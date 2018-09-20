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

export default TodoItem;
