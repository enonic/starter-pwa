/**
 * 1. global variables 
 * 2. Todo class // NOTE: move this out to another file  
 * 2. functions 
 * 3. listeners
 */

// BUG: remove only runs once. Figure out. 


var $ = require("jquery");

let registeredTodos = [];
const repoUrl = "/app/com.enonic.starter.pwa/_/service/com.enonic.starter.pwa/background-sync";
/**
 * Model of a TodoItem 
 */
class TodoItem {
    /**
     * 
     * @param {string} text 
     * @param {string} date
     * @param {boolean} isChecked 
     */               // remove if works
    constructor(text, date, isChecked) {
        this.text = text; 
        this.date = date; 
        this.isChecked = isChecked; 
        this.id = new Date().valueOf(); // unique id
    }

    getFormattedDate() {
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
 * Adds a todo to the lsit 
 */
let addTodo = () => {
    const inputfield = document.getElementById("add-todo-text");
    

    // Only add if user actually entered something 
    if (inputfield.value !== "") {
        const item = new TodoItem(inputfield.value, new Date(), false);
        registeredTodos.push(item); 
        
        postApiCall(
            repoUrl,
            {   text: inputfield.value,
                date : item.date,  
                isChecked : item.isChecked,
                id: item.id
            }
        );
        
        updateTodoView();
        updateAllListeners();   
        inputfield.value = "";
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
     * Loop through register. 
     * Update view 
     */
    const text = event.target.parentNode.children[0].value;
    const date = event.target.parentNode.children[1].innerHTML; 
    const removed = new TodoItem(text, date, false); // search for this 
    
    for(let i in registeredTodos){ 
        if (registeredTodos[i].text + " - " + removed.text && removed.date === registeredTodos[i].getFormattedDate()) {
            deleteApiCall(
                repoUrl, 
                registeredTodos[i]);
            registeredTodos.splice(i, 1);
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

    for (todo of registeredTodos) {
        outputArea.innerHTML += `
            <div class="todo-app__item">
                <input class="todo-app__checkbox" type="checkbox">
                <div style="text-decoration:${todo.isChecked ? "line-through" : "none"}">
                    <input class="todo-app__textfield" value="${todo.text}"></input>
                    <div id="${todo.id}">${todo.getFormattedDate()}</div>
                    <button class="remove-todo-button">Remove</button>
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
        console.log(item); 
        putApiCall(repoUrl, item);
    }); 
    ;
}


/**
 * Takes the DOM element and makes it TodoItem counterpart checked/unchecked
 */
let checkTodo = (checkboxElement) => {
    const id = checkboxElement.parentNode.children[1].children[1].id;
    searchAndApply(id, item => {
        item.isChecked = !item.isChecked; 
        console.log(item); 
    }); 
    updateTodoView(); 
    updateAllListeners(); 
    throw "is not updated in database. Use putApiCall, once that is working."; 
}


let updateRemoveListeners = () => {
    for (button of document.getElementsByClassName("remove-todo-button")) {
        button.onclick = removeTodo;
    }
}

let updateCheckListeners = () => {    
    const checkboxes = document.getElementsByClassName("todo-app__checkbox"); 
    if(checkboxes) {
        for (checkbox of checkboxes) {
            checkbox.onchange = () => { 
                checkTodo(checkbox); 
            }
        }
    }
}

let updateTextfieldListeners = () => {
    for(textfield of document.getElementsByClassName("todo-app__textfield")){
        textfield.onchange = itemEdited; 
    }
}

let updateAllListeners = () => {
    updateRemoveListeners(); 
    updateCheckListeners(); 
    updateTextfieldListeners(); 
}

// Listeners
document.getElementById("add-todo-button").onclick = addTodo;
document.onkeydown = (event) => {
                        //enter
    if(event.keyCode === 13) {
        addTodo(); 
    }
}

/**
 * Post data to an API endpoint. If successful (as in, HTTP call was successful, but the response may contain warnings, error messages etc),
 * trigger callbackSuccess with the response object. If not, trigger callbackFailure with the error.
 */
function postApiCall(url, data) {
    $.post({
        url: url,
        data: data,
        dataType: "json",
    })
}

function deleteApiCall(url, data) {
    $.ajax({
        url: url, 
        data : data,
        dataType: "json",
        type: "get"
    }).then((result) => {console.log(result)}); // should be okay to remove this.
}

// combine with get? 
function putApiCall(url, data) {
    console.log(repoUrl); 
    $.ajax({
        url: url,
        data: data,
        dataType: "json",
        type: "put"
    }).then((result) => { console.log(result) }); // should be okay to remove this.
}
