// Service Worker for Push Notifications - MINIMAL VERSION
const SW_VERSION = 'v3';

self.addEventListener('install', (event) => {
  console.log('🔧 SW ' + SW_VERSION + ' installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ SW ' + SW_VERSION + ' activated!');
  event.waitUntil(clients.claim());
});

// SUPER SIMPLE push handler - just like console command
self.addEventListener('push', (event) => {
  console.log('📬 Push received!');
  
  let title = 'Meeting Reminder';
  let body = 'Your meeting is starting!';
  let url = '/';
  
  try {
    const data = event.data.json();
    title = data.title || title;
    body = data.body || body;
    url = data.data?.url || url;
    console.log('📦 Data:', title, body);
  } catch (e) {
    console.log('📦 No JSON data');
  }

  // Simple notification - exactly like console command that works!
  const promiseChain = self.registration.showNotification(title, {
    body: body,
    data: { url: url }
  });
  
  event.waitUntil(promiseChain);
});

self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Clicked!');
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  const fullUrl = url.startsWith('http') ? url : 'http://localhost:3001' + url;
  
  event.waitUntil(clients.openWindow(fullUrl));
});

console.log('🎯 SW ' + SW_VERSION + ' loaded!');
