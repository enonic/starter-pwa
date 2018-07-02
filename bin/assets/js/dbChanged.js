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
    if(navigator.serviceWorker) {
        navigator.serviceWorker.ready.then(function (registration) {
            console.log("registrating sync")
            registration.sync.register("Background-sync");
        });
        
    } else if(navigator.onLine) {
        sync(); 
    }
 
}

let sync = () => {
    console.error("online, non-serviceworker sync not implemented"); 
    //use imported storage 
    //update ui
}

