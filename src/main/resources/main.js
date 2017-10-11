var mustacheLib = require('/lib/xp/mustache');
var portalLib = require('/lib/xp/portal');
var router = require('/lib/router')();

var swController = require('/lib/pwa/sw-controller');

var view = resolve('main.html');

router.get('/', function (req) {
    var appUrl = portalLib.url({path:'/app/com.enonic.starter.workbox'});
    var baseUrl = endWithSlash(appUrl) ? appUrl.substring(0, appUrl.length - 1) : appUrl;
    return {
        body: mustacheLib.render(view, {
            title: 'Worbox starter kit',
            appUrl: appUrl,
            baseUrl: baseUrl,
            themeColor: '#FFF'
        })
    }
});

router.get('/sw.js', swController.get);

exports.get = function (req) {
    return router.dispatch(req);
};

function endWithSlash(url) {
    return url.charAt(url.length - 1) === '/';
}