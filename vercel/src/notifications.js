import {api} from './client.js';
import {watchNotifications,updateNotificationBell} from '../../supabase/web/src/notification-updates.js';
try {
  const value=localStorage.getItem('mangrooves-theme:'+document.body.dataset.themeUser);
  document.documentElement.dataset.theme=['light','dark','silver','gold'].includes(value)?value:'light';
} catch { /* Keep the default when local storage is unavailable. */ }
if(document.querySelector('[data-notification-bell]')){
  watchNotifications({load:()=>api('notifications.php',{query:{summary_only:'1'}})});
  document.addEventListener('mangrooves:notification-count',event=>updateNotificationBell(event.detail));
}
