/**
 * Server-side service for handling background sync.
 * Exposes a POST endpoint at <domain:port>/webapp/<appname>/_/service/<appname>/background-sync
 */


var bsLib = require('/lib/background-sync/repo');

exports.post = function (req) {
    try {
        var item = JSON.parse(req.body);

        if (!item) {
            return {
                status: 400,
                body: 'Missing/invalid data in request'
            };
        }

        // REMOVE VALUES SET ON THE CLIENT-SIDE
        delete item.synced;
        delete item.changed;

        var result = bsLib.createItem(item);

        return {
            body: result,
            headers: {
                'Content-Type': 'application/json',
            }
        }

    } catch (e) {

        return {
            status: 500,
            body: 'Failed to create a node'
        }
    }
};

exports.delete = function (req){
    try {
        var itemId = req.params.id;

        if (!itemId) {
            return {
                status: 400,
                body: 'Missing/invalid data in request'
            };
        }

        var result = bsLib.deleteItem(itemId);
        return {
            status: result ? 200 : 404,
            body: result ? 'OK' : 'Failed to find the item'
        };

    } catch (e) {

        return {
            status: 500,
            body: 'Failed to delete the item'
        }
    }
}

exports.put = function (req) {
    try {
        var item = JSON.parse(req.body);

        if (!item) {
            var message = "Missing/invalid item data in request";
            log.warning(message);
            return {
                status: 400,
                body: message
            };
        }

        delete item.synced;
        delete item.changed;

        var result = bsLib.updateItem(item);

        if (!result) {
            return {
                status: 404,
                body: 'NOT_FOUND'
            }
        }

        return {
            body: result,
            headers: {
                "Content-Type": "application/json"
            }
        };
    } catch (e) {

        return {
            status: 500,
            body: 'Failed to update the item'
        }
    }
}

exports.get = function(req) {
    try {
        var itemId = req.params.id;
        var result = bsLib.getItems(itemId);

        if (itemId && !result) {
            return {
                body: { TodoItems: [] },
                headers: {
                    "Content-Type": "application/json"
                }
            }
        }

        return {
            body: { TodoItems: result || [] },
            headers: {
                "Content-Type": "application/json"
            }
        };
    } catch (e) {
        return {
            status: 500,
            message: JSON.stringify(e),
        };
    }
}
