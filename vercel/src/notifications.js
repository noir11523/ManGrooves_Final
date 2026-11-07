import {api} from './client.js';
import {watchNotifications,updateNotificationBell} from '../../supabase/web/src/notification-updates.js';
if(document.querySelector('[data-notification-bell]')){
  watchNotifications({load:()=>api('notifications.php',{query:{summary_only:'1'}})});
  document.addEventListener('mangrooves:notification-count',event=>updateNotificationBell(event.detail));
}
