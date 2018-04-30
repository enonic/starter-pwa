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
 * Sets the caching strategy for the client: tries contacting the network first
 */
workboxSW.router.registerRoute("{{appUrl}}offline", workboxSW.strategies.networkFirst());
workboxSW.router.registerRoute("{{appUrl}}push", workboxSW.strategies.networkFirst());
workboxSW.router.registerRoute("{{appUrl}}cache-first", workboxSW.strategies.networkFirst());
workboxSW.router.registerRoute("{{appUrl}}background-sync", workboxSW.strategies.networkFirst());
workboxSW.router.registerRoute("{{appUrl}}bluetooth", workboxSW.strategies.networkFirst());
workboxSW.router.registerRoute("{{appUrl}}audio", workboxSW.strategies.networkFirst());
workboxSW.router.registerRoute("{{appUrl}}video", workboxSW.strategies.networkFirst());
workboxSW.router.registerRoute("{{appUrl}}webrtc", workboxSW.strategies.networkFirst());


/**
 * Handles the event of receiving of a subscribed push notification
*/
self.addEventListener('push', function(event) {

    var data = JSON.parse(event.data.text());
    var iconUrl = '{{iconUrl}}';
    const title = '{{appName}}';

    if (data.text) {
        const options = {
            body: data.text,
            icon: iconUrl
        };

        const notificationPromise = self.registration.showNotification(title, options);
        event.waitUntil(notificationPromise);

    }

    if (data.subscriberCount != null) {
        var subscriberData = JSON.stringify({subscriberCount:data.subscriberCount});
        self.clients.matchAll().then(function(clients) {
            if (clients && clients.length > 0) {
                clients[0].postMessage(subscriberData);

            } else {
                console.error("Can't update the DOM: serviceworker can't find a client (page)");
            }
        });
    }
});


/**
 * Handles the event of the push notification being clicked on
 */
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
});
