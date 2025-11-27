const express = require("express");
const cors = require("cors");
const webpush = require("web-push");

const app = express();
const PORT = 4000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);
app.use(express.json());

// VAPID keys - In production, use environment variables!
// Generate new keys using: npm run generate-vapid
const VAPID_PUBLIC_KEY =
  "BA6pg-sk9KNf3XVFKuqeQxP2vT0apT-09WyN2yemwN3ExHwAA8sEZZNehbC_LPttUX-WWf7Ytwf3kClkadGS57I";
const VAPID_PRIVATE_KEY = "zMueLrQrla5sFz5-ZIRGi8vtz_XZA3xIxQld0JsHH_M";

// Configure web-push
webpush.setVapidDetails(
  "mailto:your-email@example.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Store subscriptions in memory (use database in production)
const subscriptions = new Map();

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "🚀 Push notification server is running!",
  });
});

// Get VAPID public key (frontend needs this)
app.get("/api/vapid-public-key", (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Subscribe endpoint - save user's push subscription
app.post("/api/subscribe", (req, res) => {
  const { subscription, userId } = req.body;

  if (!subscription) {
    return res.status(400).json({ error: "Subscription object is required" });
  }

  const id = userId || `user_${Date.now()}`;
  subscriptions.set(id, subscription);

  console.log(`✅ New subscription registered for: ${id}`);
  console.log(`📊 Total subscriptions: ${subscriptions.size}`);

  res.json({
    success: true,
    userId: id,
    message: "Subscription saved successfully!",
  });
});

// Unsubscribe endpoint
app.post("/api/unsubscribe", (req, res) => {
  const { userId } = req.body;

  if (userId && subscriptions.has(userId)) {
    subscriptions.delete(userId);
    console.log(`🗑️ Subscription removed for: ${userId}`);
  }

  res.json({ success: true, message: "Unsubscribed successfully" });
});

// Send notification to specific user
app.post("/api/send-notification", async (req, res) => {
  const { userId, title, body, meetingTime, meetingUrl } = req.body;

  const subscription = subscriptions.get(userId);

  if (!subscription) {
    return res.status(404).json({ error: "User subscription not found" });
  }

  // Simple payload that works in Chrome!
  const payload = JSON.stringify({
    title: title || "📅 Meeting Reminder",
    body: body || `Your meeting is starting at ${meetingTime}`,
    data: {
      url: meetingUrl || "http://localhost:3001/meeting",
    },
  });

  try {
    await webpush.sendNotification(subscription, payload);
    console.log(`📤 Notification sent to: ${userId}`);
    res.json({ success: true, message: "Notification sent!" });
  } catch (error) {
    console.error("❌ Error sending notification:", error);

    if (error.statusCode === 410) {
      // Subscription expired or invalid
      subscriptions.delete(userId);
      return res.status(410).json({ error: "Subscription expired" });
    }

    res.status(500).json({ error: "Failed to send notification" });
  }
});

// Send notification to all subscribers (broadcast)
app.post("/api/broadcast", async (req, res) => {
  const { title, body, meetingTime, meetingUrl } = req.body;

  if (subscriptions.size === 0) {
    return res.status(404).json({ error: "No active subscriptions" });
  }

  // Simple payload for Chrome
  const payload = JSON.stringify({
    title: title || "📅 Meeting Reminder",
    body: body || `Your meeting is starting at ${meetingTime}`,
    data: {
      url: meetingUrl || "http://localhost:3001/meeting",
    },
  });

  const results = [];

  for (const [userId, subscription] of subscriptions) {
    try {
      await webpush.sendNotification(subscription, payload);
      results.push({ userId, status: "sent" });
      console.log(`📤 Notification sent to: ${userId}`);
    } catch (error) {
      console.error(`❌ Failed for ${userId}:`, error.message);
      results.push({ userId, status: "failed", error: error.message });

      if (error.statusCode === 410) {
        subscriptions.delete(userId);
      }
    }
  }

  res.json({
    success: true,
    message: `Sent to ${results.filter((r) => r.status === "sent").length}/${
      results.length
    } users`,
    results,
  });
});

// Get subscription stats
app.get("/api/stats", (req, res) => {
  res.json({
    totalSubscriptions: subscriptions.size,
    subscriptionIds: Array.from(subscriptions.keys()),
  });
});

// Schedule a meeting notification (simulates scheduling)
app.post("/api/schedule-meeting", async (req, res) => {
  const { userId, meetingTime, delaySeconds = 5 } = req.body;

  const subscription = subscriptions.get(userId);

  if (!subscription) {
    return res.status(404).json({ error: "User subscription not found" });
  }

  console.log(
    `⏰ Scheduling notification in ${delaySeconds} seconds for: ${userId}`
  );

  setTimeout(async () => {
    // Simple payload for Chrome
    const payload = JSON.stringify({
      title: "🔔 Meeting Starting Soon!",
      body: `Your meeting is starting at ${meetingTime}. Click to join!`,
      data: {
        url: "http://localhost:3001/meeting",
      },
    });

    try {
      await webpush.sendNotification(subscription, payload);
      console.log(`📤 Scheduled notification sent to: ${userId}`);
    } catch (error) {
      console.error("❌ Failed to send scheduled notification:", error);
    }
  }, delaySeconds * 1000);

  res.json({
    success: true,
    message: `Meeting notification scheduled in ${delaySeconds} seconds`,
  });
});

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║  🚀 Push Notification Server                      ║
  ║  Running on http://localhost:${PORT}                 ║
  ╠═══════════════════════════════════════════════════╣
  ║  Endpoints:                                       ║
  ║  GET  /api/health           - Health check        ║
  ║  GET  /api/vapid-public-key - Get VAPID key       ║
  ║  POST /api/subscribe        - Save subscription   ║
  ║  POST /api/unsubscribe      - Remove subscription ║
  ║  POST /api/send-notification - Send to user       ║
  ║  POST /api/broadcast        - Send to all         ║
  ║  POST /api/schedule-meeting - Schedule reminder   ║
  ║  GET  /api/stats            - View stats          ║
  ╚═══════════════════════════════════════════════════╝
  `);
});
