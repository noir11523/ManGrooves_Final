import {renderEmbedded} from '../../supabase/web/src/app.js';
import {reportDraft} from '../../supabase/web/src/report-form.js';
import {esc} from '../../supabase/web/src/ui.js';
import {phpRoute} from './routes.js';
const panel=document.querySelector('[data-cloud-page]'),node=document.getElementById('cloud-content');
const {page,query,user}=JSON.parse(panel.dataset.cloudPage);
// Real PHP links also work when opened in a new tab or copied.
const rewrite=()=>panel.querySelectorAll('a[href^="#"]').forEach(link=>{const target=phpRoute(link.getAttribute('href'));if(target)link.setAttribute('href',target);});
new MutationObserver(rewrite).observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});
document.addEventListener('click',async event=>{
  const link=event.target.closest('a[href]');
  if(!link || !reportDraft.dirty || event.defaultPrevented || event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || link.target==='_blank')return;
  const target=new URL(link.href,location.href);if(target.pathname===location.pathname && target.search===location.search)return;
  event.preventDefault();await reportDraft.flush();location.assign(link.href);
});
window.addEventListener('hashchange',()=>{const target=phpRoute(location.hash);if(target)location.assign(target);});
async function start(){
  try{await renderEmbedded(page,node,query,user);rewrite();}
  catch(error){node.innerHTML=`<section class="card"><h1>Could not load this page</h1><p class="error">${esc(error.message)}</p><div class="actions"><button id="cloud-retry">Try again</button><a class="button outline" href="/dashboard.php">Back to home</a></div></section>`;document.getElementById('cloud-retry').onclick=start;}
}
start();
