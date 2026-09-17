(function(root) {
  'use strict';
  const fields = {
    munis: [[0,'Organization'],[1,'Object'],[2,'Project']],
    oracle: [[4,'Fund'],[5,'Cost center'],[6,'Account'],[7,'Major project'],[8,'Program'],[9,'Interfund'],[10,'Future']]
  };
  fields.auto = [...fields.munis.map(([i,n])=>[i,'Munis '+n.toLowerCase()]),...fields.oracle.map(([i,n])=>[i,'Oracle '+n.toLowerCase()])];
  function normalize(value) { return String(value || '').trim().toUpperCase().replace(/[\s.\-–—/|]+/g, ''); }
  function search(rows, direction, query, filters = {}) {
    const raw = String(query || '').trim();
    const costCenterPrefix = /^CC_/i.test(raw);
    const code = normalize(costCenterPrefix ? raw.slice(3) : raw);
    const active = Object.entries(filters).map(([i,v]) => [Number(i),normalize(v)]).filter(([,v])=>v);
    if (!code && !active.length) return {kind:'empty', rows:[]};
    if ([code,...active.map(([,v])=>v)].some(v=>v && !/^[A-Z0-9]+$/.test(v))) return {kind:'invalid', rows:[]};
    const columns = direction === 'auto' ? [3,11] : [direction === 'oracle' ? 11 : 3];
    const allowed = new Set(fields[direction].map(([i])=>i));
    const candidates = rows.filter(r=>active.every(([i,v])=>allowed.has(i) && normalize(r[i])===v));
    if (!code) return {kind:'fields', rows:candidates};
    const exact = costCenterPrefix ? [] : candidates.filter(r=>columns.some(i=>normalize(r[i])===code));
    if (exact.length) return {kind:'exact', rows:exact};
    const segments = costCenterPrefix ? (direction==='munis'?[]:[[5,'Oracle cost center']]) : fields[direction];
    const matchedFields = segments.filter(([i])=>candidates.some(r=>normalize(r[i])===code));
    if (matchedFields.length) return {kind:'segment', fields:matchedFields.map(([,name])=>name), rows:candidates.filter(r=>matchedFields.some(([i])=>normalize(r[i])===code))};
    if (code.length < 3) return {kind:'short', rows:[]};
    const prefixColumns = costCenterPrefix ? segments.map(([i])=>i) : [...columns,...segments.map(([i])=>i)];
    return {kind:'prefix', rows:candidates.filter(r=>prefixColumns.some(i=>normalize(r[i]).startsWith(code)))};
  }
  const api = {fields, normalize, search};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CrosswalkSearch = api;
})(typeof window !== 'undefined' ? window : globalThis);
