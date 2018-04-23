var repo = require('/lib/repoWrapper');


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
        repo.sudo(function(){ return deleteSubscriptionNode(subscription); }) :
        repo.sudo(function(){ return createSubscriptionNode(subscription); });

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
        var repoConn = repo.getRepoConnection();
        var node = repoConn.create({
            _parentPath: repo.PUSH_SUBSCRIPTIONS_PATH,
            _permissions: repo.ROOT_PERMISSIONS,
            subscription: subscription
        });

        if (!node) {
            log.error("Tried creating subscripton node, but something seems wrong: " + JSON.stringify(
                {
                    incoming_subscription:subscription,
                    resulting_node:node
                }, null, 2));

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
        var repoConn = repo.getRepoConnection();
        var hits = repoConn.query({
            query: "subscription.auth = '" + subscription.auth + "' AND subscription.key = '" + subscription.key + "'"
        }).hits;
        if (!hits || hits.length < 1) {
            return {
                status: 404,
                message: "Subscription not found: auth='" + subscription.auth + ", key='" + subscription.key + "'",
            }
        }

        var ids = hits.map(function (hit) {
            return hit.id;
        });
        var result = repoConn.delete(ids);

        if (result.length === ids.length) {
            return {success: true,}

        } else {
            return {
                status: 500,
                message: "Some subscription nodes were not deleted",
                nodeIds: ids.filter(function (id) {
                    return result.indexOf(id) === -1;
                }),
            }
        }

    } catch (e) {
        log.error(e);
        return {
            status: 500,
            message: "Couldn't delete subscription node",
        };
    }
};
