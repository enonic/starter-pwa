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
    
    var item = getItemObj(req.params);
    if (!item) {
        var message = 'Missing/invalid item data in request';
        log.warning(message);
        return {
            status: 400,
            message: message,
        };
    }

    var result = createTodoNode(item);

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

exports.get = function (req){

    var item = getItemObj(req.params);
    if (!item) {
        var message = "Missing/invalid item data in request";
        log.warning(message);
        return { status: 400, message: message };
    }

    var result = deleteTodoNode(item);

    if (result.status && Number(result.status) >= 400) {
        return result;
    }

    return { body: result, 
        headers: { 
            "Content-Type": "application/json" 
        } 
    };
}


var getItemObj = function (params) {

    return {
        data: params
    };
};

var createTodoNode = function (item) {
    try {
        var itemNode = pushRepo.storeBackgroundSyncItemAndGetNode(item);
        if (!itemNode) {
            log.error("Tried creating todo node, but something seems wrong: " + JSON.stringify(
                {
                    incoming_subscription: subscription,
                    resulting_node: node
                }, null, 2));
            t
            return {
                status: 500,
                message: "Couldn't create todo node",
            }

        } else {
            return { success: true };
        }

    } catch (e) {
        log.error(e);
        return {
            status: 500,
            message: "Couldn't create todo node",
        };
    }
};

var deleteTodoNode = function (item) {
    try {
        var result = pushRepo.deleteTodo(item);
        if (result === "NOT_FOUND") {
            return {
                status: 404,
                message: "Subscription not found: auth='" + subscription.auth + ", key='" + subscription.key + "'",
            }

        } else if (result === "SUCCESS") {
            return { success: true };

        } else if (typeof result === 'string') {
            return {
                status: 500,
                message: "Some subscription nodes were not deleted",
                nodeIds: result,
            }

        } else if (result === "test") {
            return {success: "det var ingen i hits"}
        } 
        else {
            throw Error("Weird result from pushRepo.deleteSubscription:\n" + JSON.stringify({ result: result }, null, 2) + "\n");
        }

    } catch (e) {
        log.error(e);
        return {
            status: 500,
            message: "Couldn't delete subscription node",
        };
    }
};
