# Web Push Notifications - Meeting Reminder

A full-stack web push notification system that sends meeting reminders even when the browser tab is closed!

## Architecture

```
┌──────────────────┐     Push     ┌──────────────────┐
│   Express API    │──────────────▶│   Push Service   │
│   (Port 4000)    │              │   (FCM/APNS)     │
└──────────────────┘              └────────┬─────────┘
        ▲                                  │
        │ Subscribe                        │ Push
        │                                  ▼
┌──────────────────┐              ┌──────────────────┐
│   Next.js App    │◀─────────────│  Service Worker  │
│   (Port 3000)    │  Show        │   (sw.js)        │
└──────────────────┘  Notification └──────────────────┘
```

## Features

- 🔔 **Push Notifications** - Receive notifications even when the tab is closed
- 🎯 **Service Worker** - Background push handling
- ⏰ **Meeting Reminders** - Schedule notifications for upcoming meetings
- 🔐 **VAPID Authentication** - Secure push messaging
- 📱 **Click Actions** - Open the app when clicking notification

## Quick Start

### 1. Start the Backend (Port 4000)

```bash
cd backend
npm install
npm start
```

### 2. Start the Frontend (Port 3000)

```bash
cd frontend
npm install
npm run dev
```

### 3. Test the Flow

1. Open http://localhost:3000
2. Click "Enable Push Notifications"
3. Allow notifications when prompted
4. Schedule a reminder (e.g., 10 seconds)
5. **Close the tab or minimize the browser**
6. Wait for the notification
7. Click the notification to be brought back to the app!

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/vapid-public-key` | Get VAPID public key |
| POST | `/api/subscribe` | Save push subscription |
| POST | `/api/unsubscribe` | Remove subscription |
| POST | `/api/send-notification` | Send to specific user |
| POST | `/api/broadcast` | Send to all users |
| POST | `/api/schedule-meeting` | Schedule meeting reminder |
| GET | `/api/stats` | View subscription stats |

## How It Works

1. **Service Worker Registration**: When the page loads, we register `sw.js` as a service worker
2. **Push Subscription**: User clicks subscribe → we request permission → create push subscription
3. **Backend Storage**: The subscription is sent to our Express backend and stored
4. **Sending Notifications**: Backend uses `web-push` library to send to the push service (FCM/APNS)
5. **Receiving**: Service worker receives the push event (even with tab closed!)
6. **Display**: Service worker shows the notification using `showNotification()`
7. **Click Handling**: When clicked, service worker opens/focuses the app window

## Production Considerations

- Store subscriptions in a database (Redis, PostgreSQL, etc.)
- Use environment variables for VAPID keys
- Generate new VAPID keys: `cd backend && npm run generate-vapid`
- Add authentication to protect endpoints
- Handle subscription expiration/cleanup
- Consider rate limiting

## VAPID Keys

Generate new keys for production:

```bash
cd backend
npm run generate-vapid
```

## Browser Support

- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari (macOS Ventura+, iOS 16.4+)
- ⚠️ Safari requires user interaction to subscribe

## License

MIT

