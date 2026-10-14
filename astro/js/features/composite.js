// ============================================================================
// features/composite.js
// Mapa composto (aba "Composto"): ponto médio circular entre A e B (mesmos
// mapas calculados em features/synastry.js), e trânsitos sobre esse composto
// reaproveitando o motor de eventos de features/transits.js.
// ============================================================================

import { normDeg, toJD, dateToJD_UT } from '../core/time.js';
import { computeDayPositions } from '../core/ephemeris.js';
import { wholeSignCusps, equalCusps, houseOf, degMinStr, signOf } from '../core/houses.js';
import { ASPECTS, angleLon, orbFromAspect, impactScore, effectiveMaxOrb } from '../core/aspects.js';
import {
  TRANSIT_BODIES, PLANET_GLYPH, PLANET_LABEL, SIGN_GLYPH, SIGNS, PLANET_GROUPS, speedTag
} from '../core/constants.js';
import { downloadBlob } from '../shared/download.js';
import { toDateInputValue, readDateParts } from './natal.js';
import { synChartA, synChartB, synPointList, synPointLon, loadSynChartsFromStorageOnly } from './synastry.js';
import {
  collectNatalAspectEvents, planetMatchesFilter, isBackground, aspectRowHtml, rowToPlainObject
} from './transits.js';

export function circularMidpoint(lon1, lon2){
  let diff = normDeg(lon2 - lon1);
  if(diff > 180) diff -= 360;
  return normDeg(lon1 + diff/2);
}

export let compositeChart = null; // mesma "forma" de natalChart — reaproveita synPointList/synPointLon

// ---------- cálculo puro (sem DOM), reaproveitado tanto pela aba Composto
// (mapas.html, formulário com synChartA/B já na tela) quanto pela aba
// "Sobre o composto" em efemerides.html (que só tem A/B via localStorage) ----------
export function computeCompositeFromCharts(chartA, chartB, houseSystem){
  const positions = {};
  TRANSIT_BODIES.forEach(name=>{
    positions[name] = circularMidpoint(chartA.positions[name], chartB.positions[name]);
  });

  let asc=null, mc=null, cusps=null, hasHouses=false, warning=null;
  if(chartA.hasHouses && chartB.hasHouses){
    asc = circularMidpoint(chartA.asc, chartB.asc);
    mc = circularMidpoint(chartA.mc, chartB.mc);
    cusps = houseSystem==='whole' ? wholeSignCusps(asc) : equalCusps(asc);
    hasHouses = true;
  } else {
    warning = 'Um dos mapas (A ou B) não tem hora/local completos — o composto foi calculado sem Ascendente/Casas, só signo e grau dos planetas.';
  }

  return {compositeChart: {positions, cusps, asc, mc, hasHouses}, warning};
}

export function calcComposite(){
  const msgEl = document.getElementById('coMsg');
  msgEl.textContent=''; msgEl.style.color='';
  if(!synChartA || !synChartB){
    msgEl.textContent = 'Calcule os mapas de A e B na aba Sinastria primeiro.';
    msgEl.style.color = 'var(--rose)';
    return;
  }
  const houseSystem = document.getElementById('coHouseSystem').value;
  const result = computeCompositeFromCharts(synChartA, synChartB, houseSystem);
  if(result.warning){ msgEl.textContent = result.warning; msgEl.style.color = 'var(--gold-dim)'; }
  compositeChart = result.compositeChart;
  renderComposite();
}

// ---------- usado pela aba "Sobre o composto" (efemerides.html) — recalcula o
// composto na hora a partir do A/B salvo no localStorage (evita guardar um
// composto "congelado" que poderia ficar desatualizado se A/B mudar) ----------
export function coInitFromStorage(){
  const summaryEl = document.getElementById('coPeopleSummary');
  const calcBtn = document.getElementById('coCalcTransitsBtn');
  if(!summaryEl) return {ok:false};
  const result = loadSynChartsFromStorageOnly();
  if(!result.ok){
    summaryEl.innerHTML = '<div class="hint">Calcule os mapas de Pessoa A e Pessoa B, e o mapa composto, na aba Composto de <a href="mapas.html#composto">Mapas Astrais</a> primeiro.</div>';
    if(calcBtn) calcBtn.disabled = true;
    compositeChart = null;
    return {ok:false};
  }
  coRecomputeFromStorage();
  summaryEl.innerHTML = '<div class="hint">Pessoa A: <strong>'+result.nomeA+'</strong> ('+result.dataA+') · Pessoa B: <strong>'+result.nomeB+'</strong> ('+result.dataB+') — <a href="mapas.html#composto">recalcular em Mapas Astrais ↗</a></div>';
  if(calcBtn) calcBtn.disabled = false;
  return {ok:true};
}
export function coRecomputeFromStorage(){
  if(!synChartA || !synChartB) return;
  const houseSystem = document.getElementById('coHouseSystem').value;
  const result = computeCompositeFromCharts(synChartA, synChartB, houseSystem);
  compositeChart = result.compositeChart;
}

export function renderComposite(){
  const el = document.getElementById('coOutput');
  if(!compositeChart){ el.innerHTML = '<div class="empty">Calcule o mapa composto.</div>'; return; }
  let rows='';
  TRANSIT_BODIES.forEach(name=>{
    const lon = compositeChart.positions[name];
    const sIdx = signOf(lon);
    const house = compositeChart.hasHouses ? houseOf(lon,compositeChart.cusps) : '—';
    rows += '<tr><td><span class="glyph natal">'+PLANET_GLYPH[name]+'</span>'+PLANET_LABEL[name]+'</td><td>'+SIGN_GLYPH[sIdx]+' '+SIGNS[sIdx]+'</td><td>'+degMinStr(lon%30)+'</td><td>'+(house!=='—'?('Casa '+house):'—')+'</td></tr>';
  });
  if(compositeChart.hasHouses){
    const ascS=signOf(compositeChart.asc), mcS=signOf(compositeChart.mc);
    const dscLon=angleLon(compositeChart,'DSC'), icLon=angleLon(compositeChart,'IC'), fortLon=angleLon(compositeChart,'Fortuna'), espLon=angleLon(compositeChart,'Espirito');
    const dscS=signOf(dscLon), icS=signOf(icLon), fortS=signOf(fortLon), espS=signOf(espLon);
    rows += '<tr><td><span class="glyph natal">Asc</span>Ascendente</td><td>'+SIGN_GLYPH[ascS]+' '+SIGNS[ascS]+'</td><td>'+degMinStr(compositeChart.asc%30)+'</td><td>Casa 1</td></tr>';
    rows += '<tr><td><span class="glyph natal">MC</span>Meio do Céu</td><td>'+SIGN_GLYPH[mcS]+' '+SIGNS[mcS]+'</td><td>'+degMinStr(compositeChart.mc%30)+'</td><td>Casa 10*</td></tr>';
    rows += '<tr><td><span class="glyph natal">Dsc</span>Descendente</td><td>'+SIGN_GLYPH[dscS]+' '+SIGNS[dscS]+'</td><td>'+degMinStr(dscLon%30)+'</td><td>Casa 7</td></tr>';
    rows += '<tr><td><span class="glyph natal">IC</span>Fundo do Céu</td><td>'+SIGN_GLYPH[icS]+' '+SIGNS[icS]+'</td><td>'+degMinStr(icLon%30)+'</td><td>Casa 4*</td></tr>';
    rows += '<tr><td><span class="glyph natal">'+PLANET_GLYPH.Fortuna+'</span>Parte da Fortuna</td><td>'+SIGN_GLYPH[fortS]+' '+SIGNS[fortS]+'</td><td>'+degMinStr(fortLon%30)+'</td><td>Casa '+houseOf(fortLon,compositeChart.cusps)+'</td></tr>';
    rows += '<tr><td><span class="glyph natal">'+PLANET_GLYPH.Espirito+'</span>Parte do Espírito</td><td>'+SIGN_GLYPH[espS]+' '+SIGNS[espS]+'</td><td>'+degMinStr(espLon%30)+'</td><td>Casa '+houseOf(espLon,compositeChart.cusps)+'</td></tr>';
  }
  let warn = compositeChart.hasHouses ? '' : '<div class="hint" style="margin-bottom:10px;"><span class="badge-required">Sem Casas:</span> um dos dois mapas não tinha hora/local completos.</div>';
  el.innerHTML = warn + '<table><thead><tr><th>Ponto</th><th>Signo</th><th>Grau</th><th>Casa</th></tr></thead><tbody>'+rows+'</tbody></table>'
    + (compositeChart.hasHouses ? '<div class="hint" style="margin-top:8px;">*MC nem sempre cai exatamente na cúspide da Casa 10 em Signos Inteiros — isso é esperado.</div>' : '')
    + renderCompositeDetailTables(compositeChart)
    + renderCompositeFooterActions();
}

// ---------- Casas e Aspectos do composto (tabela de detalhe, colapsada por
// padrão atrás de um interruptor — mesmo padrão de features/natal.js,
// renderDetailTables/toggleNatalDetailTables, só que sem a tabela de
// Velocidades: o composto é um ponto médio, não tem "movimento" próprio) ----------
const CO_DETAIL_CORE_PLANETS = ["Sol","Lua","Mercurio","Venus","Marte","Jupiter","Saturno","Urano","Netuno","Plutao"];
const CO_DETAIL_OTHER_BASE = ["Quiron","NodoNorte","Lilith"];
const CO_DETAIL_OTHER_HOUSES = ["Asc","MC","DSC","IC","Fortuna","Espirito","Vertice"];

function coFindAspectBetween(lon1, lon2, nameA, nameB){
  let best = null;
  for(const asp of ASPECTS){
    const orb = orbFromAspect(lon1, lon2, asp.angle);
    const maxOrb = effectiveMaxOrb(asp, nameA, nameB);
    if(orb <= maxOrb && (!best || orb < best.orb)){
      best = {aspect: asp.name, glyph: asp.glyph, orb};
    }
  }
  return best;
}

function computeCompositeDetailAspects(chart){
  const other = CO_DETAIL_OTHER_BASE.concat(chart.hasHouses ? CO_DETAIL_OTHER_HOUSES : []);
  const all = CO_DETAIL_CORE_PLANETS.concat(other);
  const planetary = [], others = [];
  for(let i=0;i<all.length;i++){
    for(let j=i+1;j<all.length;j++){
      const nameA=all[i], nameB=all[j];
      const lon1=angleLon(chart,nameA), lon2=angleLon(chart,nameB);
      const found = coFindAspectBetween(lon1,lon2,nameA,nameB);
      if(!found) continue;
      const bothCore = CO_DETAIL_CORE_PLANETS.includes(nameA) && CO_DETAIL_CORE_PLANETS.includes(nameB);
      (bothCore?planetary:others).push({nameA,nameB,...found});
    }
  }
  planetary.sort((a,b)=>a.orb-b.orb);
  others.sort((a,b)=>a.orb-b.orb);
  return {planetary, others};
}

function coHousesTableHtml(chart){
  if(!chart.hasHouses) return '<div class="hint">Sem hora/local completos — Casas não calculadas.</div>';
  const rows = chart.cusps.map((c,i)=>{
    const sIdx = signOf(c);
    return '<tr><td>Casa '+(i+1)+'</td><td>'+SIGN_GLYPH[sIdx]+' '+SIGNS[sIdx]+'</td><td>'+degMinStr(c%30)+'</td></tr>';
  }).join('');
  return '<table><thead><tr><th>Casa</th><th>Signo</th><th>Grau</th></tr></thead><tbody>'+rows+'</tbody></table>';
}

function coAspectRowsTableHtml(rows){
  if(!rows.length) return '<div class="hint">Nenhum aspecto dentro do orbe considerado.</div>';
  const body = rows.map(r=>'<tr><td>'+PLANET_GLYPH[r.nameA]+' '+PLANET_LABEL[r.nameA]+'</td><td>'+r.glyph+' '+r.aspect+'</td><td>'+PLANET_GLYPH[r.nameB]+' '+PLANET_LABEL[r.nameB]+'</td><td>'+r.orb.toFixed(2)+'°</td></tr>').join('');
  return '<table><thead><tr><th>Ponto A</th><th>Aspecto</th><th>Ponto B</th><th>Orbe</th></tr></thead><tbody>'+body+'</tbody></table>';
}

function renderCompositeDetailTables(chart){
  const {planetary, others} = computeCompositeDetailAspects(chart);
  return `
  <div class="divider"></div>
  <button class="btn secondary small" id="coDetailToggleBtn" onclick="toggleCompositeDetailTables()">▸ Casas e Aspectos</button>
  <div id="coDetailBox" style="display:none; margin-top:12px;">
    <h3 style="margin-top:0; margin-bottom:10px;">Casas</h3>
    ${coHousesTableHtml(chart)}
    <h3 style="margin-top:26px; margin-bottom:10px;">Aspectos planetários</h3>
    ${coAspectRowsTableHtml(planetary)}
    <h3 style="margin-top:26px; margin-bottom:10px;">Outros aspectos <span class="hint">(Quíron, Nodo, Lilith${chart.hasHouses?', ângulos, Parte da Fortuna, Parte do Espírito e Vértice':''})</span></h3>
    ${coAspectRowsTableHtml(others)}
  </div>`;
}

export function toggleCompositeDetailTables(){
  const box = document.getElementById('coDetailBox');
  const btn = document.getElementById('coDetailToggleBtn');
  if(!box || !btn) return;
  const hidden = box.style.display==='none' || !box.style.display;
  box.style.display = hidden ? 'block' : 'none';
  btn.textContent = (hidden?'▾':'▸') + ' Casas e Aspectos';
}

// ---------- versões em Markdown das mesmas tabelas acima, usadas em
// buildCompositeChartMarkdown() ----------
function coHousesTableMd(chart){
  if(!chart.hasHouses) return '_Sem hora/local completos — Casas não calculadas._\n';
  let md = '| Casa | Signo | Grau |\n|---|---|---|\n';
  chart.cusps.forEach((c,i)=>{ md += `| Casa ${i+1} | ${SIGNS[signOf(c)]} | ${degMinStr(c%30)} |\n`; });
  return md;
}

function coAspectRowsTableMd(rows){
  if(!rows.length) return '_Nenhum aspecto dentro do orbe considerado._\n';
  let md = '| Ponto A | Aspecto | Ponto B | Orbe |\n|---|---|---|---|\n';
  rows.forEach(r=>{ md += `| ${PLANET_LABEL[r.nameA]} | ${r.aspect} | ${PLANET_LABEL[r.nameB]} | ${r.orb.toFixed(2)}° |\n`; });
  return md;
}

// ---------- Exportação em Markdown do mapa composto em si (botões "Copiar
// para IA" / "Baixar .md" logo abaixo da tabela de posições+Casas+Aspectos —
// não confundir com copyCompositeForAI(), que exporta os TRÂNSITOS sobre o
// composto na aba "Sobre o composto" de efemerides.html) ----------
export function buildCompositeChartMarkdown(chart){
  const nameA = (document.getElementById('synAName')?.value || '').trim() || 'Pessoa A';
  const nameB = (document.getElementById('synBName')?.value || '').trim() || 'Pessoa B';

  let md = `# Mapa Composto — ${nameA} + ${nameB}\n\n`;
  if(chart.hasHouses){
    const houseSystem = document.getElementById('coHouseSystem')?.value;
    const sysLabel = {whole:'Signos Inteiros', equal:'Casas Iguais'};
    md += 'Sistema de casas: '+(sysLabel[houseSystem]||houseSystem||'—')+'\n\n';
  }

  md += '## Posições\n\n| Ponto | Signo | Grau | Casa |\n|---|---|---|---|\n';
  TRANSIT_BODIES.forEach(name=>{
    const lon = chart.positions[name];
    const house = chart.hasHouses ? houseOf(lon,chart.cusps) : null;
    md += `| ${PLANET_LABEL[name]} | ${SIGNS[signOf(lon)]} | ${degMinStr(lon%30)} | ${house?('Casa '+house):'—'} |\n`;
  });
  if(chart.hasHouses){
    const dscLon=angleLon(chart,'DSC'), icLon=angleLon(chart,'IC'), fortLon=angleLon(chart,'Fortuna'), espLon=angleLon(chart,'Espirito');
    md += `| Ascendente | ${SIGNS[signOf(chart.asc)]} | ${degMinStr(chart.asc%30)} | Casa 1 |\n`;
    md += `| Meio do Céu | ${SIGNS[signOf(chart.mc)]} | ${degMinStr(chart.mc%30)} | Casa 10* |\n`;
    md += `| Descendente | ${SIGNS[signOf(dscLon)]} | ${degMinStr(dscLon%30)} | Casa 7 |\n`;
    md += `| Fundo do Céu | ${SIGNS[signOf(icLon)]} | ${degMinStr(icLon%30)} | Casa 4* |\n`;
    md += `| Parte da Fortuna | ${SIGNS[signOf(fortLon)]} | ${degMinStr(fortLon%30)} | Casa ${houseOf(fortLon,chart.cusps)} |\n`;
    md += `| Parte do Espírito | ${SIGNS[signOf(espLon)]} | ${degMinStr(espLon%30)} | Casa ${houseOf(espLon,chart.cusps)} |\n`;
    md += '\n*MC nem sempre cai exatamente na cúspide da Casa 10 no sistema de Signos Inteiros.*\n';
  } else {
    md += '\n*Um dos dois mapas não tinha hora/local completos — Ascendente e Casas não calculados.*\n';
  }
  md += '\n';

  md += '## Casas e Aspectos\n\n';
  md += '### Casas\n\n' + coHousesTableMd(chart) + '\n';
  const detailAsp = computeCompositeDetailAspects(chart);
  md += '### Aspectos planetários\n\n' + coAspectRowsTableMd(detailAsp.planetary) + '\n';
  md += '### Outros aspectos\n\n' + coAspectRowsTableMd(detailAsp.others) + '\n';

  md += '---\n_Gerado pelo Parada Mística — mapa composto (ponto médio circular entre os dois mapas natais)._\n';
  return md;
}

export function copyCompositeChartForAI(btn){
  if(!compositeChart) return;
  const text = buildCompositeChartMarkdown(compositeChart);
  const ta = document.getElementById('coChartCopyArea');
  if(ta){ ta.value = text; ta.select(); }
  try{ navigator.clipboard.writeText(text); }
  catch(e){ if(ta) document.execCommand('copy'); }
  if(btn){
    const original = btn.textContent;
    btn.textContent = 'Copiado ✓';
    btn.disabled = true;
    setTimeout(()=>{ btn.textContent = original; btn.disabled = false; }, 1600);
  }
}

export function downloadCompositeChartMd(){
  if(!compositeChart) return;
  const nameA = (document.getElementById('synAName')?.value || '').trim();
  const nameB = (document.getElementById('synBName')?.value || '').trim();
  const slug = (nameA && nameB) ? '-'+(nameA+'-'+nameB).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') : '';
  downloadBlob(buildCompositeChartMarkdown(compositeChart), 'mapa-composto'+slug+'.md', 'text/markdown;charset=utf-8');
}

function renderCompositeFooterActions(){
  return `
  <div class="divider"></div>
  <div class="structural-row" style="flex-direction:row; gap:10px; flex-wrap:wrap;">
    <button class="btn secondary small" onclick="copyCompositeChartForAI(this)">Copiar para IA</button>
    <button class="btn secondary small" onclick="downloadCompositeChartMd()">Baixar .md</button>
  </div>
  <textarea id="coChartCopyArea" style="position:absolute; left:-9999px;"></textarea>`;
}

// ---------- trânsitos sobre o composto (reaproveita o mesmo motor de cálculo) ----------
export let compositeTransitData = null;

export function coSetMode(m){
  document.getElementById('coModeSingleBtn').classList.toggle('active', m==='single');
  document.getElementById('coModeRangeBtn').classList.toggle('active', m==='range');
  document.getElementById('coSingleFields').style.display = m==='single' ? '' : 'none';
  document.getElementById('coRangeFields').style.display = m==='range' ? '' : 'none';
}
export function coFillNow(){
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth()+1).padStart(2,'0');
  const d = String(now.getDate()).padStart(2,'0');
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  document.getElementById('coSingleDate').value = y+'-'+mo+'-'+d;
  document.getElementById('coSingleTime').value = hh+':'+mm;
  document.getElementById('coSingleTz').value = -now.getTimezoneOffset()/60;
}
export function coFillPreset(kind){
  const now = new Date();
  let start, end;
  if(kind==='hoje'){ start = new Date(now.getFullYear(),now.getMonth(),now.getDate()); end = start; }
  else if(kind==='semana'){ const dow = now.getDay(); start = new Date(now.getFullYear(),now.getMonth(),now.getDate()-dow); end = new Date(start.getFullYear(),start.getMonth(),start.getDate()+6); }
  else if(kind==='mes'){ start = new Date(now.getFullYear(),now.getMonth(),1); end = new Date(now.getFullYear(),now.getMonth()+1,0); }
  else if(kind==='semestre'){ const semStartMonth = now.getMonth()<6 ? 0 : 6; start = new Date(now.getFullYear(),semStartMonth,1); end = new Date(now.getFullYear(),semStartMonth+6,0); }
  else if(kind==='ano'){ start = new Date(now.getFullYear(),0,1); end = new Date(now.getFullYear(),11,31); }
  else return;
  coSetMode('range');
  document.getElementById('coRangeStart').value = toDateInputValue(start);
  document.getElementById('coRangeEnd').value = toDateInputValue(end);
  coUpdateRangeWarn();
}
export function coSetTransitStatus(msg, isError){
  const el = document.getElementById('coTransitStatus');
  el.textContent = msg;
  el.style.color = isError ? 'var(--rose)' : '';
}

export function coUpdateRangeWarn(){
  const warnEl = document.getElementById('coRangeWarn');
  const s = document.getElementById('coRangeStart').value;
  const en = document.getElementById('coRangeEnd').value;
  const step = Math.max(1, parseInt(document.getElementById('coRangeStep').value)||1);
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

export function calcCompositeTransits(){
  if(!compositeChart){ coSetTransitStatus('Calcule o mapa composto (aba Composto de Mapas Astrais) primeiro.', true); return; }
  const isSingle = document.getElementById('coModeSingleBtn').classList.contains('active');
  coSetTransitStatus('Calculando...', false);
  setTimeout(()=>{
    const ok = isSingle ? computeCompositeSingle() : computeCompositeRange();
    if(ok!==false) coSetTransitStatus('', false);
  }, 30);
}

export function computeCompositeSingle(){
  const dp = readDateParts(document.getElementById('coSingleDate').value, document.getElementById('coSingleTime').value, 12);
  if(!dp){ coSetTransitStatus('Informe a data do trânsito.', true); return false; }
  const tz = parseFloat(document.getElementById('coSingleTz').value)||0;
  const jd = dateToJD_UT(dp.y,dp.mo,dp.d,dp.hour,tz);
  const T = (jd-2451545.0)/36525;
  const pos = computeDayPositions(T);
  const posNext = computeDayPositions(T+1/36525);

  const positionRows = TRANSIT_BODIES.map(name=>{
    const lon = pos[name];
    const speed = (()=>{ let d=posNext[name]-lon; if(d>180)d-=360; if(d<-180)d+=360; return d; })();
    const retro = speed<0;
    const sIdx = signOf(lon);
    const house = compositeChart.hasHouses ? houseOf(lon,compositeChart.cusps) : null;
    return {name, lon, sIdx, house, retro, speed};
  });

  const natalPts = synPointList(compositeChart);
  const aspectRows = [];
  TRANSIT_BODIES.forEach(tname=>{
    const lon = pos[tname];
    const lonNext = posNext[tname];
    natalPts.forEach(nname=>{
      const nlon = synPointLon(compositeChart, nname);
      ASPECTS.forEach(asp=>{
        const orb = orbFromAspect(lon,nlon,asp.angle);
        if(orb<=asp.orb){
          const orbNext = orbFromAspect(lonNext,nlon,asp.angle);
          const applying = orbNext < orb;
          const retro = positionRows.find(p=>p.name===tname).retro;
          const score = impactScore(asp,orb,tname,nname,retro);
          aspectRows.push({
            transit:tname, natal:nname, aspect:asp, orb, applying, retro,
            sIdx: signOf(lon), house: compositeChart.hasHouses ? houseOf(lon,compositeChart.cusps) : null,
            score, dateLabel: null
          });
        }
      });
    });
  });

  compositeTransitData = {mode:'single', positionRows, aspectRows};
  renderCompositeResults();
}

export function computeCompositeRange(){
  const s = document.getElementById('coRangeStart').value;
  const en = document.getElementById('coRangeEnd').value;
  const step = Math.max(1, parseInt(document.getElementById('coRangeStep').value)||1);
  if(!s || !en){ coSetTransitStatus('Informe data inicial e final.', true); return false; }
  const [sy,smo,sd] = s.split('-').map(Number);
  const [ey,emo,ed] = en.split('-').map(Number);
  const jdStart = toJD(sy,smo,sd,12);
  const jdEnd = toJD(ey,emo,ed,12);
  if(jdEnd<jdStart){ coSetTransitStatus('Data final deve ser igual ou depois da inicial.', true); return false; }

  const days=[];
  for(let jd=jdStart; jd<=jdEnd; jd+=step) days.push(jd);

  const dayPositions = days.map(jd=>{
    const T=(jd-2451545.0)/36525;
    return computeDayPositions(T);
  });

  const natalPts = synPointList(compositeChart);
  const finishedEvents = [];

  function jdToDateLabel(jd){
    const z = Math.floor(jd+0.5);
    const f = jd+0.5-z;
    let A=z;
    if(z>=2299161){ const alpha=Math.floor((z-1867216.25)/36524.25); A=z+1+alpha-Math.floor(alpha/4); }
    const B=A+1524, C=Math.floor((B-122.1)/365.25), D=Math.floor(365.25*C), E=Math.floor((B-D)/30.6001);
    const day=B-D-Math.floor(30.6001*E);
    const month = E<14 ? E-1 : E-13;
    const year = month>2 ? C-4716 : C-4715;
    return String(day).padStart(2,'0')+'/'+String(month).padStart(2,'0')+'/'+year;
  }

  TRANSIT_BODIES.forEach(tname=>{
    collectNatalAspectEvents(tname, natalPts, compositeChart, nname=>synPointLon(compositeChart,nname), days, dayPositions, jdToDateLabel, finishedEvents);
  });

  const lastPos = dayPositions[dayPositions.length-1];
  const prevPos = dayPositions.length>1 ? dayPositions[dayPositions.length-2] : lastPos;
  const positionRows = TRANSIT_BODIES.map(name=>{
    const lon=lastPos[name];
    let speed=lon-prevPos[name]; if(speed>180)speed-=360; if(speed<-180)speed+=360;
    return {name, lon, sIdx:signOf(lon), house: compositeChart.hasHouses?houseOf(lon,compositeChart.cusps):null, retro:speed<0, speed};
  });

  compositeTransitData = {mode:'range', positionRows, aspectRows:finishedEvents, rangeLabel: days.length+' dias ('+jdToDateLabel(jdStart)+' a '+jdToDateLabel(jdEnd)+')'};
  renderCompositeResults();
}

export function renderCompositeResults(){
  document.getElementById('coResultsPanel').style.display='';

  const posTable = document.getElementById('coPositionsTable');
  posTable.querySelector('thead').innerHTML = '<tr><th>Planeta</th><th>Signo</th><th>Grau</th><th>Casa do composto</th><th>Status</th></tr>';
  posTable.querySelector('tbody').innerHTML = compositeTransitData.positionRows.map(p=>{
    return '<tr><td><span class="glyph">'+PLANET_GLYPH[p.name]+'</span>'+PLANET_LABEL[p.name]+'</td>'
      +'<td>'+SIGN_GLYPH[p.sIdx]+' '+SIGNS[p.sIdx]+'</td>'
      +'<td>'+degMinStr(p.lon%30)+'</td>'
      +'<td>'+(p.house?('Casa '+p.house):'—')+'</td>'
      +'<td>'+(p.retro?'<span class="tag retro">Retrógrado</span>':'<span class="tag">Direto</span>')+'</td></tr>';
  }).join('');

  const fPlanet=document.getElementById('coFPlanet'), fSign=document.getElementById('coFSign'),
        fHouse=document.getElementById('coFHouse'), fAspect=document.getElementById('coFAspect'),
        fNatal=document.getElementById('coFNatal');
  fPlanet.innerHTML='<option value="">Todos</option>'
    +'<optgroup label="Grupos">'+Object.keys(PLANET_GROUPS).map(g=>'<option value="grupo:'+g+'">'+g+'</option>').join('')+'</optgroup>'
    +'<optgroup label="Planetas individuais">'+TRANSIT_BODIES.map(n=>'<option value="'+n+'">'+PLANET_LABEL[n]+'</option>').join('')+'</optgroup>';
  fSign.innerHTML='<option value="">Todos</option>'+SIGNS.map((s,i)=>'<option value="'+i+'">'+s+'</option>').join('');
  if(compositeChart.hasHouses){
    fHouse.innerHTML='<option value="">Todas</option>'+[1,2,3,4,5,6,7,8,9,10,11,12].map(h=>'<option value="'+h+'">Casa '+h+'</option>').join('');
    fHouse.parentElement.style.display='';
  } else {
    fHouse.parentElement.style.display='none';
  }
  fAspect.innerHTML='<option value="">Todos</option>'+ASPECTS.map(a=>'<option value="'+a.name+'">'+a.name+'</option>').join('');
  const natalPts = synPointList(compositeChart);
  fNatal.innerHTML='<option value="">Todos</option>'+natalPts.map(n=>'<option value="'+n+'">'+PLANET_LABEL[n]+'</option>').join('');

  [fPlanet,fSign,fHouse,fAspect,fNatal].forEach(f=>f.onchange=renderCompositeAspectsTable);
  document.getElementById('coFImpact').oninput=renderCompositeAspectsTable;
  document.getElementById('coFLimit').oninput=renderCompositeAspectsTable;
  renderCompositeAspectsTable();
}

export function getFilteredCompositeAspectRows(){
  const fPlanet=document.getElementById('coFPlanet').value;
  const fSign=document.getElementById('coFSign').value;
  const fHouse=document.getElementById('coFHouse').value;
  const fAspect=document.getElementById('coFAspect').value;
  const fNatal=document.getElementById('coFNatal').value;
  const fImpact=parseInt(document.getElementById('coFImpact').value)||0;
  const showZeroed = document.getElementById('coShowZeroed').checked;
  let rows = compositeTransitData.aspectRows.filter(r=>{
    if(!planetMatchesFilter(r.transit,fPlanet)) return false;
    if(fSign && String(r.sIdx)!==fSign) return false;
    if(fHouse && String(r.house)!==fHouse) return false;
    if(fAspect && r.aspect.name!==fAspect) return false;
    if(fNatal && r.natal!==fNatal) return false;
    if(r.score<fImpact) return false;
    if(!showZeroed && r.score===0) return false;
    return true;
  });
  rows.sort((a,b)=>b.score-a.score);

  const isRange = compositeTransitData.mode==='range';
  const limitVal = parseInt(document.getElementById('coFLimit').value);
  const limit = (limitVal>0) ? limitVal : null;
  let bgRowsAll = isRange ? rows.filter(isBackground) : [];
  let periodRowsAll = isRange ? rows.filter(r=>!isBackground(r)) : rows;
  const bgRows = limit ? bgRowsAll.slice(0,limit) : bgRowsAll;
  const periodRows = limit ? periodRowsAll.slice(0,limit) : periodRowsAll;
  return {isRange, bgRows, bgRowsAll, periodRows, periodRowsAll};
}

export function renderCompositeAspectsTable(){
  const sel = getFilteredCompositeAspectRows();
  const isRange = sel.isRange;

  const countText = isRange
    ? (sel.periodRows.length+' de '+sel.periodRowsAll.length+' evento(s) do período'+(sel.bgRowsAll.length?', '+sel.bgRows.length+' de '+sel.bgRowsAll.length+' de pano de fundo':''))
    : (sel.periodRows.length+' de '+sel.periodRowsAll.length+' aspecto(s) encontrado(s)');
  document.getElementById('coResultCount').textContent = countText;

  const bgBlock = document.getElementById('coBackgroundBlock');
  const bgTable = document.getElementById('coBackgroundTable');
  if(isRange && sel.bgRows.length){
    bgBlock.style.display='';
    bgTable.querySelector('thead').innerHTML = '<tr><th>Impacto</th><th>Trânsito</th><th>Aspecto</th><th>Composto</th><th>Orbe</th><th>Ritmo</th><th>Período</th><th>Casa</th></tr>';
    bgTable.querySelector('tbody').innerHTML = sel.bgRows.map(r=>aspectRowHtml(r,true)).join('');
  } else {
    bgBlock.style.display='none';
  }

  document.getElementById('coPeriodHeading').style.display = (isRange && sel.bgRows.length) ? '' : 'none';
  document.getElementById('coPeriodCopyBar').style.display = sel.periodRows.length ? '' : 'none';

  const table = document.getElementById('coAspectsTable');
  table.querySelector('thead').innerHTML = '<tr><th>Impacto</th><th>Trânsito</th><th>Aspecto</th><th>Composto</th><th>Orbe</th><th>Ritmo</th><th>'+(isRange?'Período':'Status')+'</th><th>Casa</th></tr>';
  table.querySelector('tbody').innerHTML = sel.periodRows.map(r=>aspectRowHtml(r,isRange)).join('')
    || '<tr><td colspan="8" class="empty">Nenhum aspecto com os filtros atuais.</td></tr>';
}

export function exportCompositeJson(){
  if(!compositeTransitData){ return; }
  const sel = getFilteredCompositeAspectRows();
  const data = {
    gerado_em: new Date().toISOString(),
    mapa_composto: synPointList(compositeChart).map(name=>{
      const lon = synPointLon(compositeChart,name);
      const house = compositeChart.hasHouses ? houseOf(lon,compositeChart.cusps) : null;
      return { ponto: PLANET_LABEL[name], signo: SIGNS[signOf(lon)], grau: degMinStr(lon%30), casa: house };
    }),
    posicoes_em_transito: compositeTransitData.positionRows.map(p=>({
      planeta: PLANET_LABEL[p.name], signo: SIGNS[p.sIdx], grau: degMinStr(p.lon%30),
      casa_composto: p.house || null, retrogrado: !!p.retro
    })),
    pano_de_fundo: sel.isRange ? sel.bgRows.map(r=>rowToPlainObject(r,true)) : [],
    eventos: sel.periodRows.map(r=>rowToPlainObject(r, sel.isRange))
  };
  downloadBlob(JSON.stringify(data, null, 2), 'composto-transitos-resultado.json', 'application/json');
}

export function exportCompositeCsv(){
  if(!compositeTransitData){ return; }
  const sel = getFilteredCompositeAspectRows();
  const header = ['Seção','Impacto','Trânsito','Signo','Aspecto','Composto','Orbe(°)','Casa','Ritmo','Retrógrado','Status/Período'];
  const lines = [header.join(';')];
  function csvEscape(v){
    v = String(v==null?'':v);
    return /[;"\n]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v;
  }
  function pushRow(r, secao, isRange){
    const statusOrPeriodo = isRange
      ? (r.startLabel+' → '+r.endLabel+' (exato '+r.exactLabel+')')
      : (r.applying ? 'Aplicando' : 'Separando');
    lines.push([
      secao, r.score, PLANET_LABEL[r.transit], SIGNS[r.sIdx], r.aspect.name, PLANET_LABEL[r.natal],
      r.orb.toFixed(2), r.house||'—', speedTag(r.transit,r.aspect.orb).label, r.retro?'Sim':'Não', statusOrPeriodo
    ].map(csvEscape).join(';'));
  }
  if(sel.isRange) sel.bgRows.forEach(r=>pushRow(r,'Pano de fundo', true));
  sel.periodRows.forEach(r=>pushRow(r, sel.isRange ? 'Evento do período' : 'Aspecto', sel.isRange));
  downloadBlob('\uFEFF'+lines.join('\n'), 'composto-transitos-resultado.csv', 'text/csv;charset=utf-8');
}

export function copyCompositeForAI(scope, btn){
  scope = scope || 'all';

  function aspectLineText(r, idx, isRange){
    let line = (idx+1)+". Trânsito de "+PLANET_LABEL[r.transit]+" em "+SIGNS[r.sIdx]+(r.house?(" (Casa "+r.house+")"):"")+" forma "+r.aspect.name.toLowerCase()+" (orbe "+r.orb.toFixed(2)+"°) com "+PLANET_LABEL[r.natal]+" do composto";
    if(isRange){
      line += " — ativo de "+r.startLabel+" a "+r.endLabel+", exato em "+r.exactLabel;
      if(r.touchesStart && r.touchesEnd) line += " (em curso: já vinha de antes do período e continua depois)";
      else if(r.touchesStart) line += " (encerrando: já vinha de antes do período)";
      else if(r.touchesEnd) line += " (novo: começa dentro do período e continua depois)";
    } else {
      line += " — "+(r.applying?"aplicando":"separando");
    }
    if(r.retro) line += ", retrógrado";
    const sp = speedTag(r.transit, r.aspect.orb);
    line += ", ritmo "+sp.label.toLowerCase()+" (duração típica "+sp.approx+")";
    line += ". [impacto "+r.score+"/100]";
    return line;
  }

  let text = "MAPA COMPOSTO (A + B)\n";
  synPointList(compositeChart).forEach(name=>{
    const lon = synPointLon(compositeChart,name);
    const house = compositeChart.hasHouses ? houseOf(lon,compositeChart.cusps) : null;
    text += "- "+PLANET_LABEL[name]+": "+SIGNS[signOf(lon)]+" "+degMinStr(lon%30)+(house?(", Casa "+house):"")+"\n";
  });

  text += "\nPOSIÇÕES EM TRÂNSITO\n";
  compositeTransitData.positionRows.forEach(p=>{
    text += "- "+PLANET_LABEL[p.name]+": "+SIGNS[p.sIdx]+" "+degMinStr(p.lon%30)+(p.house?(", Casa do composto "+p.house):"")+(p.retro?" (retrógrado)":"")+"\n";
  });

  const sel = getFilteredCompositeAspectRows();
  const isRange = sel.isRange, bgRows = sel.bgRows, bgRowsAll = sel.bgRowsAll, periodRows = sel.periodRows, periodRowsAll = sel.periodRowsAll;

  const includeBg = isRange && bgRowsAll.length && (scope==='all' || scope==='background');
  const includePeriod = (scope==='all' || scope==='period');

  if(isRange && bgRowsAll.length){
    if(includeBg){
      text += "\nPANO DE FUNDO ("+bgRows.length+" de "+bgRowsAll.length+" — trânsitos lentos já em curso, que atravessam todo o período calculado; considere-os o tema estrutural dessa fase, não eventos pontuais dela)\n";
      bgRows.forEach((r,idx)=>{ text += aspectLineText(r,idx,true)+"\n"; });
    }
    if(includePeriod){
      text += "\nEVENTOS DO PERÍODO ("+periodRows.length+" de "+periodRowsAll.length+" — ordenados por impacto)\n";
      periodRows.forEach((r,idx)=>{ text += aspectLineText(r,idx,true)+"\n"; });
    }
  } else {
    text += "\nASPECTOS (ordenados por impacto, "+periodRows.length+" de "+periodRowsAll.length+")\n";
    periodRows.forEach((r,idx)=>{ text += aspectLineText(r,idx,isRange)+"\n"; });
  }

  if(scope==='background'){
    text += "\nPor favor, interprete este pano de fundo considerando o mapa composto da relação: são trânsitos lentos que atravessam toda a fase atual, o tema estrutural desse momento.";
  } else if(scope==='period'){
    text += "\nPor favor, interprete estes eventos do período considerando o mapa composto da relação, ordenados por impacto.";
  } else {
    text += "\nPor favor, interprete esses trânsitos considerando o mapa composto da relação (não a sinastria). Trate os itens de PANO DE FUNDO (se houver) como o tema estrutural da fase, e os EVENTOS DO PERÍODO como o que é específico desse momento.";
  }

  const box = document.getElementById('coCopyBox');
  box.textContent = text;
  box.style.display='block';
  const ta = document.getElementById('coCopyArea');
  ta.value = text;
  ta.select();
  try{
    navigator.clipboard.writeText(text);
  }catch(e){
    document.execCommand('copy');
  }
  if(btn){
    const original = btn.textContent;
    btn.textContent = 'Copiado ✓';
    btn.disabled = true;
    setTimeout(()=>{ btn.textContent = original; btn.disabled = false; }, 1600);
  }
}

