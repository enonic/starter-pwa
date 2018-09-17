const storeNames = {
    offline: 'OfflineStorage',
    deleted: 'DeletedWhileOffline'
};

const indexedDbName = { Todolist: 'Todolist' };

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

const showToastNotification = ToasterInstance =>
    ToasterInstance().then(toaster =>
        toaster.toast('Offline changes are synced')
    );
/*
let dbResolver;

const getIndexedDbInstance = new Promise(function(resolve) {
    console.log('DB promise ready');
    dbResolver = resolve;
});
*/

function getPromise() {
    let res;

    const promise = new Promise(resolve => {
        res = resolve;
    });

    promise.resolve = res;

    return promise;
}

let DBInstance;
const getIndexedDbInstance = getPromise();

const setIndexedDbInstance = instance => {
    console.log('Resolving DB promise');

    DBInstance = instance;
    getIndexedDbInstance.resolve(instance);
};
/*
const getIndexedDbInstance = () => {
    console.log('getIndexedDbInstance');
    return new Promise(function(resolve) {
        (function waitForInstance() {
            if (this.indexedDbInstance) {
                console.log('GOT INSTANCE');
                return resolve(this.indexedDbInstance);
            }
            console.log('no instance');
            setTimeout(waitForInstance, 30);
            return null;
        })();
    });
};

const setIndexedDbInstance = instance => {
    console.log('setIndexedDbInstance');
    this.indexedDbInstance = instance;
};

*/
const getItemsFromStore = (dbInstance, storeName) =>
    dbInstance
        .getAll(storeName)
        .then(nodes => (nodes ? nodes.map(node => node.value) : []));

const getItemsFromDB = function(dbPromise) {
    debugger;
    return dbPromise(indexedDbName).then(function(instance) {
        debugger;
        return Promise.all([
            // fetching items from indexDB

            getItemsFromStore(instance, storeNames.deleted),
            getItemsFromStore(instance, storeNames.offline)
        ]);
    });
};
/*
const getItemsFromDB = () =>
    getIndexedDbInstance.then(instance =>
        Promise.all([
            // fetching items from indexDB

            getItemsFromStore(instance, storeNames.deleted),
            getItemsFromStore(instance, storeNames.offline)
        ])
    );
*/
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
