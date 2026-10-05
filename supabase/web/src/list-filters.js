import {esc, field, select, formValues} from './ui.js';

export function listFilters(query = {}, filters = [], placeholder = 'Name or email') {
  return `<form class="filters list-filters" role="search">${field('q', 'Search', query.q ?? '', 'search', `maxlength="200" placeholder="${esc(placeholder)}"`)}${filters.map(([key, label, options]) => select(key, label, options, query[key] ?? '')).join('')}<button type="submit">Apply</button><button type="button" class="outline clear-filters" ${Object.entries(query).some(([key,v]) => key !== 'page' && v) ? '' : 'hidden'}>Clear</button></form><p class="muted result-count" role="status" aria-live="polite"></p>`;
}
export function bindListFilters(node, query, apply, total) {
  const form = node.querySelector('.list-filters');
  if (!form) return;
  const run = values => {
    Object.keys(query).forEach(key => delete query[key]);
    Object.assign(query, Object.fromEntries(Object.entries(values).map(([key,value]) => [key, value.trim()]).filter(([,value]) => value)));
    form.querySelector('.clear-filters').hidden = !Object.keys(query).length;
    apply(query);
  };
  form.onsubmit = event => {event.preventDefault(); run(formValues(form));};
  form.querySelector('.clear-filters').onclick = () => {form.reset(); [...form.elements].forEach(input => {if(input.name) input.value = '';}); run({});};
  if (total != null) node.querySelector('.result-count').textContent = `${total} result${total === 1 ? '' : 's'}`;
}
export function listRoute(route, query) {
  location.hash = `${route}${Object.keys(query).length ? `?${new URLSearchParams(query)}` : ''}`;
}
// Hide rows in place to retain unsaved editor values and selected files.
export function filterLocalList(node, query, rows, matches) {
  let total = 0;
  rows.forEach(([element, item]) => {element.hidden = !matches(item, query); if (!element.hidden) total++;});
  node.querySelector('.result-count').textContent = `${total} result${total === 1 ? '' : 's'}`;
  node.querySelector('.filter-empty').hidden = total > 0;
}
export const matchesSearch = (values, query) => values.join(' ').toLocaleLowerCase().includes(String(query.q ?? '').trim().toLocaleLowerCase());
