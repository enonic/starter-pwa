const repo = require('/lib/repo-helper');
const pushHelper = require('/lib/push/repo');

// Initialize repo on application initialization
repo.initialize();

pushHelper.deleteAllSubscriptions();
