import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OnlineUser {
  worker_id: string;
  last_heartbeat: string;
}

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const POLL_INTERVAL = 30_000; // 30 seconds

export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS).toISOString();
      const { data, error } = await supabase
        .from('worker_sessions')
        .select('worker_id, last_heartbeat')
        .gt('last_heartbeat', cutoff);

      if (error) throw error;
      setOnlineUsers(data || []);
    } catch (err) {
      console.error('Failed to fetch online users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchOnlineUsers]);

  return { onlineUsers, isLoading, refetch: fetchOnlineUsers };
}
