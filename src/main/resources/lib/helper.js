var portalLib = require('/lib/xp/portal');

exports.getAppUrl = function getAppUrl() {
    return portalLib.url({path:'/app/' + app.name});
};

exports.getBaseUrl = function() {
    var appUrl = this.getAppUrl();
    var baseUrl = this.endsWithSlash(appUrl) ? appUrl.slice(0, -1) : appUrl;
    
    return baseUrl;
};

exports.endsWithSlash = function(url) {
    return url.slice(-1) === '/';
};
