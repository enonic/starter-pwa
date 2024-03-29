const thymeleaf = require('/lib/thymeleaf');
const router = require('/lib/router')();
const portalLib = require('/lib/xp/portal');
const mustache = require('/lib/mustache');
const pushRepo = require('/lib/push/repo');

const siteTitle = 'PWA Starter';
const localStorageName = 'Todolist';
const pushKeys = require('/lib/push/keys');

function getAppUrl() {
    return portalLib.url({ path: '/webapp/' + app.name }) + '/';
}

function renderPage(pageId, title) {
    const model = {
        version: app.version,
        appUrl: getAppUrl(),
        pageId: pageId,
        title: title || siteTitle,
        appName: siteTitle,
        syncServiceUrl: portalLib.serviceUrl({ service: 'background-sync' }),
        localStorageName: localStorageName
    };

    // Data only needed for the push-notifications page:
    if (pageId === 'push') {
        model.pushUrl = portalLib.serviceUrl({ service: 'push' });
        model.subscribeUrl = portalLib.serviceUrl({ service: 'subscribe' });
        model.subscriberCountUrl = portalLib.serviceUrl({
            service: 'broadcastsubscribers'
        });
        model.publicKey = pushKeys.getKeyPair().publicKey;
        const subscriptionsCount = pushRepo.getSubscriptionsCount();
        model.subscriberCount =
            subscriptionsCount +
            ' subscriber' +
            (subscriptionsCount === 1 ? '' : 's');
        model.startDisabled = subscriptionsCount === 0;
        model.pageContributions = {
            headEnd:
                '<link rel="stylesheet" type="text/css" href="' +
                portalLib.assetUrl({ path: 'bundles/css/push.css' }) +
                '"/>' +
                '<script type="text/javascript" src="' +
                portalLib.assetUrl({ path: 'bundles/js/push.js' }) +
                '"></script>'
        };
    }
    // Data only needed for the background-sync page:
    if (pageId === 'background-sync') {
        model.pushUrl = portalLib.serviceUrl({ service: 'background-sync' });
        model.pageContributions = {
            headEnd:
                '<link rel="stylesheet" type="text/css" href="' +
                portalLib.assetUrl({ path: 'bundles/css/bs.css' }) +
                '"/>' +
                '<script type="text/javascript" src="' +
                portalLib.serviceUrl({ service: 'init' }) +
                '"></script>' +
                '<script type="text/javascript" src="' +
                portalLib.assetUrl({ path: 'bundles/js/bs.js' }) +
                '"></script>'
        };
    }

    return {
        body: thymeleaf.render(resolve('/templates/page.html'), model)
    };
}

function renderSW() {
    const appUrl = getAppUrl();

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
            appTitle: siteTitle,
            iconUrl: portalLib.assetUrl({ path: 'images/icons/icon.png' }),
            serviceUrl: portalLib.serviceUrl({ service: '' }),
            syncServiceUrl: portalLib.serviceUrl({
                service: 'background-sync'
            }),
            localStorageName: localStorageName
        })
    };
}

function renderManifest() {
    return {
        contentType: 'application/json',
        body: mustache.render(resolve('/templates/manifest.json'), {
            startUrl: getAppUrl() + '?source=web_app_manifest',
            iconPath: portalLib.assetUrl({ path: 'images/icons/icon.png' })
        })
    };
}

function renderBrowserConfig() {
    return {
        contentType: 'application/xml',
        body: mustache.render(resolve('/templates/browserconfig.xml'), {
            iconPath: portalLib.assetUrl({ path: 'images/icons/icon.png' })
        })
    };
}

router.get('/', function () {
    return renderPage('main');
});
router.get('/offline', function () {
    return renderPage('offline', 'Offline functionality');
});
router.get('/push', function () {
    return renderPage('push', 'Push notifications');
});
router.get('/cache-first', function () {
    return renderPage('cache-first', 'Cache First stragegy');
});
router.get('/background-sync', function () {
    return renderPage('background-sync', 'Background syncing');
});
router.get('/bluetooth', function () {
    return renderPage('bluetooth', 'Bluetooth functionality');
});
router.get('/audio', function () {
    return renderPage('audio', 'Audio capabilities');
});
router.get('/video', function () {
    return renderPage('video', 'Video capabilities');
});
router.get('/webrtc', function () {
    return renderPage('webrtc', 'WebRTC functionality');
});
router.get('/sw.js', renderSW);
router.get('/manifest.json', renderManifest);
router.get('/browserconfig.xml', renderBrowserConfig);

exports.get = function (req) {
    return router.dispatch(req);
};
