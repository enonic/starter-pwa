const storeNames = {
    offline: 'OfflineStorage',
    deleted: 'DeletedWhileOffline'
};

const syncEventTag = 'background-sync';

const getApiCall = url => {
    return fetch(url, {
        method: 'GET'
    });
};

const deleteApiCall = (url, data) => {
    return fetch(url + '?data=' + JSON.stringify(data), {
        method: 'DELETE'
    });
};

const getItemsFromRepo = url => {
    return getApiCall(url).then(response =>
        // item fetched from repo is an object called TodoItems, we are interested in it's values
        response.json().then(itemList => itemList.TodoItems)
    );
};

// deleting all items in repo contained in a database
const removeItemsFromRepo = function(db, url) {
    return Promise.all(db.map(item => deleteApiCall(url, item)));
};

module.exports = {
    storeNames: storeNames,
    syncEventTag: syncEventTag,
    getSyncServiceUrl: function() {
        if (!CONFIG || !CONFIG.syncServiceUrl) {
            throw new Error(
                'Service for background syncing is not configured!'
            );
        }
        return CONFIG.syncServiceUrl;
    },
    getItemsFromRepo: getItemsFromRepo,
    removeItemsFromRepo: removeItemsFromRepo
};
