var pushLib = require('/lib/push');

exports.post = function (req) {
    log.info(JSON.stringify({push_request:req}, null, 2));

    var response = {
        status: 200,
        'Content-Type': 'application/json',
    };

    try {
        if (req.params.message == '') {
            response.status = 400;
            response.body = {
                message: 'Empty message received - nothing to send',
            };
            log.info(response.body.message);

        } else {

            // TODO: Require some kind of authentication for being allowed to push?

            var succeeded = pushLib.sendPushNotificationToAllSubscribers(req.params.message);
            response.body = {
                success: succeeded,
                message: (succeeded) ? undefined : "No messages were pushed. See the server log.",
            };
        }

    } catch (e) {
        log.error(e);
        response.status = 500;
        response.body = {
            success: false,
            message: "Push failed.",
        };
    }

    log.info(JSON.stringify({push_response:response}, null, 2));

    return response;

};
