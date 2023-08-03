var portalLib = require('/lib/xp/portal');

exports.get = function () {
    var wsUrl = portalLib.serviceUrl({ service: 'ws', type: 'absolute' });
    var wsProto = wsUrl.indexOf('https:') === 0 ? 'wss' : 'ws';
    wsUrl = wsProto + wsUrl.substring(wsUrl.indexOf(':'));
    var data = {
        wsUrl: wsUrl
    };

    return {
        contentType: 'application/javascript',
        body: 'var syncData = ' + JSON.stringify(data, null, 2) + ';'
    };
};
