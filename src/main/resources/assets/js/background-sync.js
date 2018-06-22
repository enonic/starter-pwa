/**
 * 1. global variables 
 * 2. Todo class // NOTE: move this out to another file  
 * 2. functions 
 * 3. listeners
 */

// BUG: remove only runs once. Figure out. 


import IndexedDBInstance from "./libs/db/IndexedDB";

let registeredTodos = [];
/**
 * Model of a TodoItem 
 */
class TodoItem {
    /**
     * 
     * @param {string} text 
     * @param {string} date
     * @param {boolean} isChecked 
     */               
    constructor(text, date, isChecked, id, synced) {
        this.text = text; 
        this.date = date; 
        this.isChecked = isChecked;
        // only give new ID of old one is not supplied 
        this.id = (!id ? new Date().valueOf() : id); // unique id}
        this.synced = (!synced ? false : synced); 
        this.type = "TodoItem"; 
    }

    getFormattedDate() {
        //pulled as string from repo as string 
        //if (typeof this.date === "string") {
        //    this.date = Date.parse(this.date); 
        //}
        return  ""
        + this.date.getHours() + ":" + this.date.getMinutes() + " " 
        + this.date.getDate() + "/" + (this.date.getMonth() + 1) + "/" + this.date.getFullYear();
    }
}

/**
 * Search for TodoItem based on ID and use callback 
 * @param {string} id item identifier 
 */
let searchAndApply = (id, callback) => {
    for (let i in registeredTodos) {
        if (registeredTodos[i].id == id) {
            callback(registeredTodos[i]);
        }
    }
}

/**
 * Adds a todo to the list. 
 */
let addTodo = () => {
    const inputfield = document.getElementById("add-todo-text");
        // Only add if user actually entered something 
    if (inputfield.value !== ""){

        
        const item = new TodoItem(inputfield.value, new Date(), false);
        registeredTodos.push(item);
        addToOfflineStorage(item)
        inputfield.value = "";
        
        /*  Implement in sync function when online
            // adding data to online repo
            postApiCall(
                repoUrl,
                {
                    text: inputfield.value,
                    date: item.date,
                    isChecked: item.isChecked,
                    id: item.id,
                    type: "TodoItem"
                }
            );
            */
        updateTodoView();
        updateAllListeners();   
    } else {
        // let user know something was wrong 
        inputfield.style.border = "solid red";
        setTimeout(() => {
            inputfield.style.border = "";
        }, 500);
    }
}

/**
 * Removes the item associated with the clicked button 
 * @param event may be event or TodoItem
 */
let removeTodo = (event) => {   
    /**
     * Find the element data with DOM api 
     * 
     * Loop through register and remove from local 
     * Update view 
     */
    const id = parseInt(event.target.parentNode.children[1].id); 

    for(let todoItem of registeredTodos){ 
        if (todoItem.id === id) {
            
            removeFromOfflineStorage(todoItem)
            //deleteApiCall(repoUrl, todoItem)
            registeredTodos.splice(registeredTodos.indexOf(todoItem), 1);
            updateTodoView();
            updateAllListeners();
            return; //do not check more items than neccecary
        }
    }
}    

/**
 * Updates the list view 
 * NOTE: Updates all elements regardless. Must be imrpoved later 
 */
let updateTodoView = () => {
    let outputArea = document.getElementById("todo-app__item-area");
    //no duplicate renders
    outputArea.innerHTML = ""; 
    for (let todo of registeredTodos) {
        outputArea.innerHTML += `
            <div style="background-color:${todo.synced ? "green" : "red"}" class="todo-app__item">
                <label class="todo-app__checkbox" style=" background-image: ${todo.isChecked ? "url(http://localhost:8080/admin/tool/com.enonic.xp.app.contentstudio/main/_/asset/com.enonic.xp.app.contentstudio:1529474547/admin/common/images/box-checked.gif)" : "url(http://localhost:8080/admin/tool/com.enonic.xp.app.contentstudio/main/_/asset/com.enonic.xp.app.contentstudio:1529474547/admin/common/images/box-unchecked.gif)"}
                
                "></label>
                <div style="text-decoration:${todo.isChecked ? "line-through" : "none"}">
                    <label class="todo-app__textfield" value="${todo.text}">${todo.text}</label>
                    <div id="${todo.id}">${todo.getFormattedDate()}</div>
                    <button class="remove-todo-button">X</button>
                </div>
            </div>
        `;
    }
}

/**
 * Runs when an item is changed 
 */
let itemEdited = (event) => {
    const id = event.target.parentNode.children[1].id;
    var todoItem = searchAndApply(id, (item) => {
        item.text = event.target.value; 
        //putApiCall(repoUrl, item);
        editItemToOfflineStorage(item);
    }); 
    changeInputToLabel(); 
}


/**
 * Takes the DOM element and makes it TodoItem counterpart checked/unchecked
 */
let checkTodo = (checkboxElement) => {
    const id = checkboxElement.parentNode.children[1].children[1].id;
    searchAndApply(id, item => {
        
        item.isChecked = !item.isChecked;
        editItemToOfflineStorage(item);    
        //putApiCall(repoUrl, item);
    }); 
    
    updateTodoView(); 
    updateAllListeners(); 
    //throw "is not updated in database. Use putApiCall, once that is working."; 
}


let updateRemoveListeners = () => {
    for (let button of document.getElementsByClassName("remove-todo-button")) {
        button.onclick = removeTodo;
    }
}

let updateCheckListeners = () => {    
    const checkboxes = document.getElementsByClassName("todo-app__checkbox"); 
    if(checkboxes) {
        for (let checkbox of checkboxes) {
            checkbox.onclick = () => { 
                checkTodo(checkbox);
            }
        }
    }
}

let updateTextfieldListeners = () => {
    for(let textfield of document.getElementsByClassName("todo-app__textfield")){
        textfield.onclick = () => changeLabelToInput(textfield); 
        //textfield.onchange = itemEdited; 
    }
}

let updateInputFieldListeners = () => {
    for (let inputfield of document.getElementsByClassName("todo-app__inputfield")) {
        inputfield.onchange = itemEdited;
    }
}

// refactor -> similar to changeInputToLabel
let changeLabelToInput = (textfield) => {
    let label = textfield.innerHTML;
    let parent = textfield.parentNode; 

    let input = document.createElement("input"); 
    input.className = "todo-app__inputfield"; 
    input.value = label; 
    parent.replaceChild(input, parent.childNodes[1]);
    input.focus();
    
    updateInputFieldListeners(); 
}

let changeInputToLabel = () => {
    let input = document.getElementsByClassName("todo-app__inputfield")[0]; 
    let parent = input.parentNode;

    let label = document.createElement("label");
    label.className = "todo-app__textfield";
    label.innerHTML = input.value;
    parent.replaceChild(label, parent.childNodes[1]);

    updateTextfieldListeners(); 
}

let updateAllListeners = () => {
    // refarctor all the ones using classes -> repeating a lot right now 
    updateRemoveListeners(); 
    updateCheckListeners(); 
    updateTextfieldListeners(); 
}

// Listeners
document.getElementById("add-todo-button").onclick = addTodo;
document.onkeydown = (event) => {
                        //enter
    const inputfield = document.getElementById("add-todo-text");  
    if (event.keyCode === 13 && document.activeElement === inputfield) {
        addTodo(); 
    }
}
document.getElementById("todo-app__startButton").onclick = () => {
    document.getElementById("todo-app__startButton").style.display = "none"; 
    document.getElementById("todo-app__container").style.display = "block"; 
                        // callback adding items to reisteredTodos when they are fetche
    getItemsFromOfflineDB(updateFromOfflineDB);
}

let updateFromOfflineDB = (todoItems) => {
    console.log("update")
    for (let item of todoItems) {
        var data = item.value   
        registeredTodos.push(new TodoItem(data.text, data.date, data.isChecked, data.id, data.synced));
    }
    updateTodoView();
    updateAllListeners();
}

/**
 * Post data to an API endpoint. If successful (as in, HTTP call was successful, but the response may contain warnings, error messages etc),
 * trigger callbackSuccess with the response object. If not, trigger callbackFailure with the error.
 */

// ------------------------------
// Offline storage in IndexDB 
// ------------------------------

let addToOfflineStorage = (todoItem) => {
    //const dbInstance = IndexedDBInstance().then(instance => instance)
    //NOTE:  try adding something and run
    //console.log(dbInstance); 
    //dbInstance.add("TodoMemo", {id : "testid"}, "testid");
    todoItem.synced = false; 
    IndexedDBInstance().then(instance => {
        instance.add("TodoModel", todoItem) 
    })

}


let getItemsFromOfflineDB = function (callback) {
    IndexedDBInstance().then(instance => {
        instance.getAll("TodoModel").then(callback); 
    }); 
}

let removeFromOfflineStorage = function (todoItem, callback){
    IndexedDBInstance().then(instance => {
        instance.delete("TodoModel", todoItem.id)
    }); 
}

let editItemToOfflineStorage = function (todoItem){
    IndexedDBInstance().then(instance => {
        instance.put("TodoModel",todoItem)
    }); 
}

export default {
    getItemsFromOfflineDB: getItemsFromOfflineDB,
    editItemToOfflineStorage: editItemToOfflineStorage
};
