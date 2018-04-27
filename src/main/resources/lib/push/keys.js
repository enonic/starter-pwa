/**
 * Server-side authentication key handling.
 * Common to lib/push.js and main.js.
 */

var notifications = require('/lib/notifications');
var pushRepo = require('/lib/push/repo');


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
    var keyPair = pushRepo.sudo(function () {
        return pushRepo.loadKeyPair();
    });
    if (!keyPair) {
        keyPair = notifications.generateKeyPair();
        pushRepo.sudo(function () {
            pushRepo.storeKeyPair(keyPair);
        });
    }

    return keyPair;
};
