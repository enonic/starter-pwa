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
        log.warning('No subscriptions found');
        return false;
    }

    log.info("Subscriptions:");
    for (var i = 0; i < subscriptions.hits.length; i++) {
        var node = repoConn.get(subscriptions.hits[i].id);

        if (node && node.subscription) {
            log.info("\n" + JSON.stringify(node.subscription, null, 2));
            sendPushNotification(keyPair, node.subscription, message);

        } else {
            log.info(JSON.stringify(subscriptions.hits[i], null, 2));
        }
    }
    log.info("\n\nSubscriptions:");

    return true;
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
            log.info('Push notification sent successfully');
        },
        error: function () {
            throw Error("Could not send push notification: '" + message + "'");
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
