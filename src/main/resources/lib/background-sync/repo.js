/**
 * Lib for handling background sync storage.
 */

const repoHelper = require('/lib/repo-helper');

const BACKGROUND_SYNC_PATH = '/background-sync';

/**
 * Creates a background sync node
 */
const createBackgroundSyncNode = function () {
    repoHelper.createNodeWithPath(BACKGROUND_SYNC_PATH);
};

const findNodeByItemd = function (itemId) {
    const repoConn = repoHelper.getConnection();

    const hits = repoConn.query({
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
    const nodeId = findNodeByItemd(itemId);

    if (!nodeId) {
        return false;
    }

    const repoConn = repoHelper.getConnection();
    const result = repoConn.delete(nodeId);

    repoConn.refresh();

    return result;
};

exports.updateItem = function (item) {
    const nodeId = findNodeByItemd(item.id);

    if (!nodeId) {
        return false;
    }

    const editor = function (node) {
        node.item = item;

        return node;
    };

    const result = repoHelper.modifyNode(nodeId, editor);

    const repoConn = repoHelper.getConnection();
    repoConn.refresh();

    return result;
};

exports.getItems = function (itemId) {
    createBackgroundSyncNode();

    const repoConn = repoHelper.getConnection();
    let query = "_parentPath = '" + BACKGROUND_SYNC_PATH + "'";
    if (itemId) {
        query += 'AND item.id = ' + itemId;
    }

    const hits = repoConn.query({
        count: 1000,
        start: 0,
        query: query
    }).hits;

    if (!hits || hits.length < 1) {
        return null;
    }

    return hits.map(function (hit) {
        const item = repoConn.get(hit.id).item;

        item.synced = true;
        item.changed = false;

        return item;
    });
};
