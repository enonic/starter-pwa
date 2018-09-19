const storeNames = {
    offline: 'OfflineStorage',
    deleted: 'DeletedWhileOffline'
};

const indexedDbName = 'Todolist';

const syncEventTag = 'background-sync';

const getSyncServiceUrl = () => {
    if (CONFIG && CONFIG.syncServiceUrl) {
        return CONFIG.syncServiceUrl;
    }

    throw new Error('Service for background syncing is not configured!');
};

const apiCall = (method, url, id) =>
    fetch((url || getSyncServiceUrl()) + (id ? '?id=' + String(id) : ''), {
        method: method
    });

const apiGet = (url, id) => apiCall('GET', url, id);

const apiDelete = (url, id) => apiCall('DELETE', url, id);

const apiPost = (method, url, item) =>
    fetch(url || getSyncServiceUrl(), {
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

const getItemsFromDB = db =>
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

const addItemToDatabase = (db, item) =>
    new Promise((resolve, reject) => {
        const dbStore = getStore(db, storeNames.offline);
        const dbOperation = dbStore.add(item);
        dbOperation.onsuccess = event => resolve(event);
        dbOperation.onerror = event => reject(event);
    });

const addItemsToDatabase = (db, items) =>
    Promise.all(items.map(item => addItemToDatabase(db, item)));

const clearDatabase = db =>
    Promise.all([
        clearStore(db, storeNames.deleted),
        clearStore(db, storeNames.offline)
    ]);

const showToastNotification = ToasterInstance =>
    ToasterInstance().then(toaster =>
        toaster.toast('Offline changes are synced')
    );

module.exports = {
    storeNames: storeNames,
    syncEventTag: syncEventTag,
    getSyncServiceUrl: getSyncServiceUrl,
    getItemsFromRepo: getItemsFromRepo,
    removeItemsFromRepo: removeItemsFromRepo,
    syncOfflineChanges: syncOfflineChanges,
    showToastNotification: showToastNotification,
    getItemsFromDB: getItemsFromDB,
    getItemsFromStore: getItemsFromStore,
    clearDatabase: clearDatabase,
    addItemsToDatabase: addItemsToDatabase,
    addItemToDatabase: addItemToDatabase
};
