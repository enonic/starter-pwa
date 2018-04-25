importScripts('{{appUrl}}js/workbox-sw.prod.v2.0.1.js');

const swVersion = '{{appVersion}}';
const workboxSW = new self.WorkboxSW({
    skipWaiting: true,
    clientsClaim: true
});

// This is a placeholder for manifest dynamically injected from webpack.config.js
workboxSW.precache([]);

// Here we precache custom defined Urls
workboxSW.precache(['{{appUrl}}']);


/**
 * Sets the default caching strategy for the client: tries contacting the network first
 */
workboxSW.router.setDefaultHandler({
    handler: workboxSW.strategies.networkFirst(),
});


/**
 * Push and subscribe services, however, shouldn't use cache at all.
 */
workboxSW.router.registerRoute('/subscribe', workboxSW.strategies.networkOnly(), 'POST');
workboxSW.router.registerRoute('/push', workboxSW.strategies.networkOnly(), 'POST');


/**
 * Handles the event of receiving of a subscribed push notification
*/
self.addEventListener('push', function(event) {
    console.log('[Service Worker] Push Received:');

    var data = JSON.parse(event.data.text());
    console.log(data);

    const title = '{{appName}}';
    const options = {
        body: data.text,
        icon: 'images/icon.png',
        badge: 'images/badge.png'
    };

    const notificationPromise = self.registration.showNotification(title, options);
    event.waitUntil(notificationPromise);
});


/**
 * Handles the event of the push notification being clicked on
 */
self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification click Received.');
    event.notification.close();
});
