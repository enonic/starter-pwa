/**
 * Server-side service for pushing notifications to all registered subscriptions.
 * Exposes a POST endpoint at <domain:port>/app/com.enonic.starter.pwa/_/service/com.enonic.starter.pwa/push
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
    log.info(JSON.stringify({push_request:req}, null, 2));

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
            log.info(response.body.message);

        } else {
            var succeeded = sendPushNotificationToAllSubscribers(req.params.message);
            response.body = {
                success: succeeded,
                message: (succeeded) ? undefined : "No messages were pushed. See the server log.",
            };
        }

    } catch (e) {
        log.error(e);
        response.status = 500;
        response.body = {
            success: false,
            message: "Push failed.",
        };
    }

    log.info(JSON.stringify({push_response:response}, null, 2));

    return response;

};


/**
 * Iterate over all registered subscriptions and push a notification to them one by one. In real-world use, this should be done
 * asynchronously, e.g. using the XP task library.
 * @private
 * @param {string} message
 *
 * @throws Error if any notification coudn't be pushed
 *
 * @returns {boolean} True if any subscriptions were found and pushed to, false if there were no subscriptions
 */
function sendPushNotificationToAllSubscribers (message) {
    var repoConn = pushRepo.getRepoConnection();

    var keyPair = pushKeys.getKeyPair();
    var subscriptions = repoConn.findChildren({
        start: 0,
        count: -1,
        parentKey: pushRepo.PUSH_SUBSCRIPTIONS_PATH
    });

    if (subscriptions.total === 0) {
        log.warning('No subscriptions found');
        return false;
    }

    log.info("Subscriptions:");
    for (var i = 0; i < subscriptions.hits.length; i++) {
        var node = repoConn.get(subscriptions.hits[i].id);

        if (node && node.subscription) {
            log.info("\n" + JSON.stringify(node.subscription, null, 2));
            sendPushNotification(keyPair, node.subscription, message);

        } else {
            log.info(JSON.stringify(subscriptions.hits[i], null, 2));
        }
    }
    log.info("\n\nSubscriptions:");

    return true;
}


/**
 * Send a single message to a single subscriber.
 * @private
 * @param {Object} keyPair - Pair of fixed public and private key to the notification service, common between subscribe and push. DO NOT
 * SHARE THE PRIVATE KEY, don't even write it in the code. In our example it's generated once and stored in a node in the repo.
 * @param {Object} subscription - unique identifier and authentication for the subscription. Contains the fields {@code endpoint,
 * {@code auth} and {@code key}.
 * @param {String} message - Message that will be wrapped in an object under the key {@code text} and sent out as the payload of the
 * notification. The {@code payload} object can of course also be used to send general-purpose data.
 *
 * @throws Error if the notification coudn't be pushed
 */
var sendPushNotification = function (keyPair, subscription, message) {
    notifications.sendAsync({
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        endpoint: subscription.endpoint,
        auth: subscription.auth,
        receiverKey: subscription.key,
        payload: {
            text: message
        },
        success: function () {
            log.info('Push notification sent successfully');
        },
        error: function () {
            throw Error("Could not send push notification: '" + message + "'");
        }
    });
};
