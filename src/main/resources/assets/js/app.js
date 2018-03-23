require('../css/styles.less');

module.exports = {
    notifyAboutNewVersion: function() {
        var snackbarContainer = document.querySelector('#notification-bar');
        var data = {message: 'PWA Starter upgraded to the latest version'};
        if (snackbarContainer.MaterialSnackbar) {
            snackbarContainer.MaterialSnackbar.showSnackbar(data);
        }
    },

    initPushNotifications: function() {
        if (!("Notification" in window)) {
            console.log('Notification API not supported.');
            return;
        }

        // Let's check whether notification permissions have already been granted
        if (Notification.permission === "granted") {
            // If it's okay let's create a notification
            subscribeToPushNotifications();
        }

        // Otherwise, we need to ask the user for permission
        else if (Notification.permission !== 'denied') {
            Notification.requestPermission(function (permission) {
                // If the user accepts, let's create a notification
                if (permission === "granted") {
                    subscribeToPushNotifications();
                }
            });
        }
    }
};

function subscribeToPushNotifications() {
    console.log('Subscribed to notifications');
}

(function(){
    window.onload = function() {
        const mainContainer = document.getElementById("main-container");

        if (!mainContainer) {
            return;
        }

        const toggleOnlineStatus = function () {
            mainContainer.classList.toggle("online", navigator.onLine);
            mainContainer.classList.toggle("offline", !navigator.onLine);
        };

        toggleOnlineStatus();

        window.addEventListener("offline", toggleOnlineStatus);
        window.addEventListener("online", toggleOnlineStatus);
    };
})();
