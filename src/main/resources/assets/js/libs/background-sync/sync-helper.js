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

const getItemsFromRepo = function(url) {
    return getApiCall(url).then(response =>
        // item fetched from repo is an object called TodoItems, we are interested in it's values
        response.json().then(itemList => itemList.TodoItems)
    );
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
    getItemsFromRepo: getItemsFromRepo
};
