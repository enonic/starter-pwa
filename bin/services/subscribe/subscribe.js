/**
 * Server-side service for adding or removing subscriptions.
 * Exposes a POST endpoint at <domain:port>/app/com.enonic.starter.pwa/_/service/com.enonic.starter.pwa/subscribe
 */


var pushRepo = require('/lib/push/repo');


/**
 * Parameters in the request.params object
 * @typedef {Object} SubscriptionParameters
 * @property {string} endpoint - The push notification service endpoint
 * @property {string} auth - Digest of the public key
 * @property {string} key - Identifies the subscription
 * @property {boolean} cancelSubscription - If this is set and truthy, the subscription with that key will be deleted if it exists.
 */

/**
 * Service entry: opens or cancels a subscription for push notifications for the sender client.
 * @public
 * @param {SubscriptionParameters} req - HTTP request object
 *
 * @returns {{body: Object, [status]: number, headers: Object}} HTTP Response object
 */
exports.post = function (req) {
    //log.info(JSON.stringify({subscribe_request:req}, null, 2));
    var subscription = getSubscriptionObj(req.params);
    if (!subscription) {
        var message = 'Missing/invalid subscription data in request';
        log.warning(message);
        return {
            status: 400,
            message: message,
        };
    }

    var result = (req.params.cancelSubscription) ?
        pushRepo.sudo(function(){ return deleteSubscriptionNode(subscription); }) :
        pushRepo.sudo(function(){ return createSubscriptionNode(subscription); });

    if (result.status && Number(result.status) >= 400) {
        return result;
    }

    return {
        body: result,
        headers: {
            'Content-Type': 'application/json',
        },
    };
};

var getSubscriptionObj = function(params) {
    if (!params.auth || !params.endpoint || !params.key) {
        log.warning("Invalid subscription object parameters - missing auth, endpoint and/or key");
        return null;
    }

    return {
        auth: params.auth,
        endpoint: params.endpoint,
        key: params.key
    };
};

var createSubscriptionNode = function (subscription) {
    try {
        var node = pushRepo.storeSubscriptionAndGetNode(subscription);
        if (!node)  {
            log.error("Tried creating subscripton node, but something seems wrong: " + JSON.stringify(
                {
                    incoming_subscription:subscription,
                    resulting_node:node
                }, null, 2));
t
            return {
                status: 500,
                message: "Couldn't create subscription node",
            }

        } else {
            return {success: true};
        }

    } catch (e) {
        log.error(e);
        return {
            status: 500,
            message: "Couldn't create subscription node",
        };
    }
};

var deleteSubscriptionNode = function (subscription) {
    try {
        var result = pushRepo.deleteSubscription(subscription);

        if (result === "NOT_FOUND") {
            return {
                status: 404,
                message: "Subscription not found: auth='" + subscription.auth + ", key='" + subscription.key + "'",
            }

        } else if (result === "SUCCESS") {
            return {success: true};

        } else if (typeof result === 'string') {
            return {
                status: 500,
                message: "Some subscription nodes were not deleted",
                nodeIds: result,
            }

        } else {
            throw Error("Weird result from pushRepo.deleteSubscription:\n" + JSON.stringify({result:result}, null, 2) + "\n");
        }

    } catch (e) {
        log.error(e);
        return {
            status: 500,
            message: "Couldn't delete subscription node",
        };
    }
};
