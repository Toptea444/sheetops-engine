import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const NOTIFICATION_KEY = 'performanceTracker_notifications';
const LAST_DATA_HASH_KEY = 'performanceTracker_lastDataHash';

export const NOTIFICATION_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

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

/**
 * Show a notification using the best available method.
 *
 * Priority:
 * 1. ServiceWorkerRegistration.showNotification() — works on iOS PWA, Android
 *    PWA, and all modern browsers. Required for iOS 16.4+ PWA support.
 * 2. new Notification() — fallback for desktop browsers / non-SW contexts.
 *
 * iOS Safari blocks new Notification() entirely in PWA mode. Calling it throws
 * or returns silently. The SW path is the only reliable cross-platform method.
 */
async function showNotification(title: string, options: NotificationOptions): Promise<void> {
  // Try service worker first (works on iOS PWA, Android PWA, desktop)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, {
          icon: '/pwa-icon-192.png',
          badge: '/pwa-icon-192.png',
          ...options,
        });
        return;
      }
    } catch (swErr) {
      console.warn('[Notifications] SW showNotification failed, trying fallback:', swErr);
    }
  }

  // Fallback: direct Notification constructor (desktop / non-SW environments)
  try {
    new Notification(title, {
      icon: '/favicon.ico',
      ...options,
    });
  } catch (err) {
    console.warn('[Notifications] Notification constructor also failed:', err);
  }
}

export function useNotifications(): UseNotificationsResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Notifications require either the Notification API or a Service Worker.
    // iOS PWA (16.4+) supports SW notifications but NOT new Notification().
    const supported =
      'Notification' in window || ('serviceWorker' in navigator);
    setIsSupported(supported);

    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    const enabled = localStorage.getItem(NOTIFICATION_KEY) === 'true';
    const currentPermission = 'Notification' in window ? Notification.permission : 'default';
    setIsEnabled(enabled && currentPermission === 'granted');
  }, []);

  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window) && !('serviceWorker' in navigator)) {
      toast.error('Notifications are not supported on this device');
      return false;
    }

    try {
      let result: NotificationPermission = 'denied';

      if ('Notification' in window) {
        result = await Notification.requestPermission();
      } else {
        // Some environments only expose it via the SW registration
        const reg = await navigator.serviceWorker.ready;
        // @ts-ignore — non-standard in some environments
        result = await reg.pushManager?.permissionState?.({ userVisibleOnly: true }) ?? 'denied';
      }

      setPermission(result);

      if (result !== 'granted') {
        toast.error('Notification permission denied. Please allow notifications in your device settings.');
        return false;
      }

      localStorage.setItem(NOTIFICATION_KEY, 'true');
      setIsEnabled(true);

      // Send a test notification to confirm it works
      await showNotification('Notifications Enabled', {
        body: 'You\'ll be notified when your sheet data updates.',
        tag: 'notifications-enabled',
      });

      toast.success('Notifications enabled!');
      return true;
    } catch (error) {
      console.error('[Notifications] Failed to enable:', error);
      toast.error('Failed to enable notifications');
      return false;
    }
  }, []);

  const disableNotifications = useCallback(() => {
    localStorage.setItem(NOTIFICATION_KEY, 'false');
    setIsEnabled(false);
    toast.success('Notifications disabled');
  }, []);

  const checkForUpdates = useCallback((currentDataHash: string) => {
    const currentPermission = 'Notification' in window ? Notification.permission : 'default';
    if (!isEnabled || currentPermission !== 'granted') return;

    const lastHash = localStorage.getItem(LAST_DATA_HASH_KEY);

    if (lastHash && lastHash !== currentDataHash) {
      // Data changed — fire a notification
      showNotification('📊 Sheet Data Updated', {
        body: 'Your performance data has been updated. Tap to check your latest earnings!',
        tag: 'data-update', // Prevents duplicate stacked notifications
        // Re-fire even if same tag already shown (non-standard; cast to bypass TS)
        ...( { renotify: true } as NotificationOptions ),
      });
    }

    // Always store latest hash
    localStorage.setItem(LAST_DATA_HASH_KEY, currentDataHash);
  }, [isEnabled]);

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
