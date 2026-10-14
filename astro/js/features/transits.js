// ============================================================================
// features/transits.js
// Trânsitos individuais (aba "Trânsitos individuais"): data única ou
// intervalo/ano, contra o mapa natal (features/natal.js). Cálculo, filtros,
// tabela de resultado, exportação JSON/CSV e o texto pronto para IA.
// ============================================================================

import { toJD, dateToJD_UT, normDeg } from '../core/time.js';
import { computeDayPositions } from '../core/ephemeris.js';
import { houseOf, signOf, degMinStr } from '../core/houses.js';
import { ASPECTS, orbFromAspect, impactScore, angleLon } from '../core/aspects.js';
import {
  TRANSIT_BODIES, ANGLE_POINTS, PLANET_GLYPH, PLANET_LABEL, SIGN_GLYPH, SIGNS,
  PLANET_GROUPS, speedTag
} from '../core/constants.js';
import { impactBar } from '../ui/render-helpers.js';
import { downloadBlob } from '../shared/download.js';
import { natalChart, setTransitStatus, readDateParts } from './natal.js';

// ---------- state ----------
export let transitData = null; // {mode, positionRows, aspectRows}

export function calcTransits(){
  if(!natalChart){ setTransitStatus('Calcule o mapa natal primeiro.', true); return; }
  const isSingle = document.getElementById('modeSingleBtn').classList.contains('active');
  setTransitStatus('Calculando...', false);
  setTimeout(()=>{
    const ok = isSingle ? computeSingle() : computeRange();
    if(ok!==false) setTransitStatus('', false);
  }, 30);
}

export function natalPointList(){
  const pts = TRANSIT_BODIES.slice();
  if(natalChart.hasHouses) pts.push(...ANGLE_POINTS);
  return pts;
}
export function natalLon(name){
  return angleLon(natalChart, name);
}

// otimizado: calcula a diferença angular UMA vez por dia (em vez de uma vez por aspecto,
// já que são 9 tipos de aspecto) e reaproveita pra testar os 9 ao mesmo tempo.
// Compartilhada entre trânsitos individuais (natalChart) e trânsitos do composto (compositeChart).
export function collectNatalAspectEvents(tname, natalPts, chart, lonOfFn, days, dayPositions, jdToDateLabel, outEvents){
  natalPts.forEach(nname=>{
    const nlon = lonOfFn(nname);
    const opens = new Array(ASPECTS.length).fill(null);

    function closeEvt(ai, o, endIdx){
      const asp = ASPECTS[ai];
      const exactJd = days[o.minIdx];
      const lonAtExact = dayPositions[o.minIdx][tname];
      const T=(exactJd-2451545.0)/36525;
      const posNext = computeDayPositions(T+1/36525);
      let speed = posNext[tname]-lonAtExact; if(speed>180)speed-=360; if(speed<-180)speed+=360;
      const retro = speed<0;
      const score = impactScore(asp,o.minOrb,tname,nname,retro);
      return {
        transit:tname, natal:nname, aspect:asp, orb:o.minOrb, retro,
        sIdx: signOf(lonAtExact), house: chart.hasHouses ? houseOf(lonAtExact,chart.cusps) : null,
        score,
        startLabel: jdToDateLabel(days[o.startIdx]),
        exactLabel: jdToDateLabel(exactJd),
        endLabel: jdToDateLabel(days[endIdx]),
        touchesStart: o.startIdx===0,
        touchesEnd: endIdx===days.length-1,
        applying: null
      };
    }

    for(let idx=0; idx<days.length; idx++){
      const lon = dayPositions[idx][tname];
      let diff = Math.abs(normDeg(lon-nlon));
      if(diff>180) diff = 360-diff;
      for(let ai=0; ai<ASPECTS.length; ai++){
        const asp = ASPECTS[ai];
        const orb = Math.abs(diff-asp.angle);
        const active = orb<=asp.orb;
        const open = opens[ai];
        if(active){
          if(!open) opens[ai]={startIdx:idx,minOrb:orb,minIdx:idx};
          else if(orb<open.minOrb){ open.minOrb=orb; open.minIdx=idx; }
        } else if(open){
          outEvents.push(closeEvt(ai,open,idx-1));
          opens[ai]=null;
        }
      }
    }
    for(let ai=0; ai<ASPECTS.length; ai++){
      const open = opens[ai];
      if(open) outEvents.push(closeEvt(ai,open,days.length-1));
    }
  });
}

export function computeSingle(){
  const dp = readDateParts(document.getElementById('singleDate').value, document.getElementById('singleTime').value, 12);
  if(!dp){ setTransitStatus('Informe a data do trânsito.', true); return false; }
  const tz = parseFloat(document.getElementById('singleTz').value)||0;
  const jd = dateToJD_UT(dp.y,dp.mo,dp.d,dp.hour,tz);
  const T = (jd-2451545.0)/36525;
  const pos = computeDayPositions(T);
  const posNext = computeDayPositions(T+1/36525);

  const positionRows = TRANSIT_BODIES.map(name=>{
    const lon = pos[name];
    const speed = (()=>{ let d=posNext[name]-lon; if(d>180)d-=360; if(d<-180)d+=360; return d; })();
    const retro = speed<0;
    const sIdx = signOf(lon);
    const house = natalChart.hasHouses ? houseOf(lon,natalChart.cusps) : null;
    return {name, lon, sIdx, house, retro, speed};
  });

  const natalPts = natalPointList();
  const aspectRows = [];
  TRANSIT_BODIES.forEach(tname=>{
    const lon = pos[tname];
    const lonNext = posNext[tname];
    natalPts.forEach(nname=>{
      const nlon = natalLon(nname);
      ASPECTS.forEach(asp=>{
        const orb = orbFromAspect(lon,nlon,asp.angle);
        if(orb<=asp.orb){
          const orbNext = orbFromAspect(lonNext,nlon,asp.angle);
          const applying = orbNext < orb;
          const retro = positionRows.find(p=>p.name===tname).retro;
          const score = impactScore(asp,orb,tname,nname,retro);
          aspectRows.push({
            transit:tname, natal:nname, aspect:asp, orb, applying, retro,
            sIdx: signOf(lon), house: natalChart.hasHouses ? houseOf(lon,natalChart.cusps) : null,
            score, dateLabel: null
          });
        }
      });
    });
  });

  transitData = {mode:'single', positionRows, aspectRows};
  renderResults();
}

export function computeRange(){
  const s = document.getElementById('rangeStart').value;
  const en = document.getElementById('rangeEnd').value;
  const step = Math.max(1, parseInt(document.getElementById('rangeStep').value)||1);
  if(!s || !en){ setTransitStatus('Informe data inicial e final.', true); return false; }
  const [sy,smo,sd] = s.split('-').map(Number);
  const [ey,emo,ed] = en.split('-').map(Number);
  const jdStart = toJD(sy,smo,sd,12);
  const jdEnd = toJD(ey,emo,ed,12);
  if(jdEnd<jdStart){ setTransitStatus('Data final deve ser igual ou depois da inicial.', true); return false; }

  const days=[];
  for(let jd=jdStart; jd<=jdEnd; jd+=step) days.push(jd);

  const dayPositions = days.map(jd=>{
    const T=(jd-2451545.0)/36525;
    return computeDayPositions(T);
  });

  const natalPts = natalPointList();
  const events = {}; // key -> current open window

  function jdToDateLabel(jd){
    // convert JD (approx noon) back to calendar date
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

  const finishedEvents = [];

  TRANSIT_BODIES.forEach(tname=>{
    collectNatalAspectEvents(tname, natalPts, natalChart, natalLon, days, dayPositions, jdToDateLabel, finishedEvents);
  });

  // position rows: snapshot at range end, for a quick "onde está cada planeta agora" reference
  const lastPos = dayPositions[dayPositions.length-1];
  const prevPos = dayPositions.length>1 ? dayPositions[dayPositions.length-2] : lastPos;
  const positionRows = TRANSIT_BODIES.map(name=>{
    const lon=lastPos[name];
    let speed=lon-prevPos[name]; if(speed>180)speed-=360; if(speed<-180)speed+=360;
    return {name, lon, sIdx:signOf(lon), house: natalChart.hasHouses?houseOf(lon,natalChart.cusps):null, retro:speed<0, speed};
  });

  transitData = {mode:'range', positionRows, aspectRows:finishedEvents, rangeLabel: days.length+' dias ('+jdToDateLabel(jdStart)+' a '+jdToDateLabel(jdEnd)+')'};
  renderResults();
}

export function renderResults(){
  document.getElementById('resultsPanel').style.display='';

  // positions table
  const posTable = document.getElementById('positionsTable');
  posTable.querySelector('thead').innerHTML = '<tr><th>Planeta</th><th>Signo</th><th>Grau</th><th>Casa natal</th><th>Status</th></tr>';
  posTable.querySelector('tbody').innerHTML = transitData.positionRows.map(p=>{
    return '<tr><td><span class="glyph">'+PLANET_GLYPH[p.name]+'</span>'+PLANET_LABEL[p.name]+'</td>'
      +'<td>'+SIGN_GLYPH[p.sIdx]+' '+SIGNS[p.sIdx]+'</td>'
      +'<td>'+degMinStr(p.lon%30)+'</td>'
      +'<td>'+(p.house?('Casa '+p.house):'—')+'</td>'
      +'<td>'+(p.retro?'<span class="tag retro">Retrógrado</span>':'<span class="tag">Direto</span>')+'</td></tr>';
  }).join('');

  // populate filters
  const fPlanet=document.getElementById('fPlanet'), fSign=document.getElementById('fSign'),
        fHouse=document.getElementById('fHouse'), fAspect=document.getElementById('fAspect'),
        fNatal=document.getElementById('fNatal');
  fPlanet.innerHTML='<option value="">Todos</option>'
    +'<optgroup label="Grupos">'+Object.keys(PLANET_GROUPS).map(g=>'<option value="grupo:'+g+'">'+g+'</option>').join('')+'</optgroup>'
    +'<optgroup label="Planetas individuais">'+TRANSIT_BODIES.map(n=>'<option value="'+n+'">'+PLANET_LABEL[n]+'</option>').join('')+'</optgroup>';
  fSign.innerHTML='<option value="">Todos</option>'+SIGNS.map((s,i)=>'<option value="'+i+'">'+s+'</option>').join('');
  if(natalChart.hasHouses){
    fHouse.innerHTML='<option value="">Todas</option>'+[1,2,3,4,5,6,7,8,9,10,11,12].map(h=>'<option value="'+h+'">Casa '+h+'</option>').join('');
    fHouse.parentElement.style.display='';
  } else {
    fHouse.parentElement.style.display='none';
  }
  fAspect.innerHTML='<option value="">Todos</option>'+ASPECTS.map(a=>'<option value="'+a.name+'">'+a.name+'</option>').join('');
  const natalPts = natalPointList();
  fNatal.innerHTML='<option value="">Todos</option>'+natalPts.map(n=>'<option value="'+n+'">'+PLANET_LABEL[n]+'</option>').join('');

  [fPlanet,fSign,fHouse,fAspect,fNatal].forEach(f=>f.onchange=renderAspectsTable);
  document.getElementById('fImpact').oninput=renderAspectsTable;
  document.getElementById('fLimit').oninput=renderAspectsTable;
  renderAspectsTable();
}

export function planetMatchesFilter(transitName, fPlanet){
  if(!fPlanet) return true;
  if(fPlanet.startsWith('grupo:')){
    const group = fPlanet.slice(6);
    return (PLANET_GROUPS[group]||[]).includes(transitName);
  }
  return transitName===fPlanet;
}

export function phaseTag(r){
  if(r.touchesStart && r.touchesEnd) return '<span class="tag phase-ongoing">Em curso</span>';
  if(r.touchesStart) return '<span class="tag phase-ending">Encerrando</span>';
  if(r.touchesEnd) return '<span class="tag phase-new">Novo</span>';
  return '';
}
export function isBackground(r){
  // pano de fundo: ritmo não-rápido, e a janela do aspecto atravessa o período inteiro
  // (já vinha de antes e continua depois) — não é um evento pontual daquele intervalo.
  const sp = speedTag(r.transit, r.aspect.orb);
  return sp.cls!=='fast' && r.touchesStart && r.touchesEnd;
}
export function aspectRowHtml(r, isRange){
  const statusTags = (isRange ? '' : (r.applying? '<span class="tag applying">Aplicando</span>':'<span class="tag separating">Separando</span>')+' ')
    + (r.retro ? '<span class="tag retro">Retróg.</span>' : '');
  const sp = speedTag(r.transit, r.aspect.orb);
  const ritmoCell = '<span class="tag '+sp.cls+'" title="Duração típica desse aspecto: '+sp.approx+'">'+sp.label+'</span>';
  const periodCell = isRange
    ? (r.startLabel===r.endLabel ? r.exactLabel : r.startLabel+' → '+r.endLabel+' <span class="hint">(exato '+r.exactLabel+')</span>')+' '+phaseTag(r)
    : statusTags;
  return '<tr>'
    +'<td>'+impactBar(r.score)+' <span class="hint">'+r.score+'</span></td>'
    +'<td><span class="glyph">'+PLANET_GLYPH[r.transit]+'</span>'+PLANET_LABEL[r.transit]+' '+SIGN_GLYPH[r.sIdx]+'</td>'
    +'<td>'+r.aspect.glyph+' '+r.aspect.name+'</td>'
    +'<td><span class="glyph natal">'+PLANET_GLYPH[r.natal]+'</span>'+PLANET_LABEL[r.natal]+'</td>'
    +'<td>'+r.orb.toFixed(2)+'°</td>'
    +'<td>'+ritmoCell+'</td>'
    +'<td>'+periodCell+'</td>'
    +'<td>'+(r.house?('Casa '+r.house):'—')+'</td>'
    +'</tr>';
}

export function renderAspectsTable(){
  const fPlanet=document.getElementById('fPlanet').value;
  const fSign=document.getElementById('fSign').value;
  const fHouse=document.getElementById('fHouse').value;
  const fAspect=document.getElementById('fAspect').value;
  const fNatal=document.getElementById('fNatal').value;
  const fImpact=parseInt(document.getElementById('fImpact').value)||0;
  const showZeroed = document.getElementById('fShowZeroed').checked;

  let rows = transitData.aspectRows.filter(r=>{
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

  const limitVal = parseInt(document.getElementById('fLimit').value);
  const limit = (limitVal>0) ? limitVal : null;

  const isRange = transitData.mode==='range';
  let bgRowsAll = isRange ? rows.filter(isBackground) : [];
  let periodRowsAll = isRange ? rows.filter(r=>!isBackground(r)) : rows;
  const bgRows = limit ? bgRowsAll.slice(0,limit) : bgRowsAll;
  const periodRows = limit ? periodRowsAll.slice(0,limit) : periodRowsAll;

  const countText = isRange
    ? (periodRows.length+' de '+periodRowsAll.length+' evento(s) do período'+(bgRowsAll.length?', '+bgRows.length+' de '+bgRowsAll.length+' de pano de fundo':''))
    : (limit ? periodRows.length+' de '+periodRowsAll.length+' aspecto(s) encontrado(s)' : rows.length+' aspecto(s) encontrado(s)');
  document.getElementById('resultCount').textContent = countText;

  const bgBlock = document.getElementById('backgroundBlock');
  const bgTable = document.getElementById('backgroundTable');
  if(isRange && bgRows.length){
    bgBlock.style.display='';
    bgTable.querySelector('thead').innerHTML = '<tr><th>Impacto</th><th>Trânsito</th><th>Aspecto</th><th>Natal</th><th>Orbe</th><th>Ritmo</th><th>Período</th><th>Casa</th></tr>';
    bgTable.querySelector('tbody').innerHTML = bgRows.map(r=>aspectRowHtml(r,true)).join('');
  } else {
    bgBlock.style.display='none';
  }

  document.getElementById('periodHeading').style.display = (isRange && bgRows.length) ? '' : 'none';
  document.getElementById('periodCopyBar').style.display = periodRows.length ? '' : 'none';

  const table = document.getElementById('aspectsTable');
  table.querySelector('thead').innerHTML = '<tr><th>Impacto</th><th>Trânsito</th><th>Aspecto</th><th>Natal</th><th>Orbe</th><th>Ritmo</th><th>'+(isRange?'Período':'Status')+'</th><th>Casa</th></tr>';
  table.querySelector('tbody').innerHTML = periodRows.map(r=>aspectRowHtml(r,isRange)).join('')
    || '<tr><td colspan="8" class="empty">Nenhum aspecto com os filtros atuais.</td></tr>';
}

export function getFilteredAspectRows(){
  const fPlanet=document.getElementById('fPlanet').value;
  const fSign=document.getElementById('fSign').value;
  const fHouse=document.getElementById('fHouse').value;
  const fAspect=document.getElementById('fAspect').value;
  const fNatal=document.getElementById('fNatal').value;
  const fImpact=parseInt(document.getElementById('fImpact').value)||0;
  const showZeroed = document.getElementById('fShowZeroed').checked;
  let rows = transitData.aspectRows.filter(r=>{
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

  const isRange = transitData.mode==='range';
  const limitVal = parseInt(document.getElementById('fLimit').value);
  const limit = (limitVal>0) ? limitVal : null;
  let bgRowsAll = isRange ? rows.filter(isBackground) : [];
  let periodRowsAll = isRange ? rows.filter(r=>!isBackground(r)) : rows;
  const bgRows = limit ? bgRowsAll.slice(0,limit) : bgRowsAll;
  const periodRows = limit ? periodRowsAll.slice(0,limit) : periodRowsAll;
  return {isRange, bgRows, bgRowsAll, periodRows, periodRowsAll};
}

export function rowToPlainObject(r, isRange){
  const base = {
    transito: PLANET_LABEL[r.transit],
    signo: SIGNS[r.sIdx],
    aspecto: r.aspect.name,
    natal: PLANET_LABEL[r.natal],
    orbe_graus: Number(r.orb.toFixed(2)),
    casa: r.house || null,
    retrogrado: !!r.retro,
    impacto: r.score,
    ritmo: speedTag(r.transit, r.aspect.orb).label
  };
  if(isRange){
    base.inicio = r.startLabel; base.exato = r.exactLabel; base.fim = r.endLabel;
    base.em_curso = !!(r.touchesStart && r.touchesEnd);
    base.encerrando = !!(r.touchesStart && !r.touchesEnd);
    base.novo = !!(r.touchesEnd && !r.touchesStart);
  } else {
    base.status = r.applying ? 'aplicando' : 'separando';
  }
  return base;
}

export function exportResultsJson(){
  if(!transitData){ return; }
  const sel = getFilteredAspectRows();
  const data = {
    gerado_em: new Date().toISOString(),
    mapa_natal: natalPointList().map(name=>{
      const lon = natalLon(name);
      const house = natalChart.hasHouses ? houseOf(lon,natalChart.cusps) : null;
      return { ponto: PLANET_LABEL[name], signo: SIGNS[signOf(lon)], grau: degMinStr(lon%30), casa: house };
    }),
    posicoes_em_transito: transitData.positionRows.map(p=>({
      planeta: PLANET_LABEL[p.name], signo: SIGNS[p.sIdx], grau: degMinStr(p.lon%30),
      casa_natal: p.house || null, retrogrado: !!p.retro
    })),
    pano_de_fundo: sel.isRange ? sel.bgRows.map(r=>rowToPlainObject(r,true)) : [],
    eventos: sel.periodRows.map(r=>rowToPlainObject(r, sel.isRange))
  };
  downloadBlob(JSON.stringify(data, null, 2), 'transitos-resultado.json', 'application/json');
}

export function exportResultsCsv(){
  if(!transitData){ return; }
  const sel = getFilteredAspectRows();
  const header = ['Seção','Impacto','Trânsito','Signo','Aspecto','Natal','Orbe(°)','Casa','Ritmo','Retrógrado','Status/Período'];
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
  downloadBlob('\uFEFF'+lines.join('\n'), 'transitos-resultado.csv', 'text/csv;charset=utf-8');
}

export function copyForAI(scope, btn){
  scope = scope || 'all';

  function aspectLineText(r, idx, isRange){
    let line = (idx+1)+". Trânsito de "+PLANET_LABEL[r.transit]+" em "+SIGNS[r.sIdx]+(r.house?(" (Casa "+r.house+")"):"")+" forma "+r.aspect.name.toLowerCase()+" (orbe "+r.orb.toFixed(2)+"°) com "+PLANET_LABEL[r.natal]+" natal";
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

  let text = "MAPA NATAL\n";
  natalPointList().forEach(name=>{
    const lon = natalLon(name);
    const house = natalChart.hasHouses ? houseOf(lon,natalChart.cusps) : null;
    text += "- "+PLANET_LABEL[name]+": "+SIGNS[signOf(lon)]+" "+degMinStr(lon%30)+(house?(", Casa "+house):"")+"\n";
  });

  text += "\nPOSIÇÕES EM TRÂNSITO\n";
  transitData.positionRows.forEach(p=>{
    text += "- "+PLANET_LABEL[p.name]+": "+SIGNS[p.sIdx]+" "+degMinStr(p.lon%30)+(p.house?(", Casa natal "+p.house):"")+(p.retro?" (retrógrado)":"")+"\n";
  });

  const sel = getFilteredAspectRows();
  const isRange = sel.isRange, bgRows = sel.bgRows, bgRowsAll = sel.bgRowsAll, periodRows = sel.periodRows, periodRowsAll = sel.periodRowsAll;

  const includeBg = isRange && bgRowsAll.length && (scope==='all' || scope==='background');
  const includePeriod = (scope==='all' || scope==='period');

  if(isRange && bgRowsAll.length){
    if(includeBg){
      text += "\nPANO DE FUNDO ("+bgRows.length+" de "+bgRowsAll.length+" — trânsitos lentos já em curso, que atravessam todo o período "+transitData.rangeLabel+"; considere-os o tema estrutural dessa fase, não eventos pontuais dela)\n";
      bgRows.forEach((r,idx)=>{ text += aspectLineText(r,idx,true)+"\n"; });
    }
    if(includePeriod){
      text += "\nEVENTOS DO PERÍODO ("+periodRows.length+" de "+periodRowsAll.length+" — ordenados por impacto, específicos de "+transitData.rangeLabel+")\n";
      periodRows.forEach((r,idx)=>{ text += aspectLineText(r,idx,true)+"\n"; });
    }
  } else {
    text += "\nASPECTOS (ordenados por impacto, "+periodRows.length+" de "+periodRowsAll.length+(isRange?(", "+transitData.rangeLabel):"")+")\n";
    periodRows.forEach((r,idx)=>{ text += aspectLineText(r,idx,isRange)+"\n"; });
  }

  if(scope==='background'){
    text += "\nPor favor, interprete este pano de fundo considerando meu mapa natal: são trânsitos lentos que atravessam toda a fase atual, o tema estrutural desse momento — não eventos pontuais.";
  } else if(scope==='period'){
    text += "\nPor favor, interprete estes eventos do período considerando meu mapa natal, ordenados por impacto. São específicos da janela "+(transitData.rangeLabel||"calculada")+", não o pano de fundo estrutural.";
  } else {
    text += "\nPor favor, interprete esses trânsitos considerando meu mapa natal. Trate os itens de PANO DE FUNDO (se houver) como o tema estrutural da fase, e os EVENTOS DO PERÍODO como o que é específico desse momento — priorizando estes últimos por impacto.";
  }

  const box = document.getElementById('copyBox');
  box.textContent = text;
  box.style.display='block';
  const ta = document.getElementById('copyArea');
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

