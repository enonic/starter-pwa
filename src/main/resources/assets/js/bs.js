import {
    storeNames,
    syncEventTag,
    addToStorage,
    markAsDeleted,
    replaceInStorage,
    pullServerChanges,
    pushLocalChanges
} from './background-sync/sync-helper';

import ToasterInstance from './toaster';
import { debounce } from './util';
import IndexedDBInstance from './background-sync/db/indexed-db';

import TodoItem from './background-sync/db/model';

let pushInProgress = false;
let hasOfflineChanges = false;
let todoItems;
let lastItemName = '';
let backgroundSyncSupported = false;

const fetchItemsFromServerAndRender = debounce(
    () =>
        IndexedDBInstance().then((db) =>
            pullServerChanges(db, getSyncServiceUrl()).then((items) => {
                createTodoItems(items);
                renderTodoItems();
            })
        ),
    100,
    false
);

const pushChanges = function () {
    if (!navigator.onLine) {
        hasOfflineChanges = true;
    }
    if (navigator.serviceWorker) {
        // Browser supports service worker
        navigator.serviceWorker.ready.then(function (registration) {
            if (registration.sync) {
                // Browser supports background syncing
                backgroundSyncSupported = true;
                registration.sync.register(syncEventTag);
            } else {
                // Browser supports service worker but not background syncing.
                pushManually();
            }
        });
    } else {
        // Browser doesn't support service worker/background syncing
        pushManually();
    }
};

const pushManually = function () {
    if (pushInProgress || !navigator.onLine) {
        return;
    }

    pushInProgress = true;

    IndexedDBInstance().then((db) => {
        pushLocalChanges(db, getSyncServiceUrl()).then((changesMade) => {
            pushInProgress = false;
            if (changesMade) {
                fetchItemsFromServerAndRender();
                if (hasOfflineChanges) {
                    showToastNotification();
                    hasOfflineChanges = false;
                }
            }
        });
    });
};

const updateUI = () => {
    focusNewTodoField();
    updateTodoView();
    updateListenersFor.everything();
};

const createTodoItems = (items) => {
    todoItems = items.map(
        (item) =>
            new TodoItem(
                item.text,
                item.date,
                item.completed,
                item.id,
                item.synced
            )
    );
};

const renderTodoItems = () => {
    todoItems.sort((a1, a2) => (a1.date < a2.date ? 1 : -1));
    updateUI();
};

const getSyncServiceUrl = () => {
    if (CONFIG && CONFIG.syncServiceUrl) {
        return CONFIG.syncServiceUrl;
    }

    throw new Error('Service for background syncing is not configured!');
};

/**
 * Search for TodoItem based on ID and use callback
 * @param {string} id item identifier
 */
const searchAndApply = (id, callback) => {
    const i = parseInt(id, 10);
    for (const item of todoItems) {
        if (item.id === i) {
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
        todoItems.push(item);
        renderTodoItems();
        IndexedDBInstance().then((db) =>
            addToStorage(db, item).then(() => {
                pushChanges();
            })
        );
    } else {
        // let user know something was wrong
        inputfield.style.borderColor = '#f44336';
        setTimeout(() => {
            inputfield.style.border = '';
        }, 500);
    }
    inputfield.value = '';
};

/**
 * Removes the item associated with the clicked button
 * @param event may be event or TodoItem
 */
const removeTodo = (event) => {
    searchAndApply(event.target.id, (todoItem) => {
        const removeIndex = todoItems.findIndex(
            (item) => item.id === todoItem.id
        );
        todoItems.splice(removeIndex, 1);
        renderTodoItems();

        IndexedDBInstance().then((db) =>
            markAsDeleted(db, todoItem).then(() => pushChanges())
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
const editItemText = (event) => {
    const id = event.target.id;
    searchAndApply(id, (item) => {
        const changedItem = item;
        if (
            event.target.value.trim() !== '' &&
            event.target.value.trim() !== lastItemName
        ) {
            changedItem.text = event.target.value;
            registerChange(changedItem, storeNames.offline);
        }
    });
};
/**
 * Takes the DOM element and makes it TodoItem counterpart checked/unchecked
 */
const checkTodo = (checkboxElement) => {
    const id = checkboxElement.id;
    searchAndApply(id, (item) => {
        const changedItem = item;
        changedItem.completed = !item.completed;
        registerChange(changedItem, storeNames.offline);
    });
};
/**
 * Should be run when an item is edited
 * updated changed, sets to not synced and replaces in storage
 * @param item the edited item
 * @param storeName storeName to replaced in (probably storeNames.offline)
 */
const registerChange = (item, storeName) => {
    const changedItem = item;
    changedItem.changed = true;
    changedItem.synced = false;
    IndexedDBInstance().then((db) =>
        replaceInStorage(db, storeName, changedItem).then(() => {
            pushChanges();
            renderTodoItems();
        })
    );
};
const changeLabelToInput = (textfield) => {
    const label = textfield.innerHTML;
    lastItemName = label;
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
                lastItemName = textfield.innerHTML;
                changeLabelToInput(textfield);
            };
        }
    },
    inputfields: () => {
        for (const inputfield of document.getElementsByClassName(
            'todo-app__inputfield'
        )) {
            inputfield.addEventListener('keydown', (event) => {
                if (event.keyCode === 13) {
                    inputfield.blur();
                } else if (event.keyCode === 27) {
                    // cancel the change
                    document.activeElement.value = lastItemName;
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

const focusNewTodoField = () => {
    const inputfield = document.getElementById('add-todo-text');
    if (inputfield && todoItems.length <= 0) {
        inputfield.focus();
    }
};

const showToastNotification = () =>
    ToasterInstance().then((toaster) =>
        toaster.toast('Offline changes are synced')
    );

(function () {
    // Whenever data is updated on the server, websocket will notify
    // all clients so that they could fetch it and update UI
    const ws = new WebSocket(sync_data.wsUrl, ['sync_data']);
    ws.onmessage = (e) => {
        if (e.data === 'refresh' && !pushInProgress) {
            fetchItemsFromServerAndRender();
        }
    };

    window.addEventListener('online', () => {
        if (!hasOfflineChanges) {
            // If there were no changes made offline we still need to fetch
            // new data from server in case it was changed while we were offline
            fetchItemsFromServerAndRender();
            hasOfflineChanges = false;
        } else if (!backgroundSyncSupported) {
            // If background sync is not supported and some
            // changes were made offline, push them manually
            pushManually();
        }
    });

    /**
     * Listen to serviceworker
     */

    if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.message === 'sw-sync-start') {
                pushInProgress = true;
            }
            if (event.data.message === 'sw-sync-end') {
                fetchItemsFromServerAndRender();
                pushInProgress = false;
                if (event.data.notify && hasOfflineChanges) {
                    hasOfflineChanges = false;
                    showToastNotification();
                }
            }
        });
    }

    window.addEventListener('load', function () {
        fetchItemsFromServerAndRender();

        document.getElementById('add-todo-button').onclick = addTodo;
        document
            .getElementById('add-todo-text')
            .addEventListener('keydown', (event) => {
                // actions on enter
                if (event.keyCode === 13) {
                    addTodo();
                }
            });
    });
})();
