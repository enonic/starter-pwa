const storeNames = {
    offline: 'OfflineStorage',
    deleted: 'DeletedWhileOffline'
};

const syncEventTag = 'background-sync';

module.exports = {
    storeNames: storeNames,
    syncEventTag: syncEventTag,
    getSyncServiceUrl: function() {
        if (!CONFIG || !CONFIG.syncServiceUrl) {
            throw 'Service for background syncing is not configured!'
        }
        return CONFIG.syncServiceUrl;
    }
};

//  export { storeNames };
