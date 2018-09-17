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
        response.json().then(itemList => itemList.TodoItems)
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

const getAll = function(db, storeName) {
    return new Promise((resolve, reject) => {
        var dbTransaction = db.transaction(storeName, 'readonly');
        var dbStore = dbTransaction.objectStore(storeName);
        var dbCursor;

        dbCursor = dbStore.openCursor();

        var dbResults = [];

        dbCursor.onsuccess = e => {
            var cursor = e.target.result;

            if (cursor) {
                dbResults.push({
                    key: cursor.key,
                    value: cursor.value
                });
                cursor.continue();
            } else {
                resolve(dbResults);
            }
        };

        dbCursor.onerror = e => {
            reject(e);
        };
    });
};

const showToastNotification = ToasterInstance =>
    ToasterInstance().then(toaster =>
        toaster.toast('Offline changes are synced')
    );

const getItemsFromStore = (db, storeName) =>
    getAll(db, storeName).then(
        nodes => (nodes ? nodes.map(node => node.value) : [])
    );

const getItemsFromDB = dbPromise =>
    dbPromise(indexedDbName).then(function(db) {
        return Promise.all([
            // fetching items from indexDB

            getItemsFromStore(db, storeNames.deleted),
            getItemsFromStore(db, storeNames.offline)
        ]);
    });

module.exports = {
    storeNames: storeNames,
    syncEventTag: syncEventTag,
    getSyncServiceUrl: getSyncServiceUrl,
    getItemsFromRepo: getItemsFromRepo,
    removeItemsFromRepo: removeItemsFromRepo,
    syncOfflineChanges: syncOfflineChanges,
    showToastNotification: showToastNotification,
    getItemsFromDB: getItemsFromDB
};
