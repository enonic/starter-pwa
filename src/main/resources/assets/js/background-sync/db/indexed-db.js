/**
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import ConfigManagerInstance from './Config';

class OfflineDatabase {
    constructor() {
        ConfigManagerInstance().then((configManager) => {
            const config = configManager.config;

            this.db_ = null;
            this.name_ = config.name;
            this.version_ = config.version;
            this.stores_ = config.stores;
        });
    }

    open() {
        if (this.db_) return Promise.resolve(this.db_);

        return new Promise((resolve, reject) => {
            var dbOpen = indexedDB.open(this.name_, this.version_);

            dbOpen.onupgradeneeded = (e) => {
                this.db_ = e.target.result;

                var storeNames = Object.keys(this.stores_);
                var storeName;

                for (var s = 0; s < storeNames.length; s++) {
                    storeName = storeNames[s];

                    // If the store already exists
                    if (this.db_.objectStoreNames.contains(storeName)) {
                        // Check to see if the store should be deleted.
                        // If so delete, and if not skip to the next store.
                        if (this.stores_[storeName].deleteOnUpgrade)
                            this.db_.deleteObjectStore(storeName);
                        // else continue;
                    }

                    var dbStore = this.db_.createObjectStore(
                        storeName,
                        this.stores_[storeName].properties
                    );

                    if (
                        typeof this.stores_[storeName].indexes !== 'undefined'
                    ) {
                        var indexes = this.stores_[storeName].indexes;
                        var indexNames = Object.keys(indexes);
                        var index;

                        for (var i = 0; i < indexNames.length; i++) {
                            index = indexNames[i];
                            dbStore.createIndex(index, index, indexes[index]);
                        }
                    }
                }
            };

            dbOpen.onsuccess = (e) => {
                this.db_ = e.target.result;
                resolve(this.db_);
            };

            dbOpen.onerror = (e) => {
                reject(e);
            };
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            if (!this.db_) reject(new Error('No database connection'));

            this.db_.close();
            resolve(this.db_);
        });
    }
}

export default function IndexedDBInstance() {
    if (!window.IndexedDBInstance_) {
        window.IndexedDBInstance_ = Promise.resolve(new OfflineDatabase());
    }

    return window.IndexedDBInstance_.then((dbInstance) => dbInstance.open());
}
