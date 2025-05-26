const portalLib = require('/lib/xp/portal');

exports.get = function () {
    let wsUrl = portalLib.serviceUrl({ service: 'ws', type: 'absolute' });
    const wsProto = wsUrl.indexOf('https:') === 0 ? 'wss' : 'ws';
    wsUrl = wsProto + wsUrl.substring(wsUrl.indexOf(':'));
    const data = {
        wsUrl: wsUrl
    };

    return {
        contentType: 'application/javascript',
        body: 'var syncData = ' + JSON.stringify(data, null, 2) + ';'
    };
};
