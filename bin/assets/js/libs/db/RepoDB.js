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

import ConfigManagerInstance from '../ConfigManager';

export default function RepoDBInstance() {

    if (typeof window.RepoDBInstance_ !== 'undefined')
        return Promise.resolve(window.RepoDBInstance_);

    window.RepoDBInstance_ = new OnlineDatabase();

    return Promise.resolve(window.RepoDBInstance_);
}

class OnlineDatabase {

    constructor() {

        ConfigManagerInstance().then((configManager) => {

            var config = configManager.config;

            this.db_ = null;
            this.name_ = config.name;
            this.version_ = config.version;
            this.stores_ = config.stores;

        });
    }

    getStore(storeName) {

        if (!this.stores_[storeName])
            throw 'There is no store with name "' + storeName + '"';

        return this.stores_[storeName];
    }

    nuke() {
        /* return new Promise((resolve, reject) => {

             console.log("Nuking... " + this.name_);

             this.close();

             var dbTransaction = indexedDB.deleteDatabase(this.name_);
             dbTransaction.onsuccess = (e) => {
                 console.log("Nuked...");
                 resolve(e);
             }

             dbTransaction.onerror = (e) => {
                 reject(e);
             }
         });*/
    }

    put(storeName, value, key) {

        return new Promise((resolve, reject) => {
            var fd = new FormData();
            fd.append('value', value.toJson());
            fd.append('key', value.url);
            fd.append('storeName', storeName);

            fd.append('audio', value.audio);

            var xhr = new XMLHttpRequest();

            xhr.open('POST', appUrl + '/put', true);

            xhr.onreadystatechange = () => {
                if (xhr.readyState != 4) return;

                if (xhr.status == 200) {
                    resolve(xhr.responseText);
                } else {
                    reject(xhr.responseText);
                }
            }

            xhr.send(fd);

        });


    }

    get(storeName, value) {
        log.info("get")
        return new Promise((resolve, reject) => {

            var xhr = new XMLHttpRequest();

            xhr.open('GET', appUrl + '/get?key=' + value, true);
            xhr.send();

            xhr.onreadystatechange = () => {
                if (xhr.readyState != 4) return;

                if (xhr.status == 200) {
                    if (xhr.responseText) {
                        var object = JSON.parse(xhr.responseText);

                        this.getAudio(storeName, value).then(blob => {

                            object.audio = blob;
                            resolve(object);
                        })
                    } else {
                        resolve(null);
                    }

                } else {
                    reject(xhr.responseText);
                }
            }

        });

    }

    getAudio(storeName, value) {

        return new Promise((resolve, reject) => {

            var xhr = new XMLHttpRequest();

            xhr.open('GET', appUrl + '/getAudio?key=' + value, true);
            xhr.responseType = "blob";
            xhr.send();

            xhr.onload = (event) => {
                resolve(xhr.response);
            };

        });


    }

    getAll(storeName, index, order) {
        
        return new Promise((resolve, reject) => {

            var xhr = new XMLHttpRequest();

            xhr.open('GET', appUrl + '/getAll?order=' + order, true);
            xhr.send();

            xhr.onreadystatechange = () => {
                if (xhr.readyState != 4) return;

                if (xhr.status == 200) {
                    var resultArray = xhr.responseText ? JSON.parse(xhr.responseText) : [];
                    resolve(resultArray.map(json => {
                        return {
                            key: json.key,
                            value: JSON.parse(json.value)
                        }
                    }));
                } else {
                    reject(xhr.responseText);
                }
            }

        });

    }

    delete(storeName, key) {

        return new Promise((resolve, reject) => {

            var xhr = new XMLHttpRequest();

            xhr.open('GET', appUrl + '/delete?key=' + key, true);
            xhr.send();

            xhr.onreadystatechange = () => {
                if (xhr.readyState != 4) return;

                if (xhr.status == 200) {
                    resolve(xhr.responseText);
                } else {
                    reject(xhr.responseText);
                }

            }

        });
    }

    deleteAll(storeName) {


        return new Promise((resolve, reject) => {

            var xhr = new XMLHttpRequest();

            xhr.open('GET', appUrl + '/deleteAll', true);
            xhr.send();

            xhr.onreadystatechange = () => {
                if (xhr.readyState != 4) return;

                if (xhr.status == 200) {
                    resolve(xhr.responseText);
                } else {
                    reject(xhr.responseText);
                }
            }

        });

    }

}
