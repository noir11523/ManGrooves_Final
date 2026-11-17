// Move whole cards, retaining file inputs, IDs and unsaved values. Pointer events
// support touch as well as mouse; arrow keys provide a keyboard alternative.
export function choiceOrder(grid, selector) {
  const cards=()=>[...grid.children].filter(el=>el.matches(selector));
  for(const card of cards()) {
    const handle=document.createElement('button');handle.type='button';handle.className='choice-drag-handle';
    handle.textContent='☰';handle.setAttribute('aria-label','Move choice. Drag or use arrow keys.');card.prepend(handle);
    card.querySelectorAll('img').forEach(image=>image.draggable=false);
    handle.onkeydown=event=>{const list=cards(),i=list.indexOf(card),step=['ArrowLeft','ArrowUp'].includes(event.key)?-1:['ArrowRight','ArrowDown'].includes(event.key)?1:0;
      if(!step)return;event.preventDefault();const target=list[i+step];if(target){grid.insertBefore(card,step<0?target:target.nextSibling);handle.focus();grid.dispatchEvent(new Event('choiceorder'));}};
    handle.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();handle.setPointerCapture?.(event.pointerId);card.classList.add('choice-dragging');
      handle.onpointermove=move=>{const target=document.elementFromPoint(move.clientX,move.clientY)?.closest(selector);if(!target||target===card||target.parentElement!==grid)return;
        const list=cards();grid.insertBefore(card,list.indexOf(target)<list.indexOf(card)?target:target.nextSibling);};
      const end=()=>{card.classList.remove('choice-dragging');handle.onpointermove=null;handle.onpointerup=null;handle.onpointercancel=null;grid.dispatchEvent(new Event('choiceorder'));};
      handle.onpointerup=end;handle.onpointercancel=end;
    };
  }
}
