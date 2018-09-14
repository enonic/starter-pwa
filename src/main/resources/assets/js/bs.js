require('../css/styles.less');
require('./../css/background-sync.less');

const SyncHelper = require('./libs/background-sync/sync-helper');

const storage = require('./libs/background-sync/storage').default;
const storageManager = require('./libs/background-sync/storage-manager');
const ToasterInstance = require('./libs/toaster').default;

let registeredTodos;

export const updateUI = () => {
    storage.get.offline(SyncHelper.storeNames.offline, items => {
        items.reverse();
        registeredTodos = items.map(
            item =>
                new TodoItem(
                    item.value.text,
                    item.value.date,
                    item.value.completed,
                    item.value.id,
                    item.value.synced
                )
        );
        focusIfEmpty();
        updateTodoView();
        updateListenersFor.everything();
    });
};

// Speparating from the similar listener in app.js
const toggleOnlineStatus = function() {
    updateUI();
    if (navigator.onLine) {
        storageManager('online');
    }
};
toggleOnlineStatus();
let beforeLastChange = '';

window.addEventListener('offline', toggleOnlineStatus);
window.addEventListener('online', toggleOnlineStatus);

const ws = new WebSocket(sync_data.wsUrl, ['sync_data']);
ws.onmessage = onWsMessage;

function onWsMessage(event) {
    if (event.data === 'refresh') {
        storageManager('refresh');
    }
}

storage.get.offline(SyncHelper.storeNames.offline, items => {
    // transform from indexDB-item to TodoItem
    registeredTodos = items.map(
        item =>
            new TodoItem(
                item.value.text,
                item.value.date,
                item.value.completed,
                item.key
            )
    );
});

/**
 * Model of a TodoItem
 */
class TodoItem {
    /**
     *
     * @param {string} text
     * @param {string} date
     * @param {boolean} completed
     */
    constructor(text, date, completed, id, synced) {
        this.text = text;
        this.date = typeof date === 'string' ? new Date(date) : date;
        this.completed = completed;
        // only give new ID of old one is not supplied
        this.id = !id ? new Date().valueOf() : id; // unique id}
        this.synced = !!synced;
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
            (this.date.getHours() < 10 ? '0' : '') +
            this.date.getHours() +
            ':' +
            (this.date.getMinutes() < 10 ? '0' : '') +
            this.date.getMinutes()
        );
    }
}

/**
 * Search for TodoItem based on ID and use callback
 * @param {string} id item identifier
 */
const searchAndApply = (id, callback) => {
    for (const todo of registeredTodos) {
        if (todo.id === parseInt(id, 10)) {
            callback(todo);
        }
    }
};

/**
 * Adds a todo to the list.
 */
const addTodo = () => {
    const inputfield = document.getElementById('add-todo-text');
    // Only add if user actually entered something
    if (inputfield.value !== '') {
        const item = new TodoItem(inputfield.value, new Date(), false);
        registeredTodos.push(item);

        storage.add.offline(SyncHelper.storeNames.offline, item);
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
const removeTodo = event => {
    /* Find the element data with DOM api 
    Loop through register and remove from local 
    Update view */
    // const id = parseInt(event.target.parentNode.children[1].id);
    const id = event.target.id;
    searchAndApply(id, todoItem => {
        storage.add
            .offline(SyncHelper.storeNames.deleted, todoItem, true)
            .then(
                storage.delete.offline(
                    SyncHelper.storeNames.offline,
                    todoItem.id
                )
            );
        updateUI();
    });
};

/**
 * Updates the list view
 */
const updateTodoView = () => {
    const outputArea = document.getElementById('todo-app__item-area');
    outputArea.innerHTML = '';
    for (const todo of registeredTodos) {
        /**
         * Legg på grid
         * mdl-grid
         * mdl-cell mdl-cell--4-col
         */
        const checkedClass = todo.completed ? 'checked' : '';
        outputArea.innerHTML += `
            <li class="todo-app__item mdl-list__item mdl-grid ${checkedClass}">
            
				<input type="checkbox" id="${
                    todo.id
                }" class="todo-app__checkbox mdl-checkbox__input"/>
                <i id="${
                    todo.id
                }" class="todo-app__checkbox mdl-cell mdl-cell--1-col material-icons md-48" title="${
            todo.completed ? 'Mark as incomplete' : 'Mark as completed'
        }">${todo.completed ? 'check_box' : 'check_box_outline_blank'}</i>
                
            	
                <label id="${todo.id}" value="${
            todo.text
        }" class="todo-app__textfield mdl-cell mdl-cell--7-col" title="Click to edit">${
            todo.text
        }</label>
                
                <div class="todo-app__date mdl-cell mdl-cell--2-col">${todo.getFormattedDate()}</div>
                <i class="remove-todo-button mdl-cell mdl-cell--2-col material-icons" title="Delete" id=${
                    todo.id
                }>close</i>
                <i class="todo-app__synced-icon mdl-cell mdl-cell--1-col material-icons" title="${
                    todo.synced
                        ? 'Synced with storage'
                        : 'Not synced to the storage'
                }">${todo.synced ? 'cloud_done' : 'cloud_off'}</i>
            </li>
        `;
    }
    /**
     * <input id="${todo.id}" value="${todo.text}" class="todo-app__textfield mdl-textfield__input mdl-cell mdl-cell--7-col">${todo.text}</input>
     */
    for (const cbox of document.getElementsByClassName('mdl-js-checkbox')) {
        componentHandler.upgradeElements(cbox);
    }
};
/**
 * edits an item based on onclick
 * updates storage
 */
const editItemText = event => {
    const id = event.target.id;
    searchAndApply(id, item => {
        const changedItem = item;
        if (
            !(event.target.value === '') &&
            event.target.value !== beforeLastChange
        ) {
            changedItem.text = event.target.value;
            registerChange(changedItem, SyncHelper.storeNames.offline);
        } else {
            updateUI();
        }
    });
};
/**
 * Takes the DOM element and makes it TodoItem counterpart checked/unchecked
 */
const checkTodo = checkboxElement => {
    const id = checkboxElement.id;
    searchAndApply(id, item => {
        const changedItem = item;
        changedItem.completed = !item.completed;
        registerChange(changedItem, SyncHelper.storeNames.offline);
    });
};
/**
 * Should be run when an item is edited
 * updated changed, sets to not synced and replaces in storage
 * @param item the edited item
 * @param storeName storeName to replaced in (probably SyncHelper.storeNames.offline)
 */
const registerChange = (item, storeName) => {
    const changedItem = item;
    changedItem.changed = true;
    changedItem.synced = false;
    storage.replace.offline(storeName, changedItem);
    updateUI();
};
const changeLabelToInput = textfield => {
    const label = textfield.innerHTML;
    beforeLastChange = label;
    const parent = textfield.parentNode;
    const id = parent.children[2].id;
    const input = document.createElement('input');
    storageManager('edit');
    input.className =
        'todo-app__inputfield mdl-textfield__input mdl-cell mdl-cell--7-col';
    input.id = id;
    input.title = 'Click to edit';
    input.value = label;
    parent.replaceChild(input, parent.children[2]);
    input.focus();

    updateListenersFor.inputfields();
};

// Listeners
// const addButton = document.getElementById('add-todo-button');
// if (addButton) {
//     addButton.onclick = addTodo;
// }
document.getElementById('add-todo-button').onclick = addTodo;
document.getElementById('add-todo-text').addEventListener('keydown', event => {
    // actions on enter
    if (event.keyCode === 13) {
        addTodo();
    }
});

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
        for (const key of Object.keys(updateListenersFor)) {
            if (key !== 'everything') {
                updateListenersFor[key]();
            }
        }
    },
    removeButtons: () => {
        for (const button of document.getElementsByClassName(
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
            for (const checkbox of checkboxes) {
                checkbox.onclick = () => {
                    checkTodo(checkbox);
                };
            }
        }
    },
    textfields: () => {
        for (const textfield of document.getElementsByClassName(
            'todo-app__textfield'
        )) {
            textfield.onclick = () => {
                beforeLastChange = textfield.innerHTML;
                changeLabelToInput(textfield);
            };
        }
    },
    inputfields: () => {
        for (const inputfield of document.getElementsByClassName(
            'todo-app__inputfield'
        )) {
            inputfield.addEventListener('keydown', event => {
                if (event.keyCode === 13) {
                    inputfield.blur();
                } else if (event.keyCode === 27) {
                    // cancel the change
                    document.activeElement.value = beforeLastChange;
                    document.activeElement.blur();
                }
            });

            inputfield.onblur = editItemText;
        }
    },
    materialItems: () => {
        for (const item of document.getElementsByClassName('todo-app__item')) {
            componentHandler.upgradeElements(item);
        }
    }
};

const focusIfEmpty = () => {
    const inputfield = document.getElementById('add-todo-text');
    if (inputfield && registeredTodos.length <= 0) {
        inputfield.focus();
    }
};

/**
 * Listen to serviceworker
 */
if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data.message === 'synced') {
            updateUI('serviceworker');
        } else if (event.data === 'showSyncMessage') {
            SyncHelper.showToastNotification(ToasterInstance);
        }
    });
}
