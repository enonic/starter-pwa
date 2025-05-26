/**
 * Lib for handling push subscription storage.
 */

const repoHelper = require('/lib/repo-helper');

const PUSH_SUBSCRIPTIONS_PATH = '/push';

/**
 * Creates a subscription node
 */
const createSubscriptionNode = function () {
    repoHelper.createNodeWithPath(PUSH_SUBSCRIPTIONS_PATH);
};

exports.getSubscriptions = function () {
    return repoHelper.getNodesWithPath(PUSH_SUBSCRIPTIONS_PATH);
};

exports.getSubscriptionsCount = function () {
    return repoHelper.getNodesWithPathCount(PUSH_SUBSCRIPTIONS_PATH);
};

exports.getSubscriptionById = function (id) {
    return repoHelper.getNode(id);
};

exports.createSubscription = function (subscription) {
    createSubscriptionNode();
    const repoConn = repoHelper.getConnection();

    // Prevent duplicates
    const hits = repoConn.query({
        query:
            "subscription.auth = '" +
            subscription.auth +
            "' AND subscription.key = '" +
            subscription.key +
            "' AND subscription.endpoint = '" +
            subscription.endpoint +
            "'"
    }).hits;
    if (hits && hits.length > 0) {
        return repoHelper.getNode(hits[0].id);
    }

    const node = repoHelper.createNode({
        _parentPath: PUSH_SUBSCRIPTIONS_PATH,
        subscription: subscription
    });

    repoConn.refresh();
    return node;
};

exports.deleteSubscription = function (subscription) {
    const repoConn = repoHelper.getConnection();
    const hits = repoConn.query({
        query:
            "subscription.auth = '" +
            subscription.auth +
            "' AND subscription.key = '" +
            subscription.key +
            "'"
    }).hits;
    if (!hits || hits.length < 1) {
        return 'NOT_FOUND';
    }

    const ids = hits.map(function (hit) {
        return hit.id;
    });

    const result = repoConn.delete(ids);
    repoConn.refresh();

    if (result.length === ids.length) {
        return 'SUCCESS';
    }

    return JSON.stringify(
        ids.filter(function (id) {
            return result.indexOf(id) === -1;
        })
    );
};

exports.loadKeyPair = function () {
    createSubscriptionNode();
    const pushSubNode = repoHelper.getNode(PUSH_SUBSCRIPTIONS_PATH);
    return pushSubNode ? pushSubNode.keyPair : null;
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

exports.deleteAllSubscriptions = function () {
    if (!repoHelper.nodeWithPathExists(PUSH_SUBSCRIPTIONS_PATH)) {
        return;
    }
    const subscriptionNodes = exports.getSubscriptions();
    for (let i = 0; i < subscriptionNodes.hits.length; i++) {
        const node = exports.getSubscriptionById(subscriptionNodes.hits[i].id);
        exports.deleteSubscription(node.subscription);
    }
};
