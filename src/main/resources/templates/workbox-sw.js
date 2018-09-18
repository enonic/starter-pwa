let module = {};

importScripts('js/libs/background-sync/sync-helper.js');

workbox.core.setCacheNameDetails({
    prefix: 'enonic-pwa-starter',
    suffix: '{{appVersion}}',
    precache: 'precache',
    runtime: 'runtime'
});

workbox.clientsClaim();

const syncServiceUrl = '{{syncServiceUrl}}';

let indexDB; // indexDB instance

let firstTimeOnline = false;

// This is a placeholder for manifest dynamically injected from webpack.config.js
workbox.precaching.precacheAndRoute(self.__precacheManifest || []);

// Here we precache custom defined Urls
workbox.precaching.precacheAndRoute([{
    "revision": "{{appVersion}}",
    "url": "{{appUrl}}"
},{
    "revision": "{{appVersion}}",
    "url": "{{appUrl}}manifest.json"
}]);

/**
 * Make sure SW won't precache non-GET calls to service URLs
 */
workbox.routing.registerRoute(new RegExp('{{serviceUrl}}/*'), workbox.strategies.networkOnly(), 'POST');
workbox.routing.registerRoute(new RegExp('{{serviceUrl}}/*'), workbox.strategies.networkOnly(), 'PUT');
workbox.routing.registerRoute(new RegExp('{{serviceUrl}}/*'), workbox.strategies.networkOnly(), 'DELETE');

/**
 * Sets the default caching strategy for the client: tries contacting the network first
 */
workbox.routing.setDefaultHandler(workbox.strategies.networkFirst());
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
            // NOOP
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
        event.waitUntil(sync());
        return;
    }

    console.error(`Sync tag ${e.tag} is not supported`);
});

self.addEventListener('message', event => {
    if (event.data === 'online') {
        firstTimeOnline = true;
    }
});

let syncInProgress = false;
const sync = function() {
    setTimeout(() => {
        synchronize();
    }, 100);
}

const synchronize = function() {
    console.log('sync');
    if (syncInProgress) {
        return;
    }

    syncInProgress = true;

    // Open IndexedDB
    openDatabase(indexedDbName).then(db => {

        // Fetch items from IndexedDB
        getItemsFromDB(db).then(([deletedWhileOffline, dbItems]) => {

            // Sync deletions in IndexedDB with remote repo
            removeItemsFromRepo(deletedWhileOffline, syncServiceUrl).then(() => {

                // Sync changes in IndexedDB with remote repo
                syncOfflineChanges(dbItems, syncServiceUrl).then(syncPromises => {

                    // Notify clients that all changes are synced
                    if (firstTimeOnline && syncPromises.some(promise => !!promise)) {
                        firstTimeOnline = false;
                        sendMessageToClients('showSyncMessage');
                    }
                    // Clear contents of IndexedDB
                    clearDatabase(db).then(() => {

                        // Fetch all items from the remote repo
                        getItemsFromRepo(syncServiceUrl).then(repoItems => {

                            // Add all items from remote repo to IndexedDB
                            Promise.resolve(
                                repoItems
                                    ? Promise.all(
                                            repoItems.map(element =>
                                            DBPost(
                                              storeNames.offline,
                                              element.item
                                            )
                                          )
                                      )
                                    : null
                            ).then(() => {
                                const data = { message: 'synced' };
                                sendMessageToClients(data);
                                syncInProgress = false;
                            });
                        });
                    });
                });
            });
        });
    });
};

/**
 * Offline DB storage
 */

const DBPost = function(storeName, item) {
    return openDatabase(indexedDbName).then(db => {
        var dbTransaction = db.transaction(storeName, 'readwrite');
        var dbStore = dbTransaction.objectStore(storeName);
        dbStore.add(item);
        dbStore.onerror = () =>
            console.error(
                'Something went wrong with your local databse. Make sure your browser supports indexDB'
            );
    });
};

const openDatabase = function(indexedDbName) {
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
