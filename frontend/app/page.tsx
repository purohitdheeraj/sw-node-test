'use client';

import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:4000/api';

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface ToastNotification {
  id: number;
  title: string;
  body: string;
  url?: string;
}

export default function Home() {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [meetingTime, setMeetingTime] = useState('');
  const [delaySeconds, setDelaySeconds] = useState('5');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time, message, type }].slice(-50));
  }, []);

  // Show in-app toast notification
  const showToast = useCallback((title: string, body: string, url?: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, body, url }]);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 10000);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleToastClick = (toast: ToastNotification) => {
    if (toast.url) {
      window.location.href = toast.url;
    }
    removeToast(toast.id);
  };

  // Check server health
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`);
        if (res.ok) {
          setServerStatus('online');
          addLog('Connected to push notification server', 'success');
        } else {
          setServerStatus('offline');
        }
      } catch {
        setServerStatus('offline');
        addLog('Server is offline. Please start the backend server.', 'error');
      }
    };
    checkServer();
  }, [addLog]);

  // Register Service Worker and listen for messages
  useEffect(() => {
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });
          setSwRegistration(registration);
          addLog('Service Worker registered successfully!', 'success');
          
          // Check if already subscribed
          const existingSub = await registration.pushManager.getSubscription();
          if (existingSub) {
            setSubscription(existingSub);
            addLog('Found existing push subscription', 'info');
          }
        } catch (error) {
          addLog(`Service Worker registration failed: ${error}`, 'error');
        }
      } else {
        addLog('Service Workers not supported in this browser', 'error');
      }
    };
    registerSW();

    // Listen for messages from Service Worker
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PUSH_RECEIVED') {
        const { title, body, url } = event.data.payload;
        
        // Show in-app toast
        showToast(title, body, url);
        addLog(`📬 Push received: ${title}`, 'success');
        
        // ALSO show native notification from PAGE (this works!)
        if (Notification.permission === 'granted') {
          const notification = new Notification(title, { 
            body: body,
            requireInteraction: true
          });
          notification.onclick = () => {
            window.focus();
            if (url) window.location.href = url;
          };
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [addLog, showToast]);

  // Convert URL-safe base64 to Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Subscribe to push notifications
  const subscribeToPush = async () => {
    if (!swRegistration) {
      addLog('Service Worker not ready', 'error');
      return;
    }

    setIsSubscribing(true);
    addLog('Requesting notification permission...', 'info');

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        addLog('Notification permission denied', 'error');
        setIsSubscribing(false);
        return;
      }

      addLog('Permission granted! Subscribing to push...', 'success');

      // Get VAPID public key from server
      const keyRes = await fetch(`${API_BASE}/vapid-public-key`);
      const { publicKey } = await keyRes.json();

      // Subscribe to push
      const pushSubscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      setSubscription(pushSubscription);
      addLog('Push subscription created!', 'success');

      // Send subscription to backend
      const subRes = await fetch(`${API_BASE}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: pushSubscription.toJSON(),
          userId: `user_${Date.now()}`
        })
      });

      const subData = await subRes.json();
      setUserId(subData.userId);
      addLog(`Registered with server as: ${subData.userId}`, 'success');

    } catch (error) {
      addLog(`Subscription failed: ${error}`, 'error');
    }

    setIsSubscribing(false);
  };

  // Unsubscribe from push notifications
  const unsubscribeFromPush = async () => {
    if (!subscription) return;

    try {
      await subscription.unsubscribe();
      
      if (userId) {
        await fetch(`${API_BASE}/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
      }

      setSubscription(null);
      setUserId('');
      addLog('Unsubscribed from push notifications', 'info');
    } catch (error) {
      addLog(`Unsubscribe failed: ${error}`, 'error');
    }
  };

  // Test in-app toast notification
  const testToastNotification = () => {
    showToast(
      '🧪 In-App Test Notification',
      'This appears INSIDE the app - works even if macOS blocks Chrome!',
      '/meeting'
    );
    addLog('In-app toast triggered!', 'success');
  };

  // Send test notification
  const sendTestNotification = async () => {
    if (!userId) {
      addLog('Please subscribe first', 'error');
      return;
    }

    try {
      addLog('Sending test notification...', 'info');
      
      const res = await fetch(`${API_BASE}/send-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: '🔔 Test Notification',
          body: 'This is a test notification. You can close this tab and you will still receive notifications!',
          meetingUrl: 'http://localhost:3001/meeting'
        })
      });

      const data = await res.json();
      
      if (data.success) {
        addLog('Test notification sent! Check your notifications.', 'success');
      } else {
        addLog(`Failed to send: ${data.error}`, 'error');
      }
    } catch (error) {
      addLog(`Error: ${error}`, 'error');
    }
  };

  // Schedule meeting notification
  const scheduleMeetingNotification = async () => {
    if (!userId) {
      addLog('Please subscribe first', 'error');
      return;
    }

    const time = meetingTime || new Date(Date.now() + parseInt(delaySeconds) * 1000).toLocaleTimeString();

    try {
      addLog(`Scheduling meeting notification in ${delaySeconds} seconds...`, 'info');
      
      const res = await fetch(`${API_BASE}/schedule-meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          meetingTime: time,
          delaySeconds: parseInt(delaySeconds)
        })
      });

      const data = await res.json();
      
      if (data.success) {
        addLog(`Meeting reminder scheduled! You'll be notified in ${delaySeconds} seconds. Try closing this tab!`, 'success');
      } else {
        addLog(`Failed: ${data.error}`, 'error');
      }
    } catch (error) {
      addLog(`Error: ${error}`, 'error');
    }
  };

  return (
    <main className="container">
      {/* Toast Notifications Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className="toast"
            onClick={() => handleToastClick(toast)}
          >
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              <div className="toast-body">{toast.body}</div>
            </div>
            <button 
              className="toast-close"
              onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <header className="header">
        <h1>🔔 Push Notifications</h1>
        <p>Get meeting reminders even when the tab is closed</p>
      </header>

      {/* Status Card */}
      <div className="status-card">
        <div className="status-row">
          <span className="status-label">🖥️ Backend Server</span>
          <span className={`status-value ${serverStatus === 'online' ? 'connected' : serverStatus === 'offline' ? 'disconnected' : 'pending'}`}>
            {serverStatus === 'online' ? '● Connected' : serverStatus === 'offline' ? '○ Offline' : '◌ Checking...'}
          </span>
        </div>
        <div className="status-row">
          <span className="status-label">⚙️ Service Worker</span>
          <span className={`status-value ${swRegistration ? 'connected' : 'pending'}`}>
            {swRegistration ? '● Registered' : '◌ Loading...'}
          </span>
        </div>
        <div className="status-row">
          <span className="status-label">📬 Push Subscription</span>
          <span className={`status-value ${subscription ? 'connected' : 'disconnected'}`}>
            {subscription ? '● Active' : '○ Not subscribed'}
          </span>
        </div>
      </div>

      {/* Subscription Card */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon">🔐</span>
          <span className="card-title">Push Subscription</span>
        </div>

        {!subscription ? (
          <>
            <p className="instruction">
              Click the button below to enable push notifications. You'll be asked to allow notifications.
              After subscribing, you can receive meeting reminders even when this tab is closed!
            </p>
            <button 
              className="btn btn-primary" 
              onClick={subscribeToPush}
              disabled={isSubscribing || !swRegistration || serverStatus !== 'online'}
              style={{ marginTop: '1rem' }}
            >
              {isSubscribing ? '⏳ Subscribing...' : '🔔 Enable Push Notifications'}
            </button>
          </>
        ) : (
          <>
            <p className="instruction" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'var(--success)' }}>
              ✅ You're subscribed! You can now close this tab and still receive notifications.
            </p>
            {userId && (
              <div className="user-id-display">
                Your ID: {userId}
              </div>
            )}
            <button 
              className="btn btn-danger" 
              onClick={unsubscribeFromPush}
              style={{ marginTop: '1rem' }}
            >
              🚫 Unsubscribe
            </button>
          </>
        )}
      </div>

      {/* Test Notifications Card */}
      {subscription && (
        <div className="card">
          <div className="card-header">
            <span className="card-icon">📅</span>
            <span className="card-title">Meeting Reminder</span>
          </div>

          <div className="form-group">
            <label className="form-label">Meeting Time (optional)</label>
            <input
              type="time"
              className="form-input"
              value={meetingTime}
              onChange={(e) => setMeetingTime(e.target.value)}
              placeholder="Leave empty for 'now'"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Delay (seconds) - Time until notification</label>
            <input
              type="number"
              className="form-input"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(e.target.value)}
              min="1"
              max="60"
            />
          </div>

          <div className="btn-group">
            <button className="btn btn-secondary" onClick={sendTestNotification}>
              📤 Send Push Test
            </button>
            <button className="btn btn-success" onClick={scheduleMeetingNotification}>
              ⏰ Schedule Reminder
            </button>
          </div>
          
          <button 
            className="btn btn-primary" 
            onClick={testToastNotification}
            style={{ marginTop: '1rem', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
          >
            🧪 Test In-App Toast (Always Works!)
          </button>

          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
            💡 Tip: Schedule a reminder, then close this tab to test!
          </p>
        </div>
      )}

      {/* Activity Log */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon">📋</span>
          <span className="card-title">Activity Log</span>
        </div>
        <div className="log-container">
          {logs.length === 0 ? (
            <div className="empty-log">No activity yet...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="log-entry">
                <span className="log-time">{log.time}</span>
                <span className={`log-message ${log.type}`}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
