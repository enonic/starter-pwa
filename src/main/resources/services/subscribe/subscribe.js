var nodeLib = require('/lib/xp/node');
var repoLib = require('/lib/xp/repo');
var util = require('/lib/util');
var init = require('/lib/init');

var REPO_NAME = init.REPO_NAME;
var PUSH_SUBSCRIPTIONS_PATH = init.PUSH_SUBSCRIPTIONS_PATH;
var ROOT_PERMISSIONS = init.ROOT_PERMISSIONS;

var subscription;

exports.post = function (req) {
    subscription = getSubscriptionObj(req.params);

    if (!subscription) {
        log.info('No subscription data in request');
        return;
    }

    util.sudo(createSubscriptionNode);
};

var getSubscriptionObj = function(params) {
    if (!params['auth'] || !params['endpoint'] || !params['key']) {
        return null;
    }

    return {
        auth: params['auth'],
        endpoint: params['endpoint'],
        key: params['key']
    };
};

var uuidv4 = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

var createSubscriptionNode = function () {

    if (!repoLib.get(REPO_NAME)) {
        log.info('Repo does not exist');

        return;
    }

    var repoConn = nodeLib.connect({
        repoId: REPO_NAME,
        branch: 'master'
    });

    repoConn.create({
        _parentPath: PUSH_SUBSCRIPTIONS_PATH,
        _permissions: ROOT_PERMISSIONS,
        subscription: subscription
    });
};
