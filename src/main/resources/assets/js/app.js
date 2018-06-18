require('../css/styles.less');
require("../css/background-sync.less");
const Sync = require('./sync/Sync');
let sync = new Sync();

module.exports = {
    notifyAboutNewVersion: function() {
        var snackbarContainer = document.querySelector('#notification-bar');
        var data = {message: 'PWA Starter upgraded to the latest version'};
        if (snackbarContainer.MaterialSnackbar) {
            snackbarContainer.MaterialSnackbar.showSnackbar(data);
        }
    },
};

(function(){
    window.onload = function() {
        const mainContainer = document.getElementById("main-container");

        if (!mainContainer) {
            return;
        }

        const toggleOnlineStatus = function () {
            if (navigator.onLine) {

                if ('serviceWorker' in navigator) {
                    sync.syncOfflineMemos();
                    console.log("SW Online")
                }
            }
            mainContainer.classList.toggle("online", navigator.onLine);
            mainContainer.classList.toggle("offline", !navigator.onLine);
        };

        toggleOnlineStatus();

        window.addEventListener("offline", toggleOnlineStatus);
        window.addEventListener("online", toggleOnlineStatus);
    };
})();
