/**
 * Lib for handling background sync storage.
 */

var repoHelper = require('/lib/repo-helper');

var BACKGROUND_SYNC_PATH = '/background-sync';

/**
 * Creates a background sync node
 */
var createBackgroundSyncNode = function () {
    repoHelper.createNodeWithPath(BACKGROUND_SYNC_PATH);
};

var findNodeByItemd = function (itemId) {
    var repoConn = repoHelper.getConnection();

    var hits = repoConn.query({
        query:
            "_parentPath = '" +
            BACKGROUND_SYNC_PATH +
            "' AND item.id = " +
            itemId
    }).hits;

    if (!hits || hits.length < 1) {
        return null;
    }

    if (hits.length > 1) {
        throw Error('More than one instance of item ' + itemId + ' found');
    }

    return hits[0].id;
};

exports.getItems = function () {
    return repoHelper.getNodesWithPath(BACKGROUND_SYNC_PATH);
};

exports.getItemById = function (id) {
    return repoHelper.getNode(id);
};

exports.createItem = function (item) {
    createBackgroundSyncNode();

    return repoHelper.createNode({
        _parentPath: BACKGROUND_SYNC_PATH,
        item: item
    });
};

exports.deleteItem = function (itemId) {
    var nodeId = findNodeByItemd(itemId);

    if (!nodeId) {
        return false;
    }

    var repoConn = repoHelper.getConnection();
    var result = repoConn.delete(nodeId);

    repoConn.refresh();

    return result;
};

exports.updateItem = function (item) {
    var nodeId = findNodeByItemd(item.id);

    if (!nodeId) {
        return false;
    }

    var editor = function (node) {
        node.item = item;

        return node;
    };

    var result = repoHelper.modifyNode(nodeId, editor);

    var repoConn = repoHelper.getConnection();
    repoConn.refresh();

    return result;
};

exports.getItems = function (itemId) {
    createBackgroundSyncNode();

    var repoConn = repoHelper.getConnection();
    var query = "_parentPath = '" + BACKGROUND_SYNC_PATH + "'";
    if (itemId) {
        query += 'AND item.id = ' + itemId;
    }

    var hits = repoConn.query({
        count: 1000,
        start: 0,
        query: query
    }).hits;

    if (!hits || hits.length < 1) {
        return null;
    }

    return hits.map(function (hit) {
        var item = repoConn.get(hit.id).item;

        item.synced = true;
        item.changed = false;

        return item;
    });
};
