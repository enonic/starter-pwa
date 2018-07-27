const swVersion = '{{appVersion}}';

workbox.clientsClaim();
workbox.skipWaiting();

const serviceUrl = '{{serviceUrl}}';
const indexDbName = { Todolist: 'Todolist' };
const storeName = {
    offline: 'OfflineStorage',
    deleted: 'DeletedWhileOffline'
};

let indexDB; // indexDB instance
let firstTimeOnline = false; 

// This is a placeholder for manifest dynamically injected from webpack.config.js
workbox.precaching.precacheAndRoute(self.__precacheManifest || []);

// Here we precache custom defined Urls
workbox.precaching.precacheAndRoute(['{{appUrl}}']);

workbox.routing.setDefaultHandler(workbox.strategies.networkFirst());

/**
 * Sets the caching strategy for the client: tries contacting the network first
 */
/*
workbox.router.registerRoute(
    '{{appUrl}}offline',
    workbox.strategies.networkFirst()
);
workbox.router.registerRoute(
    '{{appUrl}}push',
    workbox.strategies.networkFirst()
);
workbox.router.registerRoute(
    '{{appUrl}}cache-first',
    workbox.strategies.networkFirst()
);
workbox.router.registerRoute(
    '{{appUrl}}background-sync',
    workbox.strategies.networkFirst()
);
workbox.router.registerRoute(
    '{{appUrl}}bluetooth',
    workbox.strategies.networkFirst()
);
workbox.router.registerRoute(
    '{{appUrl}}audio',
    workbox.strategies.networkFirst()
);
workbox.router.registerRoute(
    '{{appUrl}}video',
    workbox.strategies.networkFirst()
);
workbox.router.registerRoute(
    '{{appUrl}}webrtc',
    workbox.strategies.networkFirst()
);
*/
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
        sendMessageToClient(subscriberData);
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
});

/**
 * Background sync
 */

self.addEventListener('sync', event => {
    if (event.tag === 'Background-sync') {
        event.waitUntil(synchronize());
    } else {
        console.error('Problem with sync listener, sync-tag not supported');
    }
});

self.addEventListener('message', event => {
    if (event.data === 'online') {
        firstTimeOnline = true; 
    }
})

/**
 * Interval for implementation of multiple users.
 */

let interval;
const updateInterval = () => {
    if (interval) {
        clearInterval(interval);
    }
    interval = setInterval(isChangeDoneinRepo, 5000);
};

function isChangeDoneinRepo() {
    if (navigator.onLine) {
        getItemsFromRepo().then(repo => {
            if (!repo) {
                return;
            }
            getItemsFromDB().then(values => {
                const offlineStorage = values[1].reverse();
                if (repo) {
                    repo = repo.map(element => element.item);
                } else {
                    repo = [];
                }
                if (repo.length !== offlineStorage.length) {
                    synchronize();
                    return;
                }
                repo.map((item, i) => {
                    const offlineItem = offlineStorage[i];
                    if (JSON.stringify(item) !== JSON.stringify(offlineItem)) {
                        synchronize();
                    }
                });
            });
        });
    }
}

function getItemsFromRepo() {
    // fetching items from repo
    return getApiCall(serviceUrl).then(response =>
        response.json().then(itemList => {
            // item fetched from repo is an object called TodoItems, we are interested in it's values
            return itemList.TodoItems;
        })
    );
}

function getItemsFromDB() {
    return Promise.all([
        // fetching items from indexDB
        getAllFromIndexDb(indexDbName.Todolist, storeName.deleted),
        getAllFromIndexDb(indexDbName.Todolist, storeName.offline)
    ]);
}

// deleting all items in repo contained in a database
function removeItemsFromRepo(db) {
    return Promise.all(db.map(item => deleteApiCall(serviceUrl, item)));
}

function isElementInRepo(id) {
    return getItemApiCall(serviceUrl, id).then(response => {
        if (response.status === 404) {
            return false;
        }
        return true;
    });
}

// resolving offline changes on online repository
function resolveChanges(db) {
    return Promise.all(
        db.map(item => {
            if(!item.synced && firstTimeOnline) {
                sendMessageToClient("showSyncMessage");
            }

            if (!item.synced && item.changed) {
                return isElementInRepo(item.id).then(
                    status =>
                        status
                            ? putApiCall(serviceUrl, item)
                            : postApiCall(serviceUrl, item)
                );
            }
            if (!item.synced) {
                return postApiCall(serviceUrl, item);
            }
        })
    );
}

const synchronize = function(type) {
    updateInterval();
    // read db, dbRemove and repo
    getItemsFromDB().then(values => {
        // delete in repo all from db-delete
        removeItemsFromRepo(values[0]).then(() => {
            // change in repo all marked with change and sync not synced items
            resolveChanges(values[1]).then(() => {
                // get new items from repo (synced values are changed if synced)
                getItemsFromRepo().then(repo => {
                    // flush db & dbRemove
                    Promise.all([
                        flushDB(indexDbName.Todolist, storeName.offline),
                        flushDB(indexDbName.Todolist, storeName.deleted)
                    ]).then(() => {
                        // add all items from repo into db.
                        Promise.resolve(
                            repo
                                ? Promise.all(
                                        repo.map(element =>
                                            DBPost(
                                                indexDbName.Todolist,
                                                storeName.offline,
                                                element.item
                                            )
                                        )
                                    )
                                : null
                        ).then(() => {
                            const data = { message: 'synced' };
                            firstTimeOnline = false; 
                            sendMessageToClient(data); 
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

const getApiCall = url => {
    return fetch(url, {
        method: 'GET'
    });
};

const getItemApiCall = (url, data) => {
    return fetch(url + '?data=' + String(data), {
        method: 'GET'
    });
};

const deleteApiCall = (url, data) => {
    return fetch(url + '?data=' + JSON.stringify(data), {
        method: 'DELETE'
    });
};

const postApiCall = (url, data) => {
    return fetch(url, {
        body: JSON.stringify(data),
        method: 'POST'
    });
};

const putApiCall = (url, data) => {
    return fetch(url, {
        body: JSON.stringify(data),
        method: 'PUT'
    });
};

const sendMessageToClient = (message) => {
    self.clients.matchAll().then(function (clients) {
        if (clients && clients.length > 0) {
            clients.forEach(client =>
                client.postMessage(message)
            );
        } else {
            console.error(
                "Can't update the DOM: serviceworker can't find a client (page)"
            );
        }
    });
}