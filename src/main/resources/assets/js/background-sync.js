/**
 * 1. global variables 
 * 2. functions 
 * 3. listeners
 */




let registeredTodos = [];


let addTodo = () => {
    const now = new Date();
    const inputfield = document.getElementById("add-todo-text");
    const date = now.getDate() + "/" + (now.getMonth() + 1) + "/" + now.getFullYear();

    // Only add if user actually entered something 
    if (inputfield.value !== "") {
        registeredTodos.push({ text: inputfield.value, date: date });
        updateTodoView();
        inputfield.value = "";
    } else {
        // let user know something was wrong 
        inputfield.style.border = "solid red";
        setTimeout(() => {
            inputfield.style.border = "";
        }, 500);
    }
}

let removeTodo = (event) => {
    /**
     * Find the element with DOM api 
     * Loop through register. 
     * Update view 
     */
    throw "not implemented";
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


// Listeners 
document.getElementById("add-todo-button").onclick = addTodo; 
// document.getElementsByClassName("remove-todo-button").onclick = removeTodo; 
for(button of document.getElementsByClassName("remove-todo-button")) {
    button.onclick = removeTodo; 
}

