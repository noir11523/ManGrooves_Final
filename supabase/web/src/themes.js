import Chart from 'chart.js/auto';
const themes=['light','dark','silver','gold'];
Chart.register({id:'appearance',beforeUpdate(chart){
  const dark=document.documentElement.dataset.theme==='dark',color=dark?'#d7e4d8':'#536054',grid=dark?'#506354':'#dde4dd';
  chart.options.color=color;
  if(chart.options.plugins.legend?.labels)chart.options.plugins.legend.labels.color=color;
  for(const scale of Object.values(chart.options.scales??{})){
    if(scale.ticks)scale.ticks.color=color;
    if(scale.title)scale.title.color=color;
    if(scale.grid)scale.grid.color=grid;
    if(scale.border)scale.border.color=grid;
  }
}});
export function applyTheme(value){document.documentElement.dataset.theme=themes.includes(value)?value:'light';for(const chart of Object.values(Chart.instances))chart.update('none');}
export function loadTheme(user){let value='light';try{value=localStorage.getItem('mangrooves-theme:'+user.id)||value;}catch{}applyTheme(value);}
export function themeSettings(root,user){
  const section=document.createElement('section');section.className='card theme-settings';section.innerHTML='<h2>Theme</h2><div class="theme-options" role="radiogroup" aria-label="Theme">'+themes.map(value=>`<label class="check"><input type="radio" name="appearance" value="${value}" ${document.documentElement.dataset.theme===value?'checked':''}>${value[0].toUpperCase()+value.slice(1)}</label>`).join('')+'</div>';
  section.onchange=event=>{if(event.target.name!=='appearance')return;applyTheme(event.target.value);try{localStorage.setItem('mangrooves-theme:'+user.id,event.target.value);}catch{}};root.prepend(section);
}
