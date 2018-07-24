const IndexedDBInstance = require('./db/indexed-db').default;
const storageManager = require('./storage-manager');

export default {
    /**
     * Methods for retrieving from storage
     */
    get: {
        /**
         * Gets items from indexDB
         * @param storeName name of the indexDB store
         * @param callback callback when fetched
         */
        offline: (storeName, callback) => {
            return IndexedDBInstance().then(instance =>
                instance.getAll(storeName).then(callback)
            );
        },
        /**
         * Get request from URL
         * @param url the url to fetch from
         * @returns Promise from fetch
         */
        online: (url, data) => {
            return fetch(url + '?data=' + String(data), {
                method: 'GET'
            });
        }
    },
    /**
     * Methods for adding to storage
     */
    add: {
        /**
         * Adds item to indexDB
         * @param storeName name of the indexDB store
         * @param item the item to add
         * @param noSync set to true if no sync with repo is wanted
         */
        offline: (storeName, item, sync) => {
            return IndexedDBInstance().then(instance => {
                instance.add(storeName, item);
                if (!sync) {
                    storageManager('delete');
                }
            });
        },
        /**
         * Adds item to online storage
         * @param url the url to add to
         * @param data to be posted
         */
        online: (url, data) => {
            return fetch(url, {
                body: JSON.stringify(data),
                method: 'POST'
            });
        }
    },
    /**
     * Methods for deleting from storage
     */
    delete: {
        /**
         * Removes item from indexDB
         * @param storeName name of the indexDB store
         * @param identifier the identifier of item to delete
         * @param sync If function called by online sync function
         */
        offline: (storeName, identifier, sync) => {
            // keeping this for now, as I know it caused an error that I can check once the linter lets me build
            return IndexedDBInstance().then(instance => {
                let req = instance.delete(storeName, identifier);
                req.onsuccess = () => storageManager('delete');
                if (!sync) {
                    storageManager('delete');
                }
            });
        },
        /**
         * Removes item from online storage
         * @param url the url to call DELETE method on
         * @param parameter passed as ?data to specify what to delete
         * @returns Promise from fetch
         */
        online: (url, data) => {
            return fetch(url + '?data=' + JSON.stringify(data), {
                method: 'DELETE'
            });
        }
    },
    /**
     * Methods for replacing things in storage
     */
    replace: {
        /**
         * Edits item in indexDB store
         * @param storeName name of the indexDB store
         * @param item item to replace the old one
         */
        offline: (storeName, item) => {
            return IndexedDBInstance().then(instance => {
                instance.put(storeName, item);
                storageManager('replace');
            });
        },
        online: (url, data) => {
            return fetch(url, {
                body: JSON.stringify(data),
                method: 'PUT'
            });
        }
    },

    flush: {
        offline: storeName => {
            return IndexedDBInstance().then(instance => {
                instance.deleteAll(storeName);
            });
        }
    }
};
