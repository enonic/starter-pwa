import ToasterInstance from './toaster';

const showNotification = (registration, appName) => {
    const snackbarContainer = document.querySelector('#notification-bar');
    const handler = function () {
        if (!registration.waiting) {
            // Just to ensure registration.waiting is available before
            // calling postMessage()
            document.location.reload();
            return;
        }

        registration.waiting.postMessage('skipWaiting');
        document.location.reload();
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
};

const handleNewServiceWorker = (registration, appName) => {
    registration.addEventListener('updatefound', () =>
        showNotification(registration, appName)
    );
};

(function () {
    window.onload = function () {
        const mainContainer = document.getElementById('main-container');

        if (!mainContainer) {
            return;
        }

        const toggleOnlineStatus = function () {
            if (!navigator.onLine) {
                ToasterInstance().then((toaster) => {
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

export { handleNewServiceWorker };
