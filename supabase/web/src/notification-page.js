import {api,friendly} from './client.js';
import {esc,pager,toast} from './ui.js';
import {notificationRoute} from './notification-updates.js';

export async function notificationsPage(node,query,title,back) {
  let stopped=false,busy=false,revision=null;
  const emit=(name,data)=>document.dispatchEvent(new node.ownerDocument.defaultView.CustomEvent(name,{detail:data}));
  const load=async()=>{
    if(stopped||busy||!node.isConnected)return;busy=true;
    try{
      const data=await api('notifications.php',{query});if(stopped||!node.isConnected)return;
      revision=data.revision;
      node.innerHTML=`${title('Notifications',`${data.unread} unread`)}<button id="mark-all" class="outline" ${data.unread?'':'hidden'}>Mark all read</button><div class="list" style="margin-top:20px">${data.notifications.map(n=>`<button class="report-row notification" data-id="${n.id}"><div><strong>${n.read_at?'':'● '}${esc(n.title)}</strong><p>${esc(n.message)}</p><small>${esc(n.created_at)}</small></div></button>`).join('')||'<p class="empty">Applications, report updates, feedback, and badges will appear here.</p>'}</div>${pager(data,'notifications')}`;
      back();
      const changed=result=>emit('mangrooves:notifications-changed',result);
      node.querySelector('#mark-all').onclick=async event=>{
        event.currentTarget.disabled=true;
        try{changed(await api('notifications.php',{body:{action:'mark_all'}}));await load();}catch(e){toast(friendly(e));event.target.disabled=false;}
      };
      for(const button of node.querySelectorAll('.notification'))button.onclick=async()=>{
        if(button.disabled)return;button.disabled=true;
        try{
          const result=await api('notifications.php',{body:{action:'mark_read',id:Number(button.dataset.id)}});changed(result);
          const fresh=result.notification??result.notifications.find(n=>n.id===Number(button.dataset.id))??data.notifications.find(n=>n.id===Number(button.dataset.id));
          const target=notificationRoute(fresh);if(target)location.hash=target;else await load();
        }catch(e){toast(friendly(e));button.disabled=false;}
      };
      emit('mangrooves:notification-count',data);
    }finally{busy=false;}
  };
  const updated=event=>{if(event.detail?.revision!==revision)void load().catch(e=>toast(friendly(e)));};
  await load();if(!node.isConnected)return ()=>{};document.addEventListener('mangrooves:notifications-updated',updated);
  return ()=>{stopped=true;document.removeEventListener('mangrooves:notifications-updated',updated);};
}
