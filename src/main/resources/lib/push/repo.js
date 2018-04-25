/**
 * Wrapper for handling push subscription storage.
 * Common to lib/push.js and main.js.
 */

var repoLib = require('/lib/xp/repo');
var nodeLib = require('/lib/xp/node');
var contextLib = require('/lib/xp/context');



// -------------------------------------------------------------------- Constants

var REPO_NAME = app.name;
var REPO_BRANCH = 'master';
var PUSH_SUBSCRIPTIONS_PATH = '/push';
var REPO_USER = {
    login: 'su',
    userStore: 'system'
};
var REPO_PRINCIPAL = ["role:system.admin"];

var ROOT_PERMISSIONS = [
    {
        "principal": "role:system.everyone",
        "allow": [
            "READ",
            "CREATE",
            "MODIFY",
            "DELETE",
            "PUBLISH",
            "READ_PERMISSIONS",
            "WRITE_PERMISSIONS"
        ],
        "deny": []
    }
];



// -------------------------------------------------------------------- Utility functions

/**
 * Wraps a repo function in a SuperUser context, to allow high-level permission operations.
 * @public
 * @param {Function} func - Nullary function
 */
exports.sudo = function(func) {
    return contextLib.run({
        user: REPO_USER,
        principals: REPO_PRINCIPAL,
    }, func);
};



/**
 * Returns a connection to the repo. Low-level permission, unless part of functions that are wrapped in {@link sudo}.
 * @public
 */
function getRepoConnection() {
    return nodeLib.connect({
        repoId: REPO_NAME,
        branch: REPO_BRANCH,
    });
}





// ------------------------------------------------------------------------- Initialization

/**
 * Initializes the push notification repo: if either don't exist, the repo and/or the subscription node path are created.
 * @public
 */
exports.initialize = function () {
    log.info('Initializing repository...');

    exports.sudo(doInitialize);

    log.info('OK - Repository initialized.');
};

var doInitialize = function () {
    var result = repoLib.get(REPO_NAME);
    if (!result) {
        createRepo();
    }

    if (!repoLib.get(REPO_NAME)) {
        throw Error('Something went wrong when creating (and/or getting) repo:' + REPO_NAME);
    }

    createSubscriptionNode();
};

var createRepo = function () {
    log.info('Creating repository: ' + REPO_NAME);
    repoLib.create({
        id: REPO_NAME,
        rootPermissions: ROOT_PERMISSIONS
    });
    log.info('OK - Repository created.');
};

var createSubscriptionNode = function () {
    var repoConn = getRepoConnection();

    var pushSubscriptionsExist = nodeWithPathExists(repoConn, PUSH_SUBSCRIPTIONS_PATH);

    if (pushSubscriptionsExist) {
        log.info('OK - Node exists: ' + PUSH_SUBSCRIPTIONS_PATH);
        return;
    }

    log.info('Creating node: ' + PUSH_SUBSCRIPTIONS_PATH);
    repoConn.create({
        _name: PUSH_SUBSCRIPTIONS_PATH.slice(1),
        _parentPath: '/',
        _permissions: ROOT_PERMISSIONS
    });
    log.info('OK - Node created.');
};

var nodeWithPathExists = function (repoConnection, path) {
    var result = repoConnection.query({
        start: 0,
        count: 0,
        query: "_path = '" + path + "'"
    });
    return result.total > 0;
};

exports.getSubscriptions = function() {
    return getRepoConnection().findChildren({
        start: 0,
        count: -1,
        parentKey: PUSH_SUBSCRIPTIONS_PATH
    });
};

exports.getSubscriptionsCount = function() {
    var kids = getRepoConnection().findChildren({
        start: 0,
        count: -1,
        parentKey: PUSH_SUBSCRIPTIONS_PATH,
    });
    log.info(JSON.stringify({kids:kids}, null, 2));
    return kids.total;
};

exports.getSubscriptionById = function(id) {
    return getRepoConnection().get(id);
};

exports.storeSubscriptionAndGetNode = function(subscription) {
    var repoConn = getRepoConnection();

    var node = repoConn.create({
        _parentPath: PUSH_SUBSCRIPTIONS_PATH,
        _permissions: ROOT_PERMISSIONS,
        subscription: subscription
    });
    repoConn.refresh();
    return node;

}

exports.deleteSubscription = function(subscription) {
    var repoConn = getRepoConnection();
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
    } else {
        return JSON.stringify(ids.filter(function (id) {
            return result.indexOf(id) === -1;
        }));
    }
};



exports.loadKeyPair = function () {
    var pushSubNode = getRepoConnection().get(PUSH_SUBSCRIPTIONS_PATH);
    return (pushSubNode) ? pushSubNode.keyPair : null;
};


exports.storeKeyPair = function (keyPair) {
    getRepoConnection().modify({
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
