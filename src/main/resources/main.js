var thymeleaf = require('/lib/xp/thymeleaf');
var router = require('/lib/router')();
var portalLib = require('/lib/xp/portal');
var siteTitle = 'PWA Starter';
var mustache = require('/lib/xp/mustache');

function getAppUrl() {
    return portalLib.url({path:'/app/' + app.name}) + '/';
}

function renderPage(pageId, title) {
    var model = {
        version: app.version,
        appUrl: getAppUrl(),
        pageId: pageId,
        title: title || siteTitle
    };

    return {
        body: thymeleaf.render(resolve('templates/page.html'), model)
    };
}


function renderSW() {
    var appUrl = getAppUrl();

    return {
        headers: {
            'Service-Worker-Allowed': appUrl
        },
        contentType: 'application/javascript',
        // sw.js will be generated during build by Workbox from webpack.config.js
        body: mustache.render(resolve('/templates/sw.js'), {
            appUrl: appUrl,
            appVersion: app.version
        })
    };
}

function renderManifest() {

    return {
        contentType: 'application/json',
        body: mustache.render(resolve('/templates/manifest.json'), {
            startUrl: getAppUrl() + '?source=web_app_manifest'
        })
    };
}

router.get('/', function() { return renderPage('main'); });
router.get('/offline', function() { return renderPage('offline', 'Offline functionality'); });
router.get('/push', function() { return renderPage('push', 'Push notifications'); });
router.get('/cache-first', function() { return renderPage('cache-first', 'Cache First stragegy'); });
router.get('/background-sync', function() { return renderPage('background-sync', 'Background syncing'); });
router.get('/bluetooth', function() { return renderPage('bluetooth', 'Bluetooth functionality'); });
router.get('/audio', function() { return renderPage('audio', 'Audio capabilities'); });
router.get('/video', function() { return renderPage('video', 'Video capabilities'); });
router.get('/webrtc', function() { return renderPage('webrtc', 'WebRTC functionality'); });
router.get('/sw.js', renderSW);
router.get('/manifest.json', renderManifest);

exports.get = function (req) {
    return router.dispatch(req);
};
