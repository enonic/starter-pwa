const pushRepo = require('/lib/push/repo');
const pushService = require('/services/push/push');

exports.post = function () {
    // log.info(JSON.stringify({broadcastsubscription_request:req}, null, 2));
    const response = {
        status: 200,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    try {
        const subscriberCount = pushRepo.getSubscriptionsCount();
        pushService.sendPushNotificationToAllSubscribers({
            subscriberCount: subscriberCount
        });
        response.body = { success: true, subscriberCount: subscriberCount };
        // eslint-disable-next-line no-unused-vars
    } catch (e) {
        // log.error(e);
        response.status = 500;
    }

    return response;
};
