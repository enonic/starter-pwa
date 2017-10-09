var portalLib = require('/lib/xp/portal');
var parentPath = './';
var view = resolve(parentPath + 'main.page.html');
var mustacheLib = require('/lib/xp/mustache');
var helper = require('/lib/helper');

function handleGet(req) {
    var site = portalLib.getSite();
    var siteConfig = portalLib.getSiteConfig();
    var appIcon = helper.getAppIcon();

    var baseUrl = portalLib.pageUrl({
        path: site._path
    });

    var params = {
        siteName: site.displayName,
        isLive: (req.mode == 'live'),
        appVersion: app.version,
        assetUrl: portalLib.assetUrl(''),
        siteUrl: (baseUrl === '/') ? '' : baseUrl,
        baseUrl: baseUrl,
        themeColor: siteConfig.appThemeColor || '#FFF'
    };

    if (appIcon) {
        params.hasAppIcon = true;
        params.icons = {
            png_16: helper.getSquareImageUrl(appIcon, 16),
            png_32: helper.getSquareImageUrl(appIcon, 32),
            png_180: helper.getSquareImageUrl(appIcon, 180)
        };
    }

    var body = mustacheLib.render(view, params);

    return {
        contentType: 'text/html',
        body: body
    };
}

exports.get = handleGet;


