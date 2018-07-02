import storage from './libs/Storage';
import { updateUI } from './background-sync';

const repoUrl = "/app/com.enonic.starter.pwa/_/service/com.enonic.starter.pwa/background-sync";
const storeName = { 
    offline: "OfflineStorage", 
    removed: "DeletedWhileOffline"
}


/**
 * Background sync local. No service worker
 */

function getItemsFromRepo(){
    // fetching items from repo
    return storage.get.online(repoUrl).then((response) => response.json().then(itemList => {
        // item fetched from repo is an object called TodoItems, we are interested in it's values 
        return itemList.TodoItems
    }))
}


function getItemsFromDB() {
    return Promise.all([
        //fetching items from indexDB 
        storage.get.offline(storeName.removed, nodes => nodes ? nodes.map(node => node.value) : []),
        storage.get.offline(storeName.offline, nodes => nodes ? nodes.map(node => node.value) : [])
    ])
}

// deleting all items in repo contained in a database
function removeItemsFromRepo(db){
    return Promise.all(db.map(item => 
        storage.delete.online(repoUrl,item, true)
    ))
}

//resolving offline changes on online repository
function resolveChanges(db){
    return Promise.all(db.map(item => {
        return item.synced ? ( item.changed ? storage.rplace.online(repoUrl, item) : null) 
            : storage.add.online(repoUrl, item)
    }))

}


export default () => {
    //read db, dbRemove and repo
    getItemsFromDB().then(values => {
        
        //delete in repo all from db-delete 
        removeItemsFromRepo(values[0]).then(() => {
            
            // change in repo all marked with change and sync not synced items
            resolveChanges(values[1]).then(() => {
                
                //get new items from repo (synced values are changed if synced)
                getItemsFromRepo().then(repo => {
                    //flush db & dbRemove
                    Promise.all([
                        storage.flush.offline(storeName.offline),
                        storage.flush.offline(storeName.removed)
                    ]).then(() => {

                        //add all items from repo into db.
                        Promise.resolve(repo ? Promise.all(repo.map(element => storage.add.offline(storeName.offline, element.item, true))): null)
                        .then(()=>{
                            updateUI()
                            
                        })
                    }) 
                })

            })
        })  
    })
}    

