import backgroundSync from "../background-sync.js";
var $ = require("jquery");

const repoUrl = "/app/com.enonic.starter.pwa/_/service/com.enonic.starter.pwa/background-sync";

export default class Sync {
    static syncOfflineTodoItems() {
        /*
            
            get all elements from repo
            delete all elements in repo
            add all elements to repo from db


        */
        //loop through repo and delete
        getApiCall(repoUrl,(items) => {
            for (let item of items.TodoItems){
                deleteApiCall(repoUrl, item);//deleting (hopefully)
            }
        })
        
        backgroundSync.getItemsFromOfflineDB((items) => {
            for(let item of items) {
                //adding items
                postApiCall(repoUrl,item.value) // adding to repo
            }
        })
        


        // ------------------------------
        // Online storage in Enonic Repo: 
        // ------------------------------

        // adds element to repo
        function postApiCall(url, data) {
            $.post({
                url: url,
                data: data,
                dataType: "json"
            }).then(result => {
                data.synced = (result.success === true)
                backgroundSync.editItemToOfflineStorage(data)
            })
        }

        // delete item on repo
        function deleteApiCall(url, data) {
            $.ajax({
                url: url + "?" + $.param({ id: data._id }),
                type: "delete"
            })
        }

        // gets all items from repo
        function getApiCall(url, callback) {
            $.ajax({
                url: url,
                type: "get"
            }).then(callback);
        }

        /*
        function putApiCall(url, data) {
            $.ajax({
                url: url,
                data: data,
                dataType: "json",
                type: "put"
            })
        }
        */
        
        

    }
}