/**
 * Server-side service for pushing notifications to all registered subscriptions.
 * Exposes a POST endpoint at <domain:port>/webapp/<appname>/_/service/<appname>/push
 */


var notifications = require('/lib/notifications');
var pushRepo = require('/lib/push/repo');
var pushKeys = require('/lib/push/keys');

/**
 * Service entry: Allows the client to POST a message to this service, which next will be pushed as a notification to all subscribing
 * clients. NOTE: this is only for demonstration purposes, generally there shouldn't be an exposed and unprotected opening like this, that
 * allows anyone to publish notifications through just by POSTing to the service.
 * @public
 * @param {Object} req - POST'ed HTTP request object from the client.
 *
 * @returns {{body: Object, status: number, headers: Object}} HTTP Response object
 */
exports.post = function (req) {
    var response = {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    try {
        if (req.params.message == '') {
            response.status = 400;
            response.body = {
                message: 'Empty message received - nothing to send',
            };

        } else {
            var succeeded = exports.sendPushNotificationToAllSubscribers({
                text: req.params.message
            });
            response.body = {
                success: succeeded,
                message: (succeeded) ? undefined : "No messages were pushed. See the server log.",
            };
        }

    } catch (e) {
        // log.error(e);
        response.status = 500;
        response.body = {
            success: false,
            message: "Push failed.",
        };
    }

    return response;
};


/**
 * Iterate over all registered subscriptions and push a notification to them one by one. In real-world use, this should be done
 * asynchronously, e.g. using the XP task library.
 * @private
 * @param {Object} payload
 *
 * @returns {boolean} True if any subscriptions were found and pushed to, false if there were no subscriptions
 */
exports.sendPushNotificationToAllSubscribers = function (payload) {
    var subscriptions = pushRepo.getSubscriptions();

    if (subscriptions.total === 0) {
        return false;
    }

    var actuallySent = 0;
    var keyPair = pushKeys.getKeyPair();
    for (var i = 0; i < subscriptions.hits.length; i++) {
        var hit = subscriptions.hits[i];
        var node = pushRepo.getSubscriptionById(hit.id);

        if (node && node.subscription) {
            sendPushNotification(keyPair, node.subscription, payload);
            actuallySent++;

        }
    }
    return (actuallySent > 0);
};


/**
 * Send a single message to a single subscriber.
 * @private
 * @param {Object} keyPair - Pair of fixed public and private key to the notification service, common between subscribe and push. DO NOT
 * SHARE THE PRIVATE KEY, don't even write it in the code. In our example it's generated once and stored in a node in the repo.
 * @param {Object} subscription - unique identifier and authentication for the subscription. Contains the fields {@code endpoint,
 * {@code auth} and {@code key}.
 * @param {Object} payload - Message that will be wrapped in an object under the key {@code text} and sent out as the payload of the
 * notification. The {@code payload} object can of course also be used to send general-purpose data.
 */
var sendPushNotification = function (keyPair, subscription, payload) {
    notifications.sendAsync({
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        endpoint: subscription.endpoint,
        auth: subscription.auth,
        receiverKey: subscription.key,
        payload: payload,
        error: function () {
            throw Error("Could not send push notification payload: '" + JSON.stringify(payload) + "'");
        }
    });
};
