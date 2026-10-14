// ============================================================================
// core/predominance.js
// Fase 2 (parte 3): as duas tabelas de Predominância por pontos do seu docx
// de referência — Elementos e Temperamentos — que precisam de pesos por
// ponto, diferente da "Signos predominantes" da Fase 1 (contagem simples,
// sem peso, ver structural.js/computeSignDominance — mantido como está,
// não mexi nele).
//
// IMPORTANTE — convenções reconstruídas a partir do seu docx preenchido
// (Leitura_Geral.docx), reconferindo a matemática ponto a ponto até bater
// exatamente com os totais mostrados na coluna "Predominância" dele. Confira
// contra sua fonte original, principalmente os itens 3 e 4 abaixo:
// 1) Predominância de Elementos: 12 pontos com peso — Sol/Lua/Ascendente
//    (3 pts cada), Mercúrio/Vênus/Marte/Júpiter/Saturno (2 pts cada),
//    Urano/Netuno/Plutão/MC (1 pt cada) — elemento = elemento do SIGNO que
//    o ponto ocupa. Exige Ascendente/MC calculados (hasHouses); sem eles,
//    os 2 pontos angulares ficam de fora da soma (sinalizado no retorno).
// 2) Predominância de Temperamentos: 7 fatores com peso — AC (2 pts) e Lua
//    (2 pts) pelo ELEMENTO DO SIGNO que ocupam; Regente do AC, Almuten
//    Ascendentis e Dispositor da Lua (1 pt cada) também pelo ELEMENTO DO
//    SIGNO em que ESSE PLANETA está (não pela natureza fixa do planeta) —
//    confirmado batendo a mão com o exemplo do docx: o Almuten dela era
//    Vênus, marcado como "Sanguíneo" (Ar), e a tabela de Elementos mostra
//    Vênus mesmo num signo de Ar — só bate se o critério for o signo em
//    que o planeta está, não a natureza fixa do planeta (Vênus por
//    natureza fixa seria Fleumático). Mapeamento elemento→temperamento:
//    Fogo=Colérico, Terra=Melancólico, Ar=Sanguíneo, Água=Fleumático.
// 3) Fase lunar (1 pt): quarto da fase (Nova→Cresc., Cresc.→Cheia,
//    Cheia→Ming., Ming.→Nova) mapeado Sanguíneo/Colérico/Melancólico/
//    Fleumático respectivamente (analogia clássica fases-da-lua↔humores) —
//    reconstruído por analogia, é o item MENOS confirmado de todos; vale
//    conferir com cuidado.
// 4) Estação (1 pt): quarto tropical em que o Sol está (Áries-Touro-
//    Gêmeos=Primavera boreal, Câncer-Leão-Virgem=Verão boreal, etc.),
//    mapeado Primavera=Sanguíneo(Ar) Verão=Colérico(Fogo)
//    Outono=Melancólico(Terra) Inverno=Fleumático(Água) — mapeamento
//    clássico. Como você está no Hemisfério Sul, a ESTAÇÃO REAL é invertida
//    em relação ao rótulo tropical-boreal; a função abaixo recebe um
//    parâmetro `southernHemisphere` (default true, pelo seu perfil) que já
//    faz essa inversão — confira se é isso que sua referência espera.
// ============================================================================

import { normDeg } from './time.js';
import { signOf } from './houses.js';
import { angleLon } from './aspects.js';
import { ELEMENT_LABEL } from './structural.js';
import { DOMICILE_RULER } from './dignities.js';

const ELEMENT_BY_SIGN = ["fogo","terra","ar","agua","fogo","terra","ar","agua","fogo","terra","ar","agua"];
export const TEMPERAMENT_BY_ELEMENT = {fogo:'colerico', terra:'melancolico', ar:'sanguineo', agua:'fleumatico'};
export const TEMPERAMENT_LABEL = {colerico:'Colérico', sanguineo:'Sanguíneo', fleumatico:'Fleumático', melancolico:'Melancólico'};

// ---------------------------------------------------------------------------
// Predominância de Elementos
// ---------------------------------------------------------------------------
const ELEMENT_POINTS = [
  {name:'Sol', w:3}, {name:'Lua', w:3}, {name:'Asc', w:3},
  {name:'Mercurio', w:2}, {name:'Venus', w:2}, {name:'Marte', w:2}, {name:'Jupiter', w:2}, {name:'Saturno', w:2},
  {name:'Urano', w:1}, {name:'Netuno', w:1}, {name:'Plutao', w:1}, {name:'MC', w:1},
];
export function computeElementPredominance(natalChart){
  const counts = {fogo:0, terra:0, ar:0, agua:0};
  const rows = [];
  ELEMENT_POINTS.forEach(({name,w})=>{
    const isAngle = name==='Asc' || name==='MC';
    if(isAngle && !natalChart.hasHouses){ rows.push({name, w, skipped:true}); return; }
    const lon = isAngle ? angleLon(natalChart, name) : natalChart.positions[name];
    if(lon===undefined || lon===null){ rows.push({name, w, skipped:true}); return; }
    const el = ELEMENT_BY_SIGN[signOf(lon)];
    counts[el] += w;
    rows.push({name, w, element:el});
  });
  const max = Math.max(...Object.values(counts));
  const predominant = Object.keys(counts).filter(k=>counts[k]===max && max>0);
  return {counts, predominant, rows, hasHouses: natalChart.hasHouses};
}

// ---------------------------------------------------------------------------
// Dispositor da Lua: regente (domicílio) do signo em que a Lua está.
// ---------------------------------------------------------------------------
export function moonDispositor(natalChart){
  const lon = natalChart.positions.Lua;
  if(lon===undefined) return null;
  return DOMICILE_RULER[signOf(lon)];
}

// Fase lunar por quarto — 0..90°=Nova→Crescente, 90..180°=Crescente→Cheia,
// 180..270°=Cheia→Minguante, 270..360°=Minguante→Nova (elongação Lua-Sol).
export function lunarPhaseQuarter(natalChart){
  const sol = natalChart.positions.Sol, lua = natalChart.positions.Lua;
  if(sol===undefined || lua===undefined) return null;
  const elong = normDeg(lua - sol);
  if(elong < 90) return {quarter:1, label:'Nova → Crescente', temperament:'sanguineo'};
  if(elong < 180) return {quarter:2, label:'Crescente → Cheia', temperament:'colerico'};
  if(elong < 270) return {quarter:3, label:'Cheia → Minguante', temperament:'melancolico'};
  return {quarter:4, label:'Minguante → Nova', temperament:'fleumatico'};
}

// Estação (quarto tropical do Sol), com inversão pro Hemisfério Sul por
// padrão — ver nota no cabeçalho do arquivo.
const TROPICAL_SEASON_BY_SIGN_GROUP = ['primavera','verao','outono','inverno']; // grupo de signo: Ar-Tou-Gem=0 ... Cap-Aqu-Pei=3
const SEASON_TEMPERAMENT = {primavera:'sanguineo', verao:'colerico', outono:'melancolico', inverno:'fleumatico'};
const SEASON_LABEL = {primavera:'Primavera', verao:'Verão', outono:'Outono', inverno:'Inverno'};
const SEASON_OPPOSITE = {primavera:'outono', verao:'inverno', outono:'primavera', inverno:'verao'};
export function computeSeason(natalChart, southernHemisphere=true){
  const lon = natalChart.positions.Sol;
  if(lon===undefined) return null;
  const group = Math.floor(signOf(lon)/3);
  const tropical = TROPICAL_SEASON_BY_SIGN_GROUP[group];
  const real = southernHemisphere ? SEASON_OPPOSITE[tropical] : tropical;
  return {tropical, real, label: SEASON_LABEL[real], temperament: SEASON_TEMPERAMENT[real]};
}

// ---------------------------------------------------------------------------
// Predominância de Temperamentos — junta os 7 fatores com peso. `almutenPlanet`
// vem de dignities.js/computeAlmutenAscendentis (só o vencedor; em empate,
// usa o primeiro e sinaliza `almutenTied`).
// ---------------------------------------------------------------------------
export function computeTemperamentPredominance(natalChart, almutenPlanet, southernHemisphere=true){
  const counts = {colerico:0, sanguineo:0, fleumatico:0, melancolico:0};
  const rows = [];
  const push = (label, w, temperament, detail)=>{
    if(!temperament){ rows.push({label, w, skipped:true}); return; }
    counts[temperament]+=w;
    rows.push({label, w, temperament, detail});
  };

  if(natalChart.hasHouses){
    const ascEl = ELEMENT_BY_SIGN[signOf(natalChart.asc)];
    push('AC', 2, TEMPERAMENT_BY_ELEMENT[ascEl], ELEMENT_LABEL[ascEl]);
    const regAC = DOMICILE_RULER[signOf(natalChart.asc)];
    const regLon = natalChart.positions[regAC];
    if(regLon!==undefined){
      const regEl = ELEMENT_BY_SIGN[signOf(regLon)];
      push('Regente do AC', 1, TEMPERAMENT_BY_ELEMENT[regEl], `${regAC} em ${ELEMENT_LABEL[regEl]}`);
    } else push('Regente do AC', 1, null);
  } else {
    push('AC', 2, null); push('Regente do AC', 1, null);
  }

  const luaLon = natalChart.positions.Lua;
  if(luaLon!==undefined){
    const luaEl = ELEMENT_BY_SIGN[signOf(luaLon)];
    push('Lua', 2, TEMPERAMENT_BY_ELEMENT[luaEl], ELEMENT_LABEL[luaEl]);
  } else push('Lua', 2, null);

  if(almutenPlanet){
    const almLon = natalChart.positions[almutenPlanet];
    if(almLon!==undefined){
      const almEl = ELEMENT_BY_SIGN[signOf(almLon)];
      push('Almuten Ascendentis', 1, TEMPERAMENT_BY_ELEMENT[almEl], `${almutenPlanet} em ${ELEMENT_LABEL[almEl]}`);
    } else push('Almuten Ascendentis', 1, null);
  } else push('Almuten Ascendentis', 1, null);

  const phase = lunarPhaseQuarter(natalChart);
  push('Fase lunar', 1, phase?.temperament, phase?.label);

  const dispPlanet = moonDispositor(natalChart);
  if(dispPlanet){
    const dispLon = natalChart.positions[dispPlanet];
    const dispEl = dispLon!==undefined ? ELEMENT_BY_SIGN[signOf(dispLon)] : null;
    push('Dispositor lunar', 1, dispEl?TEMPERAMENT_BY_ELEMENT[dispEl]:null, dispEl?`${dispPlanet} em ${ELEMENT_LABEL[dispEl]}`:null);
  } else push('Dispositor lunar', 1, null);

  const season = computeSeason(natalChart, southernHemisphere);
  push('Estação', 1, season?.temperament, season?.label);

  const max = Math.max(...Object.values(counts));
  const predominant = Object.keys(counts).filter(k=>counts[k]===max && max>0);
  return {counts, predominant, rows};
}
