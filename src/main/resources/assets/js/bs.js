require('../css/styles.less');
require('./../css/background-sync.less');

const SyncHelper = require('./background-sync/sync-helper');

const ToasterInstance = require('./toaster').default;
const IndexedDBInstance = require('./background-sync/db/indexed-db').default;

import TodoItem from './background-sync/db/model';

let syncInProgress = false;
let todoItems;
let ws;

const syncChanges = function() {
    if (navigator.serviceWorker) {
        // chrome, firefox and safari supports
        navigator.serviceWorker.ready.then(function(registration) {
            // Browser supports service worker/background syncing
            if (registration.sync) {
                registration.sync.register(SyncHelper.syncEventTag);
            } else {
                // Browser supports service worker but not background syncing.
                // Sync local changes and set up websocket to listen for changes on the server
                if (!ws) {
                    setupWebSocket();
                }
                syncManually();
            }
        });
    } else {
        // Browser doesn't support service worker/background syncing
        syncManually();
    }
};

const syncManually = function() {
    if (syncInProgress || !navigator.onLine) {
        return;
    }

    syncInProgress = true;

    // Open IndexedDB
    IndexedDBInstance().then(db => {
        SyncHelper.synchronise(db, getSyncServiceUrl()).then(
            showNotification => {
                updateTodoItems();
                syncInProgress = false;
                if (switchedOnline && showNotification) {
                    switchedOnline = false;
                    showToastNotification(ToasterInstance);
                }
            }
        );
    });
};

const updateUI = () => {
    focusIfEmpty();
    updateTodoView();
    updateListenersFor.everything();
};

const updateTodoItems = () =>
    IndexedDBInstance().then(db =>
        SyncHelper.getItemsFromStore(db, SyncHelper.storeNames.offline).then(
            items => {
                items.reverse();
                todoItems = items.map(
                    item =>
                        new TodoItem(
                            item.text,
                            item.date,
                            item.completed,
                            item.id,
                            item.synced
                        )
                );
                updateUI();
            }
        )
    );

const getSyncServiceUrl = () => {
    if (CONFIG && CONFIG.syncServiceUrl) {
        return CONFIG.syncServiceUrl;
    }

    throw new Error('Service for background syncing is not configured!');
};

IndexedDBInstance().then(() => syncChanges());

let beforeLastChange = '';

// window.addEventListener('offline', () => syncChanges());
window.addEventListener('online', () => syncChanges());

const setupWebSocket = () => {
    ws = new WebSocket(sync_data.wsUrl, ['sync_data']);
    ws.onmessage = onWsMessage;

    function onWsMessage(event) {
        if (event.data === 'refresh') {
            syncChanges();
        }
    }
};

/**
 * Search for TodoItem based on ID and use callback
 * @param {string} id item identifier
 */
const searchAndApply = (id, callback) => {
    for (const item of todoItems) {
        if (item.id === parseInt(id, 10)) {
            callback(item);
            break;
        }
    }
};

/**
 * Adds a todo to the list.
 */
const addTodo = () => {
    const inputfield = document.getElementById('add-todo-text');
    // Only add if user actually entered something
    if (inputfield.value.trim() !== '') {
        const item = new TodoItem(inputfield.value, new Date(), false);
        //  todoItems.push(item);
        IndexedDBInstance().then(db => SyncHelper.addToStorage(db, item));
        inputfield.value = '';
        syncChanges();
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
    const id = event.target.id;
    searchAndApply(id, todoItem => {
        IndexedDBInstance().then(db =>
            SyncHelper.markAsDeleted(db, todoItem).then(() => syncChanges())
        );
    });
};

/**
 * Updates the list view
 */
const updateTodoView = () => {
    const outputArea = document.getElementById('todo-app__item-area');
    outputArea.innerHTML = '';
    for (const todo of todoItems) {
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
            syncChanges();
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
    IndexedDBInstance().then(db =>
        SyncHelper.replaceInStorage(db, storeName, changedItem).then(() =>
            syncChanges()
        )
    );
};
const changeLabelToInput = textfield => {
    const label = textfield.innerHTML;
    beforeLastChange = label;
    const parent = textfield.parentNode;
    const id = parent.children[2].id;
    const input = document.createElement('input');
    // storageManager('edit');
    input.className =
        'todo-app__inputfield mdl-textfield__input mdl-cell mdl-cell--7-col';
    input.id = id;
    input.title = 'Click to edit';
    input.value = label;
    parent.replaceChild(input, parent.children[2]);
    input.focus();

    updateListenersFor.inputfields();
};

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
    if (inputfield && todoItems.length <= 0) {
        inputfield.focus();
    }
};

const showToastNotification = () =>
    ToasterInstance().then(toaster =>
        toaster.toast('Offline changes are synced')
    );

/**
 * Listen to serviceworker
 */

if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data.message === 'sw-synced') {
            updateTodoItems();
            if (event.data.notify) {
                SyncHelper.showToastNotification(ToasterInstance);
            }
        }
    });
}
