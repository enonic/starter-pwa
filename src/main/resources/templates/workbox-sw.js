//importScripts('js/background-sync/sync-helper.js');

import {pushLocalChanges, syncEventTag} from '../assets/js/background-sync/sync-helper';

import {setCacheNameDetails, clientsClaim, skipWaiting} from 'workbox-core';
import {precacheAndRoute} from 'workbox-precaching';
import {registerRoute, setDefaultHandler} from 'workbox-routing';
import {NetworkOnly, NetworkFirst} from 'workbox-strategies';

setCacheNameDetails({
    prefix: 'enonic-pwa-starter',
    suffix: '{{appVersion}}',
    precache: 'precache',
    runtime: 'runtime'
});

skipWaiting();
clientsClaim();

const syncServiceUrl = '{{syncServiceUrl}}';
const indexedDbName = '{{localStorageName}}';

let indexDB; // indexDB instance

// This is a placeholder for manifest dynamically injected from webpack.config.js
precacheAndRoute(self.__WB_MANIFEST);

// Here we precache custom defined Urls
precacheAndRoute([{
    "revision": "{{appVersion}}",
    "url": "{{appUrl}}"
},{
    "revision": "{{appVersion}}",
    "url": "{{appUrl}}manifest.json"
}]);

/**
 * Make sure SW won't precache non-GET calls to service URLs
 */
const routePath = new RegExp('{{serviceUrl}}/*');
registerRoute(routePath, new NetworkOnly(), 'POST');
registerRoute(routePath, new NetworkOnly(), 'PUT');
registerRoute(routePath, new NetworkOnly(), 'DELETE');

/**
 * Sets the default caching strategy for the client: tries contacting the network first
 */
setDefaultHandler(new NetworkFirst());

/**
 * Pass a message from the outside world to SW
*/
self.addEventListener('message', (event) => {
    if (!event.data){
        return;
    }
    switch (event.data) {
        case 'skipWaiting':
            self.skipWaiting().then(() => {
                try {
                    self.registration.showNotification(
                    '{{appTitle}}',
                    {
                        body: 'Application is updated to version {{appVersion}}',
                        icon: '{{iconUrl}}'
                    });
                }
                catch(e) {
                    console.log('Notifications disabled. Application is updated to version {{appVersion}}');
                }
            });
            break;
        default:
            break;
    }
});

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

        const notificationPromise = self.registration.showNotification(
            title,
            options
        );
        event.waitUntil(notificationPromise);
    }

    if (data.subscriberCount != null) {
        var subscriberData = JSON.stringify({
            subscriberCount: data.subscriberCount
        });
        sendMessageToClients(subscriberData);
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
});

/**
 * Background sync
 */

self.addEventListener('sync', event => {
    if (event.tag === syncEventTag) {
        event.waitUntil(synchronize());
        return;
    }

    console.error(`Sync tag ${e.tag} is not supported`);
});

const synchronize = function() {
    return new Promise(resolve => {

        sendMessageToClients({ message: 'sw-sync-start' });

        // Open IndexedDB
        openDatabase().then(db => {
            // Call synchronise method in sync-helper.js
            pushLocalChanges(db, syncServiceUrl).then(changesMade => {
                sendMessageToClients({ message: 'sw-sync-end', notify: changesMade });

                resolve();
            });
        });
    });

};

const openDatabase = function() {
    if (indexDB) {
        return Promise.resolve(indexDB);
    }
    return new Promise((resolve, reject) => {
        const instance = self.indexedDB.open(indexedDbName);

        instance.onsuccess = e => {
            indexDB = e.target.result;
            resolve(indexDB);
        };
        instance.onerror = e => {
            reject(e);
        };
    });
};

/**
 * Online repo storage http requests
 */

const sendMessageToClients = message => {
    self.clients.matchAll().then(function(clients) {
        if (clients && clients.length > 0) {
            clients.forEach(client => client.postMessage(message));
        } else {
            console.error(
                "Can't update the DOM: serviceworker can't find a client (page)"
            );
        }
    });
};
