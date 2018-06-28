importScripts('{{appUrl}}js/workbox-sw.prod.v2.0.1.js'); 

const swVersion = '{{appVersion}}';
const workboxSW = new self.WorkboxSW({
    skipWaiting: true,
    clientsClaim: true
});

const repoUrl = "/app/com.enonic.starter.pwa/_/service/com.enonic.starter.pwa/background-sync";
const indexDbName = {todoMemo: "TodoMemo"}
const storeName = { 
    todo: "OfflineStorage", 
    removed: "DeletedWhileOffline"
}

let indexDB; // indeDB instance

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

self.addEventListener('notificationclick', function(event) {event.notification.close()});


/**
 * Background sync
 */

self.addEventListener('sync', (event) => {
    if (event.tag == 'Background-sync') {
        event.waitUntil(syncronize(event))
    } else {
        console.error("Problem with sync listener, sync-tag not supported") 
    }
})

function getItemsFromRepo(){
    // fetching items from repo
    getApiCall(repoUrl).then((response) => response.json().then(itemList => {
        // item fetched from repo is an object called TodoItems, we are interested in it's values 
        return itemList.TodoItems
    }))
}

function getItemsFromDB() {
    return Promise.all([
        //fetching items from indexDB
        getAllFromIndexDb(indexDbName.todoMemo, storeName.removed),
        getAllFromIndexDb(indexDbName.todoMemo, storeName.todo)
    ])
}

function compareDelete(db){
    return Promise.all(db.map(item => 
        deleteApiCall(repoUrl,item)
            .catch(err => 
                reject(err)
            )
        )
    )
}

function resolveChanges(db){
    return Promise.all(db.map(item => 
        item.changed ? putApiCall(repoUrl, item) :
         item.synced ? null : postApiCall(repoUrl, item)
        )
    )
}



let syncronize = function(event){
    //read db, dbRemove and repo
    getItems().then(values => {

        //delete in repo all from db-delete 
        compareDelete(values[0]).then(

            // change in repo all marked with change 
            resolveChanges(values[1]).then(

                //get new items from repo (synced values are changed if synced)
                getItemsFromRepo().then(repo => {
                    
                    //flush db & dbRemove
                    Promise.all([
                        flushDB(values[0]),
                        flushDB(values[1])
                    ]).then(

                        //add all items from repo into db.
                        Promise.all(repo.map(item => DBPost(storeName.todo, item))).then(() => {

                            //Send message to app for update of UI
                            const client = await clients.get(event.clientId);
                            if (client) {
                                clients.postMessage({
                                    message: "update",
                                    url: event.request.url
                                })
                            }
                        })
                    )
                })
            )   
        )
    })    
}

/**
 * Offline DB storage
 */

function flushDB(db){
    return new Promise((resolve,reject) => {
        var dbTransaction = db.transaction(db, "readwrite");
        var flushReq = dbTransaction.objectStore(db).clear();
        flushReq.onsuccess(response => resolve(response))
        flushDB.onerror(response => reject(response))
    })
    

}

let DBPost = function (indexDbName,item){
    return open(indexDbName).then(db => {
        db.add(indexDbName, item) 
    })
}

let getAllFromIndexDb = function(indexDbName,storeName, index, order) {
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





/**
 * Online repo storage http requests
 */


let getApiCall = (url) => {
    return fetch(url,{ 
        method: 'GET',
    }); 
}

let deleteApiCall = (url, data) => {
    return fetch(url + "?data=" + data._id, {
        method: 'DELETE',
    })
}

let postApiCall = (url, data) => {
    return fetch(url, {
        body: JSON.stringify(data), 
        method: 'POST',
    }) 
}

let putApiCall = (url, data) => {
    return fetch(url, {
        body: JSON.stringify(data), 
        method: 'PUT',
    }) 
}





