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
     */               
    constructor(text, date, isChecked, id) {
        this.text = text; 
        this.date = date; 
        this.isChecked = isChecked;
        // only give new ID of old one is not supplied 
        this.id = (!id ? new Date().valueOf() : id); // unique id}
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
                id: item.id, 
                type : "TodoItem"
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

/*
"url(http://localhost:8080/admin/tool/com.enonic.xp.app.contentstudio/main/_/asset/com.enonic.xp.app.contentstudio:1529474547/admin/common/images/box-checked.gif)" : "url(http://localhost:8080/admin/tool/com.enonic.xp.app.contentstudio/main/_/asset/com.enonic.xp.app.contentstudio:1529474547/admin/common/images/box-unchecked.gif)"
                    <input class="todo-app__textfield" value="${todo.text}"></input>

*/

/**
 * Runs when an item is changed 
 */
let itemEdited = (event) => {
    const id = event.target.parentNode.children[1].id;
    var todoItem = searchAndApply(id, (item) => {
        item.text = event.target.value; 
        putApiCall(repoUrl, item);
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
        putApiCall(repoUrl, item);
    }); 
    
    updateTodoView(); 
    updateAllListeners(); 
    //throw "is not updated in database. Use putApiCall, once that is working."; 
}


let updateRemoveListeners = () => {
    for (button of document.getElementsByClassName("remove-todo-button")) {
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
    if(event.keyCode === 13) {
        addTodo(); 
    }
}
document.getElementById("todo-app__startButton").onclick = () => {
    document.getElementById("todo-app__startButton").style.display = "none"; 
    document.getElementById("todo-app__container").style.display = "block"; 
    getApiCall(repoUrl, todoItems => updateFromRepo(todoItems.TodoItems)); 
}

let updateFromRepo = (todoItems) => {
    for(let node of todoItems) {
        var data = node.item.data                    // date and isChecked is stored as strings, not as Date/boolean
        registeredTodos.push(new TodoItem(data.text, new Date(data.date), (data.isChecked === "true"), data.id)); 
    }
    updateTodoView();
    updateAllListeners(); 
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
        url: url + "?" + $.param({ id: data.id }),
        type: "delete"
    })
}

// combine with get? 
function putApiCall(url, data) {
    $.ajax({
        url: url,
        data: data,
        dataType: "json",
        type: "put"
    })
}
// gets all items from repo
function getApiCall(url, callback) {
    $.ajax({
        url: url,
        type: "get"
    }).then(callback); 
}
