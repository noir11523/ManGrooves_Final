export function updateNotificationBell(data,doc=document) {
  const count=Math.max(0,Number(data.unread)||0);
  for(const bell of doc.querySelectorAll('[data-notification-bell]')){
    bell.setAttribute('aria-label',count?`Notifications, ${count} unread`:'Notifications');
    let badge=bell.querySelector('.notification-count');
    if(!badge){badge=doc.createElement('span');badge.className='notification-count';badge.setAttribute('aria-hidden','true');bell.append(badge);}
    badge.hidden=count===0;badge.textContent=count>99?'99+':String(count);
  }
}

export function watchNotifications({load,doc=document,win=window,interval=20000}) {
  let stopped=false,busy=false,revision=null;
  const refresh=async()=>{
    if(stopped||busy||doc.hidden||win.navigator.onLine===false)return;
    busy=true;
    try{
      const data=await load();if(stopped)return;
      updateNotificationBell(data,doc);
      const next=data.revision??`${data.unread}:${data.total}`;
      if(next!==revision){revision=next;doc.dispatchEvent(new win.CustomEvent('mangrooves:notifications-updated',{detail:data}));}
    }catch(error){if([401,403].includes(error.status))stop();}
    finally{busy=false;}
  };
  const local=event=>{if(event.detail)updateNotificationBell(event.detail,doc);void refresh();};
  const leaving=event=>{if(!event.persisted)stop();};
  const timer=win.setInterval(refresh,interval);
  function stop(){if(stopped)return;stopped=true;win.clearInterval(timer);doc.removeEventListener('visibilitychange',refresh);doc.removeEventListener('mangrooves:notifications-changed',local);win.removeEventListener('focus',refresh);win.removeEventListener('online',refresh);win.removeEventListener('pagehide',leaving);win.removeEventListener('pageshow',refresh);}
  doc.addEventListener('visibilitychange',refresh);doc.addEventListener('mangrooves:notifications-changed',local);win.addEventListener('focus',refresh);win.addEventListener('online',refresh);win.addEventListener('pagehide',leaving);win.addEventListener('pageshow',refresh);
  void refresh();return {refresh,stop};
}

export function notificationRoute(notice) {
  const t=notice.target;
  if(t?.page==='expert-applications'&&typeof t.uid==='string'&&/^[\w-]{1,80}$/.test(t.uid))return `#expert-applications?uid=${encodeURIComponent(t.uid)}`;
  if(t?.page==='badges')return '#badges';
  if(t?.page==='report'&&Number.isSafeInteger(t.id)&&t.id>0)return `#report/${t.id}${t.review?'?review=1':''}`;
  return null;
}
