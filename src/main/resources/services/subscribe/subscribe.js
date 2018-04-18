var repo = require('/lib/repoWrapper');

var AUTH = 'auth';
var ENDPOINT = 'endpoint';
var KEY = 'key';

exports.post = function (req) {
    var subscription = getSubscriptionObj(req.params);

    if (!subscription) {
        log.info('No subscription data in request');
        return;
    }

    repo.sudo(function(){ createSubscriptionNode(subscription); });
};

var getSubscriptionObj = function(params) {
    if (!params[AUTH] || !params[ENDPOINT] || !params[KEY]) {
        log.error("Invalid subscription object parameters");
        return null;
    }

    return {
        auth: params[AUTH],
        endpoint: params[ENDPOINT],
        key: params[KEY]
    };
};

var createSubscriptionNode = function (subscription) {
    var repoConn = repo.getRepoConnection();

    repoConn.create({
        _parentPath: repo.PUSH_SUBSCRIPTIONS_PATH,
        _permissions: repo.ROOT_PERMISSIONS,
        subscription: subscription
    });
};
