
const storage = require('./libs/Storage'); 
const storeNames = {
    main : "OfflineStorage", 
    deletedWhileOffline : "DeletedWhileOffline"
}
const repoUrl =
    "/app/com.enonic.starter.pwa/_/service/com.enonic.starter.pwa/background-sync";

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
        this.changed = false; 
    }
    getFormattedDate() {
        return  ""
        + this.date.getHours() + ":" + this.date.getMinutes() + " " 
        + this.date.getDate() + "/" + (this.date.getMonth() + 1) + "/" + this.date.getFullYear();
    }
}

/**
 * Setup the service worker and trigger initialization
 */
if ('serviceWorker' in navigator) {
    // Service Worker and Push is supported
    navigator.serviceWorker.ready.then(function (registration) {
        registration.sync.register('Background-sync')
    }); 
    navigator.serviceWorker.addEventListener("message", (event)=>{
        let data = JSON.parse(event.data)
        if(data.message === "synced"){
            for(let todo of registeredTodos){
                todo.synced = true
            }
            updateTodoView();
        }
    })
} else {
    displayErrorStatus('Something else wrong with sw in background-sync.js', true);
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

        storage.add.offline(storeNames.main, item); 

        inputfield.value = "";
        /* MANUELL TRIGGING AV SW 
        if ('serviceWorker' in navigator) {
            console.log(navigator.serviceWorker.controller); 
            navigator.serviceWorker.controller.postMessage("message");
        }*/
        updateTodoView();
        updateListenersFor.everything();  
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
    /*Find the element data with DOM api 
    Loop through register and remove from local 
    Update view */
    const id = parseInt(event.target.parentNode.children[1].id); 

    for(let todoItem of registeredTodos){ 
        if (todoItem.id === id) {
            // Online ? repo : indexDB 
            storage.delete.offline(storeNames.main, todoItem.id);  
            if(!navigator.onLine) storage.add.offline(storeNames.deletedWhileOffline, todoItem);            
            registeredTodos.splice(registeredTodos.indexOf(todoItem), 1);
            updateTodoView();
            updateListenersFor.everything(); 
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
 * edits an item based on onclick
 * updates storage
 */
let editItemText = (event) => {
    const id = event.target.parentNode.children[1].id;
    var todoItem = searchAndApply(id, (item) => {
        item.text = event.target.value; 
        item.changed = true; 
        storage.replace.offline(storeNames.main, item); 
    }); 
    updateListenersFor.everything(); 
    changeInputToLabel(); 
}


/**
 * Takes the DOM element and makes it TodoItem counterpart checked/unchecked
 */
let checkTodo = (checkboxElement) => {
    const id = checkboxElement.parentNode.children[1].children[1].id;
    searchAndApply(id, item => {
        
        item.isChecked = !item.isChecked;
        storage.replace.offline(storeNames.main, item);     
    }); 
    
    updateListenersFor.everything(); 
    //updateAllListeners(); 
    updateTodoView(); 
}

/**
 * Methods for updating listeners 
 * By wrapping in objects, a call to one of 
 * the methods will feel like reading a sentence. 
 * Hopefully, this makes the code more readable. 
 * i.e. updateListenersfor.checkboxes => "update listeners for checkboxes"
 */
const updateListenersFor = {
    everything : () => {        
        // TODO: do this with loop to dynamically add if more functions added 
        updateListenersFor.removeButtons(); 
        updateListenersFor.checkboxes(); 
        updateListenersFor.textfields(); 
        updateListenersFor.inputfields(); 
    },
    removeButtons : () => {
        for (let button of document.getElementsByClassName("remove-todo-button")) {
            button.onclick = removeTodo;
        }
    }, 
    checkboxes : () => {
        const checkboxes = document.getElementsByClassName("todo-app__checkbox");
        if (checkboxes) {
            for (let checkbox of checkboxes) {
                checkbox.onclick = () => {
                    checkTodo(checkbox);
                }
            }
        }
    }, 
    textfields : () => {
        for (let textfield of document.getElementsByClassName("todo-app__textfield")) {
            textfield.onclick = () => changeLabelToInput(textfield);
        }
    }, 
    inputfields : () => {
        for (let inputfield of document.getElementsByClassName("todo-app__inputfield")) {
            inputfield.onblur = editItemText;
        }
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
    
    updateListenersFor.inputfields(); 
}

let changeInputToLabel = () => {
    let input = document.getElementsByClassName("todo-app__inputfield")[0]; 
    let parent = input.parentNode;

    let label = document.createElement("label");
    label.className = "todo-app__textfield";
    label.innerHTML = input.value;
    parent.replaceChild(label, parent.childNodes[1]);

    updateListenersFor.textfields(); 
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
    storage.get.offline(storeNames.main, items => {
        // transform from indexDB-item to TodoItem
        registeredTodos = items.map(item => new TodoItem(item.value.text, item.value.date, item.value.isChecked, item.value.id)); 
        updateTodoView(); 
        updateListenersFor.everything(); 
    }); 
}
