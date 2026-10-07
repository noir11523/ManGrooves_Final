// Older reference sites are shared until the ownership migration classifies them.
export const sharedSite = site => !site.deleted_at && site.visibility !== 'personal';
export const usableSite = (site, user) => !site.deleted_at && Number(site.active) !== 0 &&
  (sharedSite(site) || Number(site.created_by) === Number(user.id));
export const visibleSite = (site, user) => !site.deleted_at &&
  (user.role !== 'guardian' || sharedSite(site) || Number(site.created_by) === Number(user.id));
