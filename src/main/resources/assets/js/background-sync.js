/**
 * 1. global variables 
 * 2. functions 
 * 3. listeners
 */

// BUG: remove only runs once. Figure out. 




let registeredTodos = [];

/**
 * Adds a todo to the lsit 
 */
let addTodo = () => {
    const now = new Date();
    const inputfield = document.getElementById("add-todo-text");
    const date = now.getDate() + "/" + (now.getMonth() + 1) + "/" + now.getFullYear();

    // Only add if user actually entered something 
    if (inputfield.value !== "") {
        registeredTodos.push({ text: inputfield.value, date: date });
        updateTodoView();
        updateRemoveListeners(); 
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
 */
let removeTodo = (event) => {    
    /**
     * Find the element with DOM api 
     * Loop through register. 
     * Update view 
     */
    const text = event.target.parentNode.children[0].innerHTML;
    const date = event.target.parentNode.children[1].innerHTML; 
    const removed = {text, date}; // search for this 

    
    for(let i in registeredTodos){
        /*
        console.log(registeredTodos[i].text + " - " + removed.text); 
        console.log(removed.text === registeredTodos[i].text); 
        console.log(registeredTodos[i].date + " - " + removed.date); 
        console.log(removed.date === registeredTodos[i].date); 
        console.log("-----------");
        */

        if (registeredTodos[i].text + " - " + removed.text && removed.date === registeredTodos[i].date) {
            registeredTodos.splice(i, 1);
            updateTodoView();
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
                <input type="checkbox">
                <div>
                    <div>${todo.text}</div>
                    <div>${todo.date}</div>
                    <button class="remove-todo-button">Remove</button>
                </div>
            </div>
        `;
    }
}


let updateRemoveListeners = () => {
    for (button of document.getElementsByClassName("remove-todo-button")) {
        button.onclick = removeTodo;
    }
}


// Listeners
document.getElementById("add-todo-button").onclick = addTodo;
document.onkeydown = (event) => {
                        //enter
    if(event.keyCode === 13) {
        addTodo(); 
    }
}
updateRemoveListeners();