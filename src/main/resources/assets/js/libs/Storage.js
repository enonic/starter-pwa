const IndexedDBInstance = require('./db/IndexedDB').default; 
const dbChanged = require("../dbChanged"); 

module.exports = {
    /**
     * Methods for retrieving from storage
     */
    get : {
        /**
         * Gets items from indexDB
         * @param storeName name of the indexDB store 
         * @param callback callback when fetched 
         */
        offline: (storeName, callback) => {
            IndexedDBInstance().then(instance => {
                instance.getAll("OfflineStorage").then(callback);
            });
        }, 
        /**
         * Get request from URL 
         * @param url the url to fetch from 
         * @returns Promise from fetch 
         */
        online: (url) => {
            return fetch(url, {
                method: 'GET',
            });
        }
    }, 
    /**
     * Methods for adding to storage
     */
    add : {
        /**
         * Adds item to indexDB
         * @param storeName name of the indexDB store
         * @param item the item to add 
         * @param noSync set to true if no sync with repo is wanted 
         */
        offline : (storeName, item, noSync) => {
            console.log("2 - adding item to removeStore");
            return IndexedDBInstance().then(instance => {
                console.log("2.5 - got db instances");
                instance.add(storeName, item);
                if(!noSync) {
                    console.log("nosync er false eller undefined"); 
                    dbChanged("add"); 
                }
            }); 
        }, 
        /**
         * Adds item to online storage 
         * @param url the url to add to 
         * @param data to be posted 
         */
        online : (url, data) => {
            return fetch(url, {
                body: JSON.stringify(data),
                method: 'POST',
            })
        }
    }, 
    /**
     * Methods for deleting from storage
     */
    delete : {
        /**
         * Removes item from indexDB
         * @param storeName name of the indexDB store
         * @param identifier the identifier of item to delete 
         */
        offline : (storeName, identifier) => {
            IndexedDBInstance().then(instance => {
                console.log("3 - delete offline");
                let req = instance.delete(storeName, identifier)
                //req.onsuccess = () => dbChanged("delete");  
                dbChanged("delete"); 
            });
            
        },
        /**
         * Removes item from online storage
         * @param url the url to call DELETE method on 
         * @param parameter passed as ?data to specify what to delete
         * @returns Promise from fetch 
         */
        online : (url, parameter) => { // parameters er data._id for oss!
            return fetch(url + "?data=" + parameter, {
                method: 'DELETE',
            });
        }
    }, 
    /**
     * Methods for replacing things in storage
     */
    replace : {
        /**
         * Edits item in indexDB store
         * @param storeName name of the indexDB store 
         * @param item item to replace the old one 
         */
        offline : (storeName, item) => {
            IndexedDBInstance().then(instance => {
                instance.put(storeName, item);
            });
            dbChanged("replace"); 
        }, 
        online : () => {
            throw "online replace not yet implementted (Storage.js)"
        }
    }
}