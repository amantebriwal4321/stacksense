const PRESETS={
 startup:{projectType:'saas',scale:'small',traffic:'steady',teamSize:2,skills:['ts'],budget:20,infra:'any',cloud:'any',dataModel:'relational',realtime:false,seo:true,mobile:false,ml:false,compliance:'none',timeToMarket:'asap',residencyIN:false},
 ml:{projectType:'analytics',scale:'medium',traffic:'steady',teamSize:5,skills:['py'],budget:200,infra:'any',cloud:'gcp',dataModel:'timeseries',realtime:false,seo:false,mobile:false,ml:true,compliance:'none',timeToMarket:'normal',residencyIN:false},
 bank:{projectType:'fintech',scale:'large',traffic:'steady',teamSize:40,skills:['java','ts'],budget:5000,infra:'any',cloud:'aws',dataModel:'relational',realtime:false,seo:false,mobile:true,ml:false,compliance:'pci',timeToMarket:'long',residencyIN:true},
 chat:{projectType:'social',scale:'large',traffic:'spiky',teamSize:6,skills:['go','ts'],budget:800,infra:'any',cloud:'any',dataModel:'document',realtime:true,seo:false,mobile:true,ml:false,compliance:'none',timeToMarket:'normal',residencyIN:false},
 onprem:{projectType:'internal',scale:'tiny',traffic:'steady',teamSize:1,skills:['php'],budget:0,infra:'onprem',cloud:'any',dataModel:'relational',realtime:false,seo:false,mobile:false,ml:false,compliance:'none',timeToMarket:'asap',residencyIN:false},
 broke:{projectType:'saas',scale:'massive',traffic:'spiky',teamSize:1,skills:[],budget:0,infra:'serverless',cloud:'aws',dataModel:'graph',realtime:true,seo:false,mobile:false,ml:false,compliance:'hipaa',timeToMarket:'asap',residencyIN:false}
};
const $=id=>document.getElementById(id);
const FIELDS=['projectType','scale','traffic','teamSize','budget','infra','cloud','dataModel','compliance','timeToMarket'];
const BOOLS=['realtime','seo','mobile','ml','residencyIN'];
function read(){const p={};FIELDS.forEach(f=>p[f]=$(f).value);BOOLS.forEach(b=>p[b]=$(b).checked);
 p.skills=[...document.querySelectorAll('#skills input:checked')].map(x=>x.value);return p}
function write(p){FIELDS.forEach(f=>$(f).value=p[f]);BOOLS.forEach(b=>$(b).checked=p[b]);
 document.querySelectorAll('#skills input').forEach(x=>x.checked=p.skills.includes(x.value));}
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function render(){
 $('teamSizeV').textContent=$('teamSize').value;$('budgetV').textContent=$('budget').value;
 const r=StackSense.recommend(read());let h='';
 if(r.warnings.length)h+=`<div class="warn"><b>Edge cases detected</b><ul>${r.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></div>`;
 if(!r.stack){h+=`<div class="bad">No stack satisfies every hard constraint. ${Object.entries(r.layers).map(([l,v])=>v.ranked.length?'':`<p><b>${l}</b>: ${v.eliminated.map(e=>esc(e.name+' ('+e.reason+')')).join(', ')}</p>`).join('')}</div>`;$('out').innerHTML=h;return}
 h+=`<div class="summary"><div class="pill">Fit score <b>${r.confidence}</b>/100</div><div class="pill">Est. run cost <b>$${r.cost.low} to $${r.cost.high}</b>/mo</div><div class="pill">Scale <b style="font-size:15px">${esc(StackSense.SCALE_LABEL[r.params.scale])}</b></div></div><div class="grid">`;
 for(const[l,x]of Object.entries(r.stack)){const el=r.layers[l].eliminated;
  h+=`<div class="card"><div class="layer">${l}</div><div class="name">${esc(x.name)}<span class="score">${x.score}</span></div><div class="note">${esc(x.note)}</div>
  ${x.all.slice(0,5).map(c=>`<div class="bar"><span>${esc(c.label)}</span><span class="t"><i style="width:${c.value*20}%"></i></span><span>+${c.points}</span></div>`).join('')}
  ${x.runnerUp?`<div class="ru">Runner up: ${esc(x.runnerUp.name)} (${x.runnerUp.score}${x.runnerUp.gap<0?', higher alone but lost on cross layer fit':', '+x.runnerUp.gap+' pts behind'})</div>`:''}
  ${el.length?`<details><summary>${el.length} ruled out by hard constraints</summary><ul>${el.map(e=>`<li>${esc(e.name)}: ${esc(e.reason)}</li>`).join('')}</ul></details>`:''}</div>`}
 h+='</div>';
 if(r.compatNotes.length||r.extras.length)h+=`<div class="card extras"><div class="layer">Also add</div><ul>${r.extras.map(e=>`<li>${esc(e)}</li>`).join('')}${r.compatNotes.map(e=>`<li>Note: ${esc(e)}</li>`).join('')}</ul></div>`;
 $('out').innerHTML=h;
}
document.querySelectorAll('select,input').forEach(e=>e.addEventListener('input',()=>{document.querySelectorAll('.presets button').forEach(b=>b.classList.remove('on'));render()}));
document.querySelectorAll('.presets button').forEach(b=>b.onclick=()=>{write(PRESETS[b.dataset.p]);render();document.querySelectorAll('.presets button').forEach(x=>x.classList.toggle('on',x===b))});
render();
