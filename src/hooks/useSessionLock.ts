import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const HEARTBEAT_INTERVAL = 60 * 1000; // 1 minute
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

// Generate a unique device fingerprint
function getDeviceFingerprint(): string {
  const storageKey = 'performanceTracker_deviceFingerprint';
  let fingerprint = localStorage.getItem(storageKey);
  
  if (!fingerprint) {
    fingerprint = crypto.randomUUID();
    localStorage.setItem(storageKey, fingerprint);
  }
  
  return fingerprint;
}

export interface UseSessionLockResult {
  isLocked: boolean;
  isChecking: boolean;
  lockError: string | null;
  claimSession: (workerId: string) => Promise<boolean>;
  releaseSession: (workerId: string) => Promise<void>;
  startHeartbeat: (workerId: string) => void;
  stopHeartbeat: () => void;
}

export function useSessionLock(): UseSessionLockResult {
  const [isLocked, setIsLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deviceFingerprint = useRef(getDeviceFingerprint());

  /**
   * Check if a worker ID is currently locked by another device
   */
  const checkSessionLock = useCallback(async (workerId: string): Promise<{ isLocked: boolean; isOwnDevice: boolean }> => {
    try {
      const { data, error } = await supabase
        .from('worker_sessions')
        .select('device_fingerprint, last_heartbeat')
        .eq('worker_id', workerId.toUpperCase())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return { isLocked: false, isOwnDevice: false };
      }

      const lastHeartbeat = new Date(data.last_heartbeat).getTime();
      const now = Date.now();
      const isStale = now - lastHeartbeat > SESSION_TIMEOUT_MS;

      if (isStale) {
        return { isLocked: false, isOwnDevice: false };
      }

      const isOwnDevice = data.device_fingerprint === deviceFingerprint.current;
      return { isLocked: !isOwnDevice, isOwnDevice };
    } catch {
      console.error('Error checking session lock');
      return { isLocked: false, isOwnDevice: false };
    }
  }, []);

  /**
   * Attempt to claim a session for a worker ID
   */
  const claimSession = useCallback(async (workerId: string): Promise<boolean> => {
    setIsChecking(true);
    setLockError(null);

    try {
      const normalizedId = workerId.toUpperCase();
      
      // First check if locked by another device
      const { isLocked, isOwnDevice } = await checkSessionLock(workerId);
      
      if (isLocked) {
        setLockError('This ID is currently active on another device. Please try again in 15 minutes or use your own ID.');
        setIsLocked(true);
        setIsChecking(false);
        return false;
      }

      if (isOwnDevice) {
        // Already own this session, just update heartbeat
        await supabase
          .from('worker_sessions')
          .update({ last_heartbeat: new Date().toISOString() })
          .eq('worker_id', normalizedId);
        
        setIsLocked(false);
        setIsChecking(false);
        return true;
      }

      // Try to upsert the session
      const { error } = await supabase
        .from('worker_sessions')
        .upsert(
          {
            worker_id: normalizedId,
            device_fingerprint: deviceFingerprint.current,
            last_heartbeat: new Date().toISOString(),
          },
          { onConflict: 'worker_id' }
        );

      if (error) {
        console.error('Failed to claim session:', error);
        setLockError('This ID is currently active on another device. Please try again later.');
        setIsLocked(true);
        setIsChecking(false);
        return false;
      }

      setIsLocked(false);
      setIsChecking(false);
      return true;
    } catch (err) {
      console.error('Session claim error:', err);
      setLockError('Failed to verify session. Please try again.');
      setIsChecking(false);
      return false;
    }
  }, [checkSessionLock]);

  /**
   * Release a session (when logging out)
   */
  const releaseSession = useCallback(async (workerId: string): Promise<void> => {
    try {
      await supabase
        .from('worker_sessions')
        .delete()
        .eq('worker_id', workerId.toUpperCase())
        .eq('device_fingerprint', deviceFingerprint.current);
    } catch {
      console.error('Failed to release session');
    }
  }, []);

  /**
   * Start sending heartbeats
   */
  const startHeartbeat = useCallback((workerId: string) => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    const sendHeartbeat = async () => {
      try {
        await supabase
          .from('worker_sessions')
          .update({ last_heartbeat: new Date().toISOString() })
          .eq('worker_id', workerId.toUpperCase())
          .eq('device_fingerprint', deviceFingerprint.current);
      } catch {
        console.error('Heartbeat failed');
      }
    };

    // Send immediate heartbeat
    sendHeartbeat();
    
    // Then send every minute
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
  }, []);

  /**
   * Stop sending heartbeats
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  return {
    isLocked,
    isChecking,
    lockError,
    claimSession,
    releaseSession,
    startHeartbeat,
    stopHeartbeat,
  };
}
