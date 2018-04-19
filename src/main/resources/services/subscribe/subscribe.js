var repo = require('/lib/repoWrapper');


exports.post = function (req) {
    log.info(JSON.stringify({subscriptionRequest_request:req}, null, 2));

    var subscription = getSubscriptionObj(req.params);

    if (!subscription) {
        var message = 'No subscription data in request';
        log.info(message);
        return {
            success: false,
            message: message,
        };
    }

    var retVal = null;
    if (req.params.cancelSubscription) {
        retVal = repo.sudo(function(){ return deleteSubscriptionNode(subscription); });

    } else {
        retVal = repo.sudo(function(){ return createSubscriptionNode(subscription); });
    }
    log.info(JSON.stringify({subscribe_retVal:retVal}, null, 2));

};

var getSubscriptionObj = function(params) {
    if (!params.auth || !params.endpoint || !params.key) {
        log.error("Invalid subscription object parameters");
        return null;
    }

    return {
        auth: params.auth,
        endpoint: params.endpoint,
        key: params.key
    };
};

var createSubscriptionNode = function (subscription) {
    var repoConn = repo.getRepoConnection();

    var node = repoConn.create({
        _parentPath: repo.PUSH_SUBSCRIPTIONS_PATH,
        _permissions: repo.ROOT_PERMISSIONS,
        subscription: subscription
    });

    return {
        success: !!node,
    }

};

var deleteSubscriptionNode = function (subscription) {
    var repoConn = repo.getRepoConnection();

    var hits = repoConn.query( {
        query: "subscription.auth = '" + subscription.auth+ "' AND subscription.key = '" + subscription.key+ "'"
    }).hits;
    if (!hits || hits.length < 1) {
        return {
            success: false,
            message: "Subscription not found: auth='" + subscription.auth + ", key='" + subscription.key+ "'",
        }
    }

    var ids = hits.map( function(hit) { return hit.id; });
    var result = repoConn.delete(ids);

    if (result.length === ids.length) {
        return {
            success: true,
        }

    } else {
        return {
            success: false,
            message: "Some subscription nodes were not deleted",
            nodeIds: ids.filter( function(id) { return result.indexOf(id) === -1; }),
        }
    }
};
