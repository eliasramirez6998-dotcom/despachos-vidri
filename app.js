/* ====== Almacenes Vidrí · Dashboard de Despachos ======
 Row schema (índices):
 0 guia_date(YYYY-MM-DD) 1 fact_date 2 canalIdx 3 zonaIdx 4 motIdx 5 numGuia
 6 onTime(1/0) 7 estadoLiq(0=COMPLETO,1=PARCIAL) 8 estadoDoc(str) 9 subIdx
 10 maxInt(num|null) 11 recol(d) 12 ruta(d) 13 entrega(d) 14 ciclo(d) 15 gestionado(1/0)
*/
const PAL={red:'#D5202A',green:'#1f9d6b',amber:'#f2a900',blue:'#1f6fb2',orange:'#e8743b',
  teal:'#15a0a6',purple:'#7a4db0',slate:'#64748b',gray:'#9aa6b2',dgreen:'#147a52'};
const MULTI=[PAL.red,PAL.amber,PAL.blue,PAL.green,PAL.orange,PAL.teal,PAL.purple,PAL.slate,'#c0392b','#2e86c1','#16a085','#d68910','#8e44ad','#27ae60','#e67e22','#2c3e50','#c2185b','#00838f'];
Chart.defaults.font.family="'IBM Plex Sans',sans-serif";
Chart.defaults.font.size=11.5;Chart.defaults.color='#6b7886';

let STATE={meta:null,rows:null};
const charts={};
const $=id=>document.getElementById(id);
const fmt=n=>n.toLocaleString('es-SV');
const pct=(a,b)=>b?(100*a/b):0;
const MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function toast(m){const t=$('toast');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),3200);}
function overlay(on,txt){const o=$('overlay');if(txt)$('ovtext').textContent=txt;o.classList.toggle('on',on);}
function isSunday(ds){const d=new Date(ds+'T00:00:00Z');return d.getUTCDay()===0;}

/* ---------- INIT ---------- */
function boot(data){
  STATE.meta=data.meta;STATE.rows=data.rows;
  // filtros sucursal/canal
  const suc=$('fSuc'),can=$('fCanal');
  suc.innerHTML='<option value="">Todas</option>'+[...data.meta.zonas].map((z,i)=>`<option value="${i}">${z||'(Sin zona)'}</option>`).join('');
  can.innerHTML='<option value="">Todos</option>'+[...data.meta.canales].map((c,i)=>`<option value="${i}">${c||'(Sin canal)'}</option>`).join('');
  // rango fechas
  let mn='9999',mx='0';
  for(const r of data.rows){const g=r[0];if(g){if(g<mn)mn=g;if(g>mx)mx=g;}}
  $('fDesde').value=mn;$('fHasta').value=mx;$('fDesde').min=mn;$('fDesde').max=mx;$('fHasta').min=mn;$('fHasta').max=mx;
  render();
}

function filtered(){
  const d=$('fDesde').value,h=$('fHasta').value,s=$('fSuc').value,c=$('fCanal').value;
  return STATE.rows.filter(r=>{
    const g=r[0]||r[1]; if(!g) return false;
    if(d&&g<d) return false; if(h&&g>h) return false;
    if(s!==''&&r[3]!=+s) return false;
    if(c!==''&&r[2]!=+c) return false;
    return true;
  });
}

/* ---------- RENDER ---------- */
function render(){
  closeDrill();
  const R=filtered();const N=R.length;
  $('cValid').textContent=fmt(N);
  renderHero(R);renderSec1(R);renderSec2(R);renderSec3(R);renderSec4(R);renderSec5(R);
}

function mkChart(id,cfg){if(charts[id])charts[id].destroy();charts[id]=new Chart($(id),cfg);}

/* ===== HERO / OTIF ===== */
function renderHero(R){
  const N=R.length;
  const otif=R.filter(r=>r[6]===1 && r[8]==='Entregado').length;
  $('otifNum').textContent=pct(otif,N).toFixed(1);
  $('otifCap').textContent=`${fmt(otif)} en tiempo y Entregados completos / ${fmt(N)} totales`;
  // tendencia: OTIF ACUMULADO, corte a fin de mes (mes en curso = hasta el último día con registros)
  const months=[...new Set(R.map(r=>{const g=r[0]||r[1];return g?g.slice(0,7):'';}).filter(Boolean))].sort();
  let maxDate=''; for(const r of R){const g=r[0]||r[1]; if(g&&g>maxDate)maxDate=g;}
  const labels=months.map(mk=>{const[y,mo]=mk.split('-');let l=MES[+mo-1]+' '+y.slice(2);const dim=new Date(Date.UTC(+y,+mo,0)).getUTCDate(),dd=+maxDate.slice(8,10);if(mk===months[months.length-1]&&maxDate.slice(0,7)===mk&&dd<dim)l+=' (al '+dd+')';return l;});
  const vals=months.map(mk=>{let nu=0,de=0;for(const r of R){const g=r[0]||r[1];if(!g)continue;if(g.slice(0,7)<=mk){de++;if(r[6]===1&&r[8]==='Entregado')nu++;}}return +pct(nu,de).toFixed(1);});
  mkChart('chTrend',{type:'line',data:{labels,datasets:[
    {data:vals,borderColor:'#fff',backgroundColor:'rgba(255,255,255,.18)',fill:true,tension:.35,pointBackgroundColor:'#ffd84d',pointBorderColor:'#fff',pointRadius:4,borderWidth:2.5},
    {data:labels.map(()=>90),borderColor:'rgba(255,255,255,.55)',borderDash:[5,4],pointRadius:0,borderWidth:1.5}
  ]},options:{maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.datasetIndex===1?'Meta 90%':'OTIF acumulado: '+c.parsed.y+'%'}}},
    scales:{y:{min:0,max:100,ticks:{color:'rgba(255,255,255,.85)',callback:v=>v+'%'},grid:{color:'rgba(255,255,255,.14)'}},x:{ticks:{color:'rgba(255,255,255,.85)'},grid:{display:false}}}}});
}

/* ===== SECTION 1 ===== */
function renderSec1(R){
  const N=R.length;
  const enT=R.filter(r=>r[6]===1).length, fuera=R.filter(r=>r[6]===0).length, sinL=0;
  $('punctCards').innerHTML=[
    card('tone-g','En tiempo (1–3 días)',pct(enT,N).toFixed(1)+'<small>%</small>',`${fmt(enT)} de ${fmt(N)} despachos`),
    card('tone-r','Fuera de tiempo (4+ días)',pct(fuera,N).toFixed(1)+'<small>%</small>',`${fmt(fuera)} de ${fmt(N)} despachos`),
    card('tone-s','Sin liquidación registrada',pct(sinL,N).toFixed(1)+'<small>%</small>',`${fmt(sinL)} de ${fmt(N)} despachos`)
  ].join('');
  mkChart('chPunct',donut(['En tiempo (1–3 días)','Fuera de tiempo (4+ días)','Sin liquidación'],[enT,fuera,sinL],[PAL.green,PAL.red,PAL.gray]));
  attachDrill('chPunct',i=>{const defs=[['En tiempo (1–3 días)',r=>r[6]===1],['Fuera de tiempo (4+ días)',r=>r[6]===0]][i];
    if(!defs)return null;return {title:defs[0],rows:R.filter(defs[1])};});
  // por sucursal
  const z=STATE.meta.zonas, agg=z.map(()=>[0,0]);
  for(const r of R){agg[r[3]][r[6]===1?0:1]++;}
  const order=z.map((n,i)=>[n,agg[i][0]+agg[i][1],i]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
  mkChart('chPunctSuc',{type:'bar',data:{labels:order.map(o=>o[0]||'(Sin zona)'),datasets:[
    {label:'En tiempo',data:order.map(o=>agg[o[2]][0]),backgroundColor:PAL.green,stack:'s'},
    {label:'Fuera de tiempo',data:order.map(o=>agg[o[2]][1]),backgroundColor:PAL.red,stack:'s'}
  ]},options:hbarOpts(true)});
  attachDrill('chPunctSuc',(i,ds)=>{const z=order[i];if(!z)return null;const ot=ds!==1;
    return {title:(ot?'En tiempo':'Fuera de tiempo')+' · '+(z[0]||'(Sin zona)'),rows:R.filter(r=>r[3]===z[2]&&((r[6]===1)===ot))};});
  // 1.B operativo
  const exito=R.filter(r=>r[8]==='Entregado').length;
  const fall=R.filter(r=>r[8]==='No entregado').length;
  const parc=R.filter(r=>r[8]==='Entrega parcial').length;
  const pend=R.filter(r=>r[8]==='Pendiente'||r[8]==='NO GESTIONADO'||r[8]==='Pendiente de entrega').length;
  $('opCards').innerHTML=[
    card('tone-g','Entregas exitosas',pct(exito,N).toFixed(1)+'<small>%</small>',`${fmt(exito)} de ${fmt(N)} despachos`),
    card('tone-r','Entregas fallidas',pct(fall,N).toFixed(1)+'<small>%</small>',`${fmt(fall)} de ${fmt(N)} despachos`),
    card('tone-a','Entregas parciales',pct(parc,N).toFixed(1)+'<small>%</small>',`${fmt(parc)} de ${fmt(N)} despachos`),
    card('tone-s','Pendientes de gestión',pct(pend,N).toFixed(1)+'<small>%</small>',`${fmt(pend)} de ${fmt(N)} despachos`)
  ].join('');
  mkChart('chOp',donut(['Entregas exitosas','Entregas fallidas','Entregas parciales','Pendientes de gestión'],[exito,fall,parc,pend],[PAL.green,PAL.red,PAL.amber,PAL.slate]));
  attachDrill('chOp',i=>{const defs=[
      ['Entregas exitosas (Entregado)',r=>r[8]==='Entregado'],
      ['Entregas fallidas (No entregado)',r=>r[8]==='No entregado'],
      ['Entregas parciales',r=>r[8]==='Entrega parcial'],
      ['Pendientes de gestión (Pendiente + NO GESTIONADO)',r=>r[8]==='Pendiente'||r[8]==='NO GESTIONADO'||r[8]==='Pendiente de entrega']][i];
    if(!defs)return null;return {title:defs[0],rows:R.filter(defs[1])};});
  // sucursales con mayor pendiente de gestion
  const pz=STATE.meta.zonas.map(()=>0);
  for(const r of R){if(r[8]==='Pendiente'||r[8]==='NO GESTIONADO'||r[8]==='Pendiente de entrega')pz[r[3]]++;}
  const po=STATE.meta.zonas.map((n,i)=>[n,pz[i],i]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,10);
  mkChart('chPend',{type:'bar',data:{labels:po.map(o=>o[0]||'(Sin zona)'),datasets:[{data:po.map(o=>o[1]),backgroundColor:PAL.slate,borderRadius:4}]},options:hbarOpts(false)});
  attachDrill('chPend',i=>{const z=po[i];if(!z)return null;
    return {title:'Pendientes de gestión · '+(z[0]||'(Sin zona)'),rows:R.filter(r=>(r[8]==='Pendiente'||r[8]==='NO GESTIONADO'||r[8]==='Pendiente de entrega')&&r[3]===z[2])};});
  // tendencia mensual de pendientes de gestión (Pendiente + NO GESTIONADO)
  const isPend=r=>r[8]==='Pendiente'||r[8]==='NO GESTIONADO'||r[8]==='Pendiente de entrega';
  const pgBy={};
  for(const r of R){const g=r[0]||r[1];if(!g)continue;const k=g.slice(0,7);if(!pgBy[k])pgBy[k]=[0,0];pgBy[k][1]++;if(isPend(r))pgBy[k][0]++;}
  const pgk=Object.keys(pgBy).sort();
  const pgLabels=pgk.map(k=>{const[y,m]=k.split('-');return MES[+m-1]+' '+y.slice(2);});
  const pgVals=pgk.map(k=>pgBy[k][0]);
  const pgPct=pgk.map(k=>+pct(pgBy[k][0],pgBy[k][1]).toFixed(1));
  mkChart('chPendTrend',{type:'line',data:{labels:pgLabels,datasets:[
    {data:pgVals,borderColor:PAL.amber,backgroundColor:'rgba(242,169,0,.15)',fill:true,tension:.35,pointRadius:5,pointBackgroundColor:PAL.amber,pointBorderColor:'#fff',pointBorderWidth:2,borderWidth:3}
  ]},options:{maintainAspectRatio:false,plugins:{legend:{display:false},
    tooltip:{callbacks:{label:c=>c.parsed.y.toLocaleString('es-SV')+' pendientes · '+pgPct[c.dataIndex]+'% del mes'}}},
    scales:{y:{beginAtZero:true,ticks:{font:{size:11},callback:v=>v.toLocaleString('es-SV')},grid:{color:'#eef1f5'},border:{display:false}},x:{grid:{display:false},ticks:{font:{size:11.5,weight:'600'},color:'#3a4756'}}}}});
  attachDrill('chPendTrend',i=>{const k=pgk[i];if(!k)return null;
    return {title:'Pendientes de gestión · '+pgLabels[i],rows:R.filter(r=>{const g=r[0]||r[1];return g&&g.slice(0,7)===k&&isPend(r);})};});

  // 1.C In Full
  const comp=R.filter(r=>r[7]===0).length, par=R.filter(r=>r[7]===1).length;
  $('inFullCards').innerHTML=[
    card('tone-g','Entregas completas (COMPLETO)',pct(comp,N).toFixed(1)+'<small>%</small>',`${fmt(comp)} de ${fmt(N)} despachos`),
    card('tone-a','Entregas parciales (PARCIAL)',pct(par,N).toFixed(1)+'<small>%</small>',`${fmt(par)} de ${fmt(N)} despachos`),
    card('tone-b','In Full',pct(comp,N).toFixed(1)+'<small>%</small>',`${fmt(comp)} de ${fmt(N)} · pedidos sin faltantes`)
  ].join('');

  // 1.B In Full · ACUMULADO con corte a fin de mes (mes en curso = hasta el último día con registros)
  const fMonths=[...new Set(R.map(r=>{const g=r[0]||r[1];return g?g.slice(0,7):'';}).filter(Boolean))].sort();
  let fMax=''; for(const r of R){const g=r[0]||r[1]; if(g&&g>fMax)fMax=g;}
  const fk=fMonths;
  const fLabels=fMonths.map(mk=>{const[y,mo]=mk.split('-');let l=MES[+mo-1]+' '+y.slice(2);const dim=new Date(Date.UTC(+y,+mo,0)).getUTCDate(),dd=+fMax.slice(8,10);if(mk===fMonths[fMonths.length-1]&&fMax.slice(0,7)===mk&&dd<dim)l+=' (al '+dd+')';return l;});
  const fVals=fMonths.map(mk=>{let nu=0,de=0;for(const r of R){const g=r[0]||r[1];if(!g)continue;if(g.slice(0,7)<=mk){de++;if(r[7]===0)nu++;}}return +pct(nu,de).toFixed(1);});
  mkChart('chInFullTrend',{type:'line',data:{labels:fLabels,datasets:[
    {label:'% In Full',data:fVals,borderColor:PAL.green,backgroundColor:'rgba(31,157,107,.14)',fill:true,tension:.35,pointRadius:5,pointBackgroundColor:PAL.green,pointBorderColor:'#fff',pointBorderWidth:2,borderWidth:3},
    {label:'Meta 95%',data:fLabels.map(()=>95),borderColor:PAL.amber,borderDash:[6,5],pointRadius:0,borderWidth:1.8}
  ]},options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:true,position:'top',align:'start',labels:{boxWidth:14,boxHeight:14,font:{size:11.5,weight:'600'},padding:14,usePointStyle:true,pointStyle:'circle'}},
      tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.parsed.y+'%'}}},
    scales:{y:{min:0,max:100,ticks:{callback:v=>v+'%',font:{size:11},stepSize:20},grid:{color:'#eef1f5'},border:{display:false}},x:{grid:{display:false},ticks:{font:{size:11.5,weight:'600'},color:'#3a4756'}}}}});
  attachDrill('chInFullTrend',(i,ds)=>{if(ds===1)return null;const k=fk[i];if(!k)return null;
    return {title:'In Full acumulado · '+fLabels[i],rows:R.filter(r=>{const g=r[0]||r[1];return g&&g.slice(0,7)<=k;})};});
}

/* ===== SECTION 2 ===== */
function renderSec2(R){
  // Domingos no operan: las guías del domingo se reasignan al lunes siguiente
  const shiftSunToMon=ds=>{ if(!isSunday(ds)) return ds; const d=new Date(ds+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+1); return d.toISOString().slice(0,10); };
  const days={}; let totalDesp=0;
  for(const r of R){ if(!r[0]) continue; const k=shiftSunToMon(r[0]); days[k]=(days[k]||0)+1; totalDesp++; }
  const dk=Object.keys(days).sort();
  const opDays=dk.length;
  const rutas=new Set();for(const r of R){if(r[5])rutas.add(r[3]+'|'+r[5]);}
  const mots=new Set();for(const r of R){if(STATE.meta.motoristas[r[4]])mots.add(r[4]);}
  const ent=avg(R.map(r=>r[13]));
  $('prodCards').innerHTML=[
    card('tone-a','Pedidos despachados/día (prom.)',Math.round(totalDesp/(opDays||1))+'<small> /día</small>',`${opDays} días con operación · ${fmt(totalDesp)} despachos`),
    card('tone-b','Pedidos por ruta (prom.)',(R.length/(rutas.size||1)).toFixed(2)+'<small> docs</small>',`${fmt(R.length)} docs / ${fmt(rutas.size)} rutas`),
    card('tone-g','Motoristas activos',fmt(mots.size),'Que entregaron al menos 1 pedido'),
    card('tone-r','Tiempo promedio por entrega',ent.toFixed(2)+'<small> días</small>','FECHA LIQ − FECHA GUÍA')
  ].join('');
  mkChart('chDaily',{type:'line',data:{labels:dk,datasets:[{data:dk.map(k=>days[k]),borderColor:PAL.red,backgroundColor:'rgba(213,32,42,.12)',fill:true,tension:.3,pointRadius:0,borderWidth:2}]},
    options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{maxTicksLimit:14},grid:{display:false}},y:{beginAtZero:true,grid:{color:'#eef1f5'}}}}});
  attachDrill('chDaily',i=>{const k=dk[i];if(!k)return null;return {title:'Despachos del día '+k,rows:R.filter(r=>r[0]&&shiftSunToMon(r[0])===k)};});
  // motoristas top 15
  const mc=STATE.meta.motoristas.map(()=>0);for(const r of R){mc[r[4]]++;}
  const mo=STATE.meta.motoristas.map((n,i)=>[n,mc[i],i]).filter(x=>x[0]&&x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,15);
  mkChart('chMot',{type:'bar',data:{labels:mo.map(o=>o[0]),datasets:[{data:mo.map(o=>o[1]),backgroundColor:PAL.blue,borderRadius:4}]},options:hbarOpts(false)});
  attachDrill('chMot',i=>{const m=mo[i];if(!m)return null;return {title:'Despachos · '+m[0],rows:R.filter(r=>r[4]===m[2])};});
  // sucursal vol
  const zc=STATE.meta.zonas.map(()=>0);for(const r of R){zc[r[3]]++;}
  const zo=STATE.meta.zonas.map((n,i)=>[n,zc[i],i]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
  mkChart('chSucVol',{type:'bar',data:{labels:zo.map(o=>o[0]||'(Sin zona)'),datasets:[{data:zo.map(o=>o[1]),backgroundColor:zo.map((_,i)=>MULTI[i%MULTI.length]),borderRadius:4}]},options:hbarOpts(false)});
  attachDrill('chSucVol',i=>{const zz=zo[i];if(!zz)return null;return {title:'Volumen · '+(zz[0]||'(Sin zona)'),rows:R.filter(r=>r[3]===zz[2])};});
}

/* ===== SECTION 3 ===== */
function renderSec3(R){
  const recol=avg(R.map(r=>r[11])),ruta=avg(R.map(r=>r[12])),ent=avg(R.map(r=>r[13])),ciclo=avg(R.map(r=>r[14]));
  $('timeCards').innerHTML=[
    card('tone-r','Tiempo de preparación / recolección',recol.toFixed(2)+'<small> días</small>','FECHA REV − FECHA FACTURACIÓN'),
    card('tone-a','Tiempo de gestión de ruta',ruta.toFixed(2)+'<small> días</small>','FECHA GUÍA − FECHA REV'),
    card('tone-b','Tiempo de ciclo de entrega',ent.toFixed(2)+'<small> días</small>','FECHA LIQUIDACIÓN − FECHA GUÍA'),
    card('tone-g','Tiempo de ciclo completo',ciclo.toFixed(2)+'<small> días</small>','FECHA LIQUIDACIÓN − FECHA FACTURACIÓN')
  ].join('');
  const z=STATE.meta.zonas;const a=z.map(()=>[0,0,0,0]);
  for(const r of R){const g=a[r[3]];g[0]+=r[11]||0;g[1]+=r[12]||0;g[2]+=r[13]||0;g[3]++;}
  const rows=z.map((n,i)=>[n,a[i][3]?a[i][0]/a[i][3]:0,a[i][3]?a[i][1]/a[i][3]:0,a[i][3]?a[i][2]/a[i][3]:0,a[i][3],i]).filter(x=>x[4]>0);
  rows.sort((x,y)=>(y[1]+y[2]+y[3])-(x[1]+x[2]+x[3]));
  mkChart('chLead',{type:'bar',data:{labels:rows.map(o=>o[0]||'(Sin zona)'),datasets:[
    {label:'Preparación',data:rows.map(o=>+o[1].toFixed(2)),backgroundColor:PAL.red,stack:'s'},
    {label:'Despacho',data:rows.map(o=>+o[2].toFixed(2)),backgroundColor:PAL.amber,stack:'s'},
    {label:'Entrega',data:rows.map(o=>+o[3].toFixed(2)),backgroundColor:PAL.blue,stack:'s'}
  ]},options:hbarOpts(true,' d')});
  attachDrill('chLead',(i,ds)=>{const z2=rows[i];if(!z2)return null;const comp=['preparación','despacho','entrega'][ds]||'';
    return {title:'Tiempos'+(comp?' · '+comp:'')+' · '+(z2[0]||'(Sin zona)'),rows:R.filter(r=>r[3]===z2[5])};});
}

/* ===== SECTION 4 ===== */
/* ===== DRILL-DOWN (doble clic en gráficos → tabla del detalle) ===== */
const DRILL_HEAD=['FECHA GUIA','FECHA FACT.','CANAL','SUCURSAL (ZONA)','CLIENTE','MONTO ($)','MOTORISTA','NUMERO GUIA','Estatus 72h','ESTADO LIQ.','Estado doc','Sub estado','Máx. int.','RECOL.','RUTA','ENTREGA','CICLO'];
function drillRow(r){const m=STATE.meta;return [r[0],r[1],m.canales[r[2]],m.zonas[r[3]],m.clientes[r[16]],r[17],m.motoristas[r[4]],r[5],r[6]?'EN TIEMPO':'FUERA DE TIEMPO',r[7]?'PARCIAL':'COMPLETO',r[8],m.subestados[r[9]],r[10],r[11],r[12],r[13],r[14]];}
function drillCell(v){if(v==null)return '';if(typeof v==='number')return Number.isInteger(v)?v:(Math.round(v*10000)/10000);return v;}
let DRILL_DATA=null;
function closeDrill(){const b=document.getElementById('drillPanel');if(b)b.style.display='none';}
function openDrill(title,rows,chartId){
  DRILL_DATA={title,rows};
  let p=document.getElementById('drillPanel');
  if(!p){p=document.createElement('div');p.id='drillPanel';p.style.cssText='font-family:Calibri,system-ui,sans-serif;margin:8px 0 28px;';}
  // ubicar el panel justo debajo de la sección que contiene el gráfico
  const ch=charts[chartId];
  const anchor=(ch&&(ch.canvas.closest('.section')||ch.canvas.closest('.card')))||null;
  if(anchor&&anchor.parentNode){anchor.parentNode.insertBefore(p,anchor.nextSibling);}
  else if(!p.parentNode){document.body.appendChild(p);}
  const shown=rows.slice(0,500);
  const th=DRILL_HEAD.map(h=>`<th style="padding:7px 9px;text-align:left;white-space:nowrap;font-weight:600;">${h}</th>`).join('');
  const tb=shown.map((r,ri)=>{const c=drillRow(r);return `<tr style="background:${ri%2?'#F7F8FA':'#fff'};">`+c.map(v=>`<td style="padding:6px 9px;border-bottom:1px solid #EEF1F5;white-space:nowrap;">${esc(drillCell(v))}</td>`).join('')+'</tr>';}).join('');
  const btn='cursor:pointer;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;';
  p.innerHTML=`<div style="background:#fff;border:1px solid #E0E0E0;border-radius:14px;box-shadow:0 4px 18px rgba(0,0,0,.06);overflow:hidden;">
    <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:1px solid #E0E0E0;background:#FCFCFD;">
      <div style="width:8px;height:28px;background:#D62828;border-radius:3px;"></div>
      <div style="flex:1;"><div style="font-weight:700;font-size:15.5px;color:#1A1A1A;">Detalle · ${esc(title)}</div>
        <div style="font-size:12.5px;color:#5A5A5A;">${fmt(rows.length)} registros${rows.length>500?' · mostrando los primeros 500 (el CSV incluye todos)':''}</div></div>
      <button id="drillCsv" style="${btn}background:#1B4F8B;color:#fff;">⬇ CSV</button>
      <button id="drillClose" style="${btn}background:#F0F0F0;color:#2A2A2A;">✕ Cerrar</button>
    </div>
    <div style="overflow:auto;max-height:460px;"><table style="border-collapse:collapse;width:100%;font-size:12px;color:#2A2A2A;">
      <thead style="position:sticky;top:0;background:#2A2A2A;color:#fff;z-index:1;"><tr>${th}</tr></thead>
      <tbody>${tb}</tbody></table></div></div>`;
  p.style.display='block';
  document.getElementById('drillClose').onclick=closeDrill;
  document.getElementById('drillCsv').onclick=exportDrillCSV;
  p.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function exportDrillCSV(){
  if(!DRILL_DATA)return;
  const aoa=[DRILL_HEAD].concat(DRILL_DATA.rows.map(drillRow));
  const csv=aoa.map(r=>r.map(v=>{v=(v==null?'':String(v));return /[",\n;]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(',')).join('\r\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=(DRILL_DATA.title.replace(/[^\w\u00C0-\u017F]+/g,'_').replace(/^_+|_+$/g,'')||'detalle')+'.csv';
  document.body.appendChild(a);a.click();a.remove();
}
function attachDrill(id,getDrill){
  const ch=charts[id];if(!ch)return;
  ch.canvas.style.cursor='pointer';
  ch.canvas.title='Doble clic en una barra para ver el detalle en tabla';
  ch.canvas.ondblclick=evt=>{
    const els=ch.getElementsAtEventForMode(evt,'nearest',{intersect:true},false);
    if(!els.length)return;
    const d=getDrill(els[0].index,els[0].datasetIndex);
    if(d&&d.rows&&d.rows.length)openDrill(d.title,d.rows,id);
  };
}

function renderSec4(R){
  const N=R.length;
  const fall=R.filter(r=>r[8]==='No entregado').length;
  const parc=R.filter(r=>r[8]==='Entrega parcial').length;
  const pend=R.filter(r=>r[8]==='Pendiente'||r[8]==='NO GESTIONADO'||r[8]==='Pendiente de entrega').length;
  // motivos: subestados de fallas/parciales (excluye entregados, vacío, no gestionado)
  const EXC=new Set(['Entregado a cliente','','NO GESTIONADO','Entregado','Entregado en otra dirección']);
  const sc={};
  for(const r of R){const s=STATE.meta.subestados[r[9]];if(r[8]==='No entregado'||r[8]==='Entrega parcial'){if(s&&!EXC.has(s))sc[s]=(sc[s]||0)+1;}}
  const mo=Object.entries(sc).sort((a,b)=>b[1]-a[1]);
  $('incCards').innerHTML=[
    card('tone-r','entregas fallidas',pct(fall,N).toFixed(1)+'<small>%</small>',`${fmt(fall)} de ${fmt(N)} despachos`),
    card('tone-a','entregas parciales',pct(parc,N).toFixed(1)+'<small>%</small>',`${fmt(parc)} de ${fmt(N)} despachos`),
    card('tone-b','Pendientes de gestión',pct(pend,N).toFixed(1)+'<small>%</small>',`${fmt(pend)} de ${fmt(N)} · Pendiente + NO GESTIONADO`),
    card('tone-s','Total incidencias',pct(fall+parc+pend,N).toFixed(1)+'<small>%</small>',`${fmt(fall+parc+pend)} de ${fmt(N)} · fallidas + parciales + pendientes`),
    card('tone-p','Motivos distintos identificados',fmt(mo.length),'Tipos de no conformidad únicos · conteo')
  ].join('');
  mkChart('chMotivos',{type:'bar',data:{labels:mo.map(o=>o[0]),datasets:[{data:mo.map(o=>o[1]),backgroundColor:mo.map((_,i)=>MULTI[i%MULTI.length]),borderRadius:5}]},options:hbarOpts(false)});
  attachDrill('chMotivos',i=>{const s=mo[i]&&mo[i][0];if(!s)return null;
    return {title:'Motivo de no conformidad: '+s,rows:R.filter(r=>(r[8]==='No entregado'||r[8]==='Entrega parcial')&&STATE.meta.subestados[r[9]]===s)};});

  // --- intentos de entrega (solo documentos Entregado) ---
  const ent=R.filter(r=>r[8]==='Entregado');
  const ib=[0,0,0,0]; // 1,2,3,4+
  for(const r of ent){let n=r[10];if(n==null)continue;n=Math.round(n);if(n<=1)ib[0]++;else if(n===2)ib[1]++;else if(n===3)ib[2]++;else if(n>=4)ib[3]++;}
  const entTot=ib[0]+ib[1]+ib[2]+ib[3];
  const reint=ib[1]+ib[2]+ib[3];
  $('intentosCards').innerHTML=[
    card('tone-g','Entregas al primer intento',pct(ib[0],entTot).toFixed(1)+'<small>%</small>',`${fmt(ib[0])} de ${fmt(entTot)} entregas`),
    card('tone-a','Requirieron 2+ intentos',pct(reint,entTot).toFixed(1)+'<small>%</small>',`${fmt(reint)} de ${fmt(entTot)} entregas`)
  ].join('');
  mkChart('chIntentos',{type:'bar',data:{labels:['1 intento','2 intentos','3 intentos','4+ intentos'],datasets:[{data:ib,backgroundColor:[PAL.green,PAL.amber,PAL.orange,PAL.red],borderRadius:6}]},
    options:{maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${fmt(c.parsed.y)} documentos (${pct(c.parsed.y,entTot).toFixed(1)}%)`}}},
    scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:{color:'#eef1f5'},title:{display:true,text:'N.º de documentos entregados'}}}}});
  $('intentosNote').textContent=`Indicador FADR (First Attempt Delivery Rate): ${pct(ib[0],entTot).toFixed(1)}% de las entregas se completaron al primer intento. Los reintentos suelen originarse en los motivos de falla de arriba (cliente ausente, dirección errónea, etc.).`;
  attachDrill('chIntentos',i=>{const lab=['1 intento','2 intentos','3 intentos','4+ intentos'][i];if(lab==null)return null;
    const rows=ent.filter(r=>{let n=r[10];if(n==null)return false;n=Math.round(n);return i===0?n<=1:i===1?n===2:i===2?n===3:n>=4;});
    return {title:'Entregas con '+lab,rows};});
}

/* ===== SECTION 5 · TOP 20 CLIENTES (por monto despachado) ===== */
function renderSec5(R){
  const N=R.length;
  const cc={},cm={};let totalMonto=0;
  for(const r of R){const ci=r[16];totalMonto+=(r[17]||0);if(ci==null)continue;cc[ci]=(cc[ci]||0)+1;cm[ci]=(cm[ci]||0)+(r[17]||0);}
  const clientesActivos=Object.keys(cc).length;
  const ranked=Object.keys(cc).map(i=>[STATE.meta.clientes[+i]||'(Sin nombre)',cc[i],cm[i]]).sort((a,b)=>b[2]-a[2]);
  const top=ranked.slice(0,20);
  const topMonto=top.reduce((p,c)=>p+c[2],0);
  const topDesp=top.reduce((p,c)=>p+c[1],0);
  const maxm=top.length?top[0][2]:1;
  $('cliCards').innerHTML=[
    card('tone-p','Clientes activos en el rango',fmt(clientesActivos),'Con al menos 1 despacho'),
    card('tone-g','Cliente #1 (por monto)',top.length?money(top[0][2]):'—',top.length?top[0][0]+' · '+fmt(top[0][1])+' despachos':''),
    card('tone-b','Concentración Top 20',pct(topMonto,totalMonto).toFixed(1)+'<small>%</small>',`${money(topMonto)} del monto total`),
    card('tone-r','Monto Top 20',money(topMonto),`${fmt(topDesp)} despachos a estos clientes`)
  ].join('');
  let html='<div class="lbhead"><span>#</span><span>Cliente</span><span>Participación ($)</span><span>Monto ($)</span><span>Despachos</span><span>Promedio</span></div>';
  top.forEach((c,i)=>{
    const w=Math.max(3,(c[2]/maxm)*100);
    const share=pct(c[2],totalMonto).toFixed(1);
    const cls=i===0?'top1':i===1?'top2':i===2?'top3':'';
    html+=`<div class="lbrow ${cls}">
      <div class="lbrank">${i+1}</div>
      <div class="lbname">${esc(c[0])}<span class="sub">${share}% del monto despachado</span></div>
      <div class="lbbar-wrap"><div class="lbbar" style="width:${w}%"></div></div>
      <div class="lbmonto">${money(c[2])}<small>monto</small></div>
      <div class="lbnum">${fmt(c[1])}<small>despachos</small></div>
      <div class="lbavg">${money(c[2]/c[1])}<small>por despacho</small></div>
    </div>`;
  });
  $('cliBoard').innerHTML=html;
}
function money(v){return '$'+Math.round(v).toLocaleString('es-SV');}
function esc(s){return String(s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));}
function card(tone,k,v,s){return `<div class="stat ${tone}"><div class="bar"></div><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;}
function avg(a){const f=a.filter(x=>typeof x==='number'&&!isNaN(x));return f.length?f.reduce((p,c)=>p+c,0)/f.length:0;}
function donut(labels,data,colors){return {type:'doughnut',data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:2,borderColor:'#fff'}]},
  options:{maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom',labels:{boxWidth:12,padding:12,font:{size:11.5}}},
  tooltip:{callbacks:{label:c=>` ${c.label}: ${fmt(c.parsed)} (${pct(c.parsed,c.dataset.data.reduce((a,b)=>a+b,0)).toFixed(1)}%)`}}}}};}
function hbarOpts(stacked,unit){return {indexAxis:'y',maintainAspectRatio:false,
  plugins:{legend:{display:!!stacked,position:'top',labels:{boxWidth:12,padding:10}},tooltip:{callbacks:{label:c=>` ${c.dataset.label?c.dataset.label+': ':''}${c.parsed.x.toLocaleString('es-SV')}${unit||''}`}}},
  scales:{x:{stacked:!!stacked,beginAtZero:true,grid:{color:'#eef1f5'}},y:{stacked:!!stacked,grid:{display:false},ticks:{font:{size:11}}}}};}

/* ---------- filtros eventos ---------- */
['fDesde','fHasta','fSuc','fCanal'].forEach(id=>$(id).addEventListener('change',render));
$('btnClear').addEventListener('click',()=>{const r=STATE.rows;let mn='9999',mx='0';for(const x of r){const g=x[0];if(g){if(g<mn)mn=g;if(g>mx)mx=g;}}$('fDesde').value=mn;$('fHasta').value=mx;$('fSuc').value='';$('fCanal').value='';render();});

/* ---------- DESCARGA data corregida ---------- */
$('btnDownload').addEventListener('click',()=>{
  overlay(true,'Generando archivo…');
  setTimeout(()=>{
    const R=filtered();const m=STATE.meta;
    const head=['FECHA GUIA','FECHA FACT.','CANAL','SUCURSAL (ZONA)','CLIENTE','MONTO A DESPACHAR','MOTORISTA','NUMERO GUIA','Estatus 72h','ESTADO LIQ.','Estado documento (corregido)','Sub estado (corregido)','Máx. intentos','RECOLECCIÓN (días)','RUTA (días)','ENTREGA (días)','CICLO TOTAL (días)'];
    const aoa=[head];
    for(const r of R){aoa.push([r[0],r[1],m.canales[r[2]],m.zonas[r[3]],m.clientes[r[16]],r[17],m.motoristas[r[4]],r[5],r[6]?'EN TIEMPO':'FUERA DE TIEMPO',r[7]?'PARCIAL':'COMPLETO',r[8],m.subestados[r[9]],r[10],r[11],r[12],r[13],r[14]]);}
    const ws=XLSX.utils.aoa_to_sheet(aoa);const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'VGO_corregido');
    XLSX.writeFile(wb,'Despachos_Vidri_dashboard_corregido.xlsx');
    overlay(false);toast('Archivo descargado con las correcciones del dashboard');
  },60);
});

/* ---------- ACTUALIZAR DATA (recalcula desde archivo crudo VGO+Dispatchtrack) ---------- */
$('btnUpdate').addEventListener('click',()=>$('fileInput').click());
$('fileInput').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  overlay(true,'Leyendo archivo…');
  try{
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:'array'});
    const data=recompute(wb);
    if(!data){overlay(false);toast('No se encontró la hoja VGO en el archivo');return;}
    LAST_DATA=data;
    boot(data);overlay(false);toast(`Data actualizada: ${fmt(data.rows.length)} despachos cargados`);
  }catch(err){console.error(err);overlay(false);toast('Error al procesar el archivo');}
  e.target.value='';
});

function findSheet(wb,name){const k=wb.SheetNames.find(s=>s.toLowerCase()===name.toLowerCase());return k?wb.Sheets[k]:null;}
function parseDT(s){if(!s||typeof s!=='string'||s.length<10)return null;
  const y=+s.slice(0,4),mo=+s.slice(5,7)-1,d=+s.slice(8,10);
  let h=0,mi=0,se=0;if(s.length>=19){h=+s.slice(11,13)||0;mi=+s.slice(14,16)||0;se=+s.slice(17,19)||0;}
  const ms=Date.UTC(y,mo,d,h,mi,se);return isNaN(ms)?null:ms;}
const DAY=86400000;
function recompute(wb){
  overlay(true,'Procesando DispatchTrack…');
  const vgoS=findSheet(wb,'VGO');if(!vgoS)return null;
  const dtS=findSheet(wb,'Dispatchtrack')||findSheet(wb,'DispatchTrack');
  // mapa cruce
  const map={};
  if(dtS){
    const dt=XLSX.utils.sheet_to_json(dtS,{header:1,raw:false,defval:''});
    const H=dt[0]||[];const col=n=>H.findIndex(x=>(x||'').toString().trim()===n);
    const cDoc=col('DocumentoFacturacion'),cSuc=col('Sucursal'),cEst=col('Estado'),cSub=col('Subestado'),cInt=col('# intentos'),cBw=col('Documento con firma de recibido');
    for(let i=1;i<dt.length;i++){const row=dt[i];if(!row)continue;const k=(row[cDoc]||'')+'||'+(row[cSuc]||'');
      let v=parseFloat(String(row[cInt]).trim());if(isNaN(v))v=null;
      const cur=map[k]||{e:'',s:'',bw:'',mi:0};cur.e=row[cEst];cur.s=row[cSub];cur.bw=row[cBw];if(v!==null)cur.mi=Math.max(cur.mi,v);map[k]=cur;}
  }
  overlay(true,'Calculando KPIs…');
  const vg=XLSX.utils.sheet_to_json(vgoS,{header:1,raw:false,defval:''});
  const H=vg[0]||[];const ci=n=>H.findIndex(x=>(x||'').toString().trim()===n);
  const I={fact:ci('FECHA FACT.'),rev:ci('FECHA REV.'),guia:ci('FECHA GUIA'),liq:ci('FECHA LIQUIDACION'),
    doc:ci('DOCUMENTO'),canal:ci('CANAL'),zona:ci('ZONA'),mot:ci('MOTORISTA'),ng:ci('NUMERO GUIA'),
    eliq:ci('ESTADO LIQ.'),cli:ci('CLIENTE'),monto:ci('MONTO A DESPACHAR')};
  const CANALMAP={'CONTACT CENTER':'Contact Center','Corporativo':'B2B','Ecommerce':'E-commerce','Mostrador':'Tienda'};
  const cIdx={},zIdx={},mIdx={},sIdx={},clIdx={};const idxof=(d,v)=>{v=(v==null?'':String(v).trim());if(!(v in d))d[v]=Object.keys(d).length;return d[v];};
  const rows=[];
  for(let i=1;i<vg.length;i++){
    const r=vg[i];if(!r||r[I.doc]==null||r[I.doc]==='')continue;
    const F=parseDT(r[I.fact]),Rv=parseDT(r[I.rev]),G=parseDT(r[I.guia]),L=parseDT(r[I.liq]);
    const dnum=ms=>ms/DAY;
    let recol=(Rv!=null&&F!=null)?dnum(Rv-F):null;
    // ruta GUIA-REV, desc si REV sábado
    let ruta=(G!=null&&Rv!=null)?dnum(G-Rv):null;
    if(ruta!=null){const wd=new Date(Rv).getUTCDay();if(wd===6&&(ruta-1)>=0)ruta=ruta-1;}
    // entrega LIQ-GUIA, desc si GUIA sábado >11:00
    let ent=(L!=null&&G!=null)?dnum(L-G):null;
    if(ent!=null){const gd=new Date(G);const wd=gd.getUTCDay();const tod=(G%DAY)/DAY;if(wd===6&&tod>(11/24)&&(ent-1)>=0)ent=ent-1;}
    // ciclo LIQ-FACT, desc si domingo en rango
    let ciclo=(L!=null&&F!=null)?dnum(L-F):null;
    if(ciclo!=null){let sun=false;let d0=Math.floor(F/DAY),d1=Math.floor(L/DAY);for(let d=d0;d<=d1&&d-d0<4000;d++){if(new Date(d*DAY).getUTCDay()===0){sun=true;break;}}if(sun&&(ciclo-1)>=0)ciclo=ciclo-1;}
    const onTime=(ent!=null&&ent<=3)?1:0;
    const doc=r[I.doc],zona=(r[I.zona]==null?'':String(r[I.zona]).trim());
    const k=doc+'||'+zona;const hit=map[k];
    const ed=hit?hit.e:'NO GESTIONADO',sd=hit?hit.s:'NO GESTIONADO',mi=hit?(hit.mi||0):null;
    let canal=r[I.canal];canal=CANALMAP[String(canal).trim()]||canal;
    const eliq=(String(r[I.eliq]).trim().toUpperCase()==='COMPLETO')?0:1;
    const gdate=r[I.guia]?String(r[I.guia]).slice(0,10):null;
    const fdate=r[I.fact]?String(r[I.fact]).slice(0,10):null;
    rows.push([gdate,fdate,idxof(cIdx,canal),idxof(zIdx,zona),idxof(mIdx,r[I.mot]),
      r[I.ng]!=null?String(r[I.ng]):'',onTime,eliq,ed,idxof(sIdx,sd),
      (mi!=null&&Number.isInteger(mi))?mi:mi,
      round4(recol),round4(ruta),round4(ent),round4(ciclo),hit?1:0,
      idxof(clIdx,r[I.cli]),(parseFloat(r[I.monto])||0)]);
  }
  const inv=d=>{const a=[];for(const k in d)a[d[k]]=k;return a;};
  return {meta:{canales:inv(cIdx),zonas:inv(zIdx),motoristas:inv(mIdx),subestados:inv(sIdx),clientes:inv(clIdx),n:rows.length},rows};
}
function round4(x){return x==null?null:Math.round(x*10000)/10000;}

/* ---------- arranque ---------- */
if(window.VIDRI_DATA){boot(window.VIDRI_DATA);}else{toast('No se encontró data.js');}

/* ---------- PUBLICAR a GitHub (Netlify republica solo) ---------- */
let LAST_DATA = window.VIDRI_DATA || null;
function dataToJs(d){return 'window.VIDRI_DATA='+JSON.stringify(d)+';';}
function b64utf8(str){const bytes=new TextEncoder().encode(str);let bin='';const ch=0x8000;for(let i=0;i<bytes.length;i+=ch)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+ch));return btoa(bin);}
function pubMsg(t,cls){const e=$('pubMsg');if(!e)return;e.textContent=t;e.className=cls||'';}
function pgLoad(){try{const c=JSON.parse(localStorage.getItem('vidri_pub')||'{}');
  $('pgOwner').value=c.owner||'';$('pgRepo').value=c.repo||'';$('pgBranch').value=c.branch||'main';$('pgPath').value=c.path||'data.js';$('pgToken').value=c.token||'';}catch(e){}}
function pgSave(){const c={owner:$('pgOwner').value.trim(),repo:$('pgRepo').value.trim(),branch:$('pgBranch').value.trim()||'main',path:$('pgPath').value.trim()||'data.js',token:$('pgToken').value.trim()};
  localStorage.setItem('vidri_pub',JSON.stringify(c));return c;}

if($('btnPublish')){
  $('btnPublish').addEventListener('click',()=>{pgLoad();pubMsg('');$('pubBack').classList.add('on');});
  $('pgClose').addEventListener('click',()=>$('pubBack').classList.remove('on'));
  $('pubBack').addEventListener('click',e=>{if(e.target.id==='pubBack')$('pubBack').classList.remove('on');});
  $('pgGo').addEventListener('click',async()=>{
    const c=pgSave();
    if(!c.owner||!c.repo||!c.token){pubMsg('Completa usuario, repositorio y token.','err');return;}
    if(!LAST_DATA||!LAST_DATA.rows||!LAST_DATA.rows.length){pubMsg('No hay data cargada para publicar.','err');return;}
    const api='https://api.github.com/repos/'+c.owner+'/'+c.repo;
    const headers={'Authorization':'Bearer '+c.token,'Accept':'application/vnd.github+json','Content-Type':'application/json'};
    const fileName=c.path.split('/').pop();
    const dir=c.path.includes('/')?c.path.slice(0,c.path.lastIndexOf('/')):'';
    try{
      pubMsg('Verificando repositorio…','info');
      let sha=null;
      const listURL=api+'/contents'+(dir?'/'+dir.split('/').map(encodeURIComponent).join('/'):'')+'?ref='+encodeURIComponent(c.branch);
      const lr=await fetch(listURL,{headers});
      if(lr.status===401){pubMsg('Token inválido. Revisa que sea correcto y vigente.','err');return;}
      if(lr.status===403){pubMsg('El token no tiene permiso (necesita Contents: Read and write en este repo).','err');return;}
      if(lr.status===404){pubMsg('No encuentro el repo/rama. Revisa usuario, repositorio y rama.','err');return;}
      if(lr.ok){const arr=await lr.json();const f=Array.isArray(arr)?arr.find(x=>x.name===fileName):null;if(f)sha=f.sha;}
      pubMsg('Subiendo '+fileName+' ('+fmt(LAST_DATA.rows.length)+' despachos)…','info');
      const body={message:'Actualiza '+fileName+' · '+new Date().toISOString().slice(0,16).replace('T',' '),content:b64utf8(dataToJs(LAST_DATA)),branch:c.branch};
      if(sha)body.sha=sha;
      const pr=await fetch(api+'/contents/'+c.path.split('/').map(encodeURIComponent).join('/'),{method:'PUT',headers,body:JSON.stringify(body)});
      if(pr.ok){pubMsg('✓ Publicado. Netlify republica en ~1 min y todos verán los datos nuevos.','ok');toast('Publicado en GitHub ✓');}
      else{const er=await pr.json().catch(()=>({}));pubMsg('Error '+pr.status+': '+(er.message||'no se pudo publicar'),'err');}
    }catch(e){console.error(e);pubMsg('Error de red: '+(e.message||e),'err');}
  });
}
