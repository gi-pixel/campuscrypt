// ==========================================
// PWA: SERVICE WORKER LIFECYCLE
// ==========================================

self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing and fast-forwarding lifecycle...');
    // Force the waiting service worker to become the active service worker immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activated and commanding active browser clients.');
    // Force active tabs to immediately drop old workers and sync with this new worker file instance
    event.waitUntil(clients.claim());
});

// ==========================================
// PWA: NATIVE SYSTEM PUSH ENGINE
// ==========================================

self.addEventListener('push', (event) => {
    console.log('Service Worker: Intercepted inbound native push notification.');
    
    let rawData = { count: 1, message: 'New anonymous post on campus' };
    
    try {
        if (event.data) {
            rawData = event.data.json();
        }
    } catch (parseError) {
        console.log("SW Data parser fallback applied:", parseError);
    }

    // Inside sw.js, we must reference the Service Worker execution global context ("self.navigator")
    if ('setAppBadge' in self.navigator) {
        self.navigator.setAppBadge(rawData.count || 1).catch(err => {
            console.log("SW App Badge registration failure:", err);
        });
    }

    // Trigger the actual native device system panel notice pop-up overlay block
    event.waitUntil(
        self.registration.showNotification('CampusCrypt', {
            body: rawData.message || 'New anonymous post on campus',
            icon: '/icon-192.png',
            badge: '/icon-192.png', // Small monochrome logo icon layout for Android status bars
            tag: 'crypt-notification', // Overwrites previous notices instead of spamming stacking lists
            data: { url: '/' },
            vibrate: [100, 50, 100], // Haptic pulse sequence alert response feedback [vibe, pause, vibe]
        })
    );
});

// ==========================================
// PWA: SYSTEM NOTIFICATION INTERFACE INTERACTIONS
// ==========================================

self.addEventListener('notificationclick', (event) => {
    // Close the operating system layout banner immediately
    event.notification.close();
    
    // Redirect or focus the user back into the application workspace
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a tab is already open, focus it
            for (const client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no active windows are open in background task docks, open a brand new context workspace tab
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});