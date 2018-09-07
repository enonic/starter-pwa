var webSocketLib = require('/lib/xp/websocket');
var eventLib = require('/lib/xp/event');

eventLib.listener({
    type: 'node.*',
    localOnly: false,
    callback: function(event) {
        if (isPWARepoNodeEvent(event)) {
            webSocketLib.sendToGroup('sync', 'refresh');
        }
    }
});

function isPWARepoNodeEvent(event) {
    if (!event.data || !event.data.nodes || event.data.nodes.length === 0) {
        return false;
    }

    if (event.data.nodes[0].repo === 'com.enonic.starter.pwa') {
        return true;
    }

    return false;
}

function handleGet(req) {
    if (!req.webSocket) {
        return {
            status: 404
        };
    }
    return {
        webSocket: {
            data: {},
            subProtocols: ['sync_data']
        }
    };
}

function handleEvent(event) {
    if (event.type === 'open') {
        // Send message back to client
        webSocketLib.send(event.session.id, 'connected');

        // Add client into a group
        webSocketLib.addToGroup('sync', event.session.id);
    }

    if (event.type === 'message') {
        // Propegate message to group
        webSocketLib.sendToGroup('sync', event.message);
    }

    if (event.type === 'close') {
        // Remove client from a group
        webSocketLib.removeFromGroup('sync', event.session.id);
    }
}

exports.webSocketEvent = handleEvent;

exports.get = handleGet;
