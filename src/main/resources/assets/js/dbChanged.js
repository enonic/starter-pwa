/**
 * EXPERIMENT: 
 * Until https://googlechrome.github.io/samples/indexeddb-observers/ becomes implemented in 
 * browsers, this file will be our way of handlig sync between Enonic repo and IndexDB.
 * 
 * It gets notified when something is added to indexDB and will use sync function similar to the one in 
 * workbox-sw.js  
 */

/**
 * Notify about indexDB changes to update with repo, if client has internet 
 * @param type optional type to specify what kind of operation was done 
 */
module.exports = (type) => {
    if(!type) {
        // check for all changes 
        
    } else {
        // TODO: try to do some specified things based on the update type 
    }
    console.log("I have been notified about database change and will proceed to sync: ", type);
}