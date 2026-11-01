// Cross-platform Notification Dispatcher for Web, PWA, and Mobile App (Expo & Android)

// Register service worker for mobile Chrome & PWA notifications
export const initNotifications = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  // 1. Register Service Worker if supported
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('[Notification] Service Worker registered successfully.');
    } catch (err) {
      console.warn('[Notification] SW registration notice:', err);
    }
  }

  // 2. Request Notification Permission
  if ('Notification' in window) {
    try {
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        return perm === 'granted';
      }
      return Notification.permission === 'granted';
    } catch (err) {
      console.warn('[Notification] Permission request failed:', err);
    }
  }

  return false;
};

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  data?: any;
  tag?: string;
}

/**
 * Sends a notification that works on:
 * - Mobile Phones (Android status bar via Service Worker & Expo)
 * - PWAs (Installed on mobile home screen)
 * - Desktop Browsers
 */
export const triggerDeviceNotification = async ({
  title,
  body,
  icon = '/logo.jpg',
  data = {},
  tag,
}: NotificationOptions) => {
  if (typeof window === 'undefined') return;

  // 1. Haptic Vibration feedback on phone
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch (e) {
      // ignore
    }
  }

  // 2. Forward to React Native / Expo Mobile App Container if embedded in WebView
  const reactNativeWebView = (window as any).ReactNativeWebView;
  if (reactNativeWebView && typeof reactNativeWebView.postMessage === 'function') {
    try {
      reactNativeWebView.postMessage(
        JSON.stringify({
          type: 'NOTIFICATION',
          title,
          body,
          payload: data,
        })
      );
      return; // Handled natively by phone status bar!
    } catch (err) {
      console.warn('[Notification] Failed to postMessage to ReactNativeWebView:', err);
    }
  }

  // 3. Mobile Chrome & PWA: Use Service Worker Registration (Required on Android)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon,
          badge: '/favicon.svg',
          vibrate: [200, 100, 200, 100, 200],
          tag: tag || 'notif_' + Date.now(),
          renotify: true,
          data,
        } as any);
        return;
      }
    } catch (swErr) {
      console.warn('[Notification] ServiceWorker showNotification failed:', swErr);
    }
  }

  // 4. Standard Desktop Notification fallback
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon,
      });
    } catch (e) {
      console.warn('[Notification] Desktop notification failed:', e);
    }
  }
};
