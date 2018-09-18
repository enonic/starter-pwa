/**
 * Background sync local. No service worker
 */

import storage from './storage';
import { updateUI } from '../../bs';

const SyncHelper = require('./sync-helper');
const IndexedDBInstance = require('./db/indexed-db').default;

const ToasterInstance = require('../toaster').default;

let switchedOnline = false;
window.addEventListener('online', () => {
    switchedOnline = navigator.onLine;
});

let syncInProgress = false;

const sync = function() {
    if (syncInProgress) {
        return;
    }

    syncInProgress = true;

    // Open IndexedDB
    IndexedDBInstance().then(dbInstance => {
        dbInstance.open().then(db => {
            // Fetch items from IndexedDB
            SyncHelper.getItemsFromDB(db).then(
                ([deletedWhileOffline, dbItems]) => {
                    // Sync deletions in IndexedDB with remote repo
                    SyncHelper.removeItemsFromRepo(deletedWhileOffline).then(
                        () => {
                            // Sync changes in IndexedDB with remote repo
                            SyncHelper.syncOfflineChanges(dbItems).then(
                                syncPromises => {
                                    // Notify clients that all changes are synced
                                    if (
                                        switchedOnline &&
                                        syncPromises.some(promise => !!promise)
                                    ) {
                                        switchedOnline = false;
                                        SyncHelper.showToastNotification(
                                            ToasterInstance
                                        );
                                    }

                                    // Clear contents of IndexedDB
                                    SyncHelper.clearDatabase(db).then(() =>
                                        // Fetch all items from the remote repo
                                        SyncHelper.getItemsFromRepo().then(
                                            repoItems =>
                                                SyncHelper.addItemsToDatabase(
                                                    db,
                                                    repoItems
                                                ).then(() => {
                                                    updateUI();
                                                    syncInProgress = false;
                                                })
                                        )
                                    );
                                }
                            );
                        }
                    );
                }
            );
        });
    });
};

export function isChangeDoneinRepo() {
    if (navigator.onLine) {
        SyncHelper.getItemsFromRepo().then(repo => {
            SyncHelper.getItemsFromDB().then(values => {
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
