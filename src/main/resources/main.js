var repo = require('/lib/repo-helper');
var pushHelper = require('/lib/push/repo');

// Initialize repo on application initialization
repo.initialize();

pushHelper.deleteAllSubscriptions();
