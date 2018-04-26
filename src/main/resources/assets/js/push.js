/**
 * Client-side code for push notifications
 */

var $ = require('jquery');

// Components - see templates/fragments/push.html
var elemSubscribeStatus = $("#subscribe-status")[0];
var elemSubscribeButton = $("#subscribe-button")[0];
var elemPushField = $("#push-field")[0];
var elemPushButton = $("#push-button")[0];
var elemSubscriberCount = $("#subscriber-count")[0];
var $subscribeForm = $('#subscribe-form');
var $pushForm = $("#push-form");


// State
var isSubscribed = false;
var subscriptionEndpoint = null;
var subscriptionKey = null;
var subscriptionAuth = null;
var subscriberCountUrl = null;

var swRegistration = null;

var displayingError = false;


// -------------------------------------------------------  Setup  --------------------------------------------------------------

/**
 * Setup the service worker and trigger initialization
 */
if ('serviceWorker' in navigator && 'PushManager' in window) {
    console.log('Service Worker and Push is supported');
    navigator.serviceWorker.ready
        .then(
            function(reg) {
                console.log('Service Worker is ready', reg);
                swRegistration = reg;
                initializeUI();

            }, function(err) {
                displayErrorStatus('Service Worker is not ready.', false, err);
            }
        );


} else {
    displayErrorStatus('Push messaging is not supported', true);
}


/**
 * Initialization: add button click listeners, check the current subscription state and update GUI elements accordingly
 */
function initializeUI() {

    // Add button click listeners
    elemSubscribeButton.addEventListener('click', clickSubscriptionButton);
    elemPushButton.addEventListener('click', clickPushButton);

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


// -----------------------------------------------  Frequently used utility functions:  ---------------------------------------------

/**
 * Update the visual elements in the GUI, depending on current subscription state and notification permission.
 */
function updateGUI() {
    if (displayingError) {
        console.log("Skipping display update in favor of error display. Click a button to reset.");
        return;
    }

    console.log("Updating GUI. Current notification.permission:", JSON.stringify(Notification.permission));
    elemSubscribeButton.classList.remove("hidden");
    elemSubscribeButton.disabled = false;

    if (Notification.permission === 'denied') {
        displayErrorStatus('Notifications are blocked. Unblock and reload page to subscribe.', true);
        elemSubscribeButton.textContent = 'Subscribe';

    } else {
        if (isSubscribed) {
            elemSubscribeStatus.textContent = 'Subscribing to notifications';
            elemSubscribeStatus.classList.add("subscribing");
            elemSubscribeStatus.classList.remove("blocked");
            elemSubscribeButton.textContent = 'Unsubscribe';

        } else {
            elemSubscribeStatus.textContent = 'Not subscribing to notifications';
            elemSubscribeStatus.classList.remove("subscribing");
            elemSubscribeStatus.classList.remove("blocked");
            elemSubscribeButton.textContent = 'Subscribe';
        }
    }
}





/**
 * Post data to an API endpoint. If successful (as in, HTTP call was successful, but the response may contain warnings, error messages etc),
 * trigger callbackSuccess with the response object. If not, trigger callbackFailure with the error.
 */
function postApiCall(url, data, callbackSuccess, callbackFailure) {
        $.post({
            url: url,
            data: data || "",
            dataType: "json",
        }).then(callbackSuccess, callbackFailure);
}


/**
 * Catch-all error handling, displaying an error message in the status footer.
 * @private
 * @param {string} message - Message to display
 * @param {boolean} [abort] - If true, the GUI stops: the push form is disabled, and the subscribe button is hidden.
 * @param {Error} [err] - If submitted, logs the error to the console.
 */
function displayErrorStatus(message, abort, err) {
    displayingError = true;
        console.log("\nERROR: " + message);
    if (err) {
        console.error(err);
    }
    elemSubscribeStatus.textContent = message;
    elemSubscribeStatus.classList.remove("subscribing");
    elemSubscribeStatus.classList.add("blocked");

    if (abort) {
        $pushForm[0].classList.add("disabled");
        elemPushField.disabled = true;
        elemPushButton.disabled = true;

        elemSubscribeButton.classList.add("hidden");
    }
}

// ----------------------------------  Basic click handlers:  ---------------------------------------

/**
 * Click handler: when the user clicks the subscribe button, toggle a subscription
 */
function clickSubscriptionButton(event) {
    displayingError = false;
    event.target.blur();
    elemSubscribeButton.disabled = true;

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
                displayErrorStatus('Failed to subscribe the user', false, err);
                if (!isSubscribed) {
                    swRegistration.pushManager.getSubscription()
                        .then(function(subscription) {
                            if (subscription) {
                                return subscription.unsubscribe();
                            }
                        })
                }
            });
    }
}



// ------------------------------------------------  Programmatically requesting permissions changes -----------------

function requestPermissionIfNeeded() {
    var permission = Notification.permission;
    if (permission !== "granted") {
        console.log("Requesting permission");
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
    var publicKey = $subscribeForm.attr("data-public-key");

    const applicationServerKey = urlB64ToUint8Array(publicKey);
    swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        })
        .then(function(subscription) {
            updateSubscriptionOnServer(subscription);
        })
        .catch(function(err) {
            displayErrorStatus('Failed to subscribe the user', false, err);
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

    var url = $subscribeForm.attr('action');

    const subObj = JSON.parse(JSON.stringify(subscription));

    const params = {
        endpoint: subObj.endpoint,
        key: subObj.keys.p256dh,
        auth: subObj.keys.auth
    };

    postApiCall(
        url,
        params,

        function (data) {
            if (((data || {}).success === true)) {
                console.log('Successfully subscribed to push notification');

                subscriptionEndpoint = params.endpoint;
                subscriptionKey = params.key;
                subscriptionAuth = params.auth;
                isSubscribed = true;

            } else {
                console.warn("Server response: status=200, but not with success=true. Response data:");
                console.log(data);
            }
            if (data.message) {
                console.log(data.message);
            }
            updateGUI();
            broadcastSubscriberCountChange();
        },

        function (error) {
            isSubscribed = false;
            displayErrorStatus('Failed to subscribe to push notification', false, error);
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
            displayErrorStatus('Failed to unsubscribe the user', false, err);
        });
}


/**
 * Sends a request to the server for removing the client's subscription.
 */
function removeSubscriptionOnServer() {
    if (isSubscribed && subscriptionEndpoint && subscriptionKey && subscriptionAuth) {

        var url = $subscribeForm.attr('action');
        const params = {
            cancelSubscription: true,
            endpoint: subscriptionEndpoint,
            key: subscriptionKey,
            auth: subscriptionAuth
        };

        postApiCall(
            url,
            params,

            function(data) {
                if (((data || {}).success === true)) {
                    console.log('Successfully unsubscribed from push notification');

                    isSubscribed = false;
                    subscriptionEndpoint = null;
                    subscriptionKey = null;
                    subscriptionAuth = null;

                } else {
                    console.warn("Server response: status=200, but not with success=true. Response data:");
                    console.log(data);
                }

                if (data.message) {
                    console.log(data.message);
                }
                updateGUI();
                broadcastSubscriberCountChange();
            },

            function(err) {
                displayErrorStatus('Failed to unsubscribe from push notification', false, err);
            }
        );


    } else {
        displayErrorStatus("No subscription to remove");
    }
}




// ---------------------------------------  Pushing a message to subscribing clients:  -----------------------------------------

function clickPushButton(event) {
    event.target.blur();
    elemPushButton.disabled = true;
    elemPushField.disabled = true;
    displayingError = false;

    console.log()

    postApiCall(
        $pushForm.attr('action'),
        $pushForm.serialize(),

        function (data) {
            if ((data || {}).success === true) {
                console.log("Push succeeded");

            } else {
                console.warn("Server response: status=200, but not with success=true. Response data:");
                console.log(data);
            }
            elemPushButton.disabled = false;
            elemPushField.disabled = false;
            elemPushField.value = "";
        },

        function (error) {
            displayErrorStatus('Push failed', false, error);
        }
    );

    return false;
}



// -----------------------------------  Call to broadcast to all subscribers when the number of subscribers changes:  ----------------------

function getSubscriberCountUrl() {
    if (subscriberCountUrl === null) {
        subscriberCountUrl = $subscribeForm.attr("data-subscribercount-url");
    }
    return subscriberCountUrl;
}


function broadcastSubscriberCountChange() {
    postApiCall(
        getSubscriberCountUrl(),
        null,
        function(response){
            if (response.subscriberCount != null) {
                updateSubscriberCountInGUI(response.subscriberCount, false);
            }

        },
        function(err) {
            displayErrorStatus("Failed to broadcast subscriber change", false, err);
        }
    );
}


// Receiving broadcast data from the service worker, triggering a GUI update
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener("message", function(event) {
        if (event.data != null) {
            console.log("Page received data message:", event.data);
            var data = JSON.parse(event.data);

            if (data.subscriberCount != null) {
                updateSubscriberCountInGUI(data.subscriberCount, true);
            }
        }
    });
}


/** Updating subscriber count in the DOM */
function updateSubscriberCountInGUI(subscriberCount, live) {
    elemSubscriberCount.textContent = subscriberCount + " subscriber" + (subscriberCount === 1 ? "" : "s");
    if (live) {
        elemSubscriberCount.classList.add("live");
    } else {
        elemSubscriberCount.classList.remove("live");
    }
    if (subscriberCount === 0) {
        $pushForm[0].classList.add("disabled");
        elemPushField.disabled = true;
        elemPushButton.disabled = true;
    } else {
        $pushForm[0].classList.remove("disabled");
        elemPushField.disabled = false;
        elemPushButton.disabled = false;
    }
}
