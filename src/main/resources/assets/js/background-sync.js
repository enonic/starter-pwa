// Listeners 
document.getElementById("add-todo-button").onclick = (event) => {
    const now = new Date(); 
    const inputfield = document.getElementById("add-todo-text"); 
    const date = now.getDay() + "/" + (now.getMonth() + 1) + "/" + now.getFullYear(); 

    let outputArea = document.getElementById("todo-app__item-area"); 

    // Only add if user actually entered something 
    if(inputfield.value !== "") {
        outputArea.innerHTML += `
            <div class="todo-app__item">
                <input type="checkbox">
                <div>
                    <div>${inputfield.value}</div>
                    <div>${date}</div>
                </div>
            </div>
        `;

        //empty the field 
        inputfield.value = ""; 
    } else {
        // let user know something was wrong 
        inputfield.style.border = "solid red"; 
        setTimeout(() => {
            inputfield.style.border = "";
        }, 500); 
    }

    
}