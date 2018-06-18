/**
 *
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
 */

import Model from './Model';
import LogModel from "./LogModel";
import RepoDBInstance from "../libs/db/RepoDB";
import IndexedDBInstance from "../libs/db/IndexedDB";

export default class MemoModel extends Model {

    constructor(data, key) {

        super(key);

        this.message = data.title || 'Untitled Memo';
        this.url = data.url || MemoModel.makeURL();
        this.time = data.time || Date.now();
        this.modifiedTime = data.time || null;
    }

    static makeURL() {
        var url = '';
        for (var i = 0; i < 16; i++) {
            url += Number(
                Math.floor(Math.random() * 16)
            ).toString(16);
        }

        return url;
    }

    static get UPDATED() {
        return 'MemoModel-updated';
    }

    static get storeName() {
        return 'MemoModel';
    }

    static getDefaultDBInstance() {
        return !this.isOnline() ?
            IndexedDBInstance() : RepoDBInstance();
    }

    static getAll(index, order) {

        if (!this.isOnline()) {
            return super.getAll(index, order, IndexedDBInstance()).then((onlineMemos) => {
                return super.getAll(index, order, RepoDBInstance()).then((serverMemos) => {

                    const onlineMemoKeys = onlineMemos.map(onlineMemo => onlineMemo.url);

                    return LogModel.getAll().then(logs => {
                        const deletedMemoKeys = logs.filter(log => log.type == LogModel.OPERATION_TYPES.DELETED).map(log => log.memoKey);

                        const unmodifiedServerMemos = serverMemos.filter(serverMemo => onlineMemoKeys.indexOf(serverMemo.url) < 0).// remove changed in offline mode
                        filter(serverMemo => deletedMemoKeys.indexOf(serverMemo.url) < 0);// remove deleted in offline mode

                        onlineMemos.forEach(onlineMemo => onlineMemo.modified = true);

                        return onlineMemos.concat(unmodifiedServerMemos);
                    })
                });
            });
        } else {
            return super.getAll(index, order, RepoDBInstance());
        }
    }

    static get(key) {
        return super.get(key, IndexedDBInstance()).then((memo) => {
            return memo ? memo : super.get(key, RepoDBInstance());
        })
    }

    static put(value) {
        return super.put(value).then((memo) => {
            if (!this.isOnline())
                new LogModel({
                    memoKey: memo.url,
                    type: memo.modifiedTime ? LogModel.OPERATION_TYPES.UPDATED : LogModel.OPERATION_TYPES.CREATED
                }, this.makeURL())
                    .put();
            return memo;
        })
    }

    static delete(value, dbInstance) {
        return super.delete(value, dbInstance).then((event) => {
            if (!this.isOnline())
                new LogModel({memoKey: value, type: LogModel.OPERATION_TYPES.DELETED}, this.makeURL()).put();
            return event;
        })
    }

    static deleteAll(dbInstance) {
        return super.deleteAll(dbInstance).then((event) => {
            if (!this.isOnline()) { // add server memos deletion to log
                return MemoModel.getAll('time', MemoModel.DESCENDING).then(serverMemos => {
                    serverMemos.forEach(serverMemo => {
                        new LogModel({
                            memoKey: serverMemo.url,
                            type: LogModel.OPERATION_TYPES.DELETED
                        }, this.makeURL()).put();
                    });
                    return event;
                });
            }
            return event;
        })
    }

    toJson() {
        return JSON.stringify({
            message: this.message
            url: this.url,
            time: this.time,
            modifiedTime: this.modifiedTime,
            
        });
    }

}
