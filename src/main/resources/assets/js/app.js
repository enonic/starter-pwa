import ToasterInstance from './toaster';
import '../css/app.less';
import toast from 'toast-me';

const showNotification = (registration, appName) => {
    const handler = (myToast) => {
        myToast.close();
        if (!registration.waiting) {
            // Just to ensure registration.waiting is available before
            // calling postMessage()
            document.location.reload();
            return;
        }
        if ('Notification' in window) {
            Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                    // Permission has been granted, show notifications.
                    registration.waiting.postMessage('skipWaitingAndNotify');
                } else {
                    // Permission has not been granted. Notifications will not work.
                    registration.waiting.postMessage('skipWaiting');
                }
            });
        }
    };

    const updateNotification = toast(
        `New version of ${appName} is available`,
        {
            position: 'bottom',
            closeable: false,
            duration: 30000,
            toastClass: 'toast-container'
        },
        {
            label: 'Update',
            class: 'toast-button',
            action: () => handler(updateNotification)
        }
    );
};

const handleNewServiceWorker = (registration, appName) => {
    let updated = false;
    let activated = false;

    const checkUpdate = () => {
        if (activated && updated) {
            window.location.reload();
        }
    };

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        // This will be triggered when the service worker is replaced with a new one.
        // We do not just reload the page right away, we want to make sure we are fully activated using the checkUpdate function.
        updated = true;
        checkUpdate();
    });

    registration.addEventListener('updatefound', () => {
        showNotification(registration, appName);

        const worker = registration.installing;
        worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') {
                // Here is when the activated state was triggered from the lifecycle of the service worker.
                // This will trigger on the first install and any updates.
                activated = true;
                checkUpdate();
            }
        });
    });
};

(function () {
    window.addEventListener('load', function () {
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
    });
})();

export { handleNewServiceWorker };
