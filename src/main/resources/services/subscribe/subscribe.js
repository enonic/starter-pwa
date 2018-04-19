var repo = require('/lib/repoWrapper');


exports.post = function (req) {
    log.info(JSON.stringify({subscriptionRequest_request:req}, null, 2));

    var subscription = getSubscriptionObj(req.params);
    if (!subscription) {
        var message = 'Missing/invalid subscription data in request';
        log.info(message);
        return {
            status: 400,
            message: message,
        };
    }

    var retVal = (req.params.cancelSubscription) ?
        repo.sudo(function(){ return deleteSubscriptionNode(subscription); }) :
        repo.sudo(function(){ return createSubscriptionNode(subscription); });

    log.info(JSON.stringify({returnFromSubscribeService:retVal}, null, 2));
    return {
        body: retVal,
        headers: {
            'Content-Type': 'application/json',
        },
    };
};

var getSubscriptionObj = function(params) {
    if (!params.auth || !params.endpoint || !params.key) {
        log.error("Invalid subscription object parameters - missing auth, endpoint and/or key");
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
            log.error("Tried creating subscripton node, seems something went wrong: " + JSON.stringify(
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
