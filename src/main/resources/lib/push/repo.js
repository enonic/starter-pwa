/**
 * Lib for handling push subscription storage.
 */

var repoHelper = require('/lib/repo-helper');

var PUSH_SUBSCRIPTIONS_PATH = '/push';

/**
 * Creates a subscription node
 */
var createSubscriptionNode = function () {
    repoHelper.createNodeWithPath(PUSH_SUBSCRIPTIONS_PATH)
};

exports.getSubscriptions = function() {
    return repoHelper.getNodesWithPath(PUSH_SUBSCRIPTIONS_PATH);
};

exports.getSubscriptionsCount = function() {
    return repoHelper.getNodesWithPathCount(PUSH_SUBSCRIPTIONS_PATH);
};

exports.getSubscriptionById = function(id) {
    return repoHelper.getNode(id);
};

exports.createSubscription = function(subscription) {
    createSubscriptionNode(); 
    var repoConn = repoHelper.getConnection();

    // Prevent duplicates
    var hits = repoConn.query({
        query: "subscription.auth = '" + subscription.auth +
               "' AND subscription.key = '" + subscription.key +
               "' AND subscription.endpoint = '" + subscription.endpoint + "'",
    }).hits;
    if (hits && hits.length > 0) {
        return repoHelper.getNode(hits[0].id);
    }

    var node = repoHelper.createNode({
        _parentPath: PUSH_SUBSCRIPTIONS_PATH,
        subscription: subscription
    });

    repoConn.refresh();
    return node;
};

exports.deleteSubscription = function(subscription) {
    var repoConn = repoHelper.getConnection();
    var hits = repoConn.query({
        query: "subscription.auth = '" + subscription.auth + "' AND subscription.key = '" + subscription.key + "'"
    }).hits;
    if (!hits || hits.length < 1) {
        return "NOT_FOUND";
    }

    var ids = hits.map(function (hit) {
        return hit.id;
    });

    var result = repoConn.delete(ids);
    repoConn.refresh();

    if (result.length === ids.length) {
        return "SUCCESS";
    }

    return JSON.stringify(ids.filter(function (id) {
        return result.indexOf(id) === -1;
    }));
};

exports.loadKeyPair = function () {
    createSubscriptionNode(); 
    var pushSubNode = repoHelper.getNode(PUSH_SUBSCRIPTIONS_PATH);
    return (pushSubNode) ? pushSubNode.keyPair : null;
};

exports.storeKeyPair = function (keyPair) {
    repoHelper.getConnection().modify({
        key: PUSH_SUBSCRIPTIONS_PATH,
        editor: function (node) {
            node.keyPair = {
                publicKey: keyPair.publicKey,
                privateKey: keyPair.privateKey
            };
            return node;
        }
    });
};

exports.deleteAllSubscriptions = function() {
    var subscriptionNodes = exports.getSubscriptions();
    for (var i = 0; i < subscriptionNodes.hits.length; i++) {
        var node = exports.getSubscriptionById(subscriptionNodes.hits[i].id);
        exports.deleteSubscription(node.subscription);
    }
};