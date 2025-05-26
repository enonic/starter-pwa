/**
 * Helper lib for repo operations
 */

const repoLib = require('/lib/xp/repo');
const nodeLib = require('/lib/xp/node');
const contextLib = require('/lib/xp/context');

// -------------------------------------------------------------------- Constants

const REPO_NAME = app.name;
const REPO_BRANCH = 'master';
const REPO_USER = {
    login: 'su',
    idProvider: 'system'
};
const REPO_PRINCIPAL = ['role:system.admin'];

const ROOT_PERMISSIONS = [
    {
        principal: 'role:system.everyone',
        allow: [
            'READ',
            'CREATE',
            'MODIFY',
            'DELETE',
            'PUBLISH',
            'READ_PERMISSIONS',
            'WRITE_PERMISSIONS'
        ],
        deny: []
    }
];

// -------------------------------------------------------------------- Utility functions

/**
 * Wraps a repo function in a SuperUser context, to allow high-level permission operations.
 * @public
 * @param {Function} func - Nullary function
 */
const sudo = function (func) {
    return contextLib.run(
        {
            user: REPO_USER,
            principals: REPO_PRINCIPAL
        },
        func
    );
};

const createRepo = function () {
    // log.info('Creating repository: ' + REPO_NAME);
    repoLib.create({
        id: REPO_NAME,
        rootPermissions: ROOT_PERMISSIONS
    });
};

/**
 * Initializes the repo: if either don't exist, the repo and/or the subscription node path are created.
 * @public
 */
const initRepo = function () {
    const result = repoLib.get(REPO_NAME);
    if (!result) {
        createRepo();
    }

    if (!repoLib.get(REPO_NAME)) {
        throw Error(
            'Something went wrong when creating (and/or getting) repo:' +
                REPO_NAME
        );
    }
};

// ------------------------------------------------------------------------- Exports

exports.sudo = sudo;

exports.modifyNode = function (key, editor) {
    const repoConn = exports.getConnection();
    return repoConn.modify({
        key: key,
        editor: editor
    });
};

exports.initialize = function () {
    sudo(initRepo);
};

/**
 * Returns a connection to the repo. Low-level permission, unless part of functions that are wrapped in {@link sudo}.
 * @public
 */
exports.getConnection = function () {
    sudo(initRepo);
    return nodeLib.connect({
        repoId: REPO_NAME,
        branch: REPO_BRANCH
    });
};

/**
 * Checks if node at specified path already exists and
 * creates it if not
 */
exports.createNodeWithPath = function (nodePath) {
    // create node if it des not already exist
    const nodeExists = exports.nodeWithPathExists(nodePath);
    if (nodeExists) {
        // Node exists
        return;
    }

    exports.createNode({
        _name: nodePath.slice(1),
        _parentPath: '/'
    });
};

exports.createNode = function (nodeData) {
    const nodeObj = nodeData;

    nodeObj._permissions = nodeObj._permissions || ROOT_PERMISSIONS;
    const conn = exports.getConnection();
    const node = conn.create(nodeData);
    conn.refresh();

    return node;
};

exports.nodeWithPathExists = function (path) {
    const result = exports.getConnection().query({
        start: 0,
        count: 0,
        query: "_path = '" + path + "'"
    });
    return result.total > 0;
};

exports.getNodesWithPath = function (nodePath) {
    return exports.getConnection().findChildren({
        start: 0,
        count: -1,
        parentKey: nodePath
    });
};

exports.getNodesWithPathCount = function (nodePath) {
    const children = exports.getConnection().findChildren({
        start: 0,
        count: -1,
        parentKey: nodePath
    });
    return children.total;
};

exports.getNode = function (id) {
    return exports.getConnection().get(id);
};
