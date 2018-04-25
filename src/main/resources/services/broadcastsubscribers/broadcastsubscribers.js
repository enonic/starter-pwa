var pushRepo = require('/lib/push/repo');
var pushService= require('/services/push/push');

exports.post = function () {
    log.info("broadcastsubscribers");
    var response = {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    try {
        var subscriberCount = pushRepo.getSubscriptionsCount();
        log.info("Notifying subscriber(s): there are now " + subscriberCount + " subscriber(s)");
        pushService.sendPushNotificationToAllSubscribers({subscriberCount:subscriberCount});
        response.body = {success: true, subscriberCount:subscriberCount};

    } catch (e) {
        log.error(e);
        response.status = 500;
    }

    return response;
};
