var thymeleaf = require('/lib/xp/thymeleaf');
var router = require('/lib/router')();
var helper = require('/lib/helper');
var portalLib = require('/lib/xp/portal');
//var swController = require('/lib/pwa/sw-controller');
var siteTitle = 'PWA Starter';

var renderMainPage = function() {
    return {
        body: thymeleaf.render(resolve('views/page.html'), {
            title: siteTitle,
            pageId: 'main',
            version: app.version,
            appUrl: portalLib.url({path:'/app/' + app.name})
        })
    };
};

var renderPage = function(pageName) {
    return function() {
        return {
            body: mustacheLib.render(resolve('pages/' + pageName), {
                title: siteTitle,
                version: app.version,
                baseUrl: helper.getBaseUrl(),
                precacheUrl: helper.getBaseUrl() + '/precache',
                themeColor: '#FFF',
                styles: mustacheLib.render(resolve('/pages/styles.html')),
                serviceWorker: mustacheLib.render(resolve('/pages/sw.html'), {
                    title: siteTitle,
                    baseUrl: helper.getBaseUrl(),
                    precacheUrl: helper.getBaseUrl() + '/precache',
                    appUrl: helper.getAppUrl()
                })
            })
        };
    }
};

router.get('/', renderMainPage);
/*
router.get('/about', renderPage('about.html'));

router.get('/contact', renderPage('contact.html'));

router.get('/sw.js', swController.get);
*/
exports.get = function (req) {
    return router.dispatch(req);
};
