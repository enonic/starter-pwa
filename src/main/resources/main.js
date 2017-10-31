var mustacheLib = require('/lib/xp/mustache');
var router = require('/lib/router')();
var helper = require('/lib/helper');
var swController = require('/lib/pwa/sw-controller');
var siteTitle = 'Workbox Starter';

var renderPage = function(pageName) {
    return function() {
        return {
            body: mustacheLib.render(resolve('pages/' + pageName), {
                title: siteTitle,
                baseUrl: helper.getBaseUrl()
            })
        };
    }
};

router.get('/', function (req) {
    return {
        body: mustacheLib.render(resolve('/pages/main.html'), {
            title: siteTitle,
            appUrl: helper.getAppUrl(),
            baseUrl: helper.getBaseUrl(),
            precacheUrl: helper.getBaseUrl() + '/precache',
            themeColor: '#FFF',
            isLive: (req.mode == 'live')
        })
    }
});

router.get('/about', renderPage('about.html'));

router.get('/contact', renderPage('contact.html'));

router.get('/sw.js', swController.get);

exports.get = function (req) {
    return router.dispatch(req);
};
