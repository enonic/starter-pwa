importScripts('{{appUrl}}js/workbox-sw.prod.v2.0.1.js'); 

const swVersion = '{{appVersion}}';
const workboxSW = new self.WorkboxSW({
    skipWaiting: true,
    clientsClaim: true
});

const indexDbName = {todoMemo: "TodoMemo"}
const storeName = {todo: "TodoModel"}


let indexDB;

// This is a placeholder for manifest dynamically injected from webpack.config.js
workboxSW.precache([]);

// Here we precache custom defined Urls
workboxSW.precache(['{{appUrl}}']);

/**
 * Sets the caching strategy for the client: tries contacting the network first
 */
workboxSW.router.registerRoute("{{appUrl}}offline", workboxSW.strategies.networkFirst());
workboxSW.router.registerRoute("{{appUrl}}push", workboxSW.strategies.networkFirst());
workboxSW.router.registerRoute("{{appUrl}}cache-first", workboxSW.strategies.networkFirst());
workboxSW.router.registerRoute("{{appUrl}}background-sync", workboxSW.strategies.networkFirst());
workboxSW.router.registerRoute("{{appUrl}}bluetooth", workboxSW.strategies.networkFirst());
workboxSW.router.registerRoute("{{appUrl}}audio", workboxSW.strategies.networkFirst());
workboxSW.router.registerRoute("{{appUrl}}video", workboxSW.strategies.networkFirst());
workboxSW.router.registerRoute("{{appUrl}}webrtc", workboxSW.strategies.networkFirst());


/**
 * Handles the event of receiving of a subscribed push notification
*/
self.addEventListener('push', function(event) {

    var data = JSON.parse(event.data.text());
    var iconUrl = '{{iconUrl}}';
    const title = '{{appName}}';

    if (data.text) {
        const options = {
            body: data.text,
            icon: iconUrl
        };

        const notificationPromise = self.registration.showNotification(title, options);
        event.waitUntil(notificationPromise);

    }

    if (data.subscriberCount != null) {
        var subscriberData = JSON.stringify({subscriberCount:data.subscriberCount});
        self.clients.matchAll().then(function(clients) {
            if (clients && clients.length > 0) {
                clients[0].postMessage(subscriberData);

            } else {
                console.error("Can't update the DOM: serviceworker can't find a client (page)");
            }
        });
    }
});


/**
 * Handles the event of the push notification being clicked on
 */
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
});


/**
 * TEST
 * Handling background-syncing
 */

self.addEventListener('sync', (event) => {
    if (event.tag == 'Background-sync') {
        event.waitUntil(syncOfflineWithRepo())
        self.clients.matchAll().then(function(clients) {
            clients[0].postMessage(JSON.stringify({message:"synced"}));
        })
        //const client = clients.get(event)
        //client.postMessage({msg: "sync", url: event.request.url})
    } else {
        console.error("Problem with sync listener"); 
    }
});

const repoUrl =
    "/app/com.enonic.starter.pwa/_/service/com.enonic.starter.pwa/background-sync";

let syncOfflineWithRepo = function (callback) {
    /*
        get all elements from repo
        delete all elements in repo
        add all elements to repo from db
    */
    getApiCall(repoUrl).then(response => {
        //for (let item of response.json().TodoItems){
        response.json().then(data => {
            if (data.TodoItems){
                for (let item of data.TodoItems) {
                    //item.item.synced = true; 
                    //console.log("sw: ", item)
                    deleteApiCall(repoUrl, item);//deleting (hopefully)
                }
            }
        }).then(()=>{
            getAll(indexDbName.todoMemo,storeName.todo).then(items => {
                for( let item of items){
                    postApiCall(repoUrl, item.value).then(()=>{
                        //poste tilbake til indexDB med synced = true
                        item.value.synced = true
                        indexDBPut(indexDbName.todoMemo,storeName.todo, item.value)
                    })
                }
            })
        });
    })
        //} 
    /* 
    postApiCall(repoUrl);
    deleteApiCall(repoUrl, )
    */ 
    
}

let indexDBPut = function(indexDbName,storeName, value) {
    return open(indexDbName).then((db)=>{
        return new Promise((resolve,reject)=>{
            
            var dbTransaction = db.transaction(storeName, 'readwrite');
            var dbStore = dbTransaction.objectStore(storeName);
            var dbRequest = dbStore.put(value);

            dbTransaction.oncomplete = (e) => {
                resolve(dbRequest.result);
            }

            dbTransaction.onabort =
                dbTransaction.onerror = (e) => {
                    reject(e);
                }
        })
    })
}


let getAll = function(indexDbName,storeName, index, order) {
    return open(indexDbName).then((db) => {

        return new Promise((resolve, reject) => {
            var dbTransaction = db.transaction(storeName, 'readonly');
            var dbStore = dbTransaction.objectStore(storeName);
            var dbCursor;

            if (typeof order !== 'string')
                order = 'next';

            if (typeof index === 'string')
                dbCursor = dbStore.index(index).openCursor(null, order);
            else
                dbCursor = dbStore.openCursor();

            var dbResults = [];

            dbCursor.onsuccess = (e) => {
                var cursor = e.target.result;

                if (cursor) {
                    dbResults.push({
                        key: cursor.key,
                        value: cursor.value
                    });
                    cursor.continue();
                } else {
                    resolve(dbResults);
                }
            }

            dbCursor.onerror = (e) => {
                reject(e);
            }

        });

    });
}


let open = function (indexDbName) {
    if (indexDB){
        return Promise.resolve(indexDB);
    }
    return new Promise((resolve, reject) => {
        let instance = self.indexedDB.open(indexDbName);

        instance.onsuccess = (e) => {
            indexDB = e.target.result;
            resolve(indexDB);
        }
        instance.onerror = (e) => {
            reject(e);
        };

    });
}




let getApiCall = (url) => {
    return fetch(url,{ 
        method: 'GET',
    }); 
}

let deleteApiCall = (url, data) => {
    fetch(url + "?data=" + data._id, {
        method: 'DELETE',
    })
}

let postApiCall = (url, data) => {
    return new Promise((resolve,reject)=>{
        fetch(url, {
            body: JSON.stringify(data), 
            method: 'POST',
        }).then(resolve())
        .catch(reject())
    })
    
}