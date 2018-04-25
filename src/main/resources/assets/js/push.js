/**
 * Client-side code for push notifications
 */


// Components - see templates/fragments/push.html
var subscribeStatus = document.getElementById("subscribe-status");
var subscribeButton = document.getElementById("subscribe-button");
var pushField = document.getElementById("push-field");
var pushButton = document.getElementById("push-button");

// State
var isSubscribed = false;
var subscriptionEndpoint = null;
var subscriptionKey = null;
var subscriptionAuth = null;
var subscriberCountUrl = null;

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
 * Update the visual elements in the GUI, depending on current subscription state.
 */
function updateGUI() {
    console.log("Updating GUI. Current notification.permission:", JSON.stringify(Notification.permission));
    subscribeButton.classList.remove("hidden");
    subscribeButton.disabled = false;

    if (Notification.permission === 'denied') {
        subscribeStatus.textContent = 'Notifications are blocked. Unblock and reload page to subscribe.';
        subscribeStatus.classList.remove("subscribing");
        subscribeStatus.classList.add("blocked");
        subscribeButton.textContent = 'Subscribe';
        subscribeButton.disabled = true;

    } else {
        if (isSubscribed) {
            subscribeStatus.textContent = 'Subscribing to notifications';
            subscribeStatus.classList.add("subscribing");
            subscribeStatus.classList.remove("blocked");
            subscribeButton.textContent = 'Unsubscribe';

        } else {
            subscribeStatus.textContent = 'Not subscribing to notifications';
            subscribeStatus.classList.remove("subscribing");
            subscribeStatus.classList.remove("blocked");
            subscribeButton.textContent = 'Subscribe';
        }
    }
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
        requestPermissionIfNeeded()
            .then(function(permission) {
                console.log("New notification permission was set:", JSON.stringify(permission));
                if (permission === 'granted') {
                    subscribeUser();
                } else {
                    updateGUI();
                }
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
}



// ------------------------------------------------  Programmatically requesting permissions changes -----------------

function requestPermissionIfNeeded() {
    var permission = Notification.permission;
    if (permission !== "granted") {
        console.log("Requesting");
        return Notification.requestPermission();
    }
    return Promise.resolve(permission);
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
            broadcastSubscriberCountChange();
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
                broadcastSubscriberCountChange();
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




// -----------------------------------  Call to broadcast to all subscribers when the number of subscribers changes:  ----------------------

function getSubscriberCountUrl() {
    if (subscriberCountUrl === null) {
        subscriberCountUrl = document.getElementById("subscribe-form").getAttribute("data-subscribercount-url");
    }
    return subscriberCountUrl;
}

function broadcastSubscriberCountChange() {
    var jquery = $ || wemjq;
    jquery.post({
        url: getSubscriberCountUrl(),
        data: "",
        dataType: "json",

    }).then(
        function(response){},
        function(err) {
            console.log(err);
        });
}

addEventListener("message", function(event) {
    console.log("Message for you sir:", event);
});
