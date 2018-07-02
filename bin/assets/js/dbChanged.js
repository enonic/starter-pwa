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


/**
 * Interval gathering online items for multiple client support
 */

const localSync  = require('./Sync').default; 

let interval;
let updateInterval = () => {
    if (interval){
        clearInterval(interval)
    }
    interval = setInterval(syncronize, 3000);
}


let syncronize = () => {
    if(navigator.serviceWorker.sync) {
        navigator.serviceWorker.ready.then(function (registration) {
            registration.sync.register("Background-sync");
        });
        
    } else if(navigator.onLine) {
        localSync(); 
    }
}
    
module.exports = (type) => {
    if(type == 'edit'){
        clearInterval(interval)
    } else {
        updateInterval()
        syncronize()
    }
}


