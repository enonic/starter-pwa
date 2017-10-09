var portalLib = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');

exports.getAppIcon = function() {
    var siteConfig = portalLib.getSiteConfig();
    if (siteConfig.appIcon) {
        return siteConfig.appIcon;
    }

    var result = contentLib.query({
        start: 0,
        count: 1,
        query: "_name = 'app-icon.png'"
    });

    if (result.hits.length == 1) {
        return result.hits[0]._id;
    }
    
    return '';
};

exports.getSquareImageUrl = function(imageId, size, format) {
    var f = format || 'png';
    
    return portalLib.imageUrl({id: imageId, scale: 'square(' + size + ')', format: f});
};

exports.getAssetContentType = function(assetName) {
    if (assetName.endsWith('.js')) {
        return 'application/javascript';
    }

    if (assetName.endsWith('.css')) {
        return 'text/css';
    }

    if (assetName.endsWith('.svg')) {
        return 'image/svg+xml';
    }
    
    if (assetName.endsWith('json')) {
        return 'application/json';
    }

    if (assetName.endsWith('xml')) {
        return 'application/xml';
    }
    
    return '';
};
