import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const NOTIFICATION_KEY = 'performanceTracker_notifications';
const LAST_DATA_HASH_KEY = 'performanceTracker_lastDataHash';

interface UseNotificationsResult {
  isSupported: boolean;
  isEnabled: boolean;
  permission: NotificationPermission;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => void;
  checkForUpdates: (currentDataHash: string) => void;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export function useNotifications(): UseNotificationsResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      
      // Check if user has enabled notifications
      const enabled = localStorage.getItem(NOTIFICATION_KEY) === 'true';
      setIsEnabled(enabled && Notification.permission === 'granted');
    }
  }, []);

  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        localStorage.setItem(NOTIFICATION_KEY, 'true');
        setIsEnabled(true);
        
        // Show a test notification
        new Notification('Notifications Enabled! 🔔', {
          body: 'You will be notified when your sheet data is updated.',
          icon: '/favicon.ico',
        });
        
        toast.success('Notifications enabled!');
        return true;
      } else {
        toast.error('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      toast.error('Failed to enable notifications');
      return false;
    }
  }, [isSupported]);

  const disableNotifications = useCallback(() => {
    localStorage.setItem(NOTIFICATION_KEY, 'false');
    setIsEnabled(false);
    toast.success('Notifications disabled');
  }, []);

  const checkForUpdates = useCallback((currentDataHash: string) => {
    if (!isEnabled || permission !== 'granted') return;

    const lastHash = localStorage.getItem(LAST_DATA_HASH_KEY);
    
    if (lastHash && lastHash !== currentDataHash) {
      // Data has changed! Send notification
      new Notification('Sheet Data Updated! 📊', {
        body: 'Your performance data has been updated. Check your latest earnings!',
        icon: '/favicon.ico',
        tag: 'data-update', // Prevents duplicate notifications
      });
    }

    // Store current hash
    localStorage.setItem(LAST_DATA_HASH_KEY, currentDataHash);
  }, [isEnabled, permission]);

  return {
    isSupported,
    isEnabled,
    permission,
    enableNotifications,
    disableNotifications,
    checkForUpdates,
  };
}

// Utility to generate a hash from results data
export function generateDataHash(results: unknown[]): string {
  try {
    const dataStr = JSON.stringify(results);
    return simpleHash(dataStr);
  } catch {
    return Date.now().toString();
  }
}
