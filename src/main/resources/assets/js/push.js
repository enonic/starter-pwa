/**
 * Client-side code for push notifications
 */


// Components - see templates/fragments/push.html
var subscribeStatus = document.getElementById("subscribe-status");
var subscribeButton = document.getElementById("subscribe-button");
var pushField = document.getElementById("push-field");
var pushButton = document.getElementById("push-button");
var permissionButton = document.getElementById("permission-button");

// State
var isSubscribed = false;
var subscriptionEndpoint = null;
var subscriptionKey = null;
var subscriptionAuth = null;

var swRegistration = null;




// -------------------------------------------------------  Setup  --------------------------------------------------------------

/**
 * Setup the service worker and trigger initialization
 */
if ('serviceWorker' in navigator && 'PushManager' in window) {
    console.log('Service Worker and Push is supported');
    navigator.serviceWorker.ready
        .then(function(reg) {
            console.log('Service Worker is ready', reg);
            swRegistration = reg;
            initializeUI();

        }, function() {
            console.log('Service Worker is not ready.');
        });


} else {
    console.warn('Push messaging is not supported');
    subscribeButton.disabled = true;
    subscribeButton.textContent = 'Push Not Supported';
}


/**
 * Initialization: add button click listeners, check the current subscription state and update GUI elements accordingly
 */
function initializeUI() {

    // Add button click listeners
    subscribeButton.addEventListener('click', clickSubscriptionButton);
    pushButton.addEventListener('click', clickPushButton);
    permissionButton.addEventListener('click', clickPermissionButton);

    // Get the initial subscription state and store it
    swRegistration.pushManager.getSubscription()
        .then(function(subscr) {
            var subscription = JSON.parse(JSON.stringify(subscr || {}));
            var keys = subscription.keys || {};

            subscriptionEndpoint = subscription.endpoint;
            subscriptionKey = keys.p256dh;
            subscriptionAuth = keys.auth;

            isSubscribed = subscriptionEndpoint && subscriptionKey && subscriptionAuth;
            updateGUI();
        });
}



/**
 * Update the visual elements in the GUI, depending on current subscription state:
 * Notifications.permissions may be "denied", "granted" or "default", and
 * a subscription may or may not be active.
 */
function updateGUI() {
    console.log("Notification.permission:", JSON.stringify(Notification.permission));
    if (Notification.permission === 'denied') {
        if (isSubscribed) {
            subscribeStatus.textContent = 'Subscribing, but permission is blocked';
            permissionButton.textContent = 'Allow';
            permissionButton.classList.remove("hidden");
            subscribeButton.textContent = 'Unsubscribe';
            subscribeButton.classList.remove("hidden");

        } else {
            subscribeStatus.textContent = 'Not subscribing, and push notifications are blocked';
            permissionButton.classList.add("hidden");
            subscribeButton.textContent = 'Allow and subscribe';
            subscribeButton.classList.remove("hidden");
        }

    } else if (Notification.permission === 'default') {
        if (isSubscribed) {
            subscribeStatus.textContent = 'Subscribing, but permission is not determined';
            permissionButton.textContent = 'Allow';
            permissionButton.classList.remove("hidden");
            subscribeButton.textContent = 'Unsubscribe and block';
            subscribeButton.classList.remove("hidden");

        } else {
            subscribeStatus.textContent = 'Not subscribing, and permission is not determined';
            permissionButton.classList.add("hidden");
            subscribeButton.textContent = 'Allow and subscribe';
            subscribeButton.classList.remove("hidden");
        }

    } else if (Notification.permission === 'granted') {
        if (isSubscribed) {
            subscribeStatus.textContent = 'Subscribing to notifications';
            permissionButton.classList.add("hidden");
            subscribeButton.textContent = 'Unsubscribe';
            subscribeButton.classList.remove("hidden");

        } else {
            subscribeStatus.textContent = 'Not subscribing, but permission allowed';
            permissionButton.classList.add("hidden");
            subscribeButton.textContent = 'Subscribe';
            subscribeButton.classList.remove("hidden");
        }
    }
    subscribeButton.disabled = false;
    permissionButton.disabled = false;
}





// ----------------------------------  Basic click handlers:  ---------------------------------------

/**
 * Click handler: when the user clicks the subscribe button, toggle a subscription
 */
function clickSubscriptionButton(event) {
    event.target.blur();
    subscribeButton.disabled = true;

    if (isSubscribed) {
        unsubscribeUser();

    } else {
        requestPermissionIfNeeded(
            function(permission) {
                console.log("New notification permission:", JSON.stringify(permission));
                console.log("Confirmed notification permission:", JSON.stringify(Notification.permission));
                if (permission === 'granted') {
                    subscribeUser();
                } else {
                    updateGUI();
                }
            }
        );
    }
}



function clickPermissionButton(event) {
    event.target.blur();
    permissionButton.disabled = true;
    doRequestPermission().then(updateGUI);
}



// ------------------------------------------------  Programmatically requesting permissions changes -----------------

function requestPermissionIfNeeded(callback) {
    var permission = Notification.permission;
    if (permission !== "granted") {
        console.log("Requesting");
        doRequestPermission().then(
            function() {
                callback();
                console.log("Mkay");
            }
        );
    }
    return Promise.resolve(permission);
}


function doRequestPermission() {
    return new Promise( (resolve, reject) => {
        Notification.requestPermission().then((result) => {
            console.log("Resolved. Result:", JSON.stringify(result));
            if (result) {
                resolve(result);
            }
        }).catch((ex) => {
            console.log("Permission request rejected:");
            console.error(ex);
            if (reject) {
                reject(ex);
            }
        });
    });
}




// ------------------------------------------------  Adding a subscription:  -----------------------------------------

/**
 * Encodes the public key to a byte array, when adding a subscription
 * @param base64String
 * @returns {Uint8Array}
 */
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


/**
 * Add a subscription, both to the service worker's push manager, and to the server's registry of active subscriptions.
 * To test this locally, open the push page in two different browsers, subscribe in both of them, and send a message from one of them.
 * Two notifications should appear.
 */
function subscribeUser() {

    var jquery = $ || wemjq;
    var form = jquery('#subscribe-form');
    var publicKey = form.attr("data-public-key");

    const applicationServerKey = urlB64ToUint8Array(publicKey);
    swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        })
        .then(function(subscription) {
            updateSubscriptionOnServer(subscription);
        })
        .catch(function(err) {
            console.error('Failed to subscribe the user: ', err);
            if (!isSubscribed) {
                swRegistration.pushManager.getSubscription()
                    .then(function(subscription) {
                        if (subscription) {
                            return subscription.unsubscribe();
                        }
                    })
            }
            updateGUI();
        });
}


/**
 * Sends a request to the server for adding the client's subscription.
 */
function updateSubscriptionOnServer(subscription) {
    if (!subscription) {
        console.log("No subscription object to update");
        return;
    }

    const subObj = JSON.parse(JSON.stringify(subscription));

    const params = {
        endpoint: subObj.endpoint,
        key: subObj.keys.p256dh,
        auth: subObj.keys.auth
    };

    var jquery = $ || wemjq;
    var form = jquery('#subscribe-form');
    jquery.post({
        url: form.attr('action'),
        data: params,
        dataType: "json",

    }).then(
        function success(data) {
            if (((data || {}).success === true)) {
                console.log('Successfully subscribed to push notification');

                subscriptionEndpoint = params.endpoint;
                subscriptionKey = params.key;
                subscriptionAuth = params.auth;
                isSubscribed = true;

            } else {
                console.warn("Server responded with status 200, but not with success=true");
            }
            updateGUI();
        },

        function fail (error) {
            console.error('Failed to subscribe to push notification.');
            console.log({response:error});

            isSubscribed = false;
            updateGUI();
        }
    );
}





// ------------------------------------------------  Removing a subscription:  -----------------------------------------

/**
 * Removes an existing subscription, first from the service worker's push manager, and then from the server's subscriptions registry.
 */
function unsubscribeUser() {
    swRegistration.pushManager.getSubscription()
        .then(function(subscription) {
            if (subscription) {
                return subscription.unsubscribe();
            }
        })
        .then(removeSubscriptionOnServer)
        .catch(function(err) {
            console.error('Failed to unsubscribe the user: ', err);
            updateGUI();
        });
}


/**
 * Sends a request to the server for removing the client's subscription.
 */
function removeSubscriptionOnServer() {
    if (isSubscribed && subscriptionEndpoint && subscriptionKey && subscriptionAuth) {

        const params = {
            cancelSubscription: true,
            endpoint: subscriptionEndpoint,
            key: subscriptionKey,
            auth: subscriptionAuth
        };

        var jquery = $ || wemjq;
        var form = jquery('#subscribe-form');
        jquery.post({
            url: form.attr('action'),
            data: params,
            dataType: "json",

            success: function(data) {
                if (((data || {}).success === true)) {
                    console.log('Successfully unsubscribed from push notification');

                    isSubscribed = false;
                    subscriptionEndpoint = null;
                    subscriptionKey = null;
                    subscriptionAuth = null;

                } else {
                    console.warn("Server responded with status 200, but not with success=true");
                }

                if (data.message) {
                    console.log(data.message);
                }
                updateGUI();
            },

            error: function(data) {
                console.error('Failed to unsubscribe from push notification.');
                if (data.message) {
                    console.info(data.message);
                }
                updateGUI();
            }
        });


    } else {
        console.log("No subscription to remove");
    }
}




// ---------------------------------------  Pushing a message to subscribing clients:  -----------------------------------------

function clickPushButton(event) {
    event.target.blur();
    pushButton.disabled = true;

    var jquery = $ || wemjq;
    var form = jquery('#push-form');
    jquery.post({
        url: form.attr('action'),
        data: form.serialize(),
        dataType: "json",

    }).then(
        function success(data) {
            pushButton.disabled = false;
            pushField.disabled = false;
            pushField.value = "";
            if ((data || {}).success === true) {
                console.log("Push succeeded");

            } else {
                console.log(data);
            }
        },

        function fail(error) {
            pushButton.textContent = 'Push failed';
            console.warn("Push failed. See server log.");
            console.error(error);
        },
    );
    pushField.disabled = true;

    return false;
}




// -----------------------------------  Programmatically request permission changes:  --------------------------------------
