// ============================================================================
// features/double-transits.js
// Trânsitos duplos (aba "Sinastria" → "Trânsitos duplos"): mesmo planeta em
// trânsito formando aspecto simultâneo com o mapa de A e o de B — usa os
// mapas já calculados em features/synastry.js.
// ============================================================================

import { toJD, dateToJD_UT, normDeg } from '../core/time.js';
import { computeDayPositions } from '../core/ephemeris.js';
import { houseOf, signOf } from '../core/houses.js';
import { ASPECTS, orbFromAspect, impactScore } from '../core/aspects.js';
import { TRANSIT_BODIES, PLANET_GLYPH, PLANET_LABEL, SIGN_GLYPH, PLANET_GROUPS } from '../core/constants.js';
import { impactBar } from '../ui/render-helpers.js';
import { downloadBlob } from '../shared/download.js';
import { toDateInputValue, readDateParts } from './natal.js';
import { synChartA, synChartB, synPointList, synPointLon, loadSynChartsFromStorageOnly } from './synastry.js';
import { planetMatchesFilter, phaseTag } from './transits.js';

export let doubleTransitData = null; // {mode, rows}

// ---------- inicialização (efemerides.html não tem formulário de Pessoa A/B
// próprio — os dados vêm do que já foi calculado em Mapas Astrais > Sinastria,
// salvo no localStorage) ----------
export function dtInitFromStorage(){
  const summaryEl = document.getElementById('dtPeopleSummary');
  const calcBtn = document.getElementById('dtCalcBtn');
  const result = loadSynChartsFromStorageOnly();
  if(!summaryEl) return;
  if(!result.ok){
    summaryEl.innerHTML = '<div class="hint">Calcule os mapas de Pessoa A e Pessoa B na aba Sinastria de <a href="mapas.html#sinastria">Mapas Astrais</a> primeiro.</div>';
    if(calcBtn) calcBtn.disabled = true;
    return;
  }
  summaryEl.innerHTML = '<div class="hint">Pessoa A: <strong>'+result.nomeA+'</strong> ('+result.dataA+') · Pessoa B: <strong>'+result.nomeB+'</strong> ('+result.dataB+') — <a href="mapas.html#sinastria">recalcular em Mapas Astrais ↗</a></div>';
  if(calcBtn) calcBtn.disabled = false;
}

export function dtSetMode(m){
  document.getElementById('dtModeSingleBtn').classList.toggle('active', m==='single');
  document.getElementById('dtModeRangeBtn').classList.toggle('active', m==='range');
  document.getElementById('dtSingleFields').style.display = m==='single' ? '' : 'none';
  document.getElementById('dtRangeFields').style.display = m==='range' ? '' : 'none';
}
export function dtFillNow(){
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth()+1).padStart(2,'0');
  const d = String(now.getDate()).padStart(2,'0');
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  document.getElementById('dtSingleDate').value = y+'-'+mo+'-'+d;
  document.getElementById('dtSingleTime').value = hh+':'+mm;
  document.getElementById('dtSingleTz').value = -now.getTimezoneOffset()/60;
}
export function dtFillPreset(kind){
  const now = new Date();
  let start, end;
  if(kind==='hoje'){ start = new Date(now.getFullYear(),now.getMonth(),now.getDate()); end = start; }
  else if(kind==='semana'){ const dow = now.getDay(); start = new Date(now.getFullYear(),now.getMonth(),now.getDate()-dow); end = new Date(start.getFullYear(),start.getMonth(),start.getDate()+6); }
  else if(kind==='mes'){ start = new Date(now.getFullYear(),now.getMonth(),1); end = new Date(now.getFullYear(),now.getMonth()+1,0); }
  else if(kind==='semestre'){ const semStartMonth = now.getMonth()<6 ? 0 : 6; start = new Date(now.getFullYear(),semStartMonth,1); end = new Date(now.getFullYear(),semStartMonth+6,0); }
  else if(kind==='ano'){ start = new Date(now.getFullYear(),0,1); end = new Date(now.getFullYear(),11,31); }
  else return;
  dtSetMode('range');
  document.getElementById('dtRangeStart').value = toDateInputValue(start);
  document.getElementById('dtRangeEnd').value = toDateInputValue(end);
  dtUpdateRangeWarn();
}
export function dtSetStatus(msg, isError){
  const el = document.getElementById('dtStatus');
  el.textContent = msg;
  el.style.color = isError ? 'var(--rose)' : '';
}

export function dtUpdateRangeWarn(){
  const warnEl = document.getElementById('dtRangeWarn');
  const s = document.getElementById('dtRangeStart').value;
  const en = document.getElementById('dtRangeEnd').value;
  const step = Math.max(1, parseInt(document.getElementById('dtRangeStep').value)||1);
  if(!s || !en){ warnEl.textContent=''; return; }
  const [sy,smo,sd] = s.split('-').map(Number);
  const [ey,emo,ed] = en.split('-').map(Number);
  const jdStart = toJD(sy,smo,sd,12), jdEnd = toJD(ey,emo,ed,12);
  if(jdEnd<jdStart){ warnEl.textContent=''; return; }
  const spanDays = jdEnd-jdStart;
  const numDates = Math.floor(spanDays/step)+1;
  if(numDates>700){
    const suggested = Math.max(step+1, Math.ceil(spanDays/400));
    warnEl.innerHTML = '<span style="color:var(--gold-dim);">Intervalo grande:</span> '+numDates+' datas com o passo atual — pode demorar alguns segundos. Um passo de '+suggested+' dias (em vez de '+step+') fica bem mais rápido e raramente perde eventos, já que a tabela mostra o início e o fim de cada janela, não só o dia exato.';
  } else {
    warnEl.textContent='';
  }
}

export function calcDoubleTransits(){
  if(!synChartA || !synChartB){ dtSetStatus('Calcule o mapa de A e o mapa de B na aba Sinastria de Mapas Astrais primeiro.', true); return; }
  const isSingle = document.getElementById('dtModeSingleBtn').classList.contains('active');
  if(isSingle){
    dtSetStatus('Calculando...', false);
    setTimeout(()=>{ const ok = computeDoubleSingle(); if(ok!==false) dtSetStatus('', false); }, 30);
  } else {
    computeDoubleRangeAsync();
  }
}

// ---------- coleta de janelas de aspecto de um único planeta contra uma lista de pontos ----------
// otimizado: calcula a diferença angular UMA vez por dia (em vez de uma vez por aspecto,
// já que são 9 tipos de aspecto) e reaproveita pra testar os 9 ao mesmo tempo.
export function collectEventsForBody(tname, pts, chart, days, dayPositions, outEvents){
  pts.forEach(nname=>{
    const nlon = synPointLon(chart, nname);
    const opens = new Array(ASPECTS.length).fill(null);
    for(let idx=0; idx<days.length; idx++){
      const lon = dayPositions[idx][tname];
      let diff = Math.abs(normDeg(lon-nlon));
      if(diff>180) diff = 360-diff;
      for(let ai=0; ai<ASPECTS.length; ai++){
        const asp = ASPECTS[ai];
        const orb = Math.abs(diff-asp.angle);
        const active = orb<=asp.orb;
        let open = opens[ai];
        if(active){
          if(!open) opens[ai]={startIdx:idx,minOrb:orb,minIdx:idx};
          else if(orb<open.minOrb){ open.minOrb=orb; open.minIdx=idx; }
        } else if(open){
          outEvents.push({tname, point:nname, aspect:asp, orb:open.minOrb, startIdx:open.startIdx, endIdx:idx-1, exactIdx:open.minIdx});
          opens[ai]=null;
        }
      }
    }
    for(let ai=0; ai<ASPECTS.length; ai++){
      const open = opens[ai];
      if(open) outEvents.push({tname, point:nname, aspect:ASPECTS[ai], orb:open.minOrb, startIdx:open.startIdx, endIdx:days.length-1, exactIdx:open.minIdx});
    }
  });
}

export function computeDoubleRangeAsync(){
  const s = document.getElementById('dtRangeStart').value;
  const en = document.getElementById('dtRangeEnd').value;
  const step = Math.max(1, parseInt(document.getElementById('dtRangeStep').value)||1);
  if(!s || !en){ dtSetStatus('Informe data inicial e final.', true); return; }
  const [sy,smo,sd] = s.split('-').map(Number);
  const [ey,emo,ed] = en.split('-').map(Number);
  const jdStart = toJD(sy,smo,sd,12);
  const jdEnd = toJD(ey,emo,ed,12);
  if(jdEnd<jdStart){ dtSetStatus('Data final deve ser igual ou depois da inicial.', true); return; }

  const days=[];
  for(let jd=jdStart; jd<=jdEnd; jd+=step) days.push(jd);

  dtSetStatus('Calculando posições ('+days.length+' datas)...', false);
  setTimeout(()=>{
    const dayPositions = days.map(jd=>{ const T=(jd-2451545.0)/36525; return computeDayPositions(T); });
    const ptsA = synPointList(synChartA), ptsB = synPointList(synChartB);
    const eventsA = [], eventsB = [];
    const bodies = TRANSIT_BODIES.slice();
    let i = 0;
    function stepBody(){
      if(i>=bodies.length){
        finishDoubleRange(days, dayPositions, eventsA, eventsB, jdStart, jdEnd);
        return;
      }
      const tname = bodies[i];
      collectEventsForBody(tname, ptsA, synChartA, days, dayPositions, eventsA);
      collectEventsForBody(tname, ptsB, synChartB, days, dayPositions, eventsB);
      i++;
      dtSetStatus('Calculando... '+Math.round(i/bodies.length*100)+'% ('+PLANET_LABEL[tname]+')', false);
      setTimeout(stepBody, 0);
    }
    stepBody();
  }, 30);
}

export function finishDoubleRange(days, dayPositions, eventsA, eventsB, jdStart, jdEnd){
  function jdToDateLabel(jd){
    const z = Math.floor(jd+0.5);
    let A=z;
    if(z>=2299161){ const alpha=Math.floor((z-1867216.25)/36524.25); A=z+1+alpha-Math.floor(alpha/4); }
    const B=A+1524, C=Math.floor((B-122.1)/365.25), D=Math.floor(365.25*C), E=Math.floor((B-D)/30.6001);
    const day=B-D-Math.floor(30.6001*E);
    const month = E<14 ? E-1 : E-13;
    const year = month>2 ? C-4716 : C-4715;
    return String(day).padStart(2,'0')+'/'+String(month).padStart(2,'0')+'/'+year;
  }

  const eventsAByPlanet = {}, eventsBByPlanet = {};
  eventsA.forEach(e=>{ (eventsAByPlanet[e.tname]=eventsAByPlanet[e.tname]||[]).push(e); });
  eventsB.forEach(e=>{ (eventsBByPlanet[e.tname]=eventsBByPlanet[e.tname]||[]).push(e); });

  // dado um evento (aspecto de um planeta em trânsito com um ponto de A ou B),
  // monta o item de exibição usando o retrógrado calculado na própria data de orbe mínimo dele.
  function eventToListItem(e, chart){
    const lonAtExact = dayPositions[e.exactIdx][e.tname];
    return {
      point: e.point, aspect: e.aspect, orb: e.orb,
      house: chart.hasHouses ? houseOf(lonAtExact, chart.cusps) : null,
      score: impactScore(e.aspect, e.orb, e.tname, e.point, e.retro)
    };
  }

  const rows = [];
  Object.keys(eventsAByPlanet).forEach(tname=>{
    const aEvents = eventsAByPlanet[tname]||[];
    const bEvents = eventsBByPlanet[tname]||[];
    if(!aEvents.length || !bEvents.length) return;

    // marca o sentido (retrógrado ou não) de cada evento na sua própria data de orbe mínimo,
    // já que pode variar entre aspectos diferentes do mesmo planeta.
    [...aEvents, ...bEvents].forEach(e=>{
      const lon = dayPositions[e.exactIdx][e.tname];
      const T=(days[e.exactIdx]-2451545.0)/36525;
      const posNext = computeDayPositions(T+1/36525);
      let speed = posNext[e.tname]-lon; if(speed>180)speed-=360; if(speed<-180)speed+=360;
      e.retro = speed<0;
    });

    // divide a linha do tempo em segmentos usando todo início/fim de janela (de A e de B)
    // como corte — assim cada segmento tem um conjunto fixo de aspectos ativos em ambos os lados.
    const boundarySet = new Set([0, days.length]);
    aEvents.concat(bEvents).forEach(e=>{ boundarySet.add(e.startIdx); boundarySet.add(e.endIdx+1); });
    const boundaries = Array.from(boundarySet).sort((x,y)=>x-y);

    const segments = [];
    for(let i=0;i<boundaries.length-1;i++){
      const segStart = boundaries[i], segEnd = boundaries[i+1]-1;
      if(segStart>segEnd) continue;
      const activeA = aEvents.filter(e=>e.startIdx<=segStart && e.endIdx>=segEnd);
      const activeB = bEvents.filter(e=>e.startIdx<=segStart && e.endIdx>=segEnd);
      if(activeA.length && activeB.length) segments.push({segStart, segEnd, activeA, activeB});
    }

    // junta segmentos vizinhos com exatamente o mesmo conjunto de aspectos ativos
    // (evita quebrar em várias linhas quando nada muda de fato).
    function sameSet(x,y){ return x.length===y.length && x.every(e=>y.includes(e)); }
    const merged = [];
    segments.forEach(seg=>{
      const last = merged[merged.length-1];
      if(last && last.segEnd+1===seg.segStart && sameSet(last.activeA,seg.activeA) && sameSet(last.activeB,seg.activeB)){
        last.segEnd = seg.segEnd;
      } else {
        merged.push({segStart:seg.segStart, segEnd:seg.segEnd, activeA:seg.activeA, activeB:seg.activeB});
      }
    });

    merged.forEach(seg=>{
      const midIdx = Math.min(days.length-1, Math.round((seg.segStart+seg.segEnd)/2));
      const lonAtMid = dayPositions[midIdx][tname];
      const T=(days[midIdx]-2451545.0)/36525;
      const posNext = computeDayPositions(T+1/36525);
      let speed = posNext[tname]-lonAtMid; if(speed>180)speed-=360; if(speed<-180)speed+=360;

      const aList = seg.activeA.map(e=>eventToListItem(e, synChartA)).sort((x,y)=>y.score-x.score);
      const bList = seg.activeB.map(e=>eventToListItem(e, synChartB)).sort((x,y)=>y.score-x.score);
      const maxA = Math.max(...aList.map(a=>a.score));
      const maxB = Math.max(...bList.map(b=>b.score));
      const score = Math.min(100, Math.round((maxA+maxB)/2*1.1));

      rows.push({
        transit: tname, retro: speed<0, sIdx: signOf(lonAtMid),
        aList, bList, score,
        startLabel: jdToDateLabel(days[seg.segStart]),
        endLabel: jdToDateLabel(days[seg.segEnd]),
        touchesStart: seg.segStart===0,
        touchesEnd: seg.segEnd===days.length-1
      });
    });
  });
  rows.sort((x,y)=>y.score-x.score);
  doubleTransitData = {mode:'range', rows, rangeLabel: days.length+' dias ('+jdToDateLabel(jdStart)+' a '+jdToDateLabel(jdEnd)+')'};
  renderDoubleResults();
  dtSetStatus(rows.length+' trânsito(s) duplo(s) encontrado(s).', false);
}

export function computeDoubleSingle(){
  const dp = readDateParts(document.getElementById('dtSingleDate').value, document.getElementById('dtSingleTime').value, 12);
  if(!dp){ dtSetStatus('Informe a data do trânsito.', true); return false; }
  const tz = parseFloat(document.getElementById('dtSingleTz').value)||0;
  const jd = dateToJD_UT(dp.y,dp.mo,dp.d,dp.hour,tz);
  const T = (jd-2451545.0)/36525;
  const pos = computeDayPositions(T);
  const posNext = computeDayPositions(T+1/36525);

  const ptsA = synPointList(synChartA);
  const ptsB = synPointList(synChartB);

  const rows = [];
  TRANSIT_BODIES.forEach(tname=>{
    const lon = pos[tname];
    const speed = (()=>{ let d=posNext[tname]-lon; if(d>180)d-=360; if(d<-180)d+=360; return d; })();
    const retro = speed<0;
    const sIdx = signOf(lon);
    const aList = [], bList = [];
    ptsA.forEach(nname=>{
      const nlon = synPointLon(synChartA, nname);
      ASPECTS.forEach(asp=>{
        const orb = orbFromAspect(lon,nlon,asp.angle);
        if(orb<=asp.orb) aList.push({point:nname, aspect:asp, orb, score:impactScore(asp,orb,tname,nname,retro), house: synChartA.hasHouses?houseOf(lon,synChartA.cusps):null});
      });
    });
    ptsB.forEach(nname=>{
      const nlon = synPointLon(synChartB, nname);
      ASPECTS.forEach(asp=>{
        const orb = orbFromAspect(lon,nlon,asp.angle);
        if(orb<=asp.orb) bList.push({point:nname, aspect:asp, orb, score:impactScore(asp,orb,tname,nname,retro), house: synChartB.hasHouses?houseOf(lon,synChartB.cusps):null});
      });
    });
    if(aList.length && bList.length){
      aList.sort((x,y)=>y.score-x.score);
      bList.sort((x,y)=>y.score-x.score);
      const maxA = Math.max(...aList.map(a=>a.score));
      const maxB = Math.max(...bList.map(b=>b.score));
      const score = Math.min(100, Math.round((maxA+maxB)/2*1.1));
      rows.push({transit:tname, sIdx, retro, aList, bList, score});
    }
  });
  rows.sort((x,y)=>y.score-x.score);
  doubleTransitData = {mode:'single', rows};
  renderDoubleResults();
}


export function renderDoubleResults(){
  document.getElementById('dtResultsPanel').style.display='';
  const fPlanet=document.getElementById('dtFPlanet'), fA=document.getElementById('dtFA'), fB=document.getElementById('dtFB');
  fPlanet.innerHTML='<option value="">Todos</option>'
    +'<optgroup label="Grupos">'+Object.keys(PLANET_GROUPS).map(g=>'<option value="grupo:'+g+'">'+g+'</option>').join('')+'</optgroup>'
    +'<optgroup label="Planetas individuais">'+TRANSIT_BODIES.map(n=>'<option value="'+n+'">'+PLANET_LABEL[n]+'</option>').join('')+'</optgroup>';
  fA.innerHTML='<option value="">Todos</option>'+synPointList(synChartA).map(n=>'<option value="'+n+'">'+PLANET_LABEL[n]+'</option>').join('');
  fB.innerHTML='<option value="">Todos</option>'+synPointList(synChartB).map(n=>'<option value="'+n+'">'+PLANET_LABEL[n]+'</option>').join('');
  [fPlanet,fA,fB].forEach(f=>f.onchange=renderDoubleTable);
  document.getElementById('dtFImpact').oninput=renderDoubleTable;
  renderDoubleTable();
}

export function getFilteredDoubleRows(){
  const fPlanet=document.getElementById('dtFPlanet').value;
  const fA=document.getElementById('dtFA').value;
  const fB=document.getElementById('dtFB').value;
  const fImpact=parseInt(document.getElementById('dtFImpact').value)||0;
  const showZeroed = document.getElementById('dtShowZeroed').checked;
  return doubleTransitData.rows.filter(r=>{
    if(!planetMatchesFilter(r.transit, fPlanet)) return false;
    if(fA && !r.aList.some(a=>a.point===fA)) return false;
    if(fB && !r.bList.some(b=>b.point===fB)) return false;
    if(r.score<fImpact) return false;
    if(!showZeroed && r.score===0) return false;
    return true;
  });
}

// Filtra os toques individuais zerados (item.score===0) de dentro de aList/bList —
// mesmo checkbox #dtShowZeroed usado pro filtro de linha inteira em getFilteredDoubleRows,
// já que uma linha pode ficar de pé (score agregado > 0 por causa do outro lado) mas
// ainda ter alguns toques individuais fora do teto de orbe do tipo de astro.
export function visibleDoubleItems(list){
  const showZeroed = document.getElementById('dtShowZeroed').checked;
  return showZeroed ? list : list.filter(item=>item.score>0);
}
export function doubleAspectListHtml(list){
  const visible = visibleDoubleItems(list);
  if(visible.length===0) return '<span class="hint">—</span>';
  return visible.map(item=>
    '<div class="dt-aspect-item">'+item.aspect.glyph+' '+item.aspect.name+' '+PLANET_LABEL[item.point]
    +'<div class="hint">orbe '+item.orb.toFixed(2)+'°'+(item.house?(', Casa '+item.house):'')+'</div></div>'
  ).join('');
}

export function doubleRowHtml(r, isRange){
  const nameA = document.getElementById('synAName').value.trim() || 'A';
  const nameB = document.getElementById('synBName').value.trim() || 'B';
  const periodCell = isRange
    ? (r.startLabel===r.endLabel ? r.startLabel : r.startLabel+' → '+r.endLabel)+' '+phaseTag(r)
    : (r.retro?'<span class="tag retro">Retróg.</span>':'');
  return '<tr>'
    +'<td>'+impactBar(r.score)+' <span class="hint">'+r.score+'</span></td>'
    +'<td><span class="glyph">'+PLANET_GLYPH[r.transit]+'</span>'+PLANET_LABEL[r.transit]+' '+SIGN_GLYPH[r.sIdx]+'</td>'
    +'<td>'+doubleAspectListHtml(r.aList)+'<div class="hint">('+nameA+')</div></td>'
    +'<td>'+doubleAspectListHtml(r.bList)+'<div class="hint">('+nameB+')</div></td>'
    +'<td>'+periodCell+'</td>'
    +'</tr>';
}

export function renderDoubleTable(){
  const rows = getFilteredDoubleRows();
  document.getElementById('dtResultCount').textContent = rows.length+' de '+doubleTransitData.rows.length+' trânsito(s) duplo(s)';
  const isRange = doubleTransitData.mode==='range';
  const table = document.getElementById('dtAspectsTable');
  table.querySelector('thead').innerHTML = '<tr><th>Impacto</th><th>Trânsito</th><th>Toca A</th><th>Toca B</th><th>'+(isRange?'Período':'Status')+'</th></tr>';
  table.querySelector('tbody').innerHTML = rows.map(r=>doubleRowHtml(r,isRange)).join('') || '<tr><td colspan="5" class="empty">Nenhum trânsito duplo com os filtros atuais.</td></tr>';
}

export function rowToDoublePlainObject(r, isRange){
  const base = {
    transito: PLANET_LABEL[r.transit],
    toca_a: r.aList.map(a=>({ponto: PLANET_LABEL[a.point], aspecto: a.aspect.name, orbe_graus: Number(a.orb.toFixed(2)), casa_de_transito: a.house||null})),
    toca_b: r.bList.map(b=>({ponto: PLANET_LABEL[b.point], aspecto: b.aspect.name, orbe_graus: Number(b.orb.toFixed(2)), casa_de_transito: b.house||null})),
    impacto: r.score
  };
  if(isRange){
    base.inicio = r.startLabel; base.fim = r.endLabel;
    base.em_curso = !!(r.touchesStart && r.touchesEnd);
  } else {
    base.retrogrado = !!r.retro;
  }
  return base;
}

export function exportDoubleJson(){
  if(!doubleTransitData) return;
  const rows = getFilteredDoubleRows();
  const isRange = doubleTransitData.mode==='range';
  const data = { gerado_em: new Date().toISOString(), transitos_duplos: rows.map(r=>rowToDoublePlainObject(r,isRange)) };
  downloadBlob(JSON.stringify(data, null, 2), 'sinastria-transitos-duplos.json', 'application/json');
}

export function exportDoubleCsv(){
  if(!doubleTransitData) return;
  const rows = getFilteredDoubleRows();
  const isRange = doubleTransitData.mode==='range';
  const header = ['Impacto','Trânsito','Toca A','Toca B',(isRange?'Período':'Retrógrado')];
  const lines=[header.join(';')];
  function csvEscape(v){ v=String(v==null?'':v); return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
  function sideText(list){
    return list.map(item=>item.aspect.name+' '+PLANET_LABEL[item.point]+' (orbe '+item.orb.toFixed(2)+'°'+(item.house?(', Casa '+item.house):'')+')').join(' | ');
  }
  rows.forEach(r=>{
    lines.push([
      r.score, PLANET_LABEL[r.transit], sideText(r.aList), sideText(r.bList),
      isRange ? (r.startLabel+' → '+r.endLabel) : (r.retro?'Sim':'Não')
    ].map(csvEscape).join(';'));
  });
  downloadBlob('\uFEFF'+lines.join('\n'), 'sinastria-transitos-duplos.csv', 'text/csv;charset=utf-8');
}

export function copyDoubleForAI(btn){
  if(!doubleTransitData) return;
  const nameA = document.getElementById('synAName').value.trim() || 'Pessoa A';
  const nameB = document.getElementById('synBName').value.trim() || 'Pessoa B';
  const rows = getFilteredDoubleRows();
  const isRange = doubleTransitData.mode==='range';
  let text = 'TRÂNSITOS DUPLOS ENTRE '+nameA.toUpperCase()+' E '+nameB.toUpperCase()+' ('+rows.length+' de '+doubleTransitData.rows.length+', ordenados por impacto)\n';
  function sideText(list){
    return list.map(item=>item.aspect.name.toLowerCase()+' (orbe '+item.orb.toFixed(2)+'°) com '+PLANET_LABEL[item.point]).join(', e ');
  }
  rows.forEach((r,idx)=>{
    let line = (idx+1)+'. '+PLANET_LABEL[r.transit]+' em trânsito forma, para '+nameA+': '+sideText(r.aList)
      +'; e, ao mesmo tempo, para '+nameB+': '+sideText(r.bList);
    if(isRange) line += ' — ativo de '+r.startLabel+' a '+r.endLabel;
    else if(r.retro) line += ' — retrógrado';
    line += '. [impacto '+r.score+'/100]';
    text += line+'\n';
  });
  text += '\nPor favor, interprete esses trânsitos duplos considerando que o mesmo planeta ativa simultaneamente os mapas de '+nameA+' e '+nameB+' — costuma indicar um evento ou tema que mexe com a relação como um todo, não só com uma das duas pessoas.';
  const box = document.getElementById('dtCopyBox');
  box.textContent = text; box.style.display='block';
  const ta = document.getElementById('dtCopyArea');
  ta.value = text; ta.select();
  try{ navigator.clipboard.writeText(text); }catch(e){ document.execCommand('copy'); }
  if(btn){ const original=btn.textContent; btn.textContent='Copiado ✓'; btn.disabled=true; setTimeout(()=>{btn.textContent=original;btn.disabled=false;},1600); }
}

