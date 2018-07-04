import { log } from 'util';

const storage = require('./libs/Storage').default; 
const dbChange = require('./dbChanged')
const storeNames = {
    offline : "OfflineStorage", 
    deletedWhileOffline : "DeletedWhileOffline"
}
const repoUrl =
    "/app/com.enonic.starter.pwa/_/service/com.enonic.starter.pwa/background-sync";



export let registeredTodos = []


// NOTE: Dette sto før når man klikket på knappen. 
// Det kjører, men fungerer ikke fordi error med IDB 
storage.get.offline(storeNames.offline, items => {
    // transform from indexDB-item to TodoItem
    registeredTodos = items.map(
        item =>
        new TodoItem(
            item.value.text,
            item.value.date,
            item.value.isChecked,
            item.value.id
        )
    );
    updateUI("startbutton");
}); 


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
        this.date = (typeof date === "string" ? new Date(date) : date); 
        this.isChecked = isChecked;
        // only give new ID of old one is not supplied 
        this.id = (!id ? new Date().valueOf() : id); // unique id}
        this.synced = (!synced ? false : synced); 
        this.type = "TodoItem"; 
        this.changed = false; 
    }
    getFormattedDate() {
        return  ""
        + this.date.getDate() + "/" + (this.date.getMonth() + 1) + "/" + this.date.getFullYear() + " "
        + this.date.getHours() + ":" + this.date.getMinutes(); 
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

        storage.add.offline(storeNames.offline, item); 
        inputfield.value = "";
        updateUI()
    } else {
        // let user know something was wrong 
        inputfield.style.borderColor = "#f44336";
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
    //const id = parseInt(event.target.parentNode.children[1].id); 
    const id = event.target.id; 
    searchAndApply(id, (todoItem) => {
        storage.add.offline(storeNames.deletedWhileOffline, todoItem, true).then(
        storage.delete.offline(storeNames.offline, todoItem.id)).then(
            updateUI()
        )
        
        return; //do not check more items than neccecary
    }); 
}    

/**
 * Updates the list view 
 * NOTE: Updates all elements regardless. Must be imrpoved later 
 */
let updateTodoView = () => {
    let outputArea = document.getElementById("todo-app__item-area");
    outputArea.innerHTML = "";
    for (let todo of registeredTodos) {
        /**
         * Legg på grid   
         * mdl-grid
         * mdl-cell mdl-cell--4-col
         */
        outputArea.innerHTML += `
            <li class="todo-app__item mdl-list__item mdl-grid>
            
				<input type="checkbox" id="${todo.id}" class="todo-app__checkbox mdl-checkbox__input" style="color: ${todo.isChecked ? "grey" : ""}"/>
                <i id="${todo.id}" class="todo-app__checkbox mdl-cell mdl-cell--1-col material-icons md-48">${todo.isChecked ? "check_box" : "check_box_outline_blank"}</i>
                
                <label id="${todo.id}" value="${todo.text}" class="todo-app__textfield mdl-cell mdl-cell--7-col">${todo.text}</label>
                <div class="todo-app__date mdl-cell mdl-cell--2-col">${todo.getFormattedDate()}</div>
                <i class="remove-todo-button mdl-cell mdl-cell--2-col material-icons md-48" id=${todo.id}>close</i>
                <i class="todo-app__synced-icon mdl-cell mdl-cell--1-col material-icons md-48">${todo.synced ? "cloud_done" : "cloud_off"}</i>
            </li>
        `;
    }
    for (let cbox of document.getElementsByClassName("mdl-js-checkbox")) {
        componentHandler.upgradeElements(cbox); 
    }
}


/**
 * edits an item based on onclick
 * updates storage
 */
let editItemText = (event) => {
    const id = event.target.id; 
    searchAndApply(id, (item) => {
        if(!(event.target.value == "")){
            item.text = event.target.value;
        } 
        registerChange(item, storeNames.offline);    
    }); 
}


/**
 * Takes the DOM element and makes it TodoItem counterpart checked/unchecked
 */
let checkTodo = (checkboxElement) => {
    const id = checkboxElement.id; 
    searchAndApply(id, item => {
        item.isChecked = !item.isChecked;

        registerChange(item, storeNames.offline);    
    }); 
}

/**
 * Should be run when an item is edited 
 * updated changed, sets to not synced and replaces in storage
 * @param item the edited item
 * @param storeName storeName to replaced in (probably storeNames.offline)
 */
let registerChange = (item, storeName) => {
    item.changed = true;
    item.synced = false; 
    storage.replace.offline(storeName, item);
    updateUI("registerchange"); 
}

let changeLabelToInput = (textfield) => {
    let label = textfield.innerHTML;
    let parent = textfield.parentNode; 
    let id = parent.children[1].id; 
    let input = document.createElement("input"); 

    dbChange("edit"); 

    input.className = "todo-app__inputfield mdl-textfield__input mdl-cell mdl-cell--7-col"; 
    input.id = id; 
    input.value = label; 
    parent.replaceChild(input, parent.children[1]);


    input.focus();
    
    updateListenersFor.inputfields(); 
}

// Listeners
document.getElementById("add-todo-button").onclick = addTodo;
document.onkeydown = (event) => {
                        //enter
    const inputfield = document.getElementById("add-todo-text");  

    // actions on enter 
    if(event.keyCode == 13) {
        // adding an item
        if (document.activeElement === inputfield) {
            addTodo(); 
            // changing an item
        } else if (document.activeElement.className.split(" ").includes("todo-app__inputfield")) {
            // changing is triggered onblur in updateListenersFor.inputfields
            document.activeElement.blur(); 
        }
    }
}


/**
 * Methods for updating listeners 
 * By wrapping in objects, a call to one of 
 * the methods will feel like reading a sentence. 
 * Hopefully, this makes the code more readable. 
 * i.e. updateListenersfor.checkboxes => "update listeners for checkboxes"
 */
const updateListenersFor = {
    /**
     * Runs every update method except for itself 
     */
    everything: () => {
        for(let key of Object.keys(updateListenersFor)) {
            (key !== "everything" ? updateListenersFor[key]() : null); 
        }
    },
    removeButtons: () => {
        for (let button of document.getElementsByClassName("remove-todo-button")) {
            button.onclick = removeTodo;
        }
    },
    checkboxes: () => {
        const checkboxes = document.getElementsByClassName("todo-app__checkbox");
        if (checkboxes) {
            for (let checkbox of checkboxes) {
                checkbox.onclick = () => {
                    checkTodo(checkbox);
                }
            }
        }
    },
    textfields: () => {
        for (let textfield of document.getElementsByClassName("todo-app__textfield")) {
            textfield.onclick = () => changeLabelToInput(textfield);
        }
    },
    inputfields: () => {
        for (let inputfield of document.getElementsByClassName("todo-app__inputfield")) {
            inputfield.onblur = editItemText;
        }
    }, 
    materialItems : () => {
        for (let item of document.getElementsByClassName("todo-app__item")) {
            componentHandler.upgradeElements(item); 
        }
    }
}


export let updateUI = () => {
    storage.get.offline(storeNames.offline, (items) => {
        items.reverse()
        registeredTodos = items.map(item => new TodoItem(item.value.text, item.value.date, item.value.isChecked, item.value.id, item.value.synced))
        updateTodoView();
        updateListenersFor.everything(); 
    }); 
}




/**
 * Listen to serviceworker
 */
if(navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.message === "synced") {
            updateUI("serviceworker")
        }

    }); 
}
    