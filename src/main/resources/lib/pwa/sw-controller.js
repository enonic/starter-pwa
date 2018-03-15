var mustache = require('/lib/xp/mustache');
var helper = require('/lib/helper');
var postfix = '?source=web_app_manifest';

exports.renderSW = function() {
    var appUrl = helper.getAppUrl();
    var baseUrl = helper.getBaseUrl();

    var preCacheRoot;
    if (appUrl === '/') {
        preCacheRoot = '/' + ',\'' + postfix;
    } else if (helper.endsWithSlash(appUrl)) {
        preCacheRoot = baseUrl + '\',\'' + appUrl + '\',\'' + baseUrl + postfix;
    } else {
        preCacheRoot = appUrl + '\',\'' + appUrl + '/' + '\',\'' + appUrl + postfix;
    }
    
    return {
        headers: {
            'Service-Worker-Allowed': appUrl
        },
        contentType: 'application/javascript',
        body: mustache.render(resolve('sw-template.js'), {
            appUrl: appUrl,
            baseUrl: baseUrl,
            preCacheRoot: preCacheRoot,
            appVersion: app.version
        })
    };
};

exports.renderManifest = function() {
    var baseUrl = helper.getBaseUrl();

    return {
        contentType: 'application/json',
        body: mustache.render(resolve('/assets/precache/manifest.json'), {
            appUrl: baseUrl + postfix
        })
    };
};
