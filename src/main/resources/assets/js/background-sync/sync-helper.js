const storeNames = {
    offline: 'OfflineStorage',
    deleted: 'DeletedWhileOffline'
};

const syncEventTag = 'background-sync';

const apiCall = (method, url, id) =>
    fetch(url + (id ? '?id=' + String(id) : ''), {
        method: method
    });

const apiGet = (url, id) => apiCall('GET', url, id);

const apiDelete = (url, id) => apiCall('DELETE', url, id);

const apiPost = (url, item, method) =>
    fetch(url, {
        body: JSON.stringify(item),
        method: method
    });

const getItemsFromRepo = (url) =>
    apiGet(url).then((response) =>
        // item fetched from repo is an object called TodoItems, we are interested in it's values
        response.json().then((responseObj) => responseObj.TodoItems || [])
    );

// Delete from the online repository items that were deleted from the local storage
const removeItemsFromRepo = (dbItems, url) =>
    Promise.all(dbItems.map((item) => apiDelete(url, item.id)));

// Update the online repository according to changes in the local storage
const updateItemsInRepo = (dbItems, url) =>
    Promise.all(
        dbItems.map((item) => {
            if (item.synced) {
                return null;
            }

            return apiGet(url, item.id).then((response) =>
                response
                    .json()
                    .then((responseObj) =>
                        apiPost(
                            url,
                            item,
                            responseObj.TodoItems.length ? 'PUT' : 'POST'
                        )
                    )
            );
        })
    );

// Get items from specific store in the local storage
const getItemsFromStore = (db, storeName) =>
    new Promise((resolve, reject) => {
        const dbTransaction = db.transaction(storeName, 'readonly');
        const dbStore = dbTransaction.objectStore(storeName);
        const dbCursor = dbStore.openCursor();
        const items = [];

        dbCursor.onsuccess = (e) => {
            const cursor = e.target.result;

            if (cursor) {
                items.push({
                    key: cursor.key,
                    value: cursor.value
                });
                cursor.continue();
            } else {
                resolve(items.map((node) => node.value));
            }
        };

        dbCursor.onerror = (e) => {
            reject(e);
        };
    });

const getItemsFromStorage = (db) =>
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
        dbOperation.onsuccess = (event) => resolve(event);
        dbOperation.onerror = (event) => reject(event);
    });

const addToStorage = (db, item, storeName) =>
    new Promise((resolve, reject) => {
        const store = storeName || storeNames.offline;
        const dbTransaction = db.transaction(store, 'readwrite');

        dbTransaction.oncomplete = (e) => resolve(e);
        dbTransaction.onabort = (e) => reject(e);
        dbTransaction.onerror = (e) => reject(e);

        const dbStore = dbTransaction.objectStore(store);
        dbStore.add(item);
    });

const addItemsToStorage = (db, items) =>
    Promise.all(items.map((item) => addToStorage(db, item)));

const deleteFromStorage = (db, key) =>
    new Promise((resolve, reject) => {
        const storeName = storeNames.offline;
        const dbTransaction = db.transaction(storeName, 'readwrite');

        dbTransaction.oncomplete = (e) => resolve(e);
        dbTransaction.onabort = (e) => reject(e);
        dbTransaction.onerror = (e) => reject(e);

        const dbStore = dbTransaction.objectStore(storeName);
        const dbOperation = dbStore.get(key);

        dbOperation.onsuccess = () => {
            dbStore.delete(key);
        };
    });

const markAsDeleted = (db, item) =>
    addToStorage(db, item, storeNames.deleted).then(() =>
        deleteFromStorage(db, item.id)
    );

const clearStorage = (db) =>
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

        dbTransaction.onabort = (e) => reject(e);
        dbTransaction.onerror = (e) => reject(e);
    });

const pullServerChanges = (db, syncServiceUrl) =>
    new Promise((resolve) =>
        // Clear contents of the local storage
        clearStorage(db).then(() =>
            // Fetch all items from the remote repo
            getItemsFromRepo(syncServiceUrl).then((repoItems) =>
                // Add all items from the repo to the local storage
                addItemsToStorage(db, repoItems).then(() => resolve(repoItems))
            )
        )
    );

const pushLocalChanges = (db, syncServiceUrl) =>
    new Promise((resolve) =>
        // Fetch items from the local storage
        getItemsFromStorage(db).then(([deletedWhileOffline, dbItems]) =>
            // Sync deletions in the local storage with remote repo
            removeItemsFromRepo(deletedWhileOffline, syncServiceUrl).then(() =>
                // Sync changes in the local storage with remote repo
                updateItemsInRepo(dbItems, syncServiceUrl).then(
                    (syncPromises) =>
                        resolve(
                            // Checks whether any changes were pushed
                            deletedWhileOffline.length > 0 ||
                                syncPromises.some((promise) => !!promise)
                        )
                )
            )
        )
    );

module.exports = {
    storeNames: storeNames,
    syncEventTag: syncEventTag,
    addToStorage: addToStorage,
    markAsDeleted: markAsDeleted,
    getItemsFromStore: getItemsFromStore,
    replaceInStorage: replaceInStorage,
    pullServerChanges: pullServerChanges,
    pushLocalChanges: pushLocalChanges
};
