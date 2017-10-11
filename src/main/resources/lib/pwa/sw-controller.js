var portalLib = require('/lib/xp/portal');
var mustache = require('/lib/xp/mustache');
var view = resolve('sw-template.js');

exports.get = function() {
    var appUrl = portalLib.url({path:'/app/com.enonic.starter.workbox'});
    log.info('appUrl: ' + appUrl);
    log.info('endWithSlash: ' + endWithSlash(appUrl));
    var baseUrl = endWithSlash(appUrl) ? appUrl.substring(0, appUrl.length - 1) : appUrl;
    log.info('baseUrl: ' + baseUrl);
    
    var preCacheRoot;
    if (appUrl === '/') {
        preCacheRoot = '/';
    } else if (endWithSlash(appUrl)) {
        preCacheRoot = baseUrl + '\',\'' + appUrl;
    } else {
        preCacheRoot = appUrl + '\',\'' + appUrl + '/';
    }
    
    return {
        headers: {
            'Service-Worker-Allowed': appUrl
        },
        contentType: 'application/javascript',
        body: mustache.render(view, {
            appUrl: appUrl,
            baseUrl: baseUrl,
            preCacheRoot: preCacheRoot
        })
    };
};

function endWithSlash(url) {
    return url.charAt(url.length - 1) === '/';
}
