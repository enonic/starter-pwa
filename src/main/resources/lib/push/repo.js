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

exports.ROOT_PERMISSIONS = ROOT_PERMISSIONS;
exports.PUSH_SUBSCRIPTIONS_PATH = PUSH_SUBSCRIPTIONS_PATH;



// -------------------------------------------------------------------- Utility functions

/**
 * Wraps a repo function in a SuperUser context, to allow high-level permission operations.
 * @public
 * @param {Function} func - Nullary function
 */
function sudo(func) {
    return contextLib.run({
        user: REPO_USER,
        principals: REPO_PRINCIPAL,
    }, func);
}

/**
 * Returns a connection to the repo. Low-level permission if not part of functions that are wrapped in {@link sudo}.
 * @public
 */
function getRepoConnection() {
    return nodeLib.connect({
        repoId: REPO_NAME,
        branch: REPO_BRANCH,
    });
}

exports.getRepoConnection = getRepoConnection;
exports.sudo = sudo;




// ------------------------------------------------------------------------- Initialization

/**
 * Initializes the push notification repo: if either don't exist, the repo and/or the subscription node path are created.
 * @public
 */
exports.initialize = function () {
    log.info('Initializing repository...');

    sudo(doInitialize);

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


