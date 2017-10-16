var mustacheLib = require('/lib/xp/mustache');
var router = require('/lib/router')();
var helper = require('/lib/helper');
var swController = require('/lib/pwa/sw-controller');
var siteTitle = 'Workbox Starter';

router.get('/', function (req) {
    return {
        body: mustacheLib.render(resolve('main.html'), {
            title: siteTitle,
            appUrl: helper.getAppUrl(),
            baseUrl: helper.getBaseUrl(),
            themeColor: '#FFF',
            isLive: (req.mode == 'live')
        })
    }
});

router.get('/about', function (req) {
    return {
        body: mustacheLib.render(resolve('about.html'), {
            title: siteTitle,
            baseUrl: helper.getBaseUrl()
        })
    }
});

router.get('/contact', function (req) {
    return {
        body: mustacheLib.render(resolve('contact.html'), {
            title: siteTitle,
            baseUrl: helper.getBaseUrl()
        })
    }
});

router.get('/header', function (req) {
    return {
        body: mustacheLib.render(resolve('header.html'), {
            title: siteTitle,
            baseUrl: helper.getBaseUrl()
        })
    }
});

router.get('/sw.js', swController.get);

exports.get = function (req) {
    return router.dispatch(req);
};
