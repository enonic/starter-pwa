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
    
    var todoItem = getItemObj(req.params);
    if (!todoItem) {
        var message = 'Missing/invalid todoItem data in request';
        log.warning(message);
        return {
            status: 400,
            message: message,
        };
    }

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
    var todoItem = getItemObj(req.params);
    if (!todoItem) {
        var message = "Missing/invalid item data in request";
        log.warning(message);
        return { 
            status: 400,
            message: message 
        };
    }

    var result = deleteTodoNode(todoItem);

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

    var todoItem = getItemObj(req.params);
    if (!todoItem) {
        var message = "Missing/invalid item data in request";
        log.warning(message);
        return {
            status: 400,
            message: message
        };
    }

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
    // Get all from repo 
    
    var result = getAllTodoItems();
    //log.info(JSON.stringify(result, null, 4));
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

// The user should get items in the same order as received 
var sortItems = function (items){
    
    items.sort(function (a, b) {
        //log.info(JSON.stringify(a.item.data.id, null, 4));
        return a.item.data.id - b.item.data.id;
    });
    
    return items
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
            return sortItems(result)
        }

    } catch (e) {
        log.error(e);
        return {
            status: 500,
            message: "Couldn't delete node",
        };
    }

}

var getItemObj = function (params) {

    return {
        data: params
    };
};



var createTodoNode = function (todoItem) {
    try {
        var Node = pushRepo.storeBackgroundSyncItemAndGetNode(todoItem);
        if (!Node) {
            log.error("Tried creating Todo node, but something seems wrong: " + JSON.stringify(
                {
                    incoming_subscription: todoItem,
                    resulting_node: Node
                }, null, 2));
            t
            return {
                status: 500,
                message: "Couldn't create Todo node",
            }

        } else {
            return { success: true };
        }

    } catch (e) {
        log.error(e);
        return {
            status: 500,
            message: "Couldn't create Todo node",
        };
    }
};

var deleteTodoNode = function (todoItem) {
    try {
        var result = pushRepo.deleteTodo(todoItem);
        if (result === "NOT_FOUND") {
            return {
                status: 404,
                message: "todoItem not found",
            }

        } else if (result === "SUCCESS") {
            return { success: true };

        } else if (typeof result === 'string') {
            return {
                status: 500,
                message: "Some nodes were not deleted",
                nodeIds: result,
            }

        } 
        else {
            throw Error("Weird result from pushRepo.deleteSubscription:\n" + JSON.stringify({ result: result }, null, 2) + "\n");
        }

    } catch (e) {
        log.error(e);
        return {
            status: 500,
            message: "Couldn't delete node",
        };
    }
};

var changeTodoNode = function (todoItem) {
    try {
        var result = pushRepo.replaceTodo(todoItem);
        return {result : result}; 
        if (result === "NOT_FOUND") {
            return {
                status: 404,
                message: "todoItem not found",
            }

        } else if (result === "SUCCESS") {
            return { success: true };

        } else if (typeof result === 'string') {
            return {
                status: 500,
                message: "Some nodes were not deleted",
                nodeIds: result,
            }

        }
        else {
            throw Error("Weird result from pushRepo.deleteSubscription:\n" + JSON.stringify({ result: result }, null, 2) + "\n");
        }

    } catch (e) {
        log.error(e);
        return {
            status: 500,
            message: "Couldn't delete node",
        };
    }
}

