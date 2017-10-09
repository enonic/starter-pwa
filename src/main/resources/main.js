var mustacheLib = require('/lib/xp/mustache');
var router = require('/lib/router')();

var view = resolve('main.html');

router.get('/', function (req) {
    return {
        body: mustacheLib.render(view, {
            title: 'Worbox starter kitbis',
            appUrl: '/app/com.enonic.starter.workbox', //TODO portalLib.url('/app/com.enonic.starter.workbox'),
            themeColor: '#FFF'
        })
    }
});

exports.get = function (req) {
    return router.dispatch(req);
}