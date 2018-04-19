// TODO: The private key doesn't seem to be needed anywhere?
var publicKey = null;
var subscribeUrl = null;
var pushUrl = null;

const subscribeButton = document.getElementById("subscribe-button");
const pushButton = document.getElementById('push-button');

// State
let isSubscribed = false;
let swRegistration = null;

var subscriptionEndpoint = null;
var subscriptionKey = null;
var subscriptionAuth = null;


// Setup service worker
if ('serviceWorker' in navigator && 'PushManager' in window) {
    console.log('Service Worker and Push is supported');

    // Read core constants stored in DOM
    navigator.serviceWorker.ready
        .then(function(reg) {
            var subscrData = document.getElementById("push-subscription-data");
            subscribeUrl = subscrData.getAttribute("data-subscribe-url");
            pushUrl = subscrData.getAttribute("data-push-url");
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
        removeSubscriptionOnServer(null);
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
            removeSubscriptionOnServer(null);

            console.log('User is unsubscribed.');
            isSubscribed = false;

            updateBtn();
        });
}


function removeSubscriptionOnServer() {
    if (subscriptionEndpoint && subscriptionKey && subscriptionAuth) {

        const pushSubParams = {
            cancelSubscription: true,
            endpoint: subscriptionEndpoint,
            key: subscriptionKey,
            auth: subscriptionAuth
        };

        var jquery = $ || wemjq;
        jquery.ajax({
            method: 'POST',
            url: subscribeUrl,
            data: pushSubParams,
            success: function() {
                console.log('Successfully unsubscribed push notifications')
            },
            error: function() {
                console.log('Failed to unsubscribe push notification')
            }
        });
    }
}

// Store the subscription on server
function updateSubscriptionOnServer(subscription) {
    if (!subscription) {
        console.log("No subscription object to update");
        return;
    }

    const subObj = JSON.parse(JSON.stringify(subscription));
    subscriptionEndpoint = subObj.endpoint;
    subscriptionKey = subObj.keys.p256dh;
    subscriptionAuth = subObj.keys.auth;

    const pushSubParams = {
        endpoint: subscriptionEndpoint,
        key: subscriptionKey,
        auth: subscriptionAuth
    };

    console.log(JSON.stringify({pushSubParams:pushSubParams}, null, 2));

    var jquery = $ || wemjq;
    jquery.ajax({
        method: 'POST',
        url: subscribeUrl,
        data: pushSubParams,
        success: function() {
            console.log('Successfully subscribed to push notification')
        },
        error: function() {
            console.log('Failed to subscribe to push notification')
        }
    });
}


