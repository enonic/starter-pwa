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
var BACKGROUND_SYNC_PATH = '/background-sync'; 
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
    // log.info('Initializing repository...');
    exports.sudo(doInitialize);
};

var doInitialize = function () {
    var result = repoLib.get(REPO_NAME);
    if (!result) {
        createRepo();
    }

    if (!repoLib.get(REPO_NAME)) {
        throw Error('Something went wrong when creating (and/or getting) repo:' + REPO_NAME);
    }
};

var createRepo = function () {
    // log.info('Creating repository: ' + REPO_NAME);
    repoLib.create({
        id: REPO_NAME,
        rootPermissions: ROOT_PERMISSIONS
    });
};

/**
 * Checks if repo already exists and 
 * creates it if not 
 */
var createSubscriptionNode = function () {
    // create node if it des not already exist
    var repoConn = getRepoConnection();
    var pushSubscriptionsExist = nodeWithPathExists(repoConn, PUSH_SUBSCRIPTIONS_PATH);
    if (pushSubscriptionsExist) {
        // Node exists
        return;
    }

    repoConn.create({
        _name: PUSH_SUBSCRIPTIONS_PATH.slice(1),
        _parentPath: '/',
        _permissions: ROOT_PERMISSIONS
    });
};

/**
 * Checks if repo already exists and 
 * creates it if not 
 */
var createBackgroundSyncNode = function() {
    // create node if it des not already exist
    var repoConn = getRepoConnection();
    var backgroundSyncExist = nodeWithPathExists(repoConn, BACKGROUND_SYNC_PATH);
    if (backgroundSyncExist) {
        return;
    }

    repoConn.create({
        _name: BACKGROUND_SYNC_PATH.slice(1),
        _parentPath: '/',
        _permissions: ROOT_PERMISSIONS
    });
}

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
    return kids.total;
};

exports.getSubscriptionById = function(id) {
    return getRepoConnection().get(id);
};

exports.storeSubscriptionAndGetNode = function(subscription) {
    createSubscriptionNode(); 
    var repoConn = getRepoConnection();

    // Prevent duplicates
    var hits = repoConn.query({
        query: "subscription.auth = '" + subscription.auth + "' AND subscription.key = '" + subscription.key + "' AND subscription.endpoint = '" + subscription.endpoint + "'",
    }).hits;
    if (hits && hits.length > 0) {
        return repoConn.get(hits[0].id);
    }

    var node = repoConn.create({
        _parentPath: PUSH_SUBSCRIPTIONS_PATH,
        _permissions: ROOT_PERMISSIONS,
        subscription: subscription
    });
    repoConn.refresh();
    return node;
};

exports.storeBackgroundSyncItemAndGetNode = function (item) {
    createBackgroundSyncNode(); 
    var repoConn = getRepoConnection();

    var node = repoConn.create({
        _parentPath: BACKGROUND_SYNC_PATH,
        _permissions: ROOT_PERMISSIONS,
        item: item
    })

    repoConn.refresh();
    return node;
};

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

exports.deleteTodo = function (itemId) {
    // log.info("DELETE:" + new Date() + JSON.stringify(item, null, 4))
    var repoConn = getRepoConnection();
    
    var hits = repoConn.query({
        query: "item.id = " + itemId
    }).hits;
    if (!hits || hits.length < 1) {
        return "NOT_FOUND";
    }
    var repoConn = getRepoConnection();
    hits.map(function(hit) {
        return repoConn.delete(hit.id)
    });
    
    repoConn.refresh();
    return "SUCCESS";
    
};



exports.replaceTodo = function (item) {
    // log.info("PUT:" + new Date() + JSON.stringify(item, null, 4))
    
    var repoConn = getRepoConnection();
    var hits = repoConn.query({
        query:
            "item.id =" + item.id
    }).hits;
    
    if (!hits || hits.length < 1) {
        return "NOT_FOUND";
    }

    var ids = hits.map(function (hit) {
        return hit.id;
    });

    var editor = function(node) {
        node.item.text = item.text;
        node.item.completed = item.completed;
        // node.item.changed = false 
        return node; 
    }
    
    var result = repoConn.modify({
        key: ids[0], 
        editor : editor
    });
    repoConn.refresh();
    
    if (result) {
        return "SUCCESS";
    } else {
        return JSON.stringify(ids.filter(function (id) {
            return result.indexOf(id) === -1;
        }));
    }
};


exports.loadKeyPair = function () {
    createSubscriptionNode(); 
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



exports.getTodo = function(id) {
    createBackgroundSyncNode(); 
    var repoConn = getRepoConnection();
    var hits = repoConn.query({
        query: "item.id = " + id 
    }).hits;

    if (!hits || hits.length < 1) {
        return "NOT_FOUND";
    }

    var todoItems = hits.map(function(hit) {
        return repoConn.get(hit.id);
    });
    if (todoItems) {
        return todoItems ;
    } else {
        return "NOT_FOUND";
    }

}


exports.getAllTodos = function() {
    createBackgroundSyncNode(); 
    var repoConn = getRepoConnection();
    var hits = repoConn.query({
        count: 1000,
        start: 0,
        query: "item.type = 'TodoItem'"
    }).hits;
    if (!hits/*  || hits.length < 1 */) {
        return "NOT_FOUND";
    }
     /**
     * The query does not fetch items inline with order they were added.
     */
    var todoItems = hits.map(function(hit) {
        return repoConn.get(hit.id);
    });

    todoItems.sort(function(a,b){return a.item.id - b.item.id})

    if (todoItems) {
        return todoItems ;
    } else {
        return "NOT_FOUND";
    }

}