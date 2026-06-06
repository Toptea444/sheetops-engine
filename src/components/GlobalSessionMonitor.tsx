import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'performanceTracker_userId';
const PIN_VERIFIED_KEY = 'performanceTracker_pinVerified';
const CHECK_INTERVAL = 30 * 1000; // 30 seconds
const USER_POLL_INTERVAL = 2 * 1000; // 2 seconds — check if userId changed
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // worker_sessions rows older than this are stale

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
 * Handles heartbeats, force-logout detection, and re-claiming sessions after login.
 */
export function GlobalSessionMonitor() {
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deviceFingerprint = useRef(getDeviceFingerprint());
  const trackedUserId = useRef<string | null>(null);
  const isClaimingRef = useRef(false);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    const userId = trackedUserId.current;
    if (!userId) return;

    try {
      await supabase
        .from('worker_sessions')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('worker_id', userId)
        .eq('device_fingerprint', deviceFingerprint.current);
    } catch {
      console.error('Session monitor: heartbeat failed');
    }
  }, []);

  const claimAndStartHeartbeat = useCallback(async (normalizedId: string) => {
    if (isClaimingRef.current) return;
    isClaimingRef.current = true;

    try {
      // Check if this device already has a worker_sessions presence row.
      // Stale rows cannot be updated by RLS, so delete/re-create them instead.
      const { data: existing } = await supabase
        .from('worker_sessions')
        .select('id, last_heartbeat')
        .eq('worker_id', normalizedId)
        .eq('device_fingerprint', deviceFingerprint.current)
        .maybeSingle();

      const nowIso = new Date().toISOString();
      const staleCutoff = new Date(Date.now() - SESSION_TIMEOUT_MS).toISOString();
      const existingIsFresh = existing
        ? Date.now() - new Date(existing.last_heartbeat).getTime() <= SESSION_TIMEOUT_MS
        : false;

      if (existing && existingIsFresh) {
        // Already have an active session; just update heartbeat.
        await supabase
          .from('worker_sessions')
          .update({ last_heartbeat: nowIso })
          .eq('id', existing.id);
      } else {
        // Clean up stale sessions first. This is required for this device's
        // stale row because UPDATE policies only allow active rows to update.
        await supabase
          .from('worker_sessions')
          .delete()
          .eq('worker_id', normalizedId)
          .lt('last_heartbeat', staleCutoff);

        // Insert a fresh presence row. If another active device already owns the
        // worker_id, this insert may be rejected by the database constraint/RLS.
        await supabase
          .from('worker_sessions')
          .insert({
            worker_id: normalizedId,
            device_fingerprint: deviceFingerprint.current,
            last_heartbeat: nowIso,
          });
      }

      // Track this user and start heartbeat
      trackedUserId.current = normalizedId;
      clearHeartbeat();
      heartbeatRef.current = setInterval(sendHeartbeat, CHECK_INTERVAL);
    } catch (err) {
      console.error('Session claim error:', err);
    } finally {
      isClaimingRef.current = false;
    }
  }, [clearHeartbeat, sendHeartbeat]);

  // Poll localStorage for userId changes (handles login, logout, re-login)
  useEffect(() => {
    const checkForUserChange = () => {
      const currentUserId = localStorage.getItem(STORAGE_KEY);
      const normalized = currentUserId ? currentUserId.toUpperCase() : null;

      if (normalized !== trackedUserId.current) {
        // IMPORTANT: Stop old heartbeat and update tracked user IMMEDIATELY
        // to prevent race conditions where old heartbeat fires for previous user,
        // detects their deleted session, and wipes the new user's localStorage
        clearHeartbeat();
        trackedUserId.current = normalized;

        if (normalized) {
          // New user logged in (or re-logged in after force-logout)
          claimAndStartHeartbeat(normalized);
        }
      }
    };

    // Check immediately on mount
    checkForUserChange();

    // Poll every 2 seconds for changes
    userPollRef.current = setInterval(checkForUserChange, USER_POLL_INTERVAL);

    return () => {
      if (userPollRef.current) clearInterval(userPollRef.current);
      clearHeartbeat();
    };
  }, [claimAndStartHeartbeat, clearHeartbeat]);

  return null;
}
