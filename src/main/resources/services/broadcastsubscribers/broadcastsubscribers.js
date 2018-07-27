var pushRepo = require('/lib/push/repo');
var pushService= require('/services/push/push');

exports.post = function (req) {
    // log.info(JSON.stringify({broadcastsubscription_request:req}, null, 2));
    var response = {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    try {
        var subscriberCount = pushRepo.getSubscriptionsCount();
        pushService.sendPushNotificationToAllSubscribers({subscriberCount:subscriberCount});
        response.body = {success: true, subscriberCount:subscriberCount};

    } catch (e) {
        // log.error(e);
        response.status = 500;
    }

    return response;
};
