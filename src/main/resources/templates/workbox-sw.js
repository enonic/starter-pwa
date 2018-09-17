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
const indexDbName = { Todolist: 'Todolist' };

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
                self.registration.showNotification(
                    '{{appTitle}}',
                {
                    body: 'Application is updated to version {{appVersion}}',
                    icon: '{{iconUrl}}'
                });
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

function getItemsFromDB() {
    return Promise.all([
        // fetching items from indexDB
        getAllFromIndexDb(indexDbName.Todolist, storeNames.deleted),
        getAllFromIndexDb(indexDbName.Todolist, storeNames.offline)
    ]);
}

let syncInProgress = false;
let needSync = false;
const sync = function() {
    setTimeout(() => {
        synchronize();
    }, 100);
}

const synchronize = function() {
    console.log('sync');
    if (syncInProgress) {
        needSync = true;
        return;
    }

    syncInProgress = true;
    // read db, dbRemove and repo
    getItemsFromDB().then(([deletedWhileOffline, dbItems]) => {
        // console.log('items from db: ' + JSON.stringify(values));
        // delete in repo all from db-delete
        removeItemsFromRepo(deletedWhileOffline, syncServiceUrl).then(() => {
            // change in repo all marked with change and sync not synced items
            syncOfflineChanges(dbItems, syncServiceUrl).then((syncPromises) => {

                if (firstTimeOnline && syncPromises.some(promise => !!promise)) {
                    sendMessageToClients('showSyncMessage');
                }
                // get new items from repo (synced values are changed if synced)
                getItemsFromRepo(syncServiceUrl).then(repo => {
                    // flush db & dbRemove
                    Promise.all([
                        flushDB(indexDbName.Todolist, storeNames.offline),
                        flushDB(indexDbName.Todolist, storeNames.deleted)
                    ]).then(() => {
                        // add all items from repo into db.
                        Promise.resolve(
                            repo
                                ? Promise.all(
                                      repo.map(element =>
                                          DBPost(
                                              indexDbName.Todolist,
                                              storeNames.offline,
                                              element.item
                                          )
                                      )
                                  )
                                : null
                        ).then(() => {
                            const data = { message: 'synced' };
                            firstTimeOnline = false;
                            sendMessageToClients(data);
                            syncInProgress = false;
                            if (needSync) {
                                needSync = false;
                                synchronize();
                            }
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

function flushDB(indexDbName, storeName) {
    return new Promise((resolve, reject) => {
        return open(indexDbName).then(db => {
            var dbTransaction = db.transaction(storeName, 'readwrite');
            var flushReq = dbTransaction.objectStore(storeName).clear();
            flushReq.onsuccess = event => resolve(event);
            flushDB.onerror = event => reject(event);
        });
    });
}

const DBPost = function(indexDbName, storeName, item) {
    return open(indexDbName).then(db => {
        var dbTransaction = db.transaction(storeName, 'readwrite');
        var dbStore = dbTransaction.objectStore(storeName);
        dbStore.add(item);
        dbStore.onerror = () =>
            console.error(
                'Something went wrong with your local databse. Make sure your browser supports indexDB'
            );
    });
};

const getAllFromIndexDb = function(indexDbName, storeName, index, order) {
    return open(indexDbName).then(db => {
        return new Promise((resolve, reject) => {
            var dbTransaction = db.transaction(storeName, 'readonly');
            var dbStore = dbTransaction.objectStore(storeName);
            var dbCursor;

            if (typeof order !== 'string') order = 'next';

            if (typeof index === 'string')
                dbCursor = dbStore.index(index).openCursor(null, order);
            else dbCursor = dbStore.openCursor();

            var dbResults = [];

            dbCursor.onsuccess = e => {
                var cursor = e.target.result;

                if (cursor) {
                    dbResults.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(dbResults);
                }
            };

            dbCursor.onerror = e => {
                reject(e);
            };
        });
    });
};

const open = function(indexDbName) {
    if (indexDB) {
        return Promise.resolve(indexDB);
    }
    return new Promise((resolve, reject) => {
        const instance = self.indexedDB.open(indexDbName);

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
