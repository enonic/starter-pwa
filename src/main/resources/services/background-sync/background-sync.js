/**
 * Server-side service for adding or removing subscriptions.
 * Exposes a POST endpoint at <domain:port>/app/com.enonic.starter.pwa/_/service/com.enonic.starter.pwa/subscribe
 */


var pushRepo = require('/lib/push/repo');


/**
 * Parameters in the request.params object
 * @typedef {Object} SubscriptionParameters
 * @property {string} endpoint - The push notification service endpoint
 * @property {string} auth - Digest of the public key
 * @property {string} key - Identifies the subscription
 * @property {boolean} cancelSubscription - If this is set and truthy, the subscription with that key will be deleted if it exists.
 */

/**
 * Service entry: opens or cancels a subscription for push notifications for the sender client.
 * @public
 * @param {SubscriptionParameters} req - HTTP request object
 *
 * @returns {{body: Object, [status]: number, headers: Object}} HTTP Response object
 */
exports.post = function (req) {
    var todoItem = JSON.parse(req.body); 
    
    if (!todoItem) {
        var message = 'Missing/invalid todoItem data in request';
        log.warning(message);
        return {
            status: 400,
            message: message,
        };
    }

    delete todoItem.synced; // REMOVING VALUES 
    delete todoItem.changed;

    var result = createTodoNode(todoItem);

    if (result.status && Number(result.status) >= 400) {
        return result;
    }

    return {
        body: result,
        headers: {
            'Content-Type': 'application/json',
        },
    };
};

exports.delete = function (req){

    var itemId = req.params.id;
    if (!itemId) {
        var message = "Missing/invalid item data in request";
        log.warning(message);
        return { 
            status: 400,
            message: message 
        };
    }

    var result = deleteTodoNode(itemId);

    if (result.status && Number(result.status) >= 400) {
        return result;
    }

    return { body: result, 
        headers: { 
            "Content-Type": "application/json" 
        } 
    };
}

exports.put = function (req) {

    var todoItem = JSON.parse(req.body);

    if (!todoItem) {
        var message = "Missing/invalid item data in request";
        log.warning(message);
        return {
            status: 400,
            message: message
        };
    }

    delete todoItem.synced; // REMOVING VALUES 
    delete todoItem.changed;

    var result = changeTodoNode(todoItem);

    if (result.status && Number(result.status) >= 400) {
        return result;
    }

    return {
        body: result,
        headers: {
            "Content-Type": "application/json"
        }
    };
}

exports.get = function(req) {
    var itemId = req.params.id;
    // log.info("DATA:" + data)
    var result;
    if (!itemId) {
        // log.info("GET:" + new Date())
        result = getAllTodoItems();
    } else {
        // log.info("GET:" + data + new Date())
        result = getItem(itemId)
    }

    if (result.status && Number(result.status) >= 400) {
        return result;
    }
    return {
        body: {TodoItems : result},
        headers: {
            "Content-Type": "application/json"
        }
    };
}

var getItem = function(id){
    try {
        var result = pushRepo.getTodo(id);
        if (result === "NOT_FOUND") {
            return {
                status: 404,
                message: "todoItem not found",
            }

        } else if (typeof result === 'string') {
            return {
                status: 500,
                message: "Some nodes were not found",
                nodeIds: result,
            }
        } 
        else {
            result[0].item.synced = true;  // SETTING VALUES 
            result[0].item.changed = false; 
            return result
        }

    } catch (e) {
        // log.error(e);
        return {
            status: 500,
            message: "Could not delete node",
        };
    }
}


var getAllTodoItems = function() {
    try {
        var result = pushRepo.getAllTodos();
        if (result === "NOT_FOUND") {
            return {
                status: 404,
                message: "todoItem not found",
            }

        } else if (typeof result === 'string') {
            return {
                status: 500,
                message: "Some nodes were not found",
                nodeIds: result,
            }
        } 
        else {
            for(var i = 0; i < result.length; i++) { // SETTING VALUES 
                result[i].item.synced = true; 
                result[i].item.changed = false; 
            }
            return result.reverse()
        }

    } catch (e) {
        // log.error(e);
        return {
            status: 500,
            message: "Could not delete node",
        };
    }

}



var createTodoNode = function (todoItem) {
    try {
        var Node = pushRepo.storeBackgroundSyncItemAndGetNode(todoItem);
        if (!Node) {
            // log.error("Tried creating Todo node, but something seems wrong: " + JSON.stringify(
                // {
                //     incoming_TodoItem: todoItem,
                //     resulting_node: Node
                // }, null, 2));
            return {
                status: 500,
                message: "Could not create node",
            }

        } else {
            return { success: true };
        }

    } catch (e) {
        // log.error(e);
        return {
            status: 500,
            message: "Couldn't create node",
        };
    }
};

var deleteTodoNode = function (itemId) {
    try {
        
        var result = pushRepo.deleteTodo(itemId);
        
        if (result === "NOT_FOUND") {
            return {
                status: 404,
                message: "todoItem not found",
            }

        }

        if (result === "SUCCESS") {
            return { success: true };

        }

        if (typeof result === 'string') {
            return {
                status: 500,
                message: "Some nodes were not deleted",
                nodeIds: result
            }

        } 

        throw Error("Weird result from pushRepo.deleteSubscription:\n" + JSON.stringify({ result: result }, null, 2) + "\n");

    } catch (e) {
        // log.error(e);
        return {
            status: 500,
            message: "Couldn't delete node",
        };
    }
};

var changeTodoNode = function (todoItem) {
    try {
        var result = pushRepo.replaceTodo(todoItem);

        if (result === "NOT_FOUND") {
            return {
                status: 404,
                message: "todoItem not found",
            }

        }

        if (result === "SUCCESS") {
            return { success: true };

        }

        if (typeof result === 'string') {
            return {
                status: 500,
                message: "Some nodes were not deleted",
                nodeIds: result,
            }

        }

        throw Error("Weird result from pushRepo.deleteSubscription:\n" + JSON.stringify({ result: result }, null, 2) + "\n");

    } catch (e) {
        // log.error(e);
        return {
            status: 500,
            message: "Couldn't delete node",
        };
    }
}

