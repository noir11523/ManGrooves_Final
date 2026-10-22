export function navigationItems(role) {
  const admin=role==='system_admin',guardian=role==='guardian';
  return [
    ['dashboard','Dashboard'],
    ['Reports & Monitoring',[
      ['reports',guardian?'My reports':'All reports'],...(!admin?[['submit','Submit report']]:[]),['report-map','Report map'],['clusters','Mangrove timeline'],...(guardian?[['explore','Explore mangrove sites']]:[])
    ]],
    ['Analytics & Decision Support',[['analytics','Monitoring analytics']]],
    ...(!guardian?[['Mangrove Data',[['species','Species & sites'],...(admin?[['checklist','Health checklist']]:[])]]]:[]),
    ...(admin?[
      ['User Management',[['users','All users'],['expert-applications','Expert applications']]],
      ['Recognition',[['badge-settings','Badges'],['certificate-settings','Certificates']]],
      ['System Management',[['audit','Audit logs']]]
    ]:[['badges','My badges']])
  ];
}
export function renderNavigation(role,route) {
  route=({report:'reports',verification:'reports',history:'reports',cluster:'clusters',growth:'clusters'})[route]||route;
  const link=([key,label])=>`<a class="${route===key?'active':''}" href="#${key}" ${route===key?'aria-current="page"':''}>${label}</a>`;
  return navigationItems(role).map(item=>Array.isArray(item[1])?`<details ${item[1].some(([key])=>key===route)?'open':''}><summary>${item[0]}</summary><nav>${item[1].map(link).join('')}</nav></details>`:link(item)).join('');
}
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
      const controls = [...menu.querySelectorAll('a[href],button:not([disabled]),summary')].filter(control=>!control.closest('details:not([open])') || control===control.closest('details').querySelector('summary'));
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  const resized = () => { if (!viewport.matches) setOpen(false, false); };
  viewport?.addEventListener('change', resized);
  return () => { viewport?.removeEventListener('change', resized); main.inert = false; };
}
