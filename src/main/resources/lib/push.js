var notifications = require('/lib/notifications');
var repo = require('/lib/repoWrapper');


exports.getKeyPair = function () {
    var keyPair = repo.sudo(function () {
        return loadKeyPair();
    });
    if (!keyPair) {
        keyPair = notifications.generateKeyPair();
        repo.sudo(function () {
            storeKeyPair(keyPair);
        });
    }

    return keyPair;
};


exports.sendPushNotificationToAllSubscribers = function (message) {
    var repoConn = repo.getRepoConnection();

    var keyPair = exports.getKeyPair();
    var subscriptions = repoConn.findChildren({
        start: 0,
        count: -1,
        parentKey: repo.PUSH_SUBSCRIPTIONS_PATH
    });

    if (subscriptions.total === 0) {
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


var loadKeyPair = function () {
    var repoConn = repo.getRepoConnection();

    var pushSubNode = repoConn.get(repo.PUSH_SUBSCRIPTIONS_PATH);

    return (pushSubNode) ? pushSubNode.keyPair : null;
};


var storeKeyPair = function (keyPair) {
    var repoConn = repo.getRepoConnection();

    repoConn.modify({
        key: repo.PUSH_SUBSCRIPTIONS_PATH,
        editor: function (node) {
            node.keyPair = {
                publicKey: keyPair.publicKey,
                privateKey: keyPair.privateKey
            };
            return node;
        }
    });
};
