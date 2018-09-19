const storeNames = {
    offline: 'OfflineStorage',
    deleted: 'DeletedWhileOffline'
};

const indexedDbName = 'Todolist';

const syncEventTag = 'background-sync';

const apiCall = (method, url, id) =>
    fetch(url + (id ? '?id=' + String(id) : ''), {
        method: method
    });

const apiGet = (url, id) => apiCall('GET', url, id);

const apiDelete = (url, id) => apiCall('DELETE', url, id);

const apiPost = (method, url, item) =>
    fetch(url, {
        body: JSON.stringify(item),
        method: method
    });

const getItemsFromRepo = url =>
    apiGet(url).then(response =>
        // item fetched from repo is an object called TodoItems, we are interested in it's values
        response
            .json()
            .then(responseObj =>
                responseObj.TodoItems.map(todoItem => todoItem.item)
            )
    );

// deleting all items in repo contained in a database
const removeItemsFromRepo = (dbItems, url) =>
    Promise.all(dbItems.map(item => apiDelete(url, item.id)));

// syncing offline changes with online repository
const syncOfflineChanges = (dbItems, url) =>
    Promise.all(
        dbItems.map(item => {
            if (item.synced) {
                return null;
            }

            return apiGet(url, item.id).then(response =>
                apiPost(response.status === 404 ? 'POST' : 'PUT', url, item)
            );
        })
    );

// Get items from specific store in the database
const getItemsFromStore = (db, storeName) =>
    new Promise((resolve, reject) => {
        const dbTransaction = db.transaction(storeName, 'readonly');
        const dbStore = dbTransaction.objectStore(storeName);
        const dbCursor = dbStore.openCursor();
        const items = [];

        dbCursor.onsuccess = e => {
            const cursor = e.target.result;

            if (cursor) {
                items.push({
                    key: cursor.key,
                    value: cursor.value
                });
                cursor.continue();
            } else {
                resolve(items.map(node => node.value));
            }
        };

        dbCursor.onerror = e => {
            reject(e);
        };
    });

const getItemsFromStorage = db =>
    Promise.all([
        getItemsFromStore(db, storeNames.deleted),
        getItemsFromStore(db, storeNames.offline)
    ]);

const getStore = (db, storeName) => {
    const dbTransaction = db.transaction(storeName, 'readwrite');

    return dbTransaction.objectStore(storeName);
};

const clearStore = (db, storeName) =>
    new Promise((resolve, reject) => {
        const dbStore = getStore(db, storeName);
        const dbOperation = dbStore.clear();
        dbOperation.onsuccess = event => resolve(event);
        dbOperation.onerror = event => reject(event);
    });

const addToStorage = (db, item, storeName) =>
    new Promise((resolve, reject) => {
        const dbStore = getStore(db, storeName || storeNames.offline);
        const dbOperation = dbStore.add(item);
        dbOperation.onsuccess = event => resolve(event);
        dbOperation.onerror = event => reject(event);
    });

const addItemsToStorage = (db, items) =>
    Promise.all(items.map(item => addToStorage(db, item)));

const deleteFromStorage = (db, key) =>
    new Promise((resolve, reject) => {
        const storeName = storeNames.offline;
        const dbTransaction = db.transaction(storeName, 'readwrite');

        dbTransaction.oncomplete = e => resolve(e);
        dbTransaction.onabort = e => reject(e);
        dbTransaction.onerror = e => reject(e);

        const dbStore = dbTransaction.objectStore(storeName);
        const dbOperation = dbStore.get(key);

        dbOperation.onsuccess = e => {
            dbStore.delete(key);
        };
    });

const markAsDeleted = (db, item) =>
    addToStorage(db, item, storeNames.deleted).then(() =>
        deleteFromStorage(db, item.id)
    );

const clearStorage = db =>
    Promise.all([
        clearStore(db, storeNames.deleted),
        clearStore(db, storeNames.offline)
    ]);

const replaceInStorage = (db, storeName, item) =>
    new Promise((resolve, reject) => {
        var dbTransaction = db.transaction(storeName, 'readwrite');
        var dbStore = dbTransaction.objectStore(storeName);
        var dbRequest = dbStore.put(item);

        dbTransaction.oncomplete = () => resolve(dbRequest.result);

        dbTransaction.onabort = e => reject(e);
        dbTransaction.onerror = e => reject(e);
    });

const synchronise = (db, syncServiceUrl) =>
    // Fetch items from IndexedDB
    new Promise((resolve, reject) => {
        getItemsFromStorage(db).then(([deletedWhileOffline, dbItems]) => {
            // Sync deletions in IndexedDB with remote repo
            removeItemsFromRepo(deletedWhileOffline, syncServiceUrl).then(
                () => {
                    // Sync changes in IndexedDB with remote repo
                    syncOfflineChanges(dbItems, syncServiceUrl).then(
                        syncPromises => {
                            // Clear contents of IndexedDB
                            clearStorage(db).then(() => {
                                // Fetch all items from the remote repo
                                getItemsFromRepo(syncServiceUrl).then(
                                    repoItems => {
                                        // Add all items from the repo to IndexedDB
                                        addItemsToStorage(db, repoItems).then(
                                            () => {
                                                resolve(
                                                    syncPromises.some(
                                                        promise => !!promise
                                                    )
                                                );
                                            }
                                        );
                                    }
                                );
                            });
                        }
                    );
                }
            );
        });
    });

module.exports = {
    storeNames: storeNames,
    syncEventTag: syncEventTag,
    addToStorage: addToStorage,
    markAsDeleted: markAsDeleted,
    getItemsFromStore: getItemsFromStore,
    replaceInStorage: replaceInStorage,
    synchronise: synchronise
};
