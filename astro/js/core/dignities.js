// ============================================================================
// core/dignities.js
// Fase 2 (parte 1): dignidades essenciais clássicas — Domicílio, Exaltação,
// Triplicidade, Termo (Egípcio) e Face (decanato), com Queda e Detrimento
// como debilidades. Usa só os 7 planetas clássicos (Sol..Saturno) — é a base
// tanto do texto "Dignidades/debilidades mais relevantes" (dignidade do
// próprio planeta na própria posição) quanto do Almuten Ascendentis (mesma
// pontuação aplicada ao grau exato do Ascendente).
//
// IMPORTANTE — convenções adotadas (confira contra sua referência, mesmo
// espírito das notas em structural.js):
// 1) Domicílio/Exaltação/Queda/Detrimento/Termo (Egípcio)/Face (decanato):
//    tabelas clássicas padrão (Valens/Lilly), sem ambiguidade relevante de
//    escola — as variações entre fontes pra Termo Egípcio são mínimas
//    (poucos graus de diferença em pouquíssimos signos); usei a versão mais
//    citada.
// 2) Triplicidade: sistema Dorotheus/Ptolomeu (dia/noite/participante).
//    Pra pontuação (Almuten e dignidade própria) uso só o regente do
//    período certo (dia OU noite, conforme a Seita do mapa) — NÃO o
//    participante — que é o uso padrão em cálculo de Almuten.
// 3) Pontuação: Domicílio=5, Exaltação=4, Triplicidade=3, Termo=2, Face=1 —
//    bate exatamente com a tabela "Almuten ascendentis" do seu docx de
//    referência.
// ============================================================================

import { normDeg } from './time.js';
import { signOf } from './houses.js';
import { fortunaLon } from './aspects.js';
import { computePrenatalSyzygy } from './ephemeris.js';

export const CLASSICAL_PLANETS = ["Sol","Lua","Mercurio","Venus","Marte","Jupiter","Saturno"];

// Índice de signo: 0=Áries ... 11=Peixes (mesma convenção de signOf/SIGNS).
export const DOMICILE_RULER = ["Marte","Venus","Mercurio","Lua","Sol","Mercurio","Venus","Marte","Jupiter","Saturno","Saturno","Jupiter"];
export const DETRIMENT_RULER = DOMICILE_RULER.map((_,i)=>DOMICILE_RULER[(i+6)%12]);

// Exaltação: {signo: {planet, degree}}. Mercúrio é domicílio E exaltação em
// Virgem — coincidência real da tradição, não erro.
export const EXALTATION = {
  0:{planet:'Sol', degree:19},      // Áries
  1:{planet:'Lua', degree:3},       // Touro
  3:{planet:'Jupiter', degree:15},  // Câncer
  5:{planet:'Mercurio', degree:15}, // Virgem
  6:{planet:'Saturno', degree:21},  // Libra
  9:{planet:'Marte', degree:28},    // Capricórnio
  11:{planet:'Venus', degree:27},   // Peixes
};
// Queda: signo oposto ao de exaltação, mesmo grau.
export const FALL = {};
Object.entries(EXALTATION).forEach(([sign,e])=>{
  FALL[(Number(sign)+6)%12] = {planet:e.planet, degree:e.degree};
});

// Triplicidade (Dorotheus/Ptolomeu) por elemento — dia/noite/participante.
// Índice de grupo: 0=Fogo(0,4,8) 1=Terra(1,5,9) 2=Ar(2,6,10) 3=Água(3,7,11)
const TRIPLICITY_BY_ELEMENT = [
  {day:'Sol', night:'Jupiter', participating:'Saturno'},   // Fogo
  {day:'Venus', night:'Lua', participating:'Marte'},        // Terra
  {day:'Saturno', night:'Mercurio', participating:'Jupiter'}, // Ar
  {day:'Venus', night:'Marte', participating:'Venus'},      // Água
];
export function triplicityRulers(signIdx){ return TRIPLICITY_BY_ELEMENT[signIdx%4]; }
export function triplicityRulerFor(signIdx, isDay){
  const t = triplicityRulers(signIdx);
  return isDay ? t.day : t.night;
}

// Termo Egípcio — 5 faixas por signo, cada uma {planet, to} (limite superior
// em grau dentro do signo; a faixa anterior começa onde a de cima terminou).
export const TERMS = [
  [{planet:'Jupiter',to:6},{planet:'Venus',to:12},{planet:'Mercurio',to:20},{planet:'Marte',to:25},{planet:'Saturno',to:30}], // Áries
  [{planet:'Venus',to:8},{planet:'Mercurio',to:14},{planet:'Jupiter',to:22},{planet:'Saturno',to:27},{planet:'Marte',to:30}], // Touro
  [{planet:'Mercurio',to:6},{planet:'Jupiter',to:12},{planet:'Venus',to:17},{planet:'Marte',to:24},{planet:'Saturno',to:30}], // Gêmeos
  [{planet:'Marte',to:7},{planet:'Venus',to:13},{planet:'Mercurio',to:19},{planet:'Jupiter',to:26},{planet:'Saturno',to:30}], // Câncer
  [{planet:'Jupiter',to:6},{planet:'Venus',to:11},{planet:'Saturno',to:18},{planet:'Mercurio',to:24},{planet:'Marte',to:30}], // Leão
  [{planet:'Mercurio',to:7},{planet:'Venus',to:13},{planet:'Jupiter',to:18},{planet:'Saturno',to:24},{planet:'Marte',to:30}], // Virgem
  [{planet:'Saturno',to:6},{planet:'Mercurio',to:14},{planet:'Jupiter',to:21},{planet:'Venus',to:28},{planet:'Marte',to:30}], // Libra
  [{planet:'Marte',to:7},{planet:'Venus',to:11},{planet:'Mercurio',to:19},{planet:'Jupiter',to:24},{planet:'Saturno',to:30}], // Escorpião
  [{planet:'Jupiter',to:12},{planet:'Venus',to:17},{planet:'Mercurio',to:21},{planet:'Saturno',to:26},{planet:'Marte',to:30}], // Sagitário
  [{planet:'Mercurio',to:7},{planet:'Jupiter',to:14},{planet:'Venus',to:22},{planet:'Saturno',to:26},{planet:'Marte',to:30}], // Capricórnio
  [{planet:'Mercurio',to:7},{planet:'Venus',to:13},{planet:'Jupiter',to:20},{planet:'Marte',to:25},{planet:'Saturno',to:30}], // Aquário
  [{planet:'Venus',to:12},{planet:'Jupiter',to:16},{planet:'Mercurio',to:19},{planet:'Marte',to:28},{planet:'Saturno',to:30}], // Peixes
];
export function termRulerAt(signIdx, degInSign){
  const faixas = TERMS[signIdx];
  for(const f of faixas){ if(degInSign < f.to) return f.planet; }
  return faixas[faixas.length-1].planet;
}

// Face (decanato) — ciclo caldeu contínuo (Saturno→Júpiter→Marte→Sol→Vênus→
// Mercúrio→Lua, repete), começando em Áries 0° com Marte.
export const FACES = [
  ['Marte','Sol','Venus'],       // Áries
  ['Mercurio','Lua','Saturno'],  // Touro
  ['Jupiter','Marte','Sol'],     // Gêmeos
  ['Venus','Mercurio','Lua'],    // Câncer
  ['Saturno','Jupiter','Marte'], // Leão
  ['Sol','Venus','Mercurio'],    // Virgem
  ['Lua','Saturno','Jupiter'],   // Libra
  ['Marte','Sol','Venus'],       // Escorpião
  ['Mercurio','Lua','Saturno'],  // Sagitário
  ['Jupiter','Marte','Sol'],     // Capricórnio
  ['Venus','Mercurio','Lua'],    // Aquário
  ['Saturno','Jupiter','Marte'], // Peixes
];
export function faceRulerAt(signIdx, degInSign){
  return FACES[signIdx][Math.min(2, Math.floor(degInSign/10))];
}

export const DIGNITY_SCORE = {domicilio:5, exaltacao:4, triplicidade:3, termo:2, face:1};
export const DIGNITY_LABEL = {domicilio:'Domicílio', exaltacao:'Exaltação', triplicidade:'Triplicidade', termo:'Termo', face:'Face'};

// Pontuação de UM planeta clássico num grau qualquer (usado tanto pra "esse
// planeta está bem colocado na própria posição?" quanto, aplicado ao grau do
// Ascendente pra cada um dos 7, pro Almuten Ascendentis).
export function dignityPointsFor(planet, lonDeg, isDay){
  const sign = signOf(lonDeg);
  const degInSign = normDeg(lonDeg) % 30;
  const parts = [];
  if(DOMICILE_RULER[sign]===planet) parts.push({type:'domicilio', pts:5});
  const ex = EXALTATION[sign];
  if(ex && ex.planet===planet) parts.push({type:'exaltacao', pts:4});
  if(triplicityRulerFor(sign, isDay)===planet) parts.push({type:'triplicidade', pts:3});
  if(termRulerAt(sign, degInSign)===planet) parts.push({type:'termo', pts:2});
  if(faceRulerAt(sign, degInSign)===planet) parts.push({type:'face', pts:1});
  const score = parts.reduce((s,p)=>s+p.pts,0);
  return {score, parts};
}

// Debilidades (Queda/Detrimento) do próprio planeta na própria posição —
// info separada da pontuação de dignidade (não entra no Almuten).
export function debilitiesFor(planet, lonDeg){
  const sign = signOf(lonDeg);
  const debs = [];
  if(DETRIMENT_RULER[sign]===planet) debs.push('detrimento');
  const f = FALL[sign];
  if(f && f.planet===planet) debs.push('queda');
  return debs;
}

// Combustão: planeta (que não o Sol) a menos de 8°30' do Sol em longitude —
// enfraquecido/"queimado" pela proximidade; dentro de 17' é Cazimi (no
// coração do Sol), tradicionalmente tratado como fortalecimento, não
// enfraquecimento — sinalizado à parte.
export function combustionCheck(planet, positions){
  if(planet==='Sol') return null;
  const lonP = positions[planet], lonS = positions.Sol;
  if(lonP===undefined || lonS===undefined) return null;
  let diff = Math.abs(normDeg(lonP-lonS));
  if(diff>180) diff = 360-diff;
  if(diff <= 17/60) return 'cazimi';
  if(diff <= 8.5) return 'combusto';
  return null;
}

// Sob os raios (under the beams): planeta (que não o Sol) fora da faixa de
// combustão (8°30') mas ainda dentro de ~17° do Sol — orbe mais largo, sinal
// de ofuscamento mais brando que a combustão (o planeta ainda está perto
// demais da luz solar pra agir com autonomia plena, mas não "queimado").
// 17° é o teto mais citado (Lilly); mutuamente exclusivo com
// combustionCheck por construção (a faixa de combustão fica de fora do
// intervalo checado aqui) — sempre checar combustão primeiro, sob os raios
// só se aplica quando combustão retorna null.
export function underBeamsCheck(planet, positions){
  if(planet==='Sol') return false;
  const lonP = positions[planet], lonS = positions.Sol;
  if(lonP===undefined || lonS===undefined) return false;
  let diff = Math.abs(normDeg(lonP-lonS));
  if(diff>180) diff = 360-diff;
  return diff > 8.5 && diff <= 17;
}

// ---------------------------------------------------------------------------
// Relatório de dignidades/debilidades mais relevantes — varre os 7 clássicos
// na própria posição natal e lista o que se destaca (qualquer dignidade
// pontuada, qualquer debilidade, e combustão/cazimi). Pensado pra alimentar
// o bloco de texto livre "Dignidades/debilidades mais relevantes" do seu
// docx de referência.
// ---------------------------------------------------------------------------
export function planetDignityReport(natalChart, isDay){
  return CLASSICAL_PLANETS.map(name=>{
    const lon = natalChart.positions[name];
    if(lon===undefined || lon===null) return null;
    const {score, parts} = dignityPointsFor(name, lon, isDay);
    const debs = debilitiesFor(name, lon);
    const combustion = combustionCheck(name, natalChart.positions);
    return {planet:name, lon, score, parts, debilities:debs, combustion};
  }).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Almuten de um grau qualquer — versão genérica: aplica dignityPointsFor aos
// 7 clássicos num grau qualquer e devolve quem soma mais pontos. Base tanto
// do Almuten Ascendentis (grau do Asc) quanto, desde a REVISÃO 12 do Perfil
// (profile.js), da regência de casa em geral e do dispositor da Fortuna/
// Espírito (REVISÃO 13, mesmo cálculo) —
// que até então usavam só o regente por domicílio (DOMICILE_RULER), ignorando
// que outro planeta pode ter mais dignidade combinada (Exaltação+Triplicidade
// etc.) naquele grau exato mesmo sem ser o dono do domicílio. Empate = lista
// com mais de um nome, mesmo espírito de computeSignDominance/
// computeAlmutenAscendentis — não força desempate que a doutrina não define.
// ---------------------------------------------------------------------------
export function computeAlmutenOf(lonDeg, isDay){
  const perPlanet = CLASSICAL_PLANETS.map(name=>({
    planet:name, ...dignityPointsFor(name, lonDeg, isDay)
  }));
  const max = Math.max(...perPlanet.map(p=>p.score));
  const winners = max>0 ? perPlanet.filter(p=>p.score===max).map(p=>p.planet) : [];
  return {perPlanet, winners, max};
}

// ---------------------------------------------------------------------------
// Almuten Ascendentis — aplica computeAlmutenOf ao grau exato do Ascendente.
// ---------------------------------------------------------------------------
export function computeAlmutenAscendentis(natalChart, isDay){
  if(!natalChart.hasHouses) return null;
  return computeAlmutenOf(natalChart.asc, isDay);
}

// ---------------------------------------------------------------------------
// Almuten Figuris ("Senhor da Geniture") — Ibn Ezra, depois citado por Lilly:
// soma dignityPointsFor dos 7 clássicos nos 5 "lugares da vida" (Sol, Lua,
// Ascendente, Parte da Fortuna e Sizígia Pré-Natal), em vez de um grau só
// como no Almuten Ascendentis. Quem soma mais pontos no total dos 5 pontos é
// o Almuten Figuris — mesmo espírito de empate sem desempate forçado.
// Exige Ascendente exato (hasHouses) igual ao Ascendentis, mais T (tempo
// juliano do nascimento) pra buscar a Sizígia Pré-Natal; sem T, os outros 4
// pontos ainda entram (SAN só fica de fora, sinalizado em `syzygy: null`).
// ---------------------------------------------------------------------------
export function computeAlmutenFiguris(natalChart, isDay){
  if(!natalChart.hasHouses || natalChart.asc==null) return null;
  const syzygy = computePrenatalSyzygy(natalChart.T);
  const points = [
    {name:'Sol', label:'Sol', lon: natalChart.positions.Sol},
    {name:'Lua', label:'Lua', lon: natalChart.positions.Lua},
    {name:'Asc', label:'Ascendente', lon: natalChart.asc},
    {name:'Fortuna', label:'Parte da Fortuna', lon: fortunaLon(natalChart)},
  ];
  if(syzygy) points.push({name:'SAN', label: syzygy.isNewMoon ? 'Sizígia Pré-Natal (Lua Nova)' : 'Sizígia Pré-Natal (Lua Cheia)', lon: syzygy.lon});

  const perPlanet = CLASSICAL_PLANETS.map(planet=>{
    const byPoint = points.map(pt=>({point: pt.name, ...dignityPointsFor(planet, pt.lon, isDay)}));
    const score = byPoint.reduce((s,p)=>s+p.score,0);
    return {planet, score, byPoint};
  });
  const max = Math.max(...perPlanet.map(p=>p.score));
  const winners = max>0 ? perPlanet.filter(p=>p.score===max).map(p=>p.planet) : [];
  return {perPlanet, winners, max, points, syzygy};
}
