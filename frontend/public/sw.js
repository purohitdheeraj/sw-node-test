// Service Worker - v5 (minimal with actions)
const SW_VERSION = "v5";

self.addEventListener("install", (event) => {
  console.log("🔧 SW " + SW_VERSION + " installing...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("✅ SW " + SW_VERSION + " activated!");
  event.waitUntil(clients.claim());
});

// Push handler - keeping it simple like v3 but with actions
self.addEventListener("push", (event) => {
  console.log("📬 Push received!");

  let title = "Meeting Reminder";
  let body = "Your meeting is starting!";
  let url = "/meeting";

  try {
    const data = event.data.json();
    title = data.title || title;
    body = data.body || body;
    url = data.data?.url || url;
    console.log("📦 Data:", title, body);
  } catch (e) {
    console.log("📦 No JSON data");
  }

  // Simple options - same as v3 that worked, plus actions
  const options = {
    body: body,
    data: { url: url },
    actions: [
      { action: "join", title: "Join" },
      { action: "close", title: "Close" },
    ],
  };

  console.log("🔔 Showing notification with actions");

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle clicks
self.addEventListener("notificationclick", (event) => {
  const action = event.action;
  console.log("🖱️ Clicked! Action:", action);

  event.notification.close();

  // If user clicked 'close' button, just close
  if (action === "close") {
    return;
  }

  // For 'join' or clicking the notification body, open URL
  const url = event.notification.data?.url || "/meeting";
  const fullUrl = url.startsWith("http") ? url : "http://localhost:3001" + url;

  event.waitUntil(clients.openWindow(fullUrl));
});

console.log("🎯 SW " + SW_VERSION + " loaded!");
