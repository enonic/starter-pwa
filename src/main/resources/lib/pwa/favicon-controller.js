var portalLib = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');

exports.get = function() {
    var siteConfig = portalLib.getSiteConfig();
    var attachments = contentLib.getAttachments(siteConfig.appIcon);

    var appIcon = attachments[Object.keys(attachments)[0]];
    
    var stream = contentLib.getAttachmentStream({
        key: siteConfig.appIcon,
        name: appIcon.name
    });

    return {
        body: stream,
        contentType: appIcon.mimeType
    };
};
