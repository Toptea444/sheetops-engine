import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STORAGE_KEY = 'performanceTracker_userId';
const PIN_VERIFIED_KEY = 'performanceTracker_pinVerified';
const CHECK_INTERVAL = 30 * 1000; // 30 seconds
const HEARTBEAT_INTERVAL = 60 * 1000; // 1 minute

function getDeviceFingerprint(): string {
  const storageKey = 'performanceTracker_deviceFingerprint';
  let fingerprint = localStorage.getItem(storageKey);
  if (!fingerprint) {
    fingerprint = crypto.randomUUID();
    localStorage.setItem(storageKey, fingerprint);
  }
  return fingerprint;
}

/**
 * Global session monitor that runs at App level.
 * Handles heartbeats and force-logout detection regardless of which page is mounted.
 */
export function GlobalSessionMonitor() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const deviceFingerprint = useRef(getDeviceFingerprint());
  const lastKnownUserId = useRef<string | null>(null);

  const sendHeartbeatAndCheck = useCallback(async () => {
    const userId = localStorage.getItem(STORAGE_KEY);
    
    if (!userId) {
      lastKnownUserId.current = null;
      return;
    }

    const normalizedId = userId.toUpperCase();
    lastKnownUserId.current = normalizedId;

    try {
      // Check if our session still exists
      const { data: sessionExists } = await supabase
        .from('worker_sessions')
        .select('id')
        .eq('worker_id', normalizedId)
        .eq('device_fingerprint', deviceFingerprint.current)
        .maybeSingle();

      if (!sessionExists) {
        // Session was deleted (force logout by admin)
        console.warn('Session deleted by admin, forcing client logout');
        
        // Clear all identity data from localStorage
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(PIN_VERIFIED_KEY);
        localStorage.removeItem('performanceTracker_userName');
        localStorage.removeItem('performanceTracker_dailyTarget');
        localStorage.removeItem('performanceTracker_cycleTargets');
        localStorage.removeItem('performanceTracker_identityConfirmed');
        localStorage.removeItem('performanceTracker_confirmedWorkerId');

        // Dispatch event for any mounted components to react
        window.dispatchEvent(new CustomEvent('force-logout', { detail: { workerId: normalizedId } }));
        toast.error('You have been logged out by an administrator.');
        return;
      }

      // Session exists, send heartbeat
      await supabase
        .from('worker_sessions')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('worker_id', normalizedId)
        .eq('device_fingerprint', deviceFingerprint.current);
    } catch {
      console.error('Session monitor: heartbeat failed');
    }
  }, []);

  // Claim session on mount if user is logged in
  const claimSession = useCallback(async () => {
    const userId = localStorage.getItem(STORAGE_KEY);
    if (!userId) return;
    
    const normalizedId = userId.toUpperCase();

    try {
      // Check if we already have a session
      const { data: existing } = await supabase
        .from('worker_sessions')
        .select('id, device_fingerprint')
        .eq('worker_id', normalizedId)
        .eq('device_fingerprint', deviceFingerprint.current)
        .maybeSingle();

      if (existing) {
        // Just update heartbeat
        await supabase
          .from('worker_sessions')
          .update({ last_heartbeat: new Date().toISOString() })
          .eq('id', existing.id);
        return;
      }

      // Delete stale sessions
      const staleCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      await supabase
        .from('worker_sessions')
        .delete()
        .eq('worker_id', normalizedId)
        .lt('last_heartbeat', staleCutoff);

      // Insert new session
      await supabase
        .from('worker_sessions')
        .insert({
          worker_id: normalizedId,
          device_fingerprint: deviceFingerprint.current,
          last_heartbeat: new Date().toISOString(),
        });
    } catch (err) {
      console.error('Session claim error:', err);
    }
  }, []);

  useEffect(() => {
    // Initial claim
    claimSession();

    // Start periodic heartbeat + force-logout check
    intervalRef.current = setInterval(sendHeartbeatAndCheck, CHECK_INTERVAL);

    // Also send immediate heartbeat
    sendHeartbeatAndCheck();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [claimSession, sendHeartbeatAndCheck]);

  // Listen for manual logout (user switches account) to release session
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Don't release on page close — session will expire naturally
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return null;
}
