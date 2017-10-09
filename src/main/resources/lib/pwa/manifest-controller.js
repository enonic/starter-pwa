// Replace placeholders in assets/precache/manifest.json with actual values
// if you don't want them to be generated dynamically from site config

var portalLib = require('/lib/xp/portal');
var mustache = require('/lib/xp/mustache');
var helper = require('/lib/helper');

exports.get = function(req) {
    var pathArr = req.path.split('/');
    var fileName = '/assets/precache/' + pathArr[pathArr.length-1];
    var sitePath = portalLib.getSite()._path;
    var siteUrl = portalLib.pageUrl({path: sitePath});
    var siteConfig = portalLib.getSiteConfig();
    var site = portalLib.getSite();
    var appIcon = helper.getAppIcon();

    var params = {
        name: siteConfig.appName || site.displayName,
        shortName: siteConfig.appShortName || siteConfig.appName || site.displayName,
        description: siteConfig.appDescription || '',
        themeColor: siteConfig.appThemeColor || '#FFF',
        backgroundColor: siteConfig.appBgColor || '#FFF',
        display: siteConfig.appDisplay || 'standalone',
        siteUrl: (siteUrl == '/') ? '/' : siteUrl + '/'
    };

    if (appIcon) {
        params.hasAppIcon = true;
        params.icons = {
            png_150: helper.getSquareImageUrl(appIcon, 150),
            png_192: helper.getSquareImageUrl(appIcon, 192),
            png_512: helper.getSquareImageUrl(appIcon, 512)
        };
    }
    
    var res = mustache.render(resolve(fileName), params);

    return {
        body: res,
        contentType: helper.getAssetContentType(fileName)
    };
};
