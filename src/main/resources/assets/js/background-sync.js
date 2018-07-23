/* eslint no-use-before-define: 0 */ // --> OFF, as some functions here are two-way-dependent
/* eslint no-undef: 0 */ // --> OFF, so md-lite's componenthandler will work
/* eslint no-restricted-syntax: 0 */ // --> OFF
/* eslint no-console: 0 */ // --> OFF

const storage = require('./libs/background-sync/storage').default;
const storageManager = require('./libs/background-sync/storage-manager');
const storeNames = {
    offline: 'OfflineStorage',
    deletedWhileOffline: 'DeletedWhileOffline'
};
let registeredTodos;

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
    updateUI('startbutton');
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
        this.date = typeof date === 'string' ? new Date(date) : date;
        this.isChecked = isChecked;
        // only give new ID of old one is not supplied
        this.id = !id ? new Date().valueOf() : id; // unique id}
        this.synced = !synced ? false : synced;
        this.type = 'TodoItem';
        this.changed = false;
    }

    getFormattedDate() {
        return (
            '' +
            this.date.getDate() +
            '/' +
            (this.date.getMonth() + 1) +
            '/' +
            this.date.getFullYear() +
            ' ' +
            this.date.getHours() +
            ':' +
            this.date.getMinutes()
        );
    }
}

/**
 * Search for TodoItem based on ID and use callback
 * @param {string} id item identifier
 */
let searchAndApply = (id, callback) => {
    for (let todo of registeredTodos) {
        if (todo.id === id) {
            callback(todo);
        }
    }
};

/**
 * Adds a todo to the list.
 */
let addTodo = () => {
    const inputfield = document.getElementById('add-todo-text');
    // Only add if user actually entered something
    if (inputfield.value !== '') {
        const item = new TodoItem(inputfield.value, new Date(), false);
        registeredTodos.push(item);

        storage.add.offline(storeNames.offline, item);
        inputfield.value = '';
        updateUI();
    } else {
        // let user know something was wrong
        inputfield.style.borderColor = '#f44336';
        setTimeout(() => {
            inputfield.style.border = '';
        }, 500);
    }
};

/**
 * Removes the item associated with the clicked button
 * @param event may be event or TodoItem
 */
let removeTodo = event => {
    /* Find the element data with DOM api 
    Loop through register and remove from local 
    Update view */
    // const id = parseInt(event.target.parentNode.children[1].id);
    const id = event.target.id;
    searchAndApply(id, todoItem => {
        storage.add
            .offline(storeNames.deletedWhileOffline, todoItem, true)
            .then(storage.delete.offline(storeNames.offline, todoItem.id))
            .then(updateUI());

        // do not check more items than neccecary
    });
};

/**
 * Updates the list view
 * NOTE: Updates all elements regardless. Must be imrpoved later
 */
let updateTodoView = () => {
    let outputArea = document.getElementById('todo-app__item-area');
    outputArea.innerHTML = '';
    for (let todo of registeredTodos) {
        /**
         * Legg på grid
         * mdl-grid
         * mdl-cell mdl-cell--4-col
         */
        outputArea.innerHTML += `
            <li class="todo-app__item mdl-list__item mdl-grid>
            
				<input type="checkbox" id="${
                    todo.id
                }" class="todo-app__checkbox mdl-checkbox__input" style="color: ${
            todo.isChecked ? 'grey' : ''
        }"/>
                <i id="${
                    todo.id
                }" class="todo-app__checkbox mdl-cell mdl-cell--1-col material-icons md-48">${
            todo.isChecked ? 'check_box' : 'check_box_outline_blank'
        }</i>
                
            	
                <label id="${todo.id}" value="${
            todo.text
        }" class="todo-app__textfield mdl-cell mdl-cell--7-col">${
            todo.text
        }</label>
                
                <div class="todo-app__date mdl-cell mdl-cell--2-col">${todo.getFormattedDate()}</div>
                <i class="remove-todo-button mdl-cell mdl-cell--2-col material-icons" id=${
                    todo.id
                }>close</i>
                <i class="todo-app__synced-icon mdl-cell mdl-cell--1-col material-icons" style="color: black;">${
                    todo.synced ? 'cloud_done' : 'cloud_off'
                }</i>
            </li>
        `;
    }
    /**
     * <input id="${todo.id}" value="${todo.text}" class="todo-app__textfield mdl-textfield__input mdl-cell mdl-cell--7-col">${todo.text}</input>
     */
    for (let cbox of document.getElementsByClassName('mdl-js-checkbox')) {
        componentHandler.upgradeElements(cbox);
    }
};
/**
 * edits an item based on onclick
 * updates storage
 */
let editItemText = event => {
    const id = event.target.id;
    searchAndApply(id, item => {
        let changedItem = item;
        if (!(event.target.value === '')) {
            changedItem.text = event.target.value;
        }
        registerChange(changedItem, storeNames.offline);
    });
};
/**
 * Takes the DOM element and makes it TodoItem counterpart checked/unchecked
 */
let checkTodo = checkboxElement => {
    const id = checkboxElement.id;
    searchAndApply(id, item => {
        let changedItem = item;
        changedItem.isChecked = !item.isChecked;
        registerChange(changedItem, storeNames.offline);
    });
};
/**
 * Should be run when an item is edited
 * updated changed, sets to not synced and replaces in storage
 * @param item the edited item
 * @param storeName storeName to replaced in (probably storeNames.offline)
 */
let registerChange = (item, storeName) => {
    let changedItem = item;
    changedItem.changed = true;
    changedItem.synced = false;
    storage.replace.offline(storeName, changedItem);
    updateUI('registerchange');
};
let changeLabelToInput = textfield => {
    let label = textfield.innerHTML;
    let parent = textfield.parentNode;
    let id = parent.children[1].id;
    let input = document.createElement('input');
    storageManager('edit');
    input.className =
        'todo-app__inputfield mdl-textfield__input mdl-cell mdl-cell--7-col';
    input.id = id;
    input.value = label;
    parent.replaceChild(input, parent.children[1]);
    input.focus();

    updateListenersFor.inputfields();
};
// Listeners
document.getElementById('add-todo-button').onclick = addTodo;
document.onkeydown = event => {
    // enter
    const inputfield = document.getElementById('add-todo-text');
    // actions on enter
    if (event.keyCode === 13) {
        // adding an item
        if (document.activeElement === inputfield) {
            addTodo();
            // changing an item
        } else if (
            document.activeElement.className
                .split(' ')
                .includes('todo-app__inputfield')
        ) {
            // changing is triggered onblur in updateListenersFor.inputfields
            document.activeElement.blur();
        }
    }
};
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
        for (let key of Object.keys(updateListenersFor)) {
            if (key !== 'everything') {
                updateListenersFor[key]();
            }
        }
    },
    removeButtons: () => {
        for (let button of document.getElementsByClassName(
            'remove-todo-button'
        )) {
            button.onclick = removeTodo;
        }
    },
    checkboxes: () => {
        const checkboxes = document.getElementsByClassName(
            'todo-app__checkbox'
        );
        if (checkboxes) {
            for (let checkbox of checkboxes) {
                checkbox.onclick = () => {
                    checkTodo(checkbox);
                };
            }
        }
    },
    textfields: () => {
        for (let textfield of document.getElementsByClassName(
            'todo-app__textfield'
        )) {
            textfield.onclick = () => changeLabelToInput(textfield);
        }
    },
    inputfields: () => {
        for (let inputfield of document.getElementsByClassName(
            'todo-app__inputfield'
        )) {
            inputfield.onblur = editItemText;
        }
    },
    materialItems: () => {
        for (let item of document.getElementsByClassName('todo-app__item')) {
            componentHandler.upgradeElements(item);
        }
    }
};
export let updateUI = () => {
    storage.get.offline(storeNames.offline, items => {
        items.reverse();
        registeredTodos = items.map(
            item =>
                new TodoItem(
                    item.value.text,
                    item.value.date,
                    item.value.isChecked,
                    item.value.id,
                    item.value.synced
                )
        );
        updateTodoView();
        updateListenersFor.everything();
    });
};
/**
 * Listen to serviceworker
 */
if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data.message === 'synced') {
            updateUI('serviceworker');
        }
    });
}

// REFACTORY RETRY
// const storage = require('./libs/background-sync/storage').default;
// const storageManager = require('./libs/background-sync/storage-manager');
// require('./background-sync');
// const storeNames = {
//     offline: 'OfflineStorage',
//     deletedWhileOffline: 'DeletedWhileOffline'
// };

// export let registeredTodos = [];

// /**
//  * Model of a TodoItem
//  */
// class TodoItem {
//     /**
//      *
//      * @param {string} text
//      * @param {string} date
//      * @param {boolean} isChecked
//      */

//     constructor(text, date, isChecked, id, synced) {
//         this.text = text;
//         this.date = typeof date === 'string' ? new Date(date) : date;
//         this.isChecked = isChecked;
//         // only give new ID of old one is not supplied
//         this.id = !id ? new Date().valueOf() : id; // unique id}
//         this.synced = !synced ? false : synced;
//         this.type = 'TodoItem';
//         this.changed = false;
//     }

//     getFormattedDate() {
//         return (
//             '' +
//             this.date.getDate() +
//             '/' +
//             (this.date.getMonth() + 1) +
//             '/' +
//             this.date.getFullYear() +
//             ' ' +
//             this.date.getHours() +
//             ':' +
//             this.date.getMinutes()
//         );
//     }
// }

// /**
//  * Search for TodoItem based on ID and use callback
//  * @param {string} id item identifier
//  */
// let searchAndApply = (id, callback) => {
//     registeredTodos.forEach(todo => {
//         if (todo.id === id) {
//             callback(todo);
//         }
//     });
// };

// /**
//  * Updates the list view
//  * NOTE: Updates all elements regardless. Must be imrpoved later
//  */
// let updateTodoView = () => {
//     let outputArea = document.getElementById('todo-app__item-area');
//     outputArea.innerHTML = '';
//     registeredTodos.forEach(todo => {
//         outputArea.innerHTML += `
//             <li class="todo-app__item mdl-list__item mdl-grid>

// 				<input type="checkbox" id="${
//                     todo.id
//                 }" class="todo-app__checkbox mdl-checkbox__input" style="color: ${
//             todo.isChecked ? 'grey' : ''
//         }"/>
//                 <i id="${
//                     todo.id
//                 }" class="todo-app__checkbox mdl-cell mdl-cell--1-col material-icons md-48">${
//             todo.isChecked ? 'check_box' : 'check_box_outline_blank'
//         }</i>

//                 <label id="${todo.id}" value="${
//             todo.text
//         }" class="todo-app__textfield mdl-cell mdl-cell--7-col">${
//             todo.text
//         }</label>

//                 <div class="todo-app__date mdl-cell mdl-cell--2-col">${todo.getFormattedDate()}</div>
//                 <i class="remove-todo-button mdl-cell mdl-cell--2-col material-icons" id=${
//                     todo.id
//                 }>close</i>
//                 <i class="todo-app__synced-icon mdl-cell mdl-cell--1-col material-icons" style="color: black;">${
//                     todo.synced ? 'cloud_done' : 'cloud_off'
//                 }</i>
//             </li>
//         `;
//     });

//     let checkboxElements = document.getElementsByClassName('mdl-js-checkbox')
//     Array.prototype.forEach.call(checkboxElements, function (cbox) {
//         componentHandler.upgradeElements(cbox)
//     });
// };

// export let updateUI = () => {
//     storage.get.offline(storeNames.offline, items => {
//         items.reverse();
//         registeredTodos = items.map(
//             item =>
//                 new TodoItem(
//                     item.value.text,
//                     item.value.date,
//                     item.value.isChecked,
//                     item.value.id,
//                     item.value.synced
//                 )
//         );
//         updateTodoView();
//         updateListenersFor.everything();
//     });
// };

// /**
//  * Should be run when an item is edited
//  * updated changed, sets to not synced and replaces in storage
//  * @param item the edited item
//  * @param storeName storeName to replaced in (probably storeNames.offline)
//  */
// let registerChange = (item, storeName) => {
//     let changedItem = item;
//     changedItem.changed = true;
//     changedItem.synced = false;
//     storage.replace.offline(storeName, changedItem);
//     updateUI('registerchange');
// };

// /**
//  * edits an item based on onclick
//  * updates storage
//  */
// let editItemText = event => {
//     const id = event.target.id;
//     searchAndApply(id, item => {
//         let changedItem = item;
//         if (!(event.target.value === '')) {
//             changedItem.text = event.target.value;
//         }
//         registerChange(changedItem, storeNames.offline);
//     });
// };

// /**
//  * Takes the DOM element and makes it TodoItem counterpart checked/unchecked
//  */
// let checkTodo = checkboxElement => {
//     const id = checkboxElement.id;
//     searchAndApply(id, item => {
//         let checkedItem = item;
//         checkedItem.isChecked = !item.isChecked;

//         registerChange(checkedItem, storeNames.offline);
//     });
// };
// /**
//  * Removes the item associated with the clicked button
//  * @param event may be event or TodoItem
//  */
// let removeTodo = event => {
//     /* Find the element data with DOM api
//     Loop through register and remove from local
//     Update view */

//     const id = event.target.id;
//     searchAndApply(id, todoItem => {
//         storage.add
//             .offline(storeNames.deletedWhileOffline, todoItem, true)
//             .then(storage.delete.offline(storeNames.offline, todoItem.id))
//             .then(updateUI());

//         // do not check more items than neccecary
//     });
// };

// let changeLabelToInput = (textfield, updater) => {
//     let label = textfield.innerHTML;
//     let parent = textfield.parentNode;
//     let id = parent.children[1].id;
//     let input = document.createElement('input');

//     storageManager('edit');

//     input.className =
//         'todo-app__inputfield mdl-textfield__input mdl-cell mdl-cell--7-col';
//     input.id = id;
//     input.value = label;
//     parent.replaceChild(input, parent.children[1]);

//     input.focus();

//     updater(); // refactored to this to make linter happy. changelabeltoinput was depending on updatelisteners as well as the other way around
// };

// /**
//  * Methods for updating listeners
//  * By wrapping in objects, a call to one of
//  * the methods will feel like reading a sentence.
//  * Hopefully, this makes the code more readable.
//  * i.e. updateListenersfor.checkboxes => "update listeners for checkboxes"
//  */
// const updateListenersFor = {
//     /**
//      * Runs every update method except for itself
//      */
//     everything: () => {
//         Object.keys(updateListenersFor).forEach(
//             key => (key !== 'everything' ? updateListenersFor[key]() : null)
//         );
//     },
//     removeButtons: () => {
//         // document
//         //     .getElementsByClassName('remove-todo-button')
//         //     .forEach(button => {
//         //         button.onclick = removeTodo;
//         //     });

//         let removeButtonElements = document.getElementsByClassName("remove-todo-button");
//         Array.prototype.forEach.call(removeButtonElements, button => {
//             button.onclick = removeTodo;
//         });
//     },
//     checkboxes: () => {
//         const checkboxes = document.getElementsByClassName(
//             'todo-app__checkbox'
//         );
//         if (checkboxes) {
//             // checkboxes.forEach(checkbox => {
//             //     checkbox.onclick = () => {
//             //         checkTodo(checkbox);
//             //     };
//             // });
//             Array.prototype.forEach.call(checkboxes, checkbox => {
//                 checkbox.onclick = () => {
//                     checkTodo(checkbox);
//                 }
//             });
//         }
//     },
//     inputfields: () => {
//         for (let inputfield of document.getElementsByClassName(
//             'todo-app__inputfield'
//         )) {
//             inputfield.onblur = editItemText;
//         }
//     },
//     textfields: () => {
//         // document
//         //     .getElementsByClassName('todo-app__textfield')
//         //     .forEach(textfield => {
//         //         textfield.onclick = () =>
//         //             changeLabelToInput(
//         //                 textfield,
//         //                 updateListenersFor.inputfields
//         //             );
//         //     });
//         let textfields = document.getElementsByClassName('todo-app__textfield');
//         Array.prototype.forEach.call(textfields, textfield => {
//             textfield.onclick = () => {
//                 changeLabelToInput(textfield, updateListenersFor.inputfields);
//             }
//         })
//     },
//     materialItems: () => {
//         document.getElementsByClassName('todo-app__item').forEach(item => {
//             componentHandler.upgradeElements(item);
//         });
//     }
// };

// // NOTE: Dette sto før når man klikket på knappen.
// // Det kjører, men fungerer ikke fordi error med IDB
// storage.get.offline(storeNames.offline, items => {
//     // transform from indexDB-item to TodoItem
//     registeredTodos = items.map(
//         item =>
//             new TodoItem(
//                 item.value.text,
//                 item.value.date,
//                 item.value.isChecked,
//                 item.value.id
//             )
//     );
//     updateUI('startbutton');
// });

// /**
//  * Adds a todo to the list.
//  */
// let addTodo = () => {
//     const inputfield = document.getElementById('add-todo-text');
//     // Only add if user actually entered something
//     if (inputfield.value !== '') {
//         const item = new TodoItem(inputfield.value, new Date(), false);
//         registeredTodos.push(item);

//         storage.add.offline(storeNames.offline, item);
//         inputfield.value = '';
//         updateUI();
//     } else {
//         // let user know something was wrong
//         inputfield.style.borderColor = '#f44336';
//         setTimeout(() => {
//             inputfield.style.border = '';
//         }, 500);
//     }
// };

// // Listeners
// document.getElementById('add-todo-button').onclick = addTodo;
// document.onkeydown = event => {
//     // enter
//     const inputfield = document.getElementById('add-todo-text');

//     // actions on enter
//     if (event.keyCode === 13) {
//         // adding an item
//         if (document.activeElement === inputfield) {
//             addTodo();
//             // changing an item
//         } else if (
//             document.activeElement.className
//                 .split(' ')
//                 .includes('todo-app__inputfield')
//         ) {
//             // changing is triggered onblur in updateListenersFor.inputfields
//             document.activeElement.blur();
//         }
//     }
// };

// /**
//  * Listen to serviceworker
//  */
// if (navigator.serviceWorker) {
//     navigator.serviceWorker.addEventListener('message', event => {
//         if (event.data.message === 'synced') {
//             updateUI('serviceworker');
//         }
//     });
// }
