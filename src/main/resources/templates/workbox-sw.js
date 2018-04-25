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
 * API services, however, shouldn't use cache at all.
 */
workboxSW.router.registerRoute('/subscribe', workboxSW.strategies.networkOnly(), 'POST');
workboxSW.router.registerRoute('/push', workboxSW.strategies.networkOnly(), 'POST');
workboxSW.router.registerRoute('/broadcastsubscribers', workboxSW.strategies.networkOnly(), 'POST');


/**
 * Handles the event of receiving of a subscribed push notification
*/
self.addEventListener('push', function(event) {
    console.log('Push Received.');

    var data = JSON.parse(event.data.text());
    console.log(JSON.stringify({data:data}));

    var iconUrl = '{{iconUrl}}';
    const title = '{{appName}}';

    if (data.text) {
        const options = {
            body: data.text,
            icon: iconUrl,
        };

        const notificationPromise = self.registration.showNotification(title, options);
        event.waitUntil(notificationPromise);

    }

    if (data.subscriberCount != null) {
        self.clients.matchAll().then(function(clients) {
            clients[0].postMessage(JSON.stringify({subscriberCount:data.subscriberCount}));
        });
    }
});


/**
 * Handles the event of the push notification being clicked on
 */
self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification click Received.');
    event.notification.close();
});
