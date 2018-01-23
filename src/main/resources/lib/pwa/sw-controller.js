var mustache = require('/lib/xp/mustache');
var view = resolve('sw-template.js');
var helper = require('/lib/helper');

exports.get = function() {
    var appUrl = helper.getAppUrl();
    var baseUrl = helper.getBaseUrl();
    var postfix = '?source=web_app_manifest';
    
    var preCacheRoot;
    if (appUrl === '/') {
        preCacheRoot = '/' + ',\'' + postfix;
    } else if (helper.endsWithSlash(appUrl)) {
        preCacheRoot = baseUrl + '\',\'' + appUrl + '\',\'' + baseUrl + postfix;
    } else {
        preCacheRoot = appUrl + '\',\'' + appUrl + '/' + '\',\'' + appUrl + '/' + postfix;
    }
    
    return {
        headers: {
            'Service-Worker-Allowed': appUrl
        },
        contentType: 'application/javascript',
        body: mustache.render(view, {
            appUrl: appUrl,
            baseUrl: baseUrl,
            preCacheRoot: preCacheRoot,
            appVersion: app.version
        })
    };
};
