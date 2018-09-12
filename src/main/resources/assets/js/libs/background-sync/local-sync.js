/**
 * Background sync local. No service worker
 */

import storage from './storage';
import { updateUI } from '../../bs';

const SyncHelper = require('./sync-helper');
const syncServiceUrl = SyncHelper.getSyncServiceUrl();

const ToasterInstance = require('../toaster').default;
let firstTimeOnline = false;
window.addEventListener('online', () => {
    if (navigator.onLine) {
        firstTimeOnline = true;
    }
});

function getItemsFromDB() {
    return Promise.all([
        // fetching items from indexDB
        storage.get.offline(
            SyncHelper.storeNames.deleted,
            nodes => (nodes ? nodes.map(node => node.value) : [])
        ),
        storage.get.offline(
            SyncHelper.storeNames.offline,
            nodes => (nodes ? nodes.map(node => node.value) : [])
        )
    ]);
}

function isElementInRepo(id) {
    return storage.get.online(syncServiceUrl, id).then(response => {
        return response.status < 404;
    });
}

// resolving offline changes on online repository
function resolveChanges(db) {
    return Promise.all(
        db.map(item => {
            if (!item.synced && firstTimeOnline) {
                ToasterInstance().then(toaster =>
                    toaster.toast('Offline changes are synced.')
                );
            }

            if (!item.synced && item.changed) {
                return isElementInRepo(item.id).then(
                    status =>
                        status
                            ? storage.replace.online(syncServiceUrl, item)
                            : storage.add.online(syncServiceUrl, item)
                );
            }
            if (!item.synced) {
                return storage.add.online(syncServiceUrl, item);
            }
            return null; // linter consistent return
        })
    );
}

let syncInProgress = false;
let needSync = false;

const sync = function() {
    if (syncInProgress) {
        needSync = true;
        return;
    }

    syncInProgress = true;
    // read db, dbRemove and repo
    getItemsFromDB().then(values => {
        // delete in repo all from db-delete
        SyncHelper.removeItemsFromRepo(values[0], syncServiceUrl).then(() => {
            // change in repo all marked with change and sync not synced items
            resolveChanges(values[1]).then(() => {
                // get new items from repo (synced values are changed if synced)
                SyncHelper.getItemsFromRepo(syncServiceUrl).then(repo => {
                    // flush db & dbRemove
                    Promise.all([
                        storage.flush.offline(SyncHelper.storeNames.offline),
                        storage.flush.offline(SyncHelper.storeNames.deleted)
                    ]).then(() => {
                        // add all items from repo into db.
                        Promise.resolve(
                            repo
                                ? Promise.all(
                                      repo.map(element =>
                                          storage.add.offline(
                                              SyncHelper.storeNames.offline,
                                              element.item,
                                              true
                                          )
                                      )
                                  )
                                : null
                        ).then(() => {
                            firstTimeOnline = false;
                            updateUI();
                            syncInProgress = false;
                            if (needSync) {
                                needSync = false;
                                sync();
                            }
                        });
                    });
                });
            });
        });
    });
};

export function isChangeDoneinRepo() {
    if (navigator.onLine) {
        SyncHelper.getItemsFromRepo().then(repo => {
            getItemsFromDB().then(values => {
                const offlineStorage = values[1].reverse();

                if (repo.length !== offlineStorage.length) {
                    syncronize();
                    return;
                }
                repo.forEach((item, i) => {
                    const offlineItem = offlineStorage[i];
                    if (JSON.stringify(item) !== JSON.stringify(offlineItem)) {
                        syncronize();
                    }
                });
            });
        });
    }
}

export function syncronize() {
    sync();
}
