var contextLib = require('/lib/xp/context');

exports.sudo = function (func) {
    return contextLib.run({
        user: {
            login: 'su',
            userStore: 'system'
        },
        principals: ["role:system.admin"]
    }, func);
};
