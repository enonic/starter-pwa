// Stylesheets
require('../css/styles.less');

var ToasterInstance = require('./libs/toaster').default;

module.exports = {
    onNewServiceWorker: function(registration, callback) {
        if (registration.waiting) {
            // SW is waiting to activate. Can occur if multiple clients open and
            // one of the clients is refreshed.
            return callback();
        }

        function listenInstalledStateChange() {
            registration.installing.addEventListener('statechange', function(
                event
            ) {
                if (event.target.state === 'installed') {
                    // A new service worker is available, inform the user
                    callback();
                }
            });
        }

        if (registration.installing) {
            return listenInstalledStateChange();
        }

        // We are currently controlled so a new SW may be found...
        // Add a listener in case a new SW is found,
        return registration.addEventListener(
            'updatefound',
            listenInstalledStateChange
        );
    },

    showNotification: function(registration, appName) {
        const snackbarContainer = document.querySelector('#notification-bar');
        const handler = function() {
            if (!registration.waiting) {
                // Just to ensure registration.waiting is available before
                // calling postMessage()
                return;
            }

            registration.waiting.postMessage('skipWaiting');
        };

        if (snackbarContainer.MaterialSnackbar) {
            const data = {
                message: `New version of ${appName} is available`,
                actionHandler: handler,
                actionText: 'Update',
                timeout: 100000
            };

            snackbarContainer.MaterialSnackbar.showSnackbar(data);
        } else {
            handler();
        }
    }
};

(function() {
    window.onload = function() {
        const mainContainer = document.getElementById('main-container');

        if (!mainContainer) {
            return;
        }

        const toggleOnlineStatus = function() {
            if (!navigator.onLine) {
                ToasterInstance().then(toaster => {
                    toaster.toast('Connection is off.');
                });
            }
            mainContainer.classList.toggle('online', navigator.onLine);
            mainContainer.classList.toggle('offline', !navigator.onLine);
        };

        toggleOnlineStatus();

        window.addEventListener('offline', toggleOnlineStatus);
        window.addEventListener('online', toggleOnlineStatus);
    };
})();
