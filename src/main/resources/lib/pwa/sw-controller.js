var portalLib = require('/lib/xp/portal');
var mustache = require('/lib/xp/mustache');
var view = resolve('sw-template.js');

exports.get = function() {
    var appUrl = '/app/com.enonic.starter.workbox'; //TODO portalLib.url('/app/com.enonic.starter.workbox')
    return {
        headers: {
            'Service-Worker-Allowed': appUrl
        },
        contentType: 'application/javascript',
        body: mustache.render(view, {
            appUrl: appUrl
        })
    };
};
