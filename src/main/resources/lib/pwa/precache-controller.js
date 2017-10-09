var mustache = require('/lib/xp/mustache');
var helper = require('/lib/helper');

var getAssetPath = function(path) {
    return path.replace(path.substr(0, path.indexOf('precache')), '');
};

exports.get = function(req) {
    var fileName = '/assets/' + getAssetPath(req.path);
    
    return {
        body: mustache.render(resolve(fileName), {}),
        contentType: helper.getAssetContentType(fileName)
    };
};
