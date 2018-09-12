/**
 * Background sync local. No service worker
 */

import storage from './storage';
import { updateUI } from '../../bs';

const SyncHelper = require('./sync-helper');

const repoUrl =
    '/app/com.enonic.starter.pwa/_/service/com.enonic.starter.pwa/background-sync';

const ToasterInstance = require('../toaster').default;
let firstTimeOnline = false;
window.addEventListener('online', () => {
    if (navigator.onLine) {
        firstTimeOnline = true;
    }
});

function getItemsFromRepo() {
    // fetching items from repo
    return storage.get.online(repoUrl).then(response =>
        response.json().then(itemList => {
            // item fetched from repo is an object called TodoItems, we are interested in it's values
            return itemList.TodoItems;
        })
    );
}

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

// deleting all items in repo contained in a database
function removeItemsFromRepo(db) {
    return Promise.all(
        db.map(item => storage.delete.online(repoUrl, item, true))
    );
}

function isElementInRepo(id) {
    return storage.get.online(repoUrl, id).then(response => {
        if (response.status >= 404) {
            return false;
        }
        return true;
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
                            ? storage.replace.online(repoUrl, item)
                            : storage.add.online(repoUrl, item)
                );
            }
            if (!item.synced) {
                return storage.add.online(repoUrl, item);
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
        removeItemsFromRepo(values[0]).then(() => {
            // change in repo all marked with change and sync not synced items
            resolveChanges(values[1]).then(() => {
                // get new items from repo (synced values are changed if synced)
                getItemsFromRepo().then(repo => {
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
        getItemsFromRepo().then(repo => {
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
