
// TODO: The private key doesn't seem to be needed anywhere?
var publicKey = null;
var subscriptionServiceUrl = null;
var pushServiceUrl = null;

const subscribeButton = document.getElementById("subscribe-button");
const pushButton = document.getElementById('push-button');

// State
let isSubscribed = false;
let swRegistration = null;


// Setup service worker
if ('serviceWorker' in navigator && 'PushManager' in window) {
    console.log('Service Worker and Push is supported');

    // Read core constants stored in DOM
    navigator.serviceWorker.ready
        .then(function(reg) {
            var subscrData = document.getElementById("push-subscription-data");
            subscriptionServiceUrl = subscrData.getAttribute("data-subscription-url");
            pushServiceUrl = subscrData.getAttribute("data-push-url");
            publicKey = subscrData.getAttribute("data-public-key");

        }, function() {
            console.log('Service Worker is not ready.');
        });


    // Register sw.js
    navigator.serviceWorker.register('sw.js')
        .then(function(swReg) {
            console.log('Service Worker is registered', swReg);

            swRegistration = swReg;
            initializeUI();
        })
        .catch(function(error) {
            console.error('Service Worker Error', error);
        });

} else {
    console.warn('Push messaging is not supported');
    subscribeButton.textContent = 'Push Not Supported';
}


function initializeUI() {

    // Add button click listener
    subscribeButton.addEventListener('click', function() {
        subscribeButton.disabled = true;
        if (isSubscribed) {
            unsubscribeUser();
        } else {
            subscribeUser();
        }
    });

    // Get the initial subscription state and store it
    swRegistration.pushManager.getSubscription()
        .then(function(subscription) {
            isSubscribed = !(subscription === null);

            updateSubscriptionOnServer(subscription);

            if (isSubscribed) {
                console.log('User IS subscribed.');
            } else {
                console.log('User is NOT subscribed.');
            }

            updateBtn();
        });
}


// What should the button look like
function updateBtn() {
    if (Notification.permission === 'denied') {
        subscribeButton.textContent = 'Push Notifications are blocked.';
        subscribeButton.disabled = true;
        updateSubscriptionOnServer(null);
        return;
    }

    if (isSubscribed) {
        subscribeButton.textContent = 'Unsubscribe';
    } else {
        subscribeButton.textContent = 'Subscribe';
    }

    subscribeButton.disabled = false;
}


function urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}


// Make a new subscription
function subscribeUser() {
    const applicationServerKey = urlB64ToUint8Array(publicKey);
    swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        })
        .then(function(subscription) {
            console.log('User is subscribed.');

            updateSubscriptionOnServer(subscription);

            isSubscribed = true;

            updateBtn();
        })
        .catch(function(err) {
            console.log('Failed to subscribe the user: ', err);
            updateBtn();
        });
}


// Remove the subscription from server
function unsubscribeUser() {
    swRegistration.pushManager.getSubscription()
        .then(function(subscription) {
            if (subscription) {
                return subscription.unsubscribe();
            }
        })
        .catch(function(error) {
            console.log('Error unsubscribing', error);
        })
        .then(function() {
            updateSubscriptionOnServer(null);

            console.log('User is unsubscribed.');
            isSubscribed = false;

            updateBtn();
        });
}


// Store the subscription on server
function updateSubscriptionOnServer(subscription) {

    const subObj = JSON.parse(JSON.stringify(subscription));

    const pushSubParams = {
        endpoint: subObj.endpoint,
        key: subObj.keys.p256dh,
        auth: subObj.keys.auth
    };

    console.log(JSON.stringify({pushSubParams:pushSubParams}, null, 2));

    var jquery = $ || wemjq;
    jquery.ajax({
        method: 'POST',
        url: subscriptionServiceUrl,
        data: pushSubParams,
        success: function() {
            console.log('Successfully subscribed to push notification')
        },
        error: function() {
            console.log('Failed to subscribe to push notification')
        }
    });
}


