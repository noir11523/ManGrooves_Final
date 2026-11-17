import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {choiceOrder} from '../src/choice-order.js';
test('mouse/touch handles and keyboard move whole cards only inside their category',()=>{
 const dom=new JSDOM('<div id="grid"><div class="choice" data-id="1"><img><input value="Green"><input type="file"></div><div class="choice" data-id="2"><input value="Yellow"></div></div><div class="choice" id="outside"></div>');
 globalThis.document=dom.window.document;globalThis.Event=dom.window.Event;
 const grid=document.querySelector('#grid'),first=grid.firstElementChild,second=grid.lastElementChild,file=first.querySelector('[type=file]');
 choiceOrder(grid,'.choice');const handle=first.querySelector('button');assert.equal(first.querySelector('img').draggable,false);
 handle.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));
 assert.equal(grid.lastElementChild,first);assert.equal(first.querySelector('[type=file]'),file);assert.equal(first.querySelector('input').value,'Green');
 document.elementFromPoint=()=>second;
 handle.onpointerdown({button:0,pointerId:1,preventDefault(){}});assert.ok(first.classList.contains('choice-dragging'));
 handle.onpointermove({clientX:0,clientY:0});assert.equal(grid.firstElementChild,first);
 document.elementFromPoint=()=>document.querySelector('#outside');handle.onpointermove({clientX:0,clientY:0});assert.equal(first.parentElement,grid);
 handle.onpointerup();assert.equal(first.classList.contains('choice-dragging'),false);dom.window.close();
});
