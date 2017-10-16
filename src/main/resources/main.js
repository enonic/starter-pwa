var mustacheLib = require('/lib/xp/mustache');
var router = require('/lib/router')();
var helper = require('/lib/helper');
var swController = require('/lib/pwa/sw-controller');

var view = resolve('main.html');

router.get('/', function (req) {
    return {
        body: mustacheLib.render(view, {
            title: 'Workbox starter kit',
            appUrl: helper.getAppUrl(),
            baseUrl: helper.getBaseUrl(),
            themeColor: '#FFF',
            isLive: (req.mode == 'live')
        })
    }
});

router.get('/sw.js', swController.get);

exports.get = function (req) {
    return router.dispatch(req);
};
