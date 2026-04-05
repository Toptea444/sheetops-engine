import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export interface DeviceBinding {
  isBound: boolean;
  boundWorkerId: string | null;
}

export interface UseSessionLockResult {
  isLocked: boolean;
  isChecking: boolean;
  lockError: string | null;
  deviceBinding: DeviceBinding;
  claimSession: (workerId: string) => Promise<boolean>;
  releaseSession: (workerId: string) => Promise<void>;
  startHeartbeat: (workerId: string) => void;
  stopHeartbeat: () => void;
  checkDeviceBinding: () => Promise<DeviceBinding>;
  bindDeviceToWorker: (workerId: string) => Promise<boolean>;
}

export function useSessionLock(): UseSessionLockResult {
  const [isLocked, setIsLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [deviceBinding, setDeviceBinding] = useState<DeviceBinding>({ isBound: false, boundWorkerId: null });
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deviceFingerprint = useRef(getDeviceFingerprint());

  /**
   * Check if this device is already permanently bound to a worker ID
   */
  const checkDeviceBinding = useCallback(async (): Promise<DeviceBinding> => {
    try {
      const { data, error } = await supabase
        .from('confirmed_identities')
        .select('worker_id')
        .eq('device_fingerprint', deviceFingerprint.current)
        .maybeSingle();

      if (error) throw error;

      const binding: DeviceBinding = {
        isBound: !!data,
        boundWorkerId: data?.worker_id || null,
      };
      
      setDeviceBinding(binding);
      return binding;
    } catch (err) {
      console.error('Error checking device binding:', err);
      return { isBound: false, boundWorkerId: null };
    }
  }, []);

  /**
   * Permanently bind this device to a worker ID (called when identity is confirmed)
   */
  const bindDeviceToWorker = useCallback(async (workerId: string): Promise<boolean> => {
    try {
      const normalizedId = workerId.toUpperCase();
      
      // Check if already bound
      const { data: existing } = await supabase
        .from('confirmed_identities')
        .select('worker_id')
        .eq('device_fingerprint', deviceFingerprint.current)
        .maybeSingle();

      if (existing) {
        // Already bound - check if same worker
        if (existing.worker_id === normalizedId) {
          return true; // Already bound to same worker, all good
        }
        // Bound to different worker - this shouldn't happen if we check properly
        console.error('Device already bound to different worker');
        return false;
      }

      // Create new binding
      const { error } = await supabase
        .from('confirmed_identities')
        .insert({
          device_fingerprint: deviceFingerprint.current,
          worker_id: normalizedId,
        });

      if (error) {
        console.error('Failed to bind device:', error);
        return false;
      }

      setDeviceBinding({ isBound: true, boundWorkerId: normalizedId });
      return true;
    } catch (err) {
      console.error('Error binding device:', err);
      return false;
    }
  }, []);

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
   * Register a session for online presence (no device locking)
   */
  const claimSession = useCallback(async (workerId: string): Promise<boolean> => {
    try {
      const normalizedId = workerId.toUpperCase();

      // Check if this device already has a session for this worker
      const { data: existing } = await supabase
        .from('worker_sessions')
        .select('id, device_fingerprint')
        .eq('worker_id', normalizedId)
        .eq('device_fingerprint', deviceFingerprint.current)
        .maybeSingle();

      if (existing) {
        // Already have a session, just update heartbeat
        await supabase
          .from('worker_sessions')
          .update({ last_heartbeat: new Date().toISOString() })
          .eq('id', existing.id);
        return true;
      }

      // Delete any stale sessions for this worker (from any device)
      const staleCutoffIso = new Date(Date.now() - SESSION_TIMEOUT_MS).toISOString();
      await supabase
        .from('worker_sessions')
        .delete()
        .eq('worker_id', normalizedId)
        .lt('last_heartbeat', staleCutoffIso);

      // Insert new session
      const { error: insertError } = await supabase
        .from('worker_sessions')
        .insert({
          worker_id: normalizedId,
          device_fingerprint: deviceFingerprint.current,
          last_heartbeat: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Failed to create session:', insertError);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Session claim error:', err);
      return false;
    }
  }, []);

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
    deviceBinding,
    claimSession,
    releaseSession,
    startHeartbeat,
    stopHeartbeat,
    checkDeviceBinding,
    bindDeviceToWorker,
  };
}
