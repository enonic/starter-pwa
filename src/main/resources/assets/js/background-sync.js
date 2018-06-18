// Listeners 
document.getElementById("add-todo-button").onclick = (event) => {
    const now = new Date(); 
    const text = document.getElementById("add-todo-text").value; 
    const date = now.getDay() + "/" + (now.getMonth() + 1) + "/" + now.getFullYear(); 

    let outputArea = document.getElementById("todo-app__item-area"); 

    outputArea.innerHTML += `
        <div class="todo-app__item">
            <input type="checkbox">
            <div>
                <div>${text}</div>
                <div>${date}</div>
            </div>
        </div>
    `;
}