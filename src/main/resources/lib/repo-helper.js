/**
 * Helper lib for repo operations
 */

var repoLib = require('/lib/xp/repo');
var nodeLib = require('/lib/xp/node');
var contextLib = require('/lib/xp/context');

// -------------------------------------------------------------------- Constants

var REPO_NAME = app.name;
var REPO_BRANCH = 'master';
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
var sudo = function(func) {
    return contextLib.run({
        user: REPO_USER,
        principals: REPO_PRINCIPAL,
    }, func);
};

/**
 * Initializes the repo: if either don't exist, the repo and/or the subscription node path are created.
 * @public
 */
var initRepo = function() {
    var result = repoLib.get(REPO_NAME);
    if (!result) {
        createRepo();
    }

    if (!repoLib.get(REPO_NAME)) {
        throw Error('Something went wrong when creating (and/or getting) repo:' + REPO_NAME);
    }
}

var createRepo = function () {
    // log.info('Creating repository: ' + REPO_NAME);
    repoLib.create({
        id: REPO_NAME,
        rootPermissions: ROOT_PERMISSIONS
    });
};

// ------------------------------------------------------------------------- Exports

exports.initialize = function () {
    sudo(initRepo);
};

/**
 * Returns a connection to the repo. Low-level permission, unless part of functions that are wrapped in {@link sudo}.
 * @public
 */
exports.getConnection = function() {
    sudo(initRepo);
    return nodeLib.connect({
        repoId: REPO_NAME,
        branch: REPO_BRANCH
    });
}

/**
 * Checks if node at specified path already exists and
 * creates it if not 
 */
exports.createNodeWithPath = function (nodePath) {
    // create node if it des not already exist
    var nodeExists = nodeWithPathExists(nodePath);
    if (nodeExists) {
        // Node exists
        return;
    }

    exports.createNode({
        _name: nodePath.slice(1),
        _parentPath: '/'
    });
};

exports.createNode = function(node) {
    var nodeObj = node;

    nodeObj._permissions = nodeObj._permissions || ROOT_PERMISSIONS;
    exports.getConnection().create(node);
}

var nodeWithPathExists = function (path) {
    var result = exports.getConnection().query({
        start: 0,
        count: 0,
        query: "_path = '" + path + "'"
    });
    return result.total > 0;
};

exports.getNodesWithPath = function(nodePath) {
    return exports.getConnection().findChildren({
        start: 0,
        count: -1,
        parentKey: nodePath
    });
};

exports.getNodesWithPathCount = function(nodePath) {
    var children = exports.getConnection().findChildren({
        start: 0,
        count: -1,
        parentKey: nodePath
    });
    return children.total;
};

exports.getNode = function(id) {
    return exports.getConnection().get(id);
};

