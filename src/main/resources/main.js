var thymeleaf = require('/lib/xp/thymeleaf');
var router = require('/lib/router')();
var portalLib = require('/lib/xp/portal');
var siteTitle = 'PWA Starter';
var mustache = require('/lib/xp/mustache');
var pushRepo = require('/lib/push/repo');

pushRepo.initialize();

var pushKeys = require('/lib/push/keys');


function getAppUrl() {
    return portalLib.url({path:'/app/' + app.name}) + '/';
}

function renderPage(pageId, title) {
    var model = {
        version: app.version,
        appUrl: getAppUrl(),
        pageId: pageId,
        title: title || siteTitle,
    };

    // Data only needed for the push-notifications page:
    if (pageId === "push") {
        model.pushUrl = portalLib.serviceUrl({service: "push"});
        model.subscribeUrl = portalLib.serviceUrl({service: "subscribe"});
        model.subscriberCountUrl = portalLib.serviceUrl({service: "broadcastsubscribers"});
        model.publicKey = pushKeys.getKeyPair().publicKey;
        var subscriptionsCount = pushRepo.getSubscriptionsCount();
        model.subscriberCount = subscriptionsCount + " subscriber" + (subscriptionsCount === 1 ? "" : "s");
        model.startDisabled = subscriptionsCount === 0;
        model.pageContributions = {
            headEnd:
                '<link rel="stylesheet" type="text/css" href="' + portalLib.assetUrl({path: 'precache/css/pushform.css'}) + '"/>' +
                '<script defer type="text/javascript" src="' + portalLib.assetUrl({path: 'precache/push-bundle.js'}) + '"></script>'
        };
    }

    log.info(JSON.stringify({model:model}, null, 2));

    return {
        body: thymeleaf.render(resolve('templates/page.html'), model),
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
            appVersion: app.version,
            appName: app.name,
            iconUrl: portalLib.assetUrl({path: "/precache/icons/icon.png"}),
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





