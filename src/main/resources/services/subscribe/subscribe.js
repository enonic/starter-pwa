/**
 * Server-side service for adding or removing subscriptions.
 * Exposes a POST endpoint at <domain:port>/webapp/com.enonic.starter.pwa/_/service/com.enonic.starter.pwa/subscribe
 */

const repoHelper = require('/lib/repo-helper');
const pushRepo = require('/lib/push/repo');

const getSubscriptionObj = function (params) {
    if (!params.auth || !params.endpoint || !params.key) {
        log.warning(
            'Invalid subscription object parameters - missing auth, endpoint and/or key'
        );
        return null;
    }

    return {
        auth: params.auth,
        endpoint: params.endpoint,
        key: params.key
    };
};

const createSubscriptionNode = function (subscription) {
    try {
        const node = pushRepo.createSubscription(subscription);
        if (!node) {
            // log.error("Tried creating subscripton node, but something seems wrong: " + JSON.stringify(
            //     {
            //         incoming_subscription:subscription,
            //         resulting_node:node
            //     }, null, 2));

            return {
                status: 500,
                message: "Couldn't create subscription node"
            };
        }
        return { success: true };
        // eslint-disable-next-line no-unused-vars
    } catch (e) {
        // log.error(e);
        return {
            status: 500,
            message: "Couldn't create subscription node"
        };
    }
};

const deleteSubscriptionNode = function (subscription) {
    try {
        const result = pushRepo.deleteSubscription(subscription);

        if (result === 'NOT_FOUND') {
            return {
                status: 404,
                message:
                    "Subscription not found: auth='" +
                    subscription.auth +
                    ", key='" +
                    subscription.key +
                    "'"
            };
        }
        if (result === 'SUCCESS') {
            return { success: true };
        }
        if (typeof result === 'string') {
            return {
                status: 500,
                message: 'Some subscription nodes were not deleted',
                nodeIds: result
            };
        }
        throw Error(
            'Weird result from pushRepo.deleteSubscription:\n' +
                JSON.stringify({ result: result }, null, 2) +
                '\n'
        );
        // eslint-disable-next-line no-unused-vars
    } catch (e) {
        // log.error(e);
        return {
            status: 500,
            message: "Couldn't delete subscription node"
        };
    }
};

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
    // log.info(JSON.stringify({subscribe_request:req}, null, 2));
    const subscription = getSubscriptionObj(req.params);
    if (!subscription) {
        const message = 'Missing/invalid subscription data in request';
        log.warning(message);
        return {
            status: 400,
            message: message
        };
    }

    const result = req.params.cancelSubscription
        ? repoHelper.sudo(function () {
              return deleteSubscriptionNode(subscription);
          })
        : repoHelper.sudo(function () {
              return createSubscriptionNode(subscription);
          });

    if (result.status && Number(result.status) >= 400) {
        return result;
    }

    return {
        body: result,
        headers: {
            'Content-Type': 'application/json'
        }
    };
};
