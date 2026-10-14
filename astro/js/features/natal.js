// ============================================================================
// features/natal.js
// Formulário de dados de nascimento (com persistência em localStorage e
// import/export JSON), busca de cidade (Nominatim/OpenStreetMap), e o cálculo
// + renderização do mapa natal em si. Expõe natalChart, lido (nunca alterado)
// por outras features que precisam da posição natal (trânsitos, sinastria
// reaproveita seu próprio estado — synChartA/B — mas o mesmo formato).
// ============================================================================

import { toJD, dateToJD_UT } from '../core/time.js';
import { computeDayPositions } from '../core/ephemeris.js';
import { ascMC, vertexLon, wholeSignCusps, equalCusps, placidusCusps, obliquity, houseOf, degMinStr, signOf, interceptedSigns } from '../core/houses.js';
import { angleLon, ASPECTS, orbFromAspect, effectiveMaxOrb } from '../core/aspects.js';
import { TRANSIT_BODIES, PLANET_GLYPH, PLANET_LABEL, SIGN_GLYPH, SIGNS, AVG_SPEED } from '../core/constants.js';
import {
  computeStructuralProfile, computeSect, MODALITY_LABEL, ELEMENT_LABEL,
  HEMISPHERE_NS_SHORT, HEMISPHERE_NS_TRAIT, HEMISPHERE_LO_SHORT, HEMISPHERE_LO_TRAIT,
  ASPECT_TONE, ASPECT_PATTERN_LABEL, aspectPatternDetail,
} from '../core/structural.js';
import {
  CLASSICAL_PLANETS, DIGNITY_LABEL, planetDignityReport, computeAlmutenAscendentis, computeAlmutenFiguris,
} from '../core/dignities.js';
import { computeFirdaria, ageInYears } from '../core/firdaria.js';
import {
  computeElementPredominance, computeTemperamentPredominance, TEMPERAMENT_LABEL,
} from '../core/predominance.js';

import { downloadBlob } from '../shared/download.js';

export function collectNatalInput(){
  return {
    nome: document.getElementById('natalName').value || null,
    sigla: document.getElementById('natalSigla').value || null,
    cidade: document.getElementById('citySearch').value || null,
    data_nascimento: document.getElementById('natalDate').value || null,
    hora_nascimento: document.getElementById('natalTime').value || null,
    fuso_horario: document.getElementById('natalTz').value !== '' ? parseFloat(document.getElementById('natalTz').value) : null,
    latitude: document.getElementById('natalLat').value !== '' ? parseFloat(document.getElementById('natalLat').value) : null,
    longitude: document.getElementById('natalLon').value !== '' ? parseFloat(document.getElementById('natalLon').value) : null,
    sistema_casas: document.getElementById('houseSystem').value
  };
}

// ---------- persistência local (localStorage) ----------
export const NATAL_STORAGE_KEY = 'efemeride_natal_dados_v1';
export function saveNatalToStorage(){
  try{ localStorage.setItem(NATAL_STORAGE_KEY, JSON.stringify(collectNatalInput())); }
  catch(e){ /* localStorage indisponível (aba anônima, etc.) — segue sem salvar */ }
}
export function loadNatalFromStorage(){
  try{
    const raw = localStorage.getItem(NATAL_STORAGE_KEY);
    if(!raw) return false;
    applyNatalInput(JSON.parse(raw));
    return true;
  }catch(e){ return false; }
}
export function clearNatalStorage(){
  try{ localStorage.removeItem(NATAL_STORAGE_KEY); }catch(e){}
  setNatalMsg('Dados salvos neste navegador foram apagados. Os campos acima continuam preenchidos até você recarregar a página.', '');
}
export function exportNatalInput(){
  const data = collectNatalInput();
  const text = JSON.stringify(data, null, 2);
  const blob = new Blob([text], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mapa-natal-dados.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
export function toggleImportBox(){
  const box = document.getElementById('importBox');
  box.style.display = (box.style.display==='none' || !box.style.display) ? 'block' : 'none';
}
// Substitui TODO o formulário pelos dados recebidos: campo ausente (ex: pessoa sem hora de
// nascimento) fica em branco, em vez de manter o valor da pessoa que estava antes, o que
// misturaria dados de duas pessoas e calcularia casas com a hora/local errados.
export function applyNatalInput(data){
  const set = (id, v) => { document.getElementById(id).value = (v === null || v === undefined) ? '' : v; };
  set('natalName', data.nome);
  set('natalSigla', data.sigla);
  set('citySearch', data.cidade);
  set('natalDate', data.data_nascimento);
  set('natalTime', data.hora_nascimento);
  set('natalTz', data.fuso_horario);
  set('natalLat', data.latitude);
  set('natalLon', data.longitude);
  document.getElementById('houseSystem').value = data.sistema_casas || 'whole';
}
export function importNatalInput(){
  const statusEl = document.getElementById('importStatus');
  const fileInput = document.getElementById('importJsonFile');
  const textVal = document.getElementById('importJsonText').value.trim();
  function handleText(txt){
    try{
      const data = JSON.parse(txt);
      applyNatalInput(data);
      statusEl.textContent = 'Dados carregados. Clique em "Calcular mapa natal" para atualizar.';
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

// ---------- preencher data/hora atuais (trânsito de data única) ----------
export function fillNow(){
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth()+1).padStart(2,'0');
  const d = String(now.getDate()).padStart(2,'0');
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  document.getElementById('singleDate').value = y+'-'+mo+'-'+d;
  document.getElementById('singleTime').value = hh+':'+mm;
  document.getElementById('singleTz').value = -now.getTimezoneOffset()/60;
}

export function toDateInputValue(dt){
  return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
}
export function fillPreset(kind){
  const now = new Date();
  let start, end;
  if(kind==='hoje'){
    start = new Date(now.getFullYear(),now.getMonth(),now.getDate());
    end = start;
  } else if(kind==='semana'){
    // semana domingo a sábado
    const dow = now.getDay(); // 0=domingo..6=sábado
    start = new Date(now.getFullYear(),now.getMonth(),now.getDate()-dow);
    end = new Date(start.getFullYear(),start.getMonth(),start.getDate()+6);
  } else if(kind==='mes'){
    start = new Date(now.getFullYear(),now.getMonth(),1);
    end = new Date(now.getFullYear(),now.getMonth()+1,0);
  } else if(kind==='semestre'){
    const semStartMonth = now.getMonth()<6 ? 0 : 6;
    start = new Date(now.getFullYear(),semStartMonth,1);
    end = new Date(now.getFullYear(),semStartMonth+6,0);
  } else if(kind==='ano'){
    start = new Date(now.getFullYear(),0,1);
    end = new Date(now.getFullYear(),11,31);
  } else return;

  setMode('range');
  document.getElementById('rangeStart').value = toDateInputValue(start);
  document.getElementById('rangeEnd').value = toDateInputValue(end);
  updateRangeWarn();
}

export function updateRangeWarn(){
  const warnEl = document.getElementById('rangeWarn');
  const s = document.getElementById('rangeStart').value;
  const en = document.getElementById('rangeEnd').value;
  const step = Math.max(1, parseInt(document.getElementById('rangeStep').value)||1);
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

// ---------- busca de cidade (geocodificação) ----------
let _cityResults = [];
export async function searchCity(){
  const q = document.getElementById('citySearch').value.trim();
  const resultsEl = document.getElementById('cityResults');
  if(!q){ resultsEl.innerHTML=''; return; }
  resultsEl.innerHTML = '<div class="hint" style="padding:6px 2px;">Buscando…</div>';
  try{
    const resp = await fetch('https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=6&q='+encodeURIComponent(q));
    if(!resp.ok) throw new Error('resposta '+resp.status);
    const data = await resp.json();
    _cityResults = data;
    if(!data.length){ resultsEl.innerHTML = '<div class="hint" style="padding:6px 2px;">Nenhum resultado. Tente incluir estado/país ou preencha manualmente.</div>'; return; }
    resultsEl.innerHTML = data.map((d,idx)=>'<div class="cityOption" onclick="pickCity('+idx+')">'+escapeCidadeNatal(d.display_name)+'</div>').join('');
  }catch(e){
    resultsEl.innerHTML = '<div class="hint" style="padding:6px 2px;">Não foi possível buscar agora (sem conexão ou serviço indisponível). Preencha lat/long manualmente.</div>';
  }
}
export function pickCity(idx){
  const d = _cityResults[idx];
  if(!d) return;
  document.getElementById('natalLat').value = parseFloat(d.lat).toFixed(4);
  document.getElementById('natalLon').value = parseFloat(d.lon).toFixed(4);
  document.getElementById('citySearch').value = d.display_name;
  document.getElementById('cityResults').innerHTML = '<div class="hint" style="padding:6px 2px;">Selecionado: '+escapeCidadeNatal(d.display_name)+'. Confirme o fuso horário no campo abaixo (atenção ao horário de verão vigente na data, se houver).</div>';
}

// ---------- state ----------
// Estado do mapa natal calculado (compartilhado com features/transits.js, que só
// lê este valor — nunca o reatribui). transitData (estado da aba Trânsitos) mora
// em features/transits.js.
export let natalChart = null; // {positions:{}, cusps:[], asc, mc, vertex, hasHouses:bool}

export function setMode(m){
  document.getElementById('modeSingleBtn').classList.toggle('active', m==='single');
  document.getElementById('modeRangeBtn').classList.toggle('active', m==='range');
  document.getElementById('singleFields').style.display = m==='single' ? '' : 'none';
  document.getElementById('rangeFields').style.display = m==='range' ? '' : 'none';
}

export function readDateParts(dateStr, timeStr, defaultHour){
  if(!dateStr) return null;
  const [y,mo,d] = dateStr.split('-').map(Number);
  let hour = defaultHour;
  if(timeStr){ const [hh,mm]=timeStr.split(':').map(Number); hour = hh + mm/60; }
  return {y,mo,d,hour};
}

export function setNatalMsg(msg, level){
  const el = document.getElementById('natalMsg');
  el.textContent = msg;
  el.style.color = level==='error' ? 'var(--rose)' : level==='warn' ? 'var(--gold-dim)' : '';
}
export function setTransitStatus(msg, isError){
  const el = document.getElementById('transitStatus');
  el.textContent = msg;
  el.style.color = isError ? 'var(--rose)' : '';
}

// opts.persist === false: calcula sem gravar o formulário no localStorage (usado pela
// efemerides.html, que lê os dados do cadastro de pessoas e não tem formulário próprio).
export function calcNatal(opts){
  setNatalMsg('', '');
  const dp = readDateParts(document.getElementById('natalDate').value, document.getElementById('natalTime').value, 12);
  if(!dp){ setNatalMsg('Informe ao menos a data de nascimento.', 'error'); return; }
  const tz = parseFloat(document.getElementById('natalTz').value)||0;
  const lat = parseFloat(document.getElementById('natalLat').value);
  const lon = parseFloat(document.getElementById('natalLon').value);
  const hasTime = !!document.getElementById('natalTime').value;
  const hasLoc = !isNaN(lat) && !isNaN(lon);

  const jd = dateToJD_UT(dp.y,dp.mo,dp.d,dp.hour,tz);
  const T = (jd-2451545.0)/36525;
  const positions = computeDayPositions(T);

  let cusps=null, asc=null, mc=null, hasHouses=false, vertex=null;
  if(hasTime && hasLoc){
    const r = ascMC(jd,T,lat,lon);
    asc=r.asc; mc=r.mc;
    vertex = vertexLon(jd,T,lat,lon);
    const sys = document.getElementById('houseSystem').value;
    if(sys==='whole') cusps = wholeSignCusps(asc);
    else if(sys==='placidus'){
      cusps = placidusCusps(asc,mc,r.ramc,lat,obliquity(T));
      if(!cusps){
        setNatalMsg('Placidus não pôde ser calculado nessa latitude (muito próxima dos polos). Usando Casas Iguais como alternativa.', 'warn');
        cusps = equalCusps(asc);
      }
    } else {
      cusps = equalCusps(asc);
    }
    hasHouses = true;
  }

  natalChart = {positions, cusps, asc, mc, vertex, hasHouses, jd, T};
  renderNatal();
  if(!opts || opts.persist!==false) saveNatalToStorage();
}

// ---------- Fase 1: leitura estrutural (configuração, padrão de aspecto,
// hemisfério/setor, seita, casas densas, modalidade, Yin/Yang, signo
// predominante, marca geracional) ----------

// Encontra o aspecto mais próximo entre duas longitudes, respeitando o orbe
// efetivo por tipo de ponto (mesma régua usada em trânsitos/sinastria) — usado
// pra achar aspectos intra-mapa em Padrão de aspecto (todos os pares entre
// STRUCTURAL_BODIES) e entre os transpessoais (Urano-Netuno-Plutão) na Marca
// Geracional; não recalcula os aspectos gerais do mapa pra exibição em tabela
// (isso é escopo de features/synastry.js/transits.js, fora daqui). SEMPRE
// repassar nameA/nameB adiante — é deles que sai o multiplicador de orbe
// apertado do Urano/Netuno/Plutão etc.
function findAspectBetween(lon1, lon2, nameA, nameB){
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

function houseRangeLabel(list){
  return list.map(h=>'Casa '+h).join(', ');
}

export function renderStructural(natalChart){
  const profile = computeStructuralProfile(natalChart, findAspectBetween);

  const gen = profile.generational.length
    ? profile.generational.map(m=>{
        const tone = ASPECT_TONE[m.aspect] || 'ambivalente';
        const frase = tone==='harmonico'
          ? 'tende a canalizar essa força geracional com mais fluidez'
          : tone==='tenso'
            ? 'tende a viver essa força geracional mais por ruptura/crise do que por escolha'
            : 'carrega essa força geracional de forma ambivalente, conforme o resto do mapa';
        return `<li>${PLANET_LABEL[m.p1]} ${m.glyph} ${PLANET_LABEL[m.p2]} (${m.aspect}, orbe ${m.orb.toFixed(1)}°) — compartilhado com toda a geração nascida na mesma janela de anos; ${frase}.</li>`;
      }).join('')
    : '<li>Nenhum aspecto exato entre os transpessoais dentro do orbe considerado.</li>';

  const patternsHtml = profile.aspectPatterns.length
    ? profile.aspectPatterns.map(p=>`<li><strong>${ASPECT_PATTERN_LABEL[p.type]}:</strong> ${aspectPatternDetail(p)}</li>`).join('')
    : '<li>Nenhum dos quatro padrões clássicos (T-Quadrado, Grande Cruz, Grande Trígono, Yod) fechou dentro do orbe considerado.</li>';

  const shape = profile.chartShape;
  const mod = profile.modality;
  const yy = profile.yinYang;
  const sd = profile.signDominance;
  const dens = profile.density;
  const hemi = profile.hemispheres;
  const sect = profile.sect;

  const modText = mod.predominant.length
    ? mod.predominant.map(k=>MODALITY_LABEL[k]).join(' / ')
    : '—';
  const modDetail = `Cardinal ${mod.counts.cardinal} · Fixo ${mod.counts.fixo} · Mutável ${mod.counts.mutavel}`;

  const yyText = yy.dominant ? (yy.dominant==='yang' ? 'Yang (Fogo/Ar)' : 'Yin (Terra/Água)') : 'Equilibrado';
  const yyDetail = `Yang ${yy.counts.yang} · Yin ${yy.counts.yin}`;

  const signText = sd.predominant.length
    ? sd.predominant.map(i=>SIGN_GLYPH[i]+' '+SIGNS[i]).join(', ')
    : '—';

  const stelliumSignHtml = dens.signStelliums.length
    ? dens.signStelliums.map(s=>`<li>${SIGN_GLYPH[s.sign]} ${SIGNS[s.sign]}: ${s.bodies.map(b=>PLANET_LABEL[b]).join(', ')} (${s.bodies.length} corpos)</li>`).join('')
    : '<li>Nenhum stellium por signo (3+ corpos no mesmo signo).</li>';
  const stelliumHouseHtml = dens.hasHouses
    ? (dens.houseStelliums.length
        ? dens.houseStelliums.map(h=>`<li>Casa ${h.house}: ${h.bodies.map(b=>PLANET_LABEL[b]).join(', ')} (${h.bodies.length} corpos)</li>`).join('')
        : '<li>Nenhum stellium por casa (3+ corpos na mesma casa).</li>')
    : '<li class="hint">Sem hora/local completos — stellium por casa não calculado.</li>';

  // Hemisfério/Setor + Seita numa linha só, no formato da sua Leitura Geral de
  // referência ("Norte e Oeste (extrospecção e independência), mapa diurno").
  let hemiSectHtml;
  if(hemi && sect){
    const nsLabel = hemi.ns.dominant ? HEMISPHERE_NS_SHORT[hemi.ns.dominant] : null;
    const loLabel = hemi.lo.dominant ? HEMISPHERE_LO_SHORT[hemi.lo.dominant] : null;
    const nsTrait = hemi.ns.dominant ? HEMISPHERE_NS_TRAIT[hemi.ns.dominant] : null;
    const loTrait = hemi.lo.dominant ? HEMISPHERE_LO_TRAIT[hemi.lo.dominant] : null;
    const setores = [nsLabel, loLabel].filter(Boolean).join(' e ') || 'Equilibrado (sem hemisfério dominante)';
    const tracos = [nsTrait, loTrait].filter(Boolean).join(' e ');
    hemiSectHtml = `<div>${setores}${tracos ? ` (${tracos})` : ''}, mapa ${sect.diurno ? 'diurno' : 'noturno'}</div>
      <div class="hint">Sul ${hemi.ns.sul} · Norte ${hemi.ns.norte} — Leste ${hemi.lo.leste} · Oeste ${hemi.lo.oeste} — Sol na Casa ${sect.sunHouse}</div>`;
  } else {
    hemiSectHtml = '<div class="hint">Sem hora/local completos — hemisfério/setor e seita não calculados.</div>';
  }

  return `
  <div class="divider"></div>
  <h3 style="margin-top:0;">Leitura estrutural</h3>
  <div class="hint" style="margin-bottom:12px;">Fatos derivados da distribuição do mapa — sem juízo de valor. A síntese/arquétipo fica pra aba Perfil.</div>

  <div class="structural-block">
    <div class="structural-row">
      <div><strong>Configuração:</strong> ${shape.label || shape.pattern}</div>
      <div class="hint">${shape.detail || ''}</div>
    </div>
    <div class="structural-row">
      <div><strong>Padrão de aspecto:</strong></div>
      <ul class="hint" style="margin:4px 0 0 18px;">${patternsHtml}</ul>
    </div>
    <div class="structural-row">
      <div><strong>Hemisférios/Setores:</strong></div>
      ${hemiSectHtml}
    </div>
    <div class="structural-row">
      <div><strong>Casas mais densas:</strong></div>
      <ul class="hint" style="margin:4px 0 0 18px;">${stelliumSignHtml}${stelliumHouseHtml}</ul>
    </div>
    <div class="structural-row">
      <div><strong>Modalidades:</strong> ${modText} <span class="hint">(${modDetail})</span></div>
    </div>
    <div class="structural-row">
      <div><strong>Balanço Yin/Yang:</strong> ${yyText} <span class="hint">(${yyDetail})</span></div>
    </div>
    <div class="structural-row">
      <div><strong>Signos predominantes:</strong> ${signText}</div>
    </div>
    <div class="structural-row">
      <div><strong>Marca geracional</strong> <span class="hint">(aspectos entre Urano, Netuno e Plutão — comuns a toda uma geração, não distintivos dessa pessoa)</span></div>
      <ul class="hint" style="margin:4px 0 0 18px;">${gen}</ul>
    </div>
  </div>`;
}

// ---------- Fase 2: dignidades essenciais, Almuten Ascendentis, Firdaria e
// as duas tabelas de Predominância por pontos (Elementos e Temperamentos) —
// ver core/dignities.js, core/firdaria.js, core/predominance.js. Tudo aqui
// exige hora+local completos (hasHouses), porque depende da Seita (Sol
// acima/abaixo do horizonte) e/ou do Ascendente exato. ----------

function dignityPartsLabel(parts){
  return parts.length ? parts.map(p=>DIGNITY_LABEL[p.type]).join(', ') : '—';
}

// Formata uma idade em anos fracionários como "X anos e Y meses" (em vez de
// decimal cru tipo "25.1 anos") — usado no bloco de Firdaria, cujas idades de
// início/fim de período raramente caem em ano cheio.
function fmtYearsMonths(ageYears){
  const totalMonths = Math.round(ageYears*12);
  const y = Math.floor(totalMonths/12);
  const m = totalMonths%12;
  const parts = [];
  if(y>0) parts.push(y+(y===1?' ano':' anos'));
  if(m>0 || y===0) parts.push(m+(m===1?' mês':' meses'));
  return parts.join(' e ');
}

function almutenTableHtml(almuten){
  const rowsOrder = ['domicilio','exaltacao','triplicidade','termo','face'];
  let head = '<tr><th>Dignidade</th>'+CLASSICAL_PLANETS.map(p=>'<th>'+PLANET_LABEL[p]+'</th>').join('')+'</tr>';
  let body = rowsOrder.map(type=>{
    const cells = CLASSICAL_PLANETS.map(p=>{
      const entry = almuten.perPlanet.find(e=>e.planet===p);
      const has = entry.parts.some(pt=>pt.type===type);
      return '<td style="text-align:center;">'+(has?'•':'')+'</td>';
    }).join('');
    return '<tr><td>'+DIGNITY_LABEL[type]+'</td>'+cells+'</tr>';
  }).join('');
  const totalRow = '<tr><td><strong>Predominância</strong></td>'+CLASSICAL_PLANETS.map(p=>{
    const entry = almuten.perPlanet.find(e=>e.planet===p);
    return '<td style="text-align:center;"><strong>'+(entry.score||'')+'</strong></td>';
  }).join('')+'</tr>';
  return '<table><thead>'+head+'</thead><tbody>'+body+totalRow+'</tbody></table>';
}

function almutenFigurisTableHtml(figuris){
  const head = '<tr><th>Planeta</th>'+figuris.points.map(pt=>'<th>'+pt.label+'</th>').join('')+'<th>Total</th></tr>';
  const body = CLASSICAL_PLANETS.map(p=>{
    const entry = figuris.perPlanet.find(e=>e.planet===p);
    const cells = entry.byPoint.map(bp=>{
      const title = bp.parts.length ? bp.parts.map(x=>DIGNITY_LABEL[x.type]).join(', ') : 'sem dignidade';
      return '<td style="text-align:center;" title="'+title+'">'+(bp.score||'')+'</td>';
    }).join('');
    return '<tr><td>'+PLANET_LABEL[p]+'</td>'+cells+'<td style="text-align:center;"><strong>'+entry.score+'</strong></td></tr>';
  }).join('');
  return '<table><thead>'+head+'</thead><tbody>'+body+'</tbody></table>';
}

function elementTableHtml(pred){
  const cols = pred.rows;
  const shortLabel = {Asc:'ASC', MC:'MC'};
  const head = '<tr><th>Astro/Elemento</th>'+cols.map(c=>'<th>'+(shortLabel[c.name]||PLANET_LABEL[c.name]||c.name)+' ('+c.w+'p)</th>').join('')+'<th>Predominância</th></tr>';
  const elOrder = [['fogo','Fogo'],['ar','Ar'],['agua','Água'],['terra','Terra']];
  const body = elOrder.map(([key,label])=>{
    const cells = cols.map(c=>'<td style="text-align:center;">'+(c.element===key?'•':'')+'</td>').join('');
    return '<tr><td>'+label+'</td>'+cells+'<td style="text-align:center;"><strong>'+pred.counts[key]+'</strong></td></tr>';
  }).join('');
  const warn = pred.hasHouses ? '' : '<div class="hint">Sem hora/local completos — Ascendente e MC ficaram de fora da soma.</div>';
  return '<table><thead>'+head+'</thead><tbody>'+body+'</tbody></table>'+warn;
}

function temperamentTableHtml(pred){
  const cols = pred.rows;
  const head = '<tr><th>Fator</th>'+cols.map(c=>'<th>'+c.label+' ('+c.w+'p)</th>').join('')+'<th>Predominância</th></tr>';
  const order = [['colerico','Colérico'],['sanguineo','Sanguíneo'],['fleumatico','Fleumático'],['melancolico','Melancólico']];
  const body = order.map(([key,label])=>{
    const cells = cols.map(c=>'<td style="text-align:center;">'+(c.temperament===key?'•':'')+'</td>').join('');
    return '<tr><td>'+label+'</td>'+cells+'<td style="text-align:center;"><strong>'+pred.counts[key]+'</strong></td></tr>';
  }).join('');
  return '<table><thead>'+head+'</thead><tbody>'+body+'</tbody></table>';
}

// ---------- versões em Markdown das mesmas tabelas de detalhe (mesma matriz
// ponto×critério que aparece na página) — usadas em buildNatalMarkdown() pra
// que a cópia/.md carregue o mesmo nível de detalhe da tela, não só as
// conclusões já resumidas ----------
function almutenTableMd(almuten){
  const rowsOrder = ['domicilio','exaltacao','triplicidade','termo','face'];
  let md = '| Dignidade | '+CLASSICAL_PLANETS.map(p=>PLANET_LABEL[p]).join(' | ')+' |\n';
  md += '|---|'+CLASSICAL_PLANETS.map(()=>'---').join('|')+'|\n';
  rowsOrder.forEach(type=>{
    const cells = CLASSICAL_PLANETS.map(p=>{
      const entry = almuten.perPlanet.find(e=>e.planet===p);
      return entry.parts.some(pt=>pt.type===type) ? '•' : '';
    });
    md += `| ${DIGNITY_LABEL[type]} | `+cells.join(' | ')+' |\n';
  });
  md += '| **Predominância** | '+CLASSICAL_PLANETS.map(p=>{
    const entry = almuten.perPlanet.find(e=>e.planet===p);
    return '**'+(entry.score||0)+'**';
  }).join(' | ')+' |\n';
  return md;
}

function almutenFigurisTableMd(figuris){
  let md = '| Planeta | '+figuris.points.map(pt=>pt.label).join(' | ')+' | Total |\n';
  md += '|---|'+figuris.points.map(()=>'---').join('|')+'|---|\n';
  CLASSICAL_PLANETS.forEach(p=>{
    const entry = figuris.perPlanet.find(e=>e.planet===p);
    const cells = entry.byPoint.map(bp=>bp.score||'');
    md += `| ${PLANET_LABEL[p]} | `+cells.join(' | ')+` | **${entry.score}** |\n`;
  });
  return md;
}

function elementTableMd(pred){
  const cols = pred.rows;
  const shortLabel = {Asc:'ASC', MC:'MC'};
  let md = '| Astro/Elemento | '+cols.map(c=>(shortLabel[c.name]||PLANET_LABEL[c.name]||c.name)+' ('+c.w+'p)').join(' | ')+' | Predominância |\n';
  md += '|---|'+cols.map(()=>'---').join('|')+'|---|\n';
  const elOrder = [['fogo','Fogo'],['ar','Ar'],['agua','Água'],['terra','Terra']];
  elOrder.forEach(([key,label])=>{
    const cells = cols.map(c=>c.element===key?'•':'');
    md += `| ${label} | `+cells.join(' | ')+` | **${pred.counts[key]}** |\n`;
  });
  if(!pred.hasHouses) md += '\n*Sem hora/local completos — Ascendente e MC ficaram de fora da soma.*\n';
  return md;
}

function temperamentTableMd(pred){
  const cols = pred.rows;
  let md = '| Fator | '+cols.map(c=>c.label+' ('+c.w+'p)').join(' | ')+' | Predominância |\n';
  md += '|---|'+cols.map(()=>'---').join('|')+'|---|\n';
  const order = [['colerico','Colérico'],['sanguineo','Sanguíneo'],['fleumatico','Fleumático'],['melancolico','Melancólico']];
  order.forEach(([key,label])=>{
    const cells = cols.map(c=>c.temperament===key?'•':'');
    md += `| ${label} | `+cells.join(' | ')+` | **${pred.counts[key]}** |\n`;
  });
  return md;
}

export function renderPhase2(natalChart){
  if(!natalChart.hasHouses){
    return `<div class="divider"></div>
    <h3 style="margin-top:0;">Dignidades, Firdaria e Predominâncias</h3>
    <div class="hint">Sem hora/local completos — Seita e Ascendente exato não calculados; esse bloco (dignidades, Almuten Ascendentis, Firdaria e Predominância de Elementos/Temperamentos) exige os dois.</div>`;
  }
  const sect = computeSect(natalChart);
  const isDay = sect.diurno;

  const dignReport = planetDignityReport(natalChart, isDay);
  const dignRows = dignReport.map(d=>{
    const debHtml = d.debilities.length ? d.debilities.map(x=>x==='detrimento'?'Detrimento':'Queda').join(', ') : '—';
    const combHtml = d.combustion ? (d.combustion==='cazimi'?'Cazimi':'Combusto') : '—';
    return `<tr><td>${PLANET_LABEL[d.planet]}</td><td>${dignityPartsLabel(d.parts)}</td><td>${debHtml}</td><td>${combHtml}</td></tr>`;
  }).join('');
  const dignTable = `<table><thead><tr><th>Planeta</th><th>Dignidades</th><th>Debilidades</th><th>Combustão</th></tr></thead><tbody>${dignRows}</tbody></table>`;

  const almuten = computeAlmutenAscendentis(natalChart, isDay);
  const almutenWinnerText = almuten.winners.length
    ? almuten.winners.map(p=>PLANET_LABEL[p]).join(' / ') + ` (${almuten.max} pontos)`
    : 'Nenhum planeta pontuou dignidade no grau do Ascendente.';

  const figuris = computeAlmutenFiguris(natalChart, isDay);
  const figurisWinnerText = figuris.winners.length
    ? figuris.winners.map(p=>PLANET_LABEL[p]).join(' / ') + ` (${figuris.max} pontos)`
    : 'Nenhum planeta pontuou dignidade nos 5 lugares da vida.';

  const nowJD = toJD(new Date().getUTCFullYear(), new Date().getUTCMonth()+1, new Date().getUTCDate(), new Date().getUTCHours()+new Date().getUTCMinutes()/60);
  const age = ageInYears(natalChart.jd, nowJD);
  const fird = computeFirdaria(age, isDay);
  const firdText = `<div><strong>Período atual:</strong> ${PLANET_LABEL[fird.major.planet]} (${fmtYearsMonths(fird.major.startAge)}–${fmtYearsMonths(fird.major.endAge)}) → subperíodo de ${PLANET_LABEL[fird.sub.planet]} (${fmtYearsMonths(fird.sub.startAge)}–${fmtYearsMonths(fird.sub.endAge)})</div>
    <div class="hint">Idade atual: ${fmtYearsMonths(age)}${fird.cycle>0?` — 2º ciclo de Firdaria (75 anos cada)`:''} · Seita: mapa ${isDay?'diurno':'noturno'}</div>`;

  const elPred = computeElementPredominance(natalChart);
  const elWinnerText = elPred.predominant.length ? elPred.predominant.map(k=>ELEMENT_LABEL[k]).join(' / ') : '—';

  const tempPred = computeTemperamentPredominance(natalChart, almuten.winners[0], true);
  const tempWinnerText = tempPred.predominant.length ? tempPred.predominant.map(k=>TEMPERAMENT_LABEL[k]).join(' / ') : '—';

  return `
  <div class="divider"></div>
  <h3 style="margin-top:0;">Dignidades, Firdaria e Predominâncias</h3>

  <div class="structural-block">
    <div class="structural-row">
      <div><strong>Dignidades essenciais</strong> <span class="hint">(dignidade/debilidade de cada planeta na própria posição)</span></div>
      ${dignTable}
    </div>
    <div class="structural-row">
      <div><strong>Almuten Ascendentis:</strong> ${almutenWinnerText}</div>
      ${almutenTableHtml(almuten)}
    </div>
    <div class="structural-row">
      <div><strong>Almuten Figuris:</strong> ${figurisWinnerText}</div>
      <span class="hint">(regente geral do mapa — soma a mesma pontuação de dignidade nos 5 "lugares da vida": Sol, Lua, Ascendente, Parte da Fortuna e Sizígia Pré-Natal)</span>
      ${almutenFigurisTableHtml(figuris)}
      ${!figuris.syzygy ? '<div class="hint">Sizígia Pré-Natal não pôde ser calculada — considerado só Sol, Lua, Ascendente e Parte da Fortuna.</div>' : ''}
    </div>
    <div class="structural-row">
      <div><strong>Firdaria</strong></div>
      ${firdText}
    </div>
    <div class="structural-row">
      <div><strong>Predominância de Elementos:</strong> ${elWinnerText}</div>
      ${elementTableHtml(elPred)}
    </div>
    <div class="structural-row">
      <div><strong>Predominância de Temperamentos:</strong> ${tempWinnerText}</div>
      ${temperamentTableHtml(tempPred)}
    </div>
  </div>`;
}

// ---------- Exportação em Markdown (botões "Copiar para IA" / "Baixar .md") ----------
// Monta a leitura inteira (posições + Fase 1 + Fase 2) num Markdown legível
// tanto por gente quanto por IA — mesma informação das tabelas da página,
// em texto corrido/tabelas Markdown, sem depender de raspar o HTML renderizado.
export function buildNatalMarkdown(natalChart){
  const nome = (document.getElementById('natalName')?.value || '').trim() || 'Mapa Natal';
  const dataNasc = document.getElementById('natalDate')?.value || '';
  const horaNasc = document.getElementById('natalTime')?.value || '';
  const cidade = document.getElementById('citySearch')?.value || '';

  let md = `# Leitura Geral — ${nome}\n\n`;
  const meta = [];
  if(dataNasc) meta.push('Nascimento: '+dataNasc+(horaNasc?' '+horaNasc:' (hora não informada)'));
  if(cidade) meta.push('Local: '+cidade);
  if(natalChart.hasHouses){
    const sysLabel = {whole:'Signos Inteiros', equal:'Casas Iguais', placidus:'Placidus'};
    const sys = document.getElementById('houseSystem')?.value;
    meta.push('Sistema de casas: '+(sysLabel[sys]||sys||'—'));
  }
  if(meta.length) md += meta.join(' · ')+'\n\n';

  md += '## Posições\n\n| Ponto | Signo | Grau | Casa |\n|---|---|---|---|\n';
  TRANSIT_BODIES.forEach(name=>{
    const lon = natalChart.positions[name];
    const house = natalChart.hasHouses ? houseOf(lon,natalChart.cusps) : null;
    md += `| ${PLANET_LABEL[name]} | ${SIGNS[signOf(lon)]} | ${degMinStr(lon%30)} | ${house?('Casa '+house):'—'} |\n`;
  });
  if(natalChart.hasHouses){
    const dscLon=angleLon(natalChart,'DSC'), icLon=angleLon(natalChart,'IC'), fortLon=angleLon(natalChart,'Fortuna'), espLon=angleLon(natalChart,'Espirito');
    md += `| Ascendente | ${SIGNS[signOf(natalChart.asc)]} | ${degMinStr(natalChart.asc%30)} | Casa 1 |\n`;
    md += `| Meio do Céu | ${SIGNS[signOf(natalChart.mc)]} | ${degMinStr(natalChart.mc%30)} | Casa 10* |\n`;
    md += `| Descendente | ${SIGNS[signOf(dscLon)]} | ${degMinStr(dscLon%30)} | Casa 7 |\n`;
    md += `| Fundo do Céu | ${SIGNS[signOf(icLon)]} | ${degMinStr(icLon%30)} | Casa 4* |\n`;
    md += `| Parte da Fortuna | ${SIGNS[signOf(fortLon)]} | ${degMinStr(fortLon%30)} | Casa ${houseOf(fortLon,natalChart.cusps)} |\n`;
    md += `| Parte do Espírito | ${SIGNS[signOf(espLon)]} | ${degMinStr(espLon%30)} | Casa ${houseOf(espLon,natalChart.cusps)} |\n`;
    const vtxLon=natalChart.vertex;
    md += `| Vértice | ${SIGNS[signOf(vtxLon)]} | ${degMinStr(vtxLon%30)} | Casa ${houseOf(vtxLon,natalChart.cusps)} |\n`;
    md += '\n*MC nem sempre cai exatamente na cúspide da Casa 10 no sistema de Signos Inteiros.*\n';
  } else {
    md += '\n*Sem hora/local completos — Ascendente e Casas não calculados.*\n';
  }
  md += '\n';

  md += '## Casas, Aspectos e Velocidade\n\n';
  md += '### Casas\n\n' + housesTableMd(natalChart) + '\n';
  const detailAsp = computeDetailAspects(natalChart);
  md += '### Aspectos planetários\n\n' + aspectRowsTableMd(detailAsp.planetary) + '\n';
  md += '### Outros aspectos\n\n' + aspectRowsTableMd(detailAsp.others) + '\n';
  md += '### Velocidades planetárias\n\n' + speedsTableMd(natalChart) + '\n';

  const profile = computeStructuralProfile(natalChart, findAspectBetween);
  md += '## Leitura estrutural\n\n';
  md += `- **Configuração:** ${profile.chartShape.label||profile.chartShape.pattern} — ${profile.chartShape.detail||''}\n`;
  if(profile.aspectPatterns.length){
    md += '- **Padrão de aspecto:**\n';
    profile.aspectPatterns.forEach(p=>{ md += `  - ${ASPECT_PATTERN_LABEL[p.type]}: ${aspectPatternDetail(p)}\n`; });
  } else {
    md += '- **Padrão de aspecto:** nenhum dos quatro padrões clássicos (T-Quadrado, Grande Cruz, Grande Trígono, Yod) fechou dentro do orbe considerado.\n';
  }
  const hemi = profile.hemispheres, sectP = profile.sect;
  if(hemi && sectP){
    const nsLabel = hemi.ns.dominant ? HEMISPHERE_NS_SHORT[hemi.ns.dominant] : null;
    const loLabel = hemi.lo.dominant ? HEMISPHERE_LO_SHORT[hemi.lo.dominant] : null;
    const setores = [nsLabel, loLabel].filter(Boolean).join(' e ') || 'Equilibrado (sem hemisfério dominante)';
    md += `- **Hemisférios/Setores:** ${setores}, mapa ${sectP.diurno?'diurno':'noturno'}\n`;
  } else {
    md += '- **Hemisférios/Setores:** sem hora/local completos, não calculado.\n';
  }
  const dens = profile.density;
  md += '- **Casas mais densas:**\n';
  md += dens.signStelliums.length
    ? dens.signStelliums.map(s=>`  - ${SIGNS[s.sign]}: ${s.bodies.map(b=>PLANET_LABEL[b]).join(', ')}\n`).join('')
    : '  - Nenhum stellium por signo (3+ corpos no mesmo signo).\n';
  if(dens.hasHouses){
    md += dens.houseStelliums.length
      ? dens.houseStelliums.map(h=>`  - Casa ${h.house}: ${h.bodies.map(b=>PLANET_LABEL[b]).join(', ')}\n`).join('')
      : '  - Nenhum stellium por casa (3+ corpos na mesma casa).\n';
  }
  const mod = profile.modality;
  md += `- **Modalidades:** ${mod.predominant.length?mod.predominant.map(k=>MODALITY_LABEL[k]).join(' / '):'—'} (Cardinal ${mod.counts.cardinal} · Fixo ${mod.counts.fixo} · Mutável ${mod.counts.mutavel})\n`;
  const yy = profile.yinYang;
  md += `- **Balanço Yin/Yang:** ${yy.dominant?(yy.dominant==='yang'?'Yang (Fogo/Ar)':'Yin (Terra/Água)'):'Equilibrado'} (Yang ${yy.counts.yang} · Yin ${yy.counts.yin})\n`;
  const sd = profile.signDominance;
  md += `- **Signos predominantes:** ${sd.predominant.length?sd.predominant.map(i=>SIGNS[i]).join(', '):'—'}\n`;
  md += '- **Marca geracional** (aspectos entre Urano, Netuno e Plutão — comuns a toda uma geração, não distintivos dessa pessoa):\n';
  md += profile.generational.length
    ? profile.generational.map(m=>`  - ${PLANET_LABEL[m.p1]} ${m.aspect} ${PLANET_LABEL[m.p2]} (orbe ${m.orb.toFixed(1)}°)\n`).join('')
    : '  - Nenhum aspecto exato entre os transpessoais dentro do orbe considerado.\n';
  md += '\n';

  if(natalChart.hasHouses){
    const sect2 = computeSect(natalChart);
    const isDay = sect2.diurno;
    md += '## Dignidades, Firdaria e Predominâncias\n\n';

    md += '### Dignidades essenciais\n\n| Planeta | Dignidades | Debilidades | Combustão |\n|---|---|---|---|\n';
    planetDignityReport(natalChart, isDay).forEach(d=>{
      const deb = d.debilities.length ? d.debilities.map(x=>x==='detrimento'?'Detrimento':'Queda').join(', ') : '—';
      const comb = d.combustion ? (d.combustion==='cazimi'?'Cazimi':'Combusto') : '—';
      md += `| ${PLANET_LABEL[d.planet]} | ${dignityPartsLabel(d.parts)} | ${deb} | ${comb} |\n`;
    });
    md += '\n';

    const almuten = computeAlmutenAscendentis(natalChart, isDay);
    md += `**Almuten Ascendentis:** ${almuten.winners.length?almuten.winners.map(p=>PLANET_LABEL[p]).join(' / ')+' ('+almuten.max+' pontos)':'Nenhum planeta pontuou dignidade no grau do Ascendente.'}\n\n`;
    md += almutenTableMd(almuten)+'\n';

    const figuris = computeAlmutenFiguris(natalChart, isDay);
    md += `**Almuten Figuris:** ${figuris.winners.length?figuris.winners.map(p=>PLANET_LABEL[p]).join(' / ')+' ('+figuris.max+' pontos)':'Nenhum planeta pontuou dignidade nos 5 lugares da vida.'}\n\n`;
    md += almutenFigurisTableMd(figuris)+'\n';
    if(!figuris.syzygy) md += '*Sizígia Pré-Natal não pôde ser calculada — considerado só Sol, Lua, Ascendente e Parte da Fortuna.*\n\n';

    const nowJD = toJD(new Date().getUTCFullYear(), new Date().getUTCMonth()+1, new Date().getUTCDate(), new Date().getUTCHours()+new Date().getUTCMinutes()/60);
    const age = ageInYears(natalChart.jd, nowJD);
    const fird = computeFirdaria(age, isDay);
    md += `**Firdaria** — idade atual: ${fmtYearsMonths(age)}${fird.cycle>0?' (2º ciclo de 75 anos)':''} · Seita: mapa ${isDay?'diurno':'noturno'}\n`;
    md += `- Período atual: ${PLANET_LABEL[fird.major.planet]} (${fmtYearsMonths(fird.major.startAge)}–${fmtYearsMonths(fird.major.endAge)})\n`;
    md += `- Subperíodo: ${PLANET_LABEL[fird.sub.planet]} (${fmtYearsMonths(fird.sub.startAge)}–${fmtYearsMonths(fird.sub.endAge)})\n\n`;

    const elPred = computeElementPredominance(natalChart);
    md += `**Predominância de Elementos:** ${elPred.predominant.length?elPred.predominant.map(k=>ELEMENT_LABEL[k]).join(' / '):'—'} (Fogo ${elPred.counts.fogo} · Terra ${elPred.counts.terra} · Ar ${elPred.counts.ar} · Água ${elPred.counts.agua})\n\n`;
    md += elementTableMd(elPred)+'\n';

    const tempPred = computeTemperamentPredominance(natalChart, almuten.winners[0], true);
    md += `**Predominância de Temperamentos:** ${tempPred.predominant.length?tempPred.predominant.map(k=>TEMPERAMENT_LABEL[k]).join(' / '):'—'} (Colérico ${tempPred.counts.colerico} · Sanguíneo ${tempPred.counts.sanguineo} · Fleumático ${tempPred.counts.fleumatico} · Melancólico ${tempPred.counts.melancolico})\n\n`;
    md += temperamentTableMd(tempPred)+'\n';
  } else {
    md += '## Dignidades, Firdaria e Predominâncias\n\nSem hora/local completos — não calculado.\n\n';
  }

  md += '---\n_Gerado pelo Parada Mística — fatos derivados da distribuição do mapa, sem juízo de valor. Interprete considerando o conjunto, não pontos isolados._\n';
  return md;
}

export function copyNatalForAI(btn){
  if(!natalChart) return;
  const text = buildNatalMarkdown(natalChart);
  const ta = document.getElementById('natalCopyArea');
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

export function downloadNatalMd(){
  if(!natalChart) return;
  const nome = (document.getElementById('natalName')?.value || '').trim();
  const filename = 'mapa-natal'+(nome?('-'+nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')):'')+'.md';
  downloadBlob(buildNatalMarkdown(natalChart), filename, 'text/markdown;charset=utf-8');
}

// ---------- Casas, Aspectos e Velocidade (tabelas de detalhe, colapsadas por
// padrão atrás de um interruptor) ----------
// "Planetários" = os 10 planetas clássicos/modernos com orbe cheio (mult. 1.0
// em ORB_TYPE_MULT, core/orbs.js); "Outros" = tudo que já leva orbe mais
// apertado ali (Quíron/Nodo/Lilith) mais os ângulos/Fortuna/Vértice quando há
// hora+local — a mesma linha divisória que o resto do app já usa, só exibida
// agora como duas tabelas separadas em vez de um único critério de peso.
const DETAIL_CORE_PLANETS = ["Sol","Lua","Mercurio","Venus","Marte","Jupiter","Saturno","Urano","Netuno","Plutao"];
const DETAIL_OTHER_BASE = ["Quiron","NodoNorte","Lilith"];
const DETAIL_OTHER_HOUSES = ["Asc","MC","DSC","IC","Fortuna","Espirito","Vertice"];

function degMinSecStr(value){
  let d=Math.floor(value);
  let mFull=(value-d)*60;
  let m=Math.floor(mFull);
  let s=Math.round((mFull-m)*60);
  if(s===60){s=0;m+=1;}
  if(m===60){m=0;d+=1;}
  return d+"°"+String(m).padStart(2,'0')+"'"+String(s).padStart(2,'0')+"''";
}

function computeDetailAspects(chart){
  const other = DETAIL_OTHER_BASE.concat(chart.hasHouses ? DETAIL_OTHER_HOUSES : []);
  const all = DETAIL_CORE_PLANETS.concat(other);
  const planetary = [], others = [];
  for(let i=0;i<all.length;i++){
    for(let j=i+1;j<all.length;j++){
      const nameA=all[i], nameB=all[j];
      const lon1=angleLon(chart,nameA), lon2=angleLon(chart,nameB);
      const found = findAspectBetween(lon1,lon2,nameA,nameB);
      if(!found) continue;
      const bothCore = DETAIL_CORE_PLANETS.includes(nameA) && DETAIL_CORE_PLANETS.includes(nameB);
      (bothCore?planetary:others).push({nameA,nameB,...found});
    }
  }
  planetary.sort((a,b)=>a.orb-b.orb);
  others.sort((a,b)=>a.orb-b.orb);
  return {planetary, others};
}

function housesTableHtml(chart){
  if(!chart.hasHouses) return '<div class="hint">Sem hora/local completos — Casas não calculadas.</div>';
  const { intercepted, duplicated } = interceptedSigns(chart.cusps);
  const duplicatedSigns = new Set(duplicated.map(d=>d.sign));
  const rows = chart.cusps.map((c,i)=>{
    const sIdx = signOf(c);
    const dupTag = duplicatedSigns.has(sIdx) ? ' <span class="hint" title="Esse signo também é cúspide de outra casa">(cúspide dupla)</span>' : '';
    return '<tr><td>Casa '+(i+1)+'</td><td>'+SIGN_GLYPH[sIdx]+' '+SIGNS[sIdx]+dupTag+'</td><td>'+degMinStr(c%30)+'</td></tr>';
  }).join('');
  const interceptWarn = intercepted.length
    ? `<div class="hint" style="margin-bottom:8px;">⚠️ Interceptação: ${intercepted.map(x=>`${SIGNS[x.sign]} (dentro da Casa ${x.house}, sem cúspide própria)`).join('; ')}.</div>`
    : '';
  return interceptWarn + '<table><thead><tr><th>Casa</th><th>Signo</th><th>Grau</th></tr></thead><tbody>'+rows+'</tbody></table>';
}

function aspectRowsTableHtml(rows){
  if(!rows.length) return '<div class="hint">Nenhum aspecto dentro do orbe considerado.</div>';
  const body = rows.map(r=>'<tr><td>'+PLANET_GLYPH[r.nameA]+' '+PLANET_LABEL[r.nameA]+'</td><td>'+r.glyph+' '+r.aspect+'</td><td>'+PLANET_GLYPH[r.nameB]+' '+PLANET_LABEL[r.nameB]+'</td><td>'+r.orb.toFixed(2)+'°</td></tr>').join('');
  return '<table><thead><tr><th>Ponto A</th><th>Aspecto</th><th>Ponto B</th><th>Orbe</th></tr></thead><tbody>'+body+'</tbody></table>';
}

function speedClassify(ratio){
  if(ratio < 0.05) return {label:'Estacionário', cls:'stationary'};
  if(ratio < 0.5) return {label:'Lento', cls:'slow'};
  if(ratio <= 1.5) return {label:'Médio', cls:'medium'};
  return {label:'Rápido', cls:'fast'};
}

function speedsTableHtml(chart){
  const prevPositions = computeDayPositions(chart.T - 1/36525);
  const rows = TRANSIT_BODIES.map(name=>{
    let speed = chart.positions[name]-prevPositions[name];
    if(speed>180) speed-=360; if(speed<-180) speed+=360;
    const retro = speed<0, abs = Math.abs(speed);
    const avg = AVG_SPEED[name]||1, ratio = avg?(abs/avg):0;
    const sc = speedClassify(ratio);
    const direction = sc.label==='Estacionário'
      ? '<span class="tag stationary">Estacionário</span>'
      : (retro?'<span class="tag retro">Retrógrado</span>':'<span class="tag">Direto</span>');
    return '<tr><td>'+PLANET_GLYPH[name]+' '+PLANET_LABEL[name]+'</td><td>'+degMinSecStr(abs)+'/dia</td><td>'+direction+'</td><td>cca '+ratio.toFixed(2)+'x a média ('+sc.label+')</td></tr>';
  }).join('');
  return '<table><thead><tr><th>Ponto</th><th>Velocidade</th><th>Direção</th><th>Vs. velocidade média</th></tr></thead><tbody>'+rows+'</tbody></table>';
}

function renderDetailTables(chart){
  const {planetary, others} = computeDetailAspects(chart);
  return `
  <div class="divider"></div>
  <button class="btn secondary small" id="natalDetailToggleBtn" onclick="toggleNatalDetailTables()">▸ Casas, Aspectos e Velocidade</button>
  <div id="natalDetailBox" style="display:none; margin-top:12px;">
    <h3 style="margin-top:0; margin-bottom:10px;">Casas</h3>
    ${housesTableHtml(chart)}
    <h3 style="margin-top:26px; margin-bottom:10px;">Aspectos planetários</h3>
    ${aspectRowsTableHtml(planetary)}
    <h3 style="margin-top:26px; margin-bottom:10px;">Outros aspectos <span class="hint">(Quíron, Nodo, Lilith${chart.hasHouses?', ângulos, Parte da Fortuna, Parte do Espírito e Vértice':''})</span></h3>
    ${aspectRowsTableHtml(others)}
    <h3 style="margin-top:26px; margin-bottom:10px;">Velocidades planetárias</h3>
    ${speedsTableHtml(chart)}
  </div>`;
}

export function toggleNatalDetailTables(){
  const box = document.getElementById('natalDetailBox');
  const btn = document.getElementById('natalDetailToggleBtn');
  if(!box || !btn) return;
  const hidden = box.style.display==='none' || !box.style.display;
  box.style.display = hidden ? 'block' : 'none';
  btn.textContent = (hidden?'▾':'▸') + ' Casas, Aspectos e Velocidade';
}

// ---------- versões em Markdown das mesmas tabelas acima (mesmo critério
// Planetários/Outros), usadas em buildNatalMarkdown() ----------
function housesTableMd(chart){
  if(!chart.hasHouses) return '_Sem hora/local completos — Casas não calculadas._\n';
  const { intercepted, duplicated } = interceptedSigns(chart.cusps);
  const duplicatedSigns = new Set(duplicated.map(d=>d.sign));
  let md = '';
  if(intercepted.length){
    md += `*⚠️ Interceptação: ${intercepted.map(x=>`${SIGNS[x.sign]} (dentro da Casa ${x.house}, sem cúspide própria)`).join('; ')}.*\n\n`;
  }
  md += '| Casa | Signo | Grau |\n|---|---|---|\n';
  chart.cusps.forEach((c,i)=>{
    const sIdx = signOf(c);
    const dupTag = duplicatedSigns.has(sIdx) ? ' (cúspide dupla)' : '';
    md += `| Casa ${i+1} | ${SIGNS[sIdx]}${dupTag} | ${degMinStr(c%30)} |\n`;
  });
  return md;
}

function aspectRowsTableMd(rows){
  if(!rows.length) return '_Nenhum aspecto dentro do orbe considerado._\n';
  let md = '| Ponto A | Aspecto | Ponto B | Orbe |\n|---|---|---|---|\n';
  rows.forEach(r=>{ md += `| ${PLANET_LABEL[r.nameA]} | ${r.aspect} | ${PLANET_LABEL[r.nameB]} | ${r.orb.toFixed(2)}° |\n`; });
  return md;
}

function speedsTableMd(chart){
  const prevPositions = computeDayPositions(chart.T - 1/36525);
  let md = '| Ponto | Velocidade | Direção | Vs. velocidade média |\n|---|---|---|---|\n';
  TRANSIT_BODIES.forEach(name=>{
    let speed = chart.positions[name]-prevPositions[name];
    if(speed>180) speed-=360; if(speed<-180) speed+=360;
    const retro = speed<0, abs = Math.abs(speed);
    const avg = AVG_SPEED[name]||1, ratio = avg?(abs/avg):0;
    const sc = speedClassify(ratio);
    const direction = sc.label==='Estacionário' ? 'Estacionário' : (retro?'Retrógrado':'Direto');
    md += `| ${PLANET_LABEL[name]} | ${degMinSecStr(abs)}/dia | ${direction} | cca ${ratio.toFixed(2)}x a média (${sc.label}) |\n`;
  });
  return md;
}

function renderNatalFooterActions(){
  return `
  <div class="divider"></div>
  <div class="structural-row" style="flex-direction:row; gap:10px; flex-wrap:wrap;">
    <button class="btn secondary small" onclick="copyNatalForAI(this)">Copiar para IA</button>
    <button class="btn secondary small" onclick="downloadNatalMd()">Baixar .md</button>
  </div>
  <textarea id="natalCopyArea" style="position:absolute; left:-9999px;"></textarea>`;
}

export function renderNatal(){
  const el = document.getElementById('natalOutput');
  if(!natalChart){ el.innerHTML='<div class="empty">Calcule o mapa natal.</div>'; return; }
  let rows='';
  TRANSIT_BODIES.forEach(name=>{
    const lon = natalChart.positions[name];
    const sIdx = signOf(lon);
    const house = natalChart.hasHouses ? houseOf(lon,natalChart.cusps) : '—';
    rows += '<tr><td><span class="glyph natal">'+PLANET_GLYPH[name]+'</span>'+PLANET_LABEL[name]+'</td><td>'+SIGN_GLYPH[sIdx]+' '+SIGNS[sIdx]+'</td><td>'+degMinStr(lon%30)+'</td><td>'+(house!=='—'?('Casa '+house):'—')+'</td></tr>';
  });
  if(natalChart.hasHouses){
    const ascS=signOf(natalChart.asc), mcS=signOf(natalChart.mc);
    const dscLon=angleLon(natalChart,'DSC'), icLon=angleLon(natalChart,'IC'), fortLon=angleLon(natalChart,'Fortuna'), espLon=angleLon(natalChart,'Espirito');
    const dscS=signOf(dscLon), icS=signOf(icLon), fortS=signOf(fortLon), espS=signOf(espLon);
    rows += '<tr><td><span class="glyph natal">Asc</span>Ascendente</td><td>'+SIGN_GLYPH[ascS]+' '+SIGNS[ascS]+'</td><td>'+degMinStr(natalChart.asc%30)+'</td><td>Casa 1</td></tr>';
    rows += '<tr><td><span class="glyph natal">MC</span>Meio do Céu</td><td>'+SIGN_GLYPH[mcS]+' '+SIGNS[mcS]+'</td><td>'+degMinStr(natalChart.mc%30)+'</td><td>Casa 10*</td></tr>';
    rows += '<tr><td><span class="glyph natal">Dsc</span>Descendente</td><td>'+SIGN_GLYPH[dscS]+' '+SIGNS[dscS]+'</td><td>'+degMinStr(dscLon%30)+'</td><td>Casa 7</td></tr>';
    rows += '<tr><td><span class="glyph natal">IC</span>Fundo do Céu</td><td>'+SIGN_GLYPH[icS]+' '+SIGNS[icS]+'</td><td>'+degMinStr(icLon%30)+'</td><td>Casa 4*</td></tr>';
    rows += '<tr><td><span class="glyph natal">'+PLANET_GLYPH.Fortuna+'</span>Parte da Fortuna</td><td>'+SIGN_GLYPH[fortS]+' '+SIGNS[fortS]+'</td><td>'+degMinStr(fortLon%30)+'</td><td>Casa '+houseOf(fortLon,natalChart.cusps)+'</td></tr>';
    rows += '<tr><td><span class="glyph natal">'+PLANET_GLYPH.Espirito+'</span>Parte do Espírito</td><td>'+SIGN_GLYPH[espS]+' '+SIGNS[espS]+'</td><td>'+degMinStr(espLon%30)+'</td><td>Casa '+houseOf(espLon,natalChart.cusps)+'</td></tr>';
    const vtxLon=natalChart.vertex, vtxS=signOf(vtxLon);
    rows += '<tr><td><span class="glyph natal">'+PLANET_GLYPH.Vertice+'</span>Vértice</td><td>'+SIGN_GLYPH[vtxS]+' '+SIGNS[vtxS]+'</td><td>'+degMinStr(vtxLon%30)+'</td><td>Casa '+houseOf(vtxLon,natalChart.cusps)+'</td></tr>';
  }
  let warn = natalChart.hasHouses ? '' : '<div class="hint" style="margin-bottom:10px;"><span class="badge-required">Sem hora/local completos:</span> Ascendente e Casas não foram calculados — apenas signo e grau dos planetas.</div>';
  el.innerHTML = warn + '<table id="natalSummary"><thead><tr><th>Ponto</th><th>Signo</th><th>Grau</th><th>Casa</th></tr></thead><tbody>'+rows+'</tbody></table>'
    + (natalChart.hasHouses ? '<div class="hint" style="margin-top:8px;">*MC nem sempre cai exatamente na cúspide da Casa 10 no sistema de Signos Inteiros — isso é esperado.</div>' : '')
    + renderDetailTables(natalChart)
    + renderStructural(natalChart)
    + renderPhase2(natalChart)
    + renderNatalFooterActions();
}

// Texto vindo de serviço externo (Nominatim) nunca entra no HTML sem escape.
function escapeCidadeNatal(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
