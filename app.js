(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const results = $('results'), status = $('status'), data = window.CROSSWALK, api = window.CrosswalkSearch;
  if (!data || !api || !Array.isArray(data.rows) || !data.rows.length) {
    status.textContent = 'The crosswalk could not be loaded. Refresh the page to try again.';
    $('data-note').textContent = 'Crosswalk unavailable';
    return;
  }
  const PAGE_SIZE = 10;
  let direction = 'auto', matches = [], page = 0, timer;
  const date = new Date(data.metadata.asOf + 'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  $('data-note').textContent = 'Crosswalk: ' + date + ' · ' + data.rows.length.toLocaleString() + ' mappings';
  $('source-note').textContent = 'Source: ' + data.metadata.source;
  $('search-button').disabled = false;
  const create = (tag,cls,text) => {const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  function announceCopy(message) {
    clearTimeout(timer); $('copy-status').textContent=message; $('copy-status').hidden=false;
    timer=setTimeout(()=>$('copy-status').hidden=true,3500);
  }
  async function copy(value,button) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
      else {
        const box=create('textarea');box.value=value;box.style.cssText='position:fixed;left:-9999px;';document.body.append(box);box.select();
        const success=document.execCommand('copy');box.remove();button.focus();if(!success)throw new Error('copy');
      }
      announceCopy('Code copied');
    } catch {announceCopy('Select the code and use Ctrl+C or your device’s copy command.');}
  }
  function copyButton(value,label,cls='copy') {
    const button=create('button',cls,cls==='copy'?'Copy code':'Copy');button.type='button';button.setAttribute('aria-label','Copy '+label+' '+value);button.addEventListener('click',()=>copy(value,button));return button;
  }
  function codeBlock(row,system,isSource) {
    const block=create('section','code-block'+(isSource?' source':''));
    const label=create('div','code-label',system==='munis'?'Munis code':'Oracle code');
    const value=row[system==='munis'?3:11];label.append(copyButton(value,system+' code'));
    block.append(label,create('div','full-code',value));
    const dl=create('dl','breakdown');
    for(const [index,name] of api.fields[system]) {
      const group=create('div'),dd=create('dd');
      dd.append(create('span','segment-code',row[index] || 'None'));
      if(row[index])dd.append(copyButton(row[index],name,'segment-copy'));
      group.append(create('dt',null,name),dd);dl.append(group);
    }
    block.append(dl);return block;
  }
  function renderPage() {
    results.replaceChildren();
    matches.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE).forEach((row,index)=>{
      const article=create('article','result'),top=create('div','result-top');
      top.append(create('h2',null,'MATCH '+(page*PAGE_SIZE+index+1)),create('span','row-reference','Crosswalk row '+row[12]));
      const sourceSystem = direction==='oracle'?'oracle':'munis';
      article.append(top,codeBlock(row,sourceSystem==='munis'?'oracle':'munis',false),codeBlock(row,sourceSystem,true));results.append(article);
    });
    const pages=Math.ceil(matches.length/PAGE_SIZE);
    document.querySelector('.pagination').hidden=pages<=1;
    $('previous').disabled=page===0;$('next').disabled=page>=pages-1;
    $('page-label').textContent='Page '+(page+1)+' of '+pages;
  }
  function resetResults() { matches=[];page=0;renderPage();status.textContent='Ready when you are. Enter a code above to find its match.'; }
  function setDirection() {
    direction=document.querySelector('input[name=direction]:checked').value;
    const name=direction==='munis'?'Munis':'Oracle';
    const example=direction==='munis'?'0E000000720100':'18101020';
    $('code-label').textContent=direction==='auto'?'Enter a code or cost center':'Enter an '+name+' code or cost center';
    if(direction==='munis')$('code-label').textContent='Enter a Munis code';
    $('code').value='';$('code').placeholder='e.g. '+example;$('example').textContent=example;
    $('segment-fields').replaceChildren();
    for(const [index,label] of api.fields[direction]) {
      const wrapper=create('label',null,label),input=create('input');input.type='text';input.id='field-'+index;input.dataset.column=String(index);input.autocomplete='off';input.spellcheck=false;wrapper.append(input);$('segment-fields').append(wrapper);
    }
    resetResults();
  }
  function runSearch() {
    const filters=Object.fromEntries([...$('segment-fields').querySelectorAll('input')].map(i=>[i.dataset.column,i.value]));
    const found=api.search(data.rows,direction,$('code').value,filters);matches=found.rows;page=0;renderPage();
    if(found.kind==='empty'){status.textContent='Enter a cost center, individual code, full code or at least one search field.';$('code').focus();return;}
    if(found.kind==='invalid'){status.textContent='Use letters and numbers. Spaces, periods, hyphens and slashes are accepted as separators.';return;}
    if(found.kind==='short'){status.textContent='Enter at least 3 characters for a partial code, or search by individual fields.';return;}
    if(!matches.length){status.textContent='No match found in this crosswalk. Check the direction and entered fields, or try a shorter code. Leading zeros matter.';return;}
    const exact=found.kind==='exact'||found.kind==='segment';
    status.replaceChildren(create('strong',null,matches.length.toLocaleString()+' '+(exact?'exact ':'')+(matches.length===1?'match':'matches')));
    if(found.kind==='segment')status.append(document.createTextNode(' · Matched '+found.fields.join(' or ')+'. Showing all associated crosswalk entries.'));
    else if(found.kind==='prefix')status.append(document.createTextNode(' · No exact match. Showing full codes or individual fields that start with your entry.'));
    else if(found.kind==='fields')status.append(document.createTextNode(' · Showing entries matching all supplied fields.'));
    else if(direction==='oracle'&&matches.length>1)status.append(document.createTextNode(' · This Oracle code maps to multiple Munis entries. Review all matches.'));
    if(matches.length>PAGE_SIZE)status.append(document.createTextNode(' Displaying 10 per page. Narrow your search with individual fields.'));
  }
  $('lookup-form').addEventListener('submit',event=>{event.preventDefault();runSearch();});
  document.querySelectorAll('input[name=direction]').forEach(i=>i.addEventListener('change',setDirection));
  $('clear').addEventListener('click',()=>{setDirection();$('code').focus();});
  $('example').addEventListener('click',()=>{for(const i of $('segment-fields').querySelectorAll('input'))i.value='';$('code').value=$('example').textContent;runSearch();});
  $('previous').addEventListener('click',()=>{if(page>0){page--;renderPage();results.scrollIntoView({behavior:'smooth',block:'start'});}});
  $('next').addEventListener('click',()=>{if((page+1)*PAGE_SIZE<matches.length){page++;renderPage();results.scrollIntoView({behavior:'smooth',block:'start'});}});
  setDirection();
})();
