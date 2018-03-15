
var thymeleaf = require('/lib/xp/thymeleaf');
var router = require('/lib/router')();
var portalLib = require('/lib/xp/portal');
var swController = require('/lib/pwa/sw-controller');
var siteTitle = 'PWA Starter';

var renderMainPage = function() {
    return renderPage('main');
};

var renderAboutPage = function() {
    return renderPage('about', 'About');
};

var renderContactPage = function() {
    return renderPage('contact', 'Contact');
};

var renderPage = function(pageId, title) {
    return {
        body: thymeleaf.render(resolve('views/page.html'), getParameters(pageId, title))
    };
};

var getParameters = function(pageId, title) {
    return {
        version: app.version,
        appUrl: portalLib.url({path:'/app/' + app.name}),
        pageId: pageId,
        title: title || siteTitle
    };
};

router.get('/', renderMainPage);

router.get('/about', renderAboutPage);

router.get('/contact', renderContactPage);

router.get('/sw.js', swController.renderSW);
router.get('/manifest.json', swController.renderManifest);

exports.get = function (req) {
    return router.dispatch(req);
};
