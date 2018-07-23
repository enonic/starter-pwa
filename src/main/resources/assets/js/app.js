// Stylesheets
require('../css/styles.less');
require('../css/background-sync.less');
require('./background-sync');
require('../css/background-sync.less'); // having this in background-sync.js overwrites the other styles

const storageManager = require('./libs/background-sync/storage-manager');

var ToasterInstance = require('./libs/toaster').default;

module.exports = {
    notifyAboutNewVersion: function() {
        var snackbarContainer = document.querySelector('#notification-bar');
        var data = { message: 'PWA Starter upgraded to the latest version' };
        if (snackbarContainer.MaterialSnackbar) {
            snackbarContainer.MaterialSnackbar.showSnackbar(data);
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
            if (navigator.onLine) {
                storageManager('online');
            } else {
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
