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

// Get items from specific store in the database
const getItemsFromStore = function(db, storeName) {
    return new Promise((resolve, reject) => {
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
};

const getItemsFromDB = db =>
    Promise.all([
        // fetching items from indexedDB

        getItemsFromStore(db, storeNames.deleted),
        getItemsFromStore(db, storeNames.offline)
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
    getItemsFromStore: getItemsFromStore
};
