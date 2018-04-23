var notifications = require('/lib/notifications');
var repo = require('/lib/repoWrapper');


// --------------------------------------------------------------------------------  Initialization: key setup


/**
 * A fixed pair of authentication keys
 * @typedef {Object} Keypair
 * @property {string} publicKey - Key to be shared with clients, identifies the service and allows subscription
 * @property {string} privateKey - Secret key that corresponds to the public one and allows the service to push notifications. DO NOT
 * SHARE THE PRIVATE KEY, don't even write it in the code. In this demo, it's simply stored in the repo.
 */

/**
 * Returns an authentication keypair for the push-notifications service, either fetched from the repo, or generated and stored if no
 * existing keys were found.
 * @public
 * @returns {Keypair}
 */
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


