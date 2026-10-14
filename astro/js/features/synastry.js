// ============================================================================
// features/synastry.js
// Sinastria (aba "Sinastria"): mapa de Pessoa A e Pessoa B, aspectos entre os
// dois mapas com o sistema de pesos dedicado (core/synastry-weights.js),
// filtros, exportação JSON/CSV, texto para IA e o texto no formato de
// exportação do Astro-seek para colar na Calculadora de Sinastria.
// ============================================================================

import { dateToJD_UT } from '../core/time.js';
import { computeDayPositions } from '../core/ephemeris.js';
import { ascMC, vertexLon, wholeSignCusps, equalCusps, placidusCusps, obliquity, houseOf, degMinStr, signOf } from '../core/houses.js';
import { ASPECTS, angleLon, orbFromAspect } from '../core/aspects.js';
import { impactScoreSynastry, rawWeightSynastry, toEnPoint, ASPECT_GROUPS_SYN, aspectMatchesFilterSyn } from '../core/synastry-weights.js';
import { pairKey } from '../core/weights.js';
import {
  TRANSIT_BODIES, SYN_ANGLE_POINTS, PLANET_GLYPH, PLANET_LABEL, SIGN_GLYPH, SIGNS,
  SIGNS_EN, PLANET_EN, ASPECT_EN
} from '../core/constants.js';
import { impactBar } from '../ui/render-helpers.js';
import { downloadBlob } from '../shared/download.js';
import { readDateParts } from './natal.js';

let _synCityResults = {};
export async function searchCityFor(searchId, resultsId, latId, lonId, prefix){
  const q = document.getElementById(searchId).value.trim();
  const resultsEl = document.getElementById(resultsId);
  if(!q){ resultsEl.innerHTML=''; return; }
  resultsEl.innerHTML = '<div class="hint" style="padding:6px 2px;">Buscando…</div>';
  try{
    const resp = await fetch('https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=6&q='+encodeURIComponent(q));
    if(!resp.ok) throw new Error('resposta '+resp.status);
    const data = await resp.json();
    _synCityResults[prefix] = data;
    if(!data.length){ resultsEl.innerHTML = '<div class="hint" style="padding:6px 2px;">Nenhum resultado. Tente incluir estado/país ou preencha manualmente.</div>'; return; }
    resultsEl.innerHTML = data.map((d,idx)=>'<div class="cityOption" onclick="pickCityFor('+idx+',\''+prefix+'\',\''+latId+'\',\''+lonId+'\',\''+resultsId+'\',\''+searchId+'\')">'+escapeCidadeSyn(d.display_name)+'</div>').join('');
  }catch(e){
    resultsEl.innerHTML = '<div class="hint" style="padding:6px 2px;">Não foi possível buscar agora (sem conexão ou serviço indisponível). Preencha lat/long manualmente.</div>';
  }
}
export function pickCityFor(idx, prefix, latId, lonId, resultsId, searchId){
  const d = (_synCityResults[prefix]||[])[idx];
  if(!d) return;
  document.getElementById(latId).value = parseFloat(d.lat).toFixed(4);
  document.getElementById(lonId).value = parseFloat(d.lon).toFixed(4);
  if(searchId) document.getElementById(searchId).value = d.display_name;
  document.getElementById(resultsId).innerHTML = '<div class="hint" style="padding:6px 2px;">Selecionado: '+escapeCidadeSyn(d.display_name)+'. Confirme o fuso horário no campo abaixo (atenção ao horário de verão vigente na data, se houver).</div>';
}

// ---------- state ----------
// synChartA/B são reaproveitados por features/double-transits.js e
// features/composite.js (mesmo formato de natalChart, com vertex além de asc/mc).
export let synChartA = null, synChartB = null;
export let synData = null; // {aspectRows}

export function synPointList(chart){
  const pts = TRANSIT_BODIES.slice();
  if(chart.hasHouses) pts.push(...SYN_ANGLE_POINTS);
  return pts;
}
export function synPointLon(chart, name){
  return angleLon(chart, name);
}

// ---------- cálculo puro (sem DOM), reaproveitado tanto pelo formulário de
// Pessoa A/B (mapas.html) quanto pela leitura direta do localStorage feita
// pelos Trânsitos duplos em efemerides.html ----------
// data: {data_nascimento, hora_nascimento, fuso_horario, latitude, longitude, sistema_casas}
// Retorna {chart, warning} — warning é preenchido só no caso do fallback de Placidus.
export function computeSynChartFromInput(data){
  const dp = readDateParts(data.data_nascimento, data.hora_nascimento, 12);
  if(!dp) return null;
  const tz = parseFloat(data.fuso_horario) || 0;
  const lat = parseFloat(data.latitude);
  const lon = parseFloat(data.longitude);
  const hasTime = !!data.hora_nascimento;
  const hasLoc = !isNaN(lat) && !isNaN(lon);

  const jd = dateToJD_UT(dp.y,dp.mo,dp.d,dp.hour,tz);
  const T = (jd-2451545.0)/36525;
  const positions = computeDayPositions(T);

  let cusps=null, asc=null, mc=null, hasHouses=false, vertex=null, warning=null;
  if(hasTime && hasLoc){
    const r = ascMC(jd,T,lat,lon);
    asc=r.asc; mc=r.mc;
    vertex = vertexLon(jd,T,lat,lon);
    const sys = data.sistema_casas;
    if(sys==='whole') cusps = wholeSignCusps(asc);
    else if(sys==='placidus'){
      cusps = placidusCusps(asc,mc,r.ramc,lat,obliquity(T));
      if(!cusps){
        warning = 'Placidus não pôde ser calculado nessa latitude (muito próxima dos polos). Usando Casas Iguais como alternativa.';
        cusps = equalCusps(asc);
      }
    } else {
      cusps = equalCusps(asc);
    }
    hasHouses = true;
  }

  return {chart: {positions, cusps, asc, mc, vertex, hasHouses, jd, T}, warning};
}

export function calcSynPerson(who){
  const p = 'syn'+who; // 'synA' ou 'synB'
  const msgEl = document.getElementById(p+'Msg');
  msgEl.textContent=''; msgEl.style.color='';
  if(!document.getElementById(p+'Date').value){ msgEl.textContent='Informe ao menos a data de nascimento.'; msgEl.style.color='var(--rose)'; return; }

  const result = computeSynChartFromInput(collectSynInput(who));
  if(!result){ msgEl.textContent='Informe ao menos a data de nascimento.'; msgEl.style.color='var(--rose)'; return; }
  if(result.warning){ msgEl.textContent = result.warning; msgEl.style.color='var(--gold-dim)'; }

  if(who==='A') synChartA = result.chart; else synChartB = result.chart;
  renderSynPerson(who, result.chart);
  saveSynToStorage();
}

// ---------- usado pelos Trânsitos duplos (efemerides.html), que não têm o
// formulário de Pessoa A/B próprio — leem direto o que já está salvo no
// localStorage (calculado em Mapas Astrais > Sinastria) ----------
export function loadSynChartsFromStorageOnly(){
  const raw = (()=>{ try{ return localStorage.getItem(SYN_STORAGE_KEY); }catch(e){ return null; } })();
  if(!raw) return {ok:false};
  let data;
  try{ data = JSON.parse(raw); }catch(e){ return {ok:false}; }
  const a = data.pessoa_a, b = data.pessoa_b;
  if(!a || !b || !a.data_nascimento || !b.data_nascimento) return {ok:false};
  const ra = computeSynChartFromInput(a), rb = computeSynChartFromInput(b);
  if(!ra || !rb) return {ok:false};
  synChartA = ra.chart; synChartB = rb.chart;
  return {ok:true, nomeA: a.nome || 'Pessoa A', nomeB: b.nome || 'Pessoa B', dataA: a.data_nascimento, dataB: b.data_nascimento};
}

// ---------- persistência local da Sinastria (Pessoa A e B) ----------
export function collectSynInput(who){
  const p = 'syn'+who;
  return {
    nome: document.getElementById(p+'Name').value || null,
    sigla: document.getElementById(p+'Sigla').value || null,
    data_nascimento: document.getElementById(p+'Date').value || null,
    hora_nascimento: document.getElementById(p+'Time').value || null,
    fuso_horario: document.getElementById(p+'Tz').value !== '' ? parseFloat(document.getElementById(p+'Tz').value) : null,
    latitude: document.getElementById(p+'Lat').value !== '' ? parseFloat(document.getElementById(p+'Lat').value) : null,
    longitude: document.getElementById(p+'Lon').value !== '' ? parseFloat(document.getElementById(p+'Lon').value) : null,
    sistema_casas: document.getElementById(p+'House').value
  };
}
export const SYN_STORAGE_KEY = 'efemeride_sinastria_dados_v1';
export function saveSynToStorage(){
  try{ localStorage.setItem(SYN_STORAGE_KEY, JSON.stringify({pessoa_a: collectSynInput('A'), pessoa_b: collectSynInput('B')})); }
  catch(e){ /* localStorage indisponível — segue sem salvar */ }
}
// Substitui TODO o formulário da pessoa pelos dados recebidos: campo ausente (ex: pessoa sem
// hora de nascimento) fica em branco, em vez de manter o valor de quem estava antes.
export function applySynInput(who, data){
  if(!data) return;
  const p = 'syn'+who;
  const set = (suffix, v) => { document.getElementById(p+suffix).value = (v === null || v === undefined) ? '' : v; };
  set('Name', data.nome);
  set('Sigla', data.sigla);
  set('CitySearch', data.cidade);
  set('Date', data.data_nascimento);
  set('Time', data.hora_nascimento);
  set('Tz', data.fuso_horario);
  set('Lat', data.latitude);
  set('Lon', data.longitude);
  document.getElementById(p+'House').value = data.sistema_casas || 'whole';
}
export function loadSynFromStorage(){
  try{
    const raw = localStorage.getItem(SYN_STORAGE_KEY);
    if(!raw) return false;
    const data = JSON.parse(raw);
    applySynInput('A', data.pessoa_a);
    applySynInput('B', data.pessoa_b);
    return true;
  }catch(e){ return false; }
}
export function clearSynStorage(){
  try{ localStorage.removeItem(SYN_STORAGE_KEY); }catch(e){}
  const statusEl = document.getElementById('synStatus');
  statusEl.textContent = 'Dados salvos neste navegador foram apagados. Os campos acima continuam preenchidos até você recarregar a página.';
  statusEl.style.color = '';
}
export function exportSynInput(){
  const data = {pessoa_a: collectSynInput('A'), pessoa_b: collectSynInput('B')};
  downloadBlob(JSON.stringify(data, null, 2), 'sinastria-dados.json', 'application/json');
}
export function toggleSynImportBox(){
  const box = document.getElementById('synImportBox');
  box.style.display = (box.style.display==='none' || !box.style.display) ? 'block' : 'none';
}
export function importSynInput(){
  const statusEl = document.getElementById('synImportStatus');
  const fileInput = document.getElementById('synImportJsonFile');
  const textVal = document.getElementById('synImportJsonText').value.trim();
  function handleText(txt){
    try{
      const data = JSON.parse(txt);
      applySynInput('A', data.pessoa_a);
      applySynInput('B', data.pessoa_b);
      statusEl.textContent = 'Dados carregados. Clique em "Calcular mapa de A" e "Calcular mapa de B" para atualizar.';
    }catch(e){
      statusEl.textContent = 'JSON inválido: '+e.message;
    }
  }
  if(fileInput.files && fileInput.files[0]){
    const reader = new FileReader();
    reader.onload = ()=>handleText(reader.result);
    reader.onerror = ()=>{ statusEl.textContent='Não foi possível ler o arquivo.'; };
    reader.readAsText(fileInput.files[0]);
  } else if(textVal){
    handleText(textVal);
  } else {
    statusEl.textContent = 'Cole um JSON ou selecione um arquivo primeiro.';
  }
}

export function renderSynPerson(who, chart){
  const el = document.getElementById('syn'+who+'Output');
  let rows='';
  TRANSIT_BODIES.forEach(name=>{
    const lon = chart.positions[name];
    const sIdx = signOf(lon);
    const house = chart.hasHouses ? houseOf(lon,chart.cusps) : '—';
    rows += '<tr><td><span class="glyph natal">'+PLANET_GLYPH[name]+'</span>'+PLANET_LABEL[name]+'</td><td>'+SIGN_GLYPH[sIdx]+' '+SIGNS[sIdx]+'</td><td>'+degMinStr(lon%30)+'</td><td>'+(house!=='—'?('Casa '+house):'—')+'</td></tr>';
  });
  if(chart.hasHouses){
    const ascS=signOf(chart.asc), mcS=signOf(chart.mc);
    const dscLon=angleLon(chart,'DSC'), icLon=angleLon(chart,'IC'), fortLon=angleLon(chart,'Fortuna'), espLon=angleLon(chart,'Espirito');
    const dscS=signOf(dscLon), icS=signOf(icLon), fortS=signOf(fortLon), espS=signOf(espLon);
    rows += '<tr><td><span class="glyph natal">Asc</span>Ascendente</td><td>'+SIGN_GLYPH[ascS]+' '+SIGNS[ascS]+'</td><td>'+degMinStr(chart.asc%30)+'</td><td>Casa 1</td></tr>';
    rows += '<tr><td><span class="glyph natal">MC</span>Meio do Céu</td><td>'+SIGN_GLYPH[mcS]+' '+SIGNS[mcS]+'</td><td>'+degMinStr(chart.mc%30)+'</td><td>Casa 10*</td></tr>';
    rows += '<tr><td><span class="glyph natal">Dsc</span>Descendente</td><td>'+SIGN_GLYPH[dscS]+' '+SIGNS[dscS]+'</td><td>'+degMinStr(dscLon%30)+'</td><td>Casa 7</td></tr>';
    rows += '<tr><td><span class="glyph natal">IC</span>Fundo do Céu</td><td>'+SIGN_GLYPH[icS]+' '+SIGNS[icS]+'</td><td>'+degMinStr(icLon%30)+'</td><td>Casa 4*</td></tr>';
    rows += '<tr><td><span class="glyph natal">'+PLANET_GLYPH.Fortuna+'</span>Parte da Fortuna</td><td>'+SIGN_GLYPH[fortS]+' '+SIGNS[fortS]+'</td><td>'+degMinStr(fortLon%30)+'</td><td>Casa '+houseOf(fortLon,chart.cusps)+'</td></tr>';
    rows += '<tr><td><span class="glyph natal">'+PLANET_GLYPH.Espirito+'</span>Parte do Espírito</td><td>'+SIGN_GLYPH[espS]+' '+SIGNS[espS]+'</td><td>'+degMinStr(espLon%30)+'</td><td>Casa '+houseOf(espLon,chart.cusps)+'</td></tr>';
    const vtxLon=chart.vertex, vtxS=signOf(vtxLon);
    rows += '<tr><td><span class="glyph natal">'+PLANET_GLYPH.Vertice+'</span>Vértice</td><td>'+SIGN_GLYPH[vtxS]+' '+SIGNS[vtxS]+'</td><td>'+degMinStr(vtxLon%30)+'</td><td>Casa '+houseOf(vtxLon,chart.cusps)+'</td></tr>';
  }
  let warn = chart.hasHouses ? '' : '<div class="hint" style="margin-bottom:10px;"><span class="badge-required">Sem hora/local completos:</span> Ascendente e Casas não foram calculados — apenas signo e grau dos planetas.</div>';
  el.innerHTML = warn + '<table><thead><tr><th>Ponto</th><th>Signo</th><th>Grau</th><th>Casa</th></tr></thead><tbody>'+rows+'</tbody></table>'
    + (chart.hasHouses ? '<div class="hint" style="margin-top:8px;">*MC nem sempre cai exatamente na cúspide da Casa 10 no sistema de Signos Inteiros — isso é esperado.</div>' : '');
}

// ---------- cálculo puro (sem DOM) dos aspectos entre dois mapas — reaproveitado
// por calcSynastry() aqui (mapas.html) e pelo painel "usar pessoas cadastradas"
// da Calculadora de Sinastria (sinastria/js/from-pessoas.js), que calcula os
// mapas a partir do cadastro sem passar pelos campos de Pessoa A/B desta página ----------
export function computeSynAspectRows(chartA, chartB){
  const ptsA = synPointList(chartA);
  const ptsB = synPointList(chartB);
  const rows = [];
  ptsA.forEach(aName=>{
    const aLon = synPointLon(chartA, aName);
    ptsB.forEach(bName=>{
      const bLon = synPointLon(chartB, bName);
      ASPECTS.forEach(asp=>{
        const orb = orbFromAspect(aLon,bLon,asp.angle);
        if(orb<=asp.orb){
          rows.push({
            a:aName, b:bName, aspect:asp, orb, score:0,
            aSign: signOf(aLon), bSign: signOf(bLon),
            aInB: chartB.hasHouses ? houseOf(aLon, chartB.cusps) : null,
            bInA: chartA.hasHouses ? houseOf(bLon, chartA.cusps) : null
          });
        }
      });
    });
  });
  // Reciprocidade (mesma regra da Calculadora de Sinastria): quando o mesmo par de pontos
  // aparece em mais de um aspecto entre as duas pessoas (ex.: Vênus de A com Marte de B E
  // Marte de A com Vênus de B), cada um desses aspectos ganha o bônus. Só contam aspectos
  // que de fato têm peso (dentro do teto de orbe do tipo de ponto).
  const counts = new Map();
  rows.forEach(r=>{
    if(rawWeightSynastry(r.aspect, r.orb, r.a, r.b) > 0){
      const k = pairKey(toEnPoint(r.a), toEnPoint(r.b));
      counts.set(k, (counts.get(k)||0) + 1);
    }
  });
  rows.forEach(r=>{
    r.score = impactScoreSynastry(r.aspect, r.orb, r.a, r.b, counts.get(pairKey(toEnPoint(r.a), toEnPoint(r.b))) || 1);
  });
  return rows;
}

// Detecta se Pessoa A e Pessoa B parecem ser a mesma pessoa — mesmos dados de
// nascimento preenchidos nos dois formulários (independente de terem sido
// digitados à mão ou carregados de uma pessoa cadastrada, já que os dois
// caminhos preenchem os mesmos campos synA*/synB*). Compara só quando data,
// hora, fuso e local estão todos preenchidos dos dois lados — dados parciais
// (ex: sem hora) não são comparados, pra não gerar falso positivo.
function synPeopleLookIdentical(){
  const a = collectSynInput('A'), b = collectSynInput('B');
  if(!a.data_nascimento || !b.data_nascimento) return false;
  if(a.data_nascimento !== b.data_nascimento) return false;
  if(a.hora_nascimento !== b.hora_nascimento) return false;
  if(a.fuso_horario !== b.fuso_horario) return false;
  // sem lat/long dos dois lados não dá pra confirmar — evita falso positivo
  // com gente que nasceu no mesmo dia/hora/fuso em cidades diferentes (ou
  // simplesmente não preencheu local ainda).
  if(a.latitude===null || a.longitude===null || b.latitude===null || b.longitude===null) return false;
  if(a.latitude !== b.latitude) return false;
  if(a.longitude !== b.longitude) return false;
  return true;
}

export function calcSynastry(){
  const statusEl = document.getElementById('synStatus');
  if(!synChartA || !synChartB){ statusEl.textContent='Calcule o mapa de A e o mapa de B primeiro.'; statusEl.style.color='var(--rose)'; return; }
  if(synPeopleLookIdentical()){ statusEl.textContent='Pessoa A e Pessoa B têm os mesmos dados de nascimento — escolha ou preencha duas pessoas diferentes.'; statusEl.style.color='var(--rose)'; return; }
  statusEl.textContent='Calculando...'; statusEl.style.color='';
  setTimeout(()=>{
    const rows = computeSynAspectRows(synChartA, synChartB);
    synData = {aspectRows: rows};
    renderSynResults();
    statusEl.textContent = rows.length+' aspecto(s) encontrado(s).';
  }, 30);
}

export function renderSynResults(){
  document.getElementById('synResultsPanel').style.display='';

  const fA=document.getElementById('synFA'), fB=document.getElementById('synFB'), fAspect=document.getElementById('synFAspect');
  fA.innerHTML='<option value="">Todos</option>'+synPointList(synChartA).map(n=>'<option value="'+n+'">'+PLANET_LABEL[n]+'</option>').join('');
  fB.innerHTML='<option value="">Todos</option>'+synPointList(synChartB).map(n=>'<option value="'+n+'">'+PLANET_LABEL[n]+'</option>').join('');
  fAspect.innerHTML='<option value="">Todos</option>'
    +'<optgroup label="Grupos">'+Object.keys(ASPECT_GROUPS_SYN).map(g=>'<option value="grupo:'+g+'">'+g+'</option>').join('')+'</optgroup>'
    +'<optgroup label="Aspectos individuais">'+ASPECTS.map(a=>'<option value="'+a.name+'">'+a.name+'</option>').join('')+'</optgroup>';

  [fA,fB,fAspect].forEach(f=>f.onchange=renderSynAspectsTable);
  document.getElementById('synFImpact').oninput=renderSynAspectsTable;

  renderSynAspectsTable();
}

export function getFilteredSynRows(){
  const fA=document.getElementById('synFA').value;
  const fB=document.getElementById('synFB').value;
  const fAspect=document.getElementById('synFAspect').value;
  const fImpact=parseInt(document.getElementById('synFImpact').value)||0;
  const showZeroed = document.getElementById('synShowZeroed').checked;
  let rows = synData.aspectRows.filter(r=>{
    if(fA && r.a!==fA) return false;
    if(fB && r.b!==fB) return false;
    if(!aspectMatchesFilterSyn(r.aspect.name,fAspect)) return false;
    if(r.score<fImpact) return false;
    if(!showZeroed && r.score===0) return false;
    return true;
  });
  rows.sort((a,b)=>b.score-a.score);
  return rows;
}

export function synRowHtml(r){
  const nameA = document.getElementById('synAName').value.trim() || 'A';
  const nameB = document.getElementById('synBName').value.trim() || 'B';
  return '<tr>'
    +'<td>'+impactBar(r.score)+' <span class="hint">'+r.score+'</span></td>'
    +'<td><span class="glyph">'+PLANET_GLYPH[r.a]+'</span>'+PLANET_LABEL[r.a]+' '+SIGN_GLYPH[r.aSign]+'</td>'
    +'<td>'+r.aspect.glyph+' '+r.aspect.name+'</td>'
    +'<td><span class="glyph natal">'+PLANET_GLYPH[r.b]+'</span>'+PLANET_LABEL[r.b]+' '+SIGN_GLYPH[r.bSign]+'</td>'
    +'<td>'+r.orb.toFixed(2)+'°</td>'
    +'<td>'+(r.aInB?('Casa '+r.aInB+' de '+nameB):'—')+'</td>'
    +'<td>'+(r.bInA?('Casa '+r.bInA+' de '+nameA):'—')+'</td>'
    +'</tr>';
}

export function renderSynAspectsTable(){
  const rows = getFilteredSynRows();
  document.getElementById('synResultCount').textContent = rows.length+' de '+synData.aspectRows.length+' aspecto(s) encontrado(s)';
  const table = document.getElementById('synAspectsTable');
  table.querySelector('thead').innerHTML = '<tr><th>Impacto</th><th>Ponto A</th><th>Aspecto</th><th>Ponto B</th><th>Orbe</th><th>A cai em (B)</th><th>B cai em (A)</th></tr>';
  table.querySelector('tbody').innerHTML = rows.map(synRowHtml).join('') || '<tr><td colspan="7" class="empty">Nenhum aspecto com os filtros atuais.</td></tr>';
}

export function synRowToPlainObject(r){
  return {
    ponto_a: PLANET_LABEL[r.a], signo_a: SIGNS[r.aSign],
    aspecto: r.aspect.name,
    ponto_b: PLANET_LABEL[r.b], signo_b: SIGNS[r.bSign],
    orbe_graus: Number(r.orb.toFixed(2)),
    casa_de_a_no_mapa_de_b: r.aInB || null,
    casa_de_b_no_mapa_de_a: r.bInA || null,
    impacto: r.score
  };
}

export function exportSynJson(){
  if(!synData){ return; }
  const nameA = document.getElementById('synAName').value.trim() || 'Pessoa A';
  const nameB = document.getElementById('synBName').value.trim() || 'Pessoa B';
  const rows = getFilteredSynRows();
  const data = {
    gerado_em: new Date().toISOString(),
    pessoa_a: nameA,
    mapa_a: synPointList(synChartA).map(name=>{
      const lon = synPointLon(synChartA,name);
      const house = synChartA.hasHouses ? houseOf(lon,synChartA.cusps) : null;
      return { ponto: PLANET_LABEL[name], signo: SIGNS[signOf(lon)], grau: degMinStr(lon%30), casa: house };
    }),
    pessoa_b: nameB,
    mapa_b: synPointList(synChartB).map(name=>{
      const lon = synPointLon(synChartB,name);
      const house = synChartB.hasHouses ? houseOf(lon,synChartB.cusps) : null;
      return { ponto: PLANET_LABEL[name], signo: SIGNS[signOf(lon)], grau: degMinStr(lon%30), casa: house };
    }),
    aspectos: rows.map(synRowToPlainObject)
  };
  downloadBlob(JSON.stringify(data, null, 2), 'sinastria-resultado.json', 'application/json');
}

export function exportSynCsv(){
  if(!synData){ return; }
  const rows = getFilteredSynRows();
  const header = ['Impacto','Ponto A','Signo A','Aspecto','Ponto B','Signo B','Orbe(°)','Casa de A em B','Casa de B em A'];
  const lines = [header.join(';')];
  function csvEscape(v){
    v = String(v==null?'':v);
    return /[;"\n]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v;
  }
  rows.forEach(r=>{
    lines.push([
      r.score, PLANET_LABEL[r.a], SIGNS[r.aSign], r.aspect.name, PLANET_LABEL[r.b], SIGNS[r.bSign],
      r.orb.toFixed(2), r.aInB||'—', r.bInA||'—'
    ].map(csvEscape).join(';'));
  });
  downloadBlob('\uFEFF'+lines.join('\n'), 'sinastria-resultado.csv', 'text/csv;charset=utf-8');
}

// Monta o mesmo texto usado pelo "Copiar para IA" (posições dos dois mapas +
// aspectos entre eles, respeitando os filtros atuais da tabela) — reaproveitado
// tanto por copySynForAI() (clipboard) quanto por downloadSynMd() (arquivo .md).
export function buildSynMarkdown(){
  const nameA = document.getElementById('synAName').value.trim() || 'Pessoa A';
  const nameB = document.getElementById('synBName').value.trim() || 'Pessoa B';

  let text = 'MAPA DE '+nameA.toUpperCase()+'\n';
  synPointList(synChartA).forEach(name=>{
    const lon = synPointLon(synChartA,name);
    const house = synChartA.hasHouses ? houseOf(lon,synChartA.cusps) : null;
    text += "- "+PLANET_LABEL[name]+": "+SIGNS[signOf(lon)]+" "+degMinStr(lon%30)+(house?(", Casa "+house):"")+"\n";
  });

  text += '\nMAPA DE '+nameB.toUpperCase()+'\n';
  synPointList(synChartB).forEach(name=>{
    const lon = synPointLon(synChartB,name);
    const house = synChartB.hasHouses ? houseOf(lon,synChartB.cusps) : null;
    text += "- "+PLANET_LABEL[name]+": "+SIGNS[signOf(lon)]+" "+degMinStr(lon%30)+(house?(", Casa "+house):"")+"\n";
  });

  const rows = getFilteredSynRows();
  text += '\nASPECTOS ENTRE OS DOIS MAPAS (ordenados por impacto, '+rows.length+' de '+synData.aspectRows.length+')\n';
  rows.forEach((r,idx)=>{
    let line = (idx+1)+'. '+PLANET_LABEL[r.a]+' de '+nameA+' ('+SIGNS[r.aSign]+') forma '+r.aspect.name.toLowerCase()+' (orbe '+r.orb.toFixed(2)+'°) com '+PLANET_LABEL[r.b]+' de '+nameB+' ('+SIGNS[r.bSign]+')';
    if(r.aInB) line += ' — '+PLANET_LABEL[r.a]+' de '+nameA+' cai na Casa '+r.aInB+' de '+nameB;
    if(r.bInA) line += (r.aInB?'; ':' — ')+PLANET_LABEL[r.b]+' de '+nameB+' cai na Casa '+r.bInA+' de '+nameA;
    line += '. [impacto '+r.score+'/100]';
    text += line+'\n';
  });

  text += '\nPor favor, interprete essa sinastria entre '+nameA+' e '+nameB+', considerando os aspectos acima ordenados por impacto e as casas em que os planetas de um caem no mapa do outro.';
  return text;
}

export function copySynForAI(btn){
  if(!synData) return;
  const text = buildSynMarkdown();

  const box = document.getElementById('synCopyBox');
  box.textContent = text;
  box.style.display='block';
  const ta = document.getElementById('synCopyArea');
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

// "Baixar .md" da aba Sinastria — mesmo conteúdo do "Copiar para IA", como
// arquivo (mesmo padrão de downloadNatalMd(), em features/natal.js).
export function downloadSynMd(){
  if(!synData) return;
  const nameA = document.getElementById('synAName').value.trim();
  const nameB = document.getElementById('synBName').value.trim();
  const slug = (nameA && nameB) ? '-'+(nameA+'-'+nameB).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') : '';
  downloadBlob(buildSynMarkdown(), 'sinastria'+slug+'.md', 'text/markdown;charset=utf-8');
}

// sufixo ordinal em inglês (1st, 2nd, 3rd, 4th... 11th, 12th) — exigido pelo formato de
// casas que a Calculadora de Sinastria espera ("in the 7th Nome's house")
export function ordinalSuffixEn(n){
  const rem100 = n % 100;
  if(rem100>=11 && rem100<=13) return 'th';
  switch(n%10){
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Gera o texto no formato de exportação "AI-ChatGPT" do Astro-seek (o mesmo que a
// Calculadora de Sinastria já sabe ler colando manualmente ou via extensão), a partir dos
// dois mapas já calculados aqui. Isso evita o passo de ir até o Astro-seek: os aspectos e
// casas usados são os mesmos calculados nesta aba, só traduzidos pro vocabulário/sintaxe
// em inglês que o parser da Calculadora reconhece (ver ASPECT_EN/PLANET_EN/SIGNS_EN acima).
// Sigla de cada pessoa pro texto pra Calculadora de Sinastria — é ela quem vira o
// identificador antes do "'s" em cada linha (ex: "VL's Sun..."), igual ao Astro-seek e ao
// que a aba Dicionário da Calculadora já espera. Sem sigla preenchida, cai pro Nome.
export function synSigla(who){
  const sigla = document.getElementById('syn'+who+'Sigla').value.trim();
  if(sigla) return sigla;
  return document.getElementById('syn'+who+'Name').value.trim() || who;
}

// Monta o texto no formato que o parser da Calculadora de Sinastria reconhece,
// a partir de dois mapas já calculados (chartA/chartB) e sua lista de aspectos
// (rows, no formato de computeSynAspectRows). Função pura — não olha pro DOM
// nem pro estado desta página — reaproveitada por buildSinastriaCalcText()
// abaixo (que lê nomes/siglas/filtros da tela) e por sinastria/js/from-pessoas.js
// (que parte direto do cadastro de pessoas), pra não haver duas versões dessa
// tradução divergindo com o tempo.
export function buildSinastriaText({ chartA, chartB, nameA, nameB, siglaA, siglaB, rows }){
  let text = 'Sinastria — '+nameA+' ('+siglaA+') & '+nameB+' ('+siglaB+')\n\n';

  // aspectos: uma linha por aspecto, na sintaxe "A's Planet in Sign Aspect B's Planet in Sign (Orb: D°M'"
  rows.forEach(r=>{
    const aspectWord = ASPECT_EN[r.aspect.name] || r.aspect.name;
    const planetA = PLANET_EN[r.a] || r.a;
    const planetB = PLANET_EN[r.b] || r.b;
    const signA = SIGNS_EN[r.aSign];
    const signB = SIGNS_EN[r.bSign];
    const deg = Math.floor(r.orb);
    const min = Math.round((r.orb - deg) * 60);
    text += siglaA+"'s "+planetA+' in '+signA+' '+aspectWord+' '+siglaB+"'s "+planetB+' in '+signB+' (Orb: '+deg+'°'+min+"')\n";
  });

  // casas: todos os pontos de A na casa em que caem no mapa de B, e vice-versa —
  // independente de formarem aspecto ou não, igual ao que o Astro-seek exporta.
  if(chartA.hasHouses || chartB.hasHouses){
    text += '\n';
    if(chartB.hasHouses){
      synPointList(chartA).forEach(name=>{
        const lon = synPointLon(chartA, name);
        const house = houseOf(lon, chartB.cusps);
        const planet = PLANET_EN[name] || name;
        text += siglaA+"'s "+planet+' in the '+house+ordinalSuffixEn(house)+' '+siglaB+"'s house\n";
      });
    }
    if(chartA.hasHouses){
      synPointList(chartB).forEach(name=>{
        const lon = synPointLon(chartB, name);
        const house = houseOf(lon, chartA.cusps);
        const planet = PLANET_EN[name] || name;
        text += siglaB+"'s "+planet+' in the '+house+ordinalSuffixEn(house)+' '+siglaA+"'s house\n";
      });
    }
  }

  return text;
}

// Wrapper usado pelos botões desta página (copyForSinastriaCalc,
// openInSinastriaCalc): lê nomes/siglas dos campos e aplica os filtros atuais
// da tabela (getFilteredSynRows) antes de chamar a função pura acima.
function buildSinastriaCalcText(){
  if(!synData) return null;
  const nameA = document.getElementById('synAName').value.trim() || 'Pessoa A';
  const nameB = document.getElementById('synBName').value.trim() || 'Pessoa B';
  const siglaA = synSigla('A');
  const siglaB = synSigla('B');
  const rows = getFilteredSynRows();
  const text = buildSinastriaText({ chartA: synChartA, chartB: synChartB, nameA, nameB, siglaA, siglaB, rows });
  return { text, nameA, nameB };
}

export function copyForSinastriaCalc(btn){
  const built = buildSinastriaCalcText();
  if(!built) return;
  const { text } = built;

  const box = document.getElementById('synCopyBox');
  box.textContent = text;
  box.style.display='block';
  const ta = document.getElementById('synCopyArea');
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

// Salva o texto em localStorage (chave lida pela página de Sinastria ao carregar)
// e navega pra lá — a pessoa não precisa copiar/colar manualmente pra usar dados
// já calculados aqui. A colagem manual continua existindo na Sinastria pra quem
// traz dados de outro app.
export function openInSinastriaCalc(btn){
  const built = buildSinastriaCalcText();
  if(!built){
    if(btn){
      const original = btn.textContent;
      btn.textContent = 'Calcule os dois mapas antes ⚠';
      setTimeout(()=>{ btn.textContent = original; }, 2200);
    }
    return;
  }
  const { text, nameA, nameB } = built;
  try{
    localStorage.setItem('synastry:pendingImport', JSON.stringify({ text, name1: nameA, name2: nameB }));
  }catch(e){
    alert('Não consegui salvar os dados pra transferir (localStorage indisponível). Use "Copiar p/ Calculadora de Sinastria" e cole manualmente.');
    return;
  }
  window.location.href = 'sinastria.html';
}

// Texto vindo de serviço externo (Nominatim) nunca entra no HTML sem escape.
function escapeCidadeSyn(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
