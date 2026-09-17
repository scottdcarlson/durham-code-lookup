(function(root) {
  'use strict';
  const fields = {
    munis: [[0,'Organization'],[1,'Object'],[2,'Project']],
    oracle: [[4,'Fund'],[5,'Cost center'],[6,'Account'],[7,'Major project'],[8,'Program'],[9,'Interfund'],[10,'Future']]
  };
  function normalize(value) { return String(value || '').trim().toUpperCase().replace(/[\s.\-–—/|]+/g, ''); }
  function search(rows, direction, query, filters = {}) {
    const code = normalize(query);
    const active = Object.entries(filters).map(([i,v]) => [Number(i),normalize(v)]).filter(([,v])=>v);
    if (!code && !active.length) return {kind:'empty', rows:[]};
    if ([code,...active.map(([,v])=>v)].some(v=>v && !/^[A-Z0-9]+$/.test(v))) return {kind:'invalid', rows:[]};
    const column = direction === 'oracle' ? 11 : 3;
    const allowed = new Set(fields[direction].map(([i])=>i));
    const candidates = rows.filter(r=>active.every(([i,v])=>allowed.has(i) && normalize(r[i])===v));
    if (!code) return {kind:'fields', rows:candidates};
    const exact = candidates.filter(r=>normalize(r[column])===code);
    if (exact.length) return {kind:'exact', rows:exact};
    if (code.length < 3) return {kind:'short', rows:[]};
    return {kind:'prefix', rows:candidates.filter(r=>normalize(r[column]).startsWith(code))};
  }
  const api = {fields, normalize, search};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CrosswalkSearch = api;
})(typeof window !== 'undefined' ? window : globalThis);
