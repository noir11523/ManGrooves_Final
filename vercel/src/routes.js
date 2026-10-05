const routes={home:'/index.php',login:'/login.php',register:'/register.php','forgot-password':'/forgot-password.php',privacy:'/privacy.php',explore:'/explore.php',dashboard:'/dashboard.php',reports:'/reports.php',report:'/report-detail.php',submit:'/submit-report.php',analytics:'/analytics.php',clusters:'/clusters.php',growth:'/clusters.php?view=growth',cluster:'/cluster.php',history:'/admin/validation-history.php',verification:'/admin/verification.php',notifications:'/notifications.php',profile:'/settings.php',badges:'/badges.php',checklist:'/admin/checklist.php',users:'/admin/users.php',species:'/admin/species.php','badge-settings':'/admin/badges.php',audit:'/admin/audit.php','expert-applications':'/admin/expert-applications.php','certificate-settings':'/admin/certificate-settings.php','report-map':'/report-map.php'};
export function phpRoute(hash){
  if(!hash.startsWith('#'))return null;
  const [path,search='']=hash.slice(1).split('?'),[name,id]=path.split('/');
  if(!routes[name])return null;
  const url=new URL(routes[name],'https://website.invalid');
  for(const [key,value] of new URLSearchParams(search))url.searchParams.set(key,value);
  if(id)url.searchParams.set('id',id);
  return url.pathname+url.search;
}
