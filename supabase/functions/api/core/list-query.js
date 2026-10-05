// Apply list filters before pagination so searches include every record.
export function filterRows(rows, query = {}, fields = [], exact = []) {
  const search = String(query.q ?? '').trim().toLocaleLowerCase().slice(0, 200);
  return rows.filter(row => (!search || fields.map(key => row[key] ?? '').join(' ').toLocaleLowerCase().includes(search))
    && exact.every(key => !query[key] || String(row[key] ?? '') === String(query[key])));
}
