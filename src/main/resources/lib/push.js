var nodeLib = require('/lib/xp/node');
var contextLib = require('/lib/xp/context');
var notifications = require('/lib/notifications');

var REPO_NAME = 'statnett';
var PUSH_SUBSCRIPTIONS_PATH = '/push-subscriptions';

exports.getKeyPair = function () {

    var keyPair = sudo(function () {
        return loadKeyPair();
    });
    if (!keyPair) {
        keyPair = notifications.generateKeyPair();
        sudo(function () {
            storeKeyPair(keyPair);
        });
    }

    return keyPair;
};

exports.sendPushNotificationToAllSubscribers = function (message) {
    var repoConn = nodeLib.connect({
        repoId: REPO_NAME,
        branch: 'master'
    });

    var keyPair = exports.getKeyPair();
    var subscriptions = repoConn.findChildren({
        start: 0,
        count: -1,
        parentKey: PUSH_SUBSCRIPTIONS_PATH
    });

    if (subscriptions.total == 0) {
        log.info('No subscriptions found');
        return;
    }

    for (var i = 0; i < subscriptions.hits.length; i++) {
        var node = repoConn.get(subscriptions.hits[i].id);


        if (node && node.subscription) {
            sendPushNotification(keyPair, node.subscription, message);
        }
        else {
            log.info(JSON.stringify(subscriptions.hits[i], null, 2));
        }
    }
};

var sendPushNotification = function (keyPair, subscription, message) {
    notifications.sendAsync({
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        endpoint: subscription.endpoint,
        auth: subscription.auth,
        receiverKey: subscription.key,
        payload: {
            text: message
        },
        success: function () {
            log.info(prefix + 'Push notification sent successfully');
        },
        error: function () {
            log.warning(prefix + 'Could not send push notification');
        }
    });
};


var sudo = function (func) {
    return contextLib.run({
        user: {
            login: 'su',
            userStore: 'system'
        },
        principals: ["role:system.admin"]
    }, func);
};

var loadKeyPair = function () {
    var repoConn = nodeLib.connect({
        repoId: REPO_NAME,
        branch: 'master'
    });
    var pushSubNode = repoConn.get(PUSH_SUBSCRIPTIONS_PATH);
    if (pushSubNode) {
        return pushSubNode.keyPair;
    }

    return null;
};

var storeKeyPair = function (keyPair) {
    var repoConn = nodeLib.connect({
        repoId: REPO_NAME,
        branch: 'master'
    });
    repoConn.modify({
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