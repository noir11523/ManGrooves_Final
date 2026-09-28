const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function editor() {
    const node = (value = '') => ({value, hidden: false, disabled: false, textContent: '', focus() { this.focused = true; }});
    const list = {children: [], events: {}, addEventListener(name, fn) { this.events[name] = fn; },
        querySelectorAll() { return this.children.map(c => c.querySelector('[data-choice-deleted]')); }};
    function card(id) {
        const fields = Object.fromEntries(['id', 'deleted', 'fields', 'heading', 'kind', 'label', 'points', 'points-wrap', 'rule'].map(k => [`[data-choice-${k}]`, node()]));
        fields['[data-choice-id]'].value = String(id);
        fields['[data-choice-deleted]'].value = '0';
        const result = {querySelector: key => fields[key], remove() { list.children.splice(list.children.indexOf(this), 1); }};
        const button = node(); button.closest = () => result;
        result.clickDelete = () => list.events.click({target: {closest: () => button}});
        const kind = fields['[data-choice-kind]']; kind.closest = () => result; kind.matches = () => true;
        result.changeKind = value => { kind.value = value; list.events.change({target: kind}); };
        return result;
    }
    list.children.push(card(1), card(2));
    list.insertAdjacentHTML = (_, html) => { list.children.push(card(Number(html.match(/id="(-?\d+)"/)[1]))); };
    Object.defineProperty(list, 'lastElementChild', {get: () => list.children.at(-1)});
    const add = {addEventListener(_, fn) { this.click = fn; }};
    const message = node();
    const form = {querySelector: key => ({'[data-choice-list]': list, '[data-add-choice]': add, '[data-choice-message]': message, '[data-choice-template]': {innerHTML: '<div id="__ID__" data-index="__INDEX__"></div>'}}[key])};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/assets/js/checklist-editor.js'), 'utf8'), {document: {querySelectorAll: () => [form]}});
    return {list, add, message};
}

test('delete is staged, hidden fields survive submission and Undo restores editable fields', () => {
    const {list} = editor(); const first = list.children[0];
    first.clickDelete();
    assert.equal(first.querySelector('[data-choice-deleted]').value, '1');
    assert.equal(first.querySelector('[data-choice-fields]').disabled, true);
    assert.equal(first.querySelector('[data-choice-fields]').hidden, true);
    assert.equal(first.querySelector('[data-choice-id]').value, '1');
    first.clickDelete();
    assert.equal(first.querySelector('[data-choice-deleted]').value, '0');
    assert.equal(first.querySelector('[data-choice-fields]').disabled, false);
    assert.equal(first.querySelector('[data-choice-fields]').hidden, false);
});

test('new choices use unique temporary IDs even after deletion and receive focus', () => {
    const {list, add} = editor(); add.click(); const first = list.lastElementChild;
    assert.equal(first.querySelector('[data-choice-label]').focused, true);
    const id = first.querySelector('[data-choice-id]').value;
    first.clickDelete(); assert.equal(list.children.length, 2);
    add.click(); assert.notEqual(list.lastElementChild.querySelector('[data-choice-id]').value, id);
    for (let i = 0; i < 40; i++) add.click();
    assert.equal(list.children.length, 30);
});

test('automatic answer types keep labels editable and use their scoring rule', () => {
    const {list, add} = editor(); add.click(); const choice = list.lastElementChild;
    choice.changeKind('unknown');
    assert.equal(choice.querySelector('[data-choice-label]').value, 'Not Sure');
    assert.equal(choice.querySelector('[data-choice-points-wrap]').hidden, true);
    assert.equal(choice.querySelector('[data-choice-points]').value, '0');
    assert.equal(choice.querySelector('[data-choice-label]').disabled, false);
    choice.changeKind('all_of_the_above');
    assert.equal(choice.querySelector('[data-choice-label]').value, 'All of the above');
    choice.changeKind('standard');
    assert.equal(choice.querySelector('[data-choice-points-wrap]').hidden, false);
    assert.equal(choice.querySelector('[data-choice-points]').required, true);
});
