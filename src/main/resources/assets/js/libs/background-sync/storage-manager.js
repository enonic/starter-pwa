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

const localSync = require('./local-sync');
const SyncHelper = require('./sync-helper');

const syncronize = type => {
    /**
     *  some web-browsers supports serviceWorkers, but not all of them supports background-sync
     *  Today, 4.july 2018 only Chrome supports background sync
     */
    if (navigator.serviceWorker) {
        // chrome, firefox and safari supports
        navigator.serviceWorker.ready.then(function(registration) {
            if (registration.sync) {
                // Only chrome supports
                registration.sync.register(SyncHelper.syncEventTag);
                // indicate that this is going online after being offline
                if (type !== 'online') {
                    return;
                }

                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage(type);
                } else {
                    navigator.serviceWorker.addEventListener(
                        'controllerchange',
                        () =>
                            navigator.serviceWorker.controller.postMessage(type)
                    );
                }
            } else if (navigator.onLine) {
                localSync.syncronize();
                localSync.isChangeDoneinRepo();
            }
        });
    } else if (navigator.onLine) {
        localSync.syncronize(type);
        localSync.isChangeDoneinRepo();
    }
};

module.exports = function(type) {
    if (navigator.onLine && type !== 'edit') {
        syncronize(type);
    }
};
