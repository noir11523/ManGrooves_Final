// Keep the small-screen menu usable with touch, a keyboard, and a screen reader.
export function bindMenu(root) {
  const menu = root.querySelector('#site-menu');
  const toggle = root.querySelector('.mobile-menu');
  const close = root.querySelector('.menu-close');
  const backdrop = root.querySelector('.menu-backdrop');
  const main = root.querySelector('.shell-main');
  const viewport = window.matchMedia?.('(max-width: 700px)');
  function setOpen(open, restoreFocus = true) {
    root.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    main.inert = open;
    backdrop.hidden = !open;
    if (open) {
      menu.setAttribute('role', 'dialog');
      menu.setAttribute('aria-modal', 'true');
      close.focus();
    } else {
      menu.removeAttribute('role');
      menu.removeAttribute('aria-modal');
      if (restoreFocus) toggle.focus();
    }
  }
  toggle.onclick = () => setOpen(!root.classList.contains('menu-open'));
  close.onclick = backdrop.onclick = () => setOpen(false);
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false, false);
  });
  root.addEventListener('keydown', event => {
    if (!root.classList.contains('menu-open')) return;
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
    if (event.key === 'Tab') {
      const controls = [...menu.querySelectorAll('a[href],button:not([disabled])')];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  const resized = () => { if (!viewport.matches) setOpen(false, false); };
  viewport?.addEventListener('change', resized);
  return () => { viewport?.removeEventListener('change', resized); main.inert = false; };
}
