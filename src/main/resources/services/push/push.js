var pushLib = require('/lib/push');

exports.post = function (req) {
    if (req.params.message == '') {
        log.info('Empty message received - nothing to send')
        return;
    }

    pushLib.sendPushNotificationToAllSubscribers(req.params.message);
};
