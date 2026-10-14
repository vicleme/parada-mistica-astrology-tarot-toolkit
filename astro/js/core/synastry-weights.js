// ============================================================================
// core/synastry-weights.js
// Coluna de "impacto" da aba Sinastria (Mapas). Os pesos em si (peso por par de pontos,
// decaimento de orbe, categoria do aspecto, desconto geracional e reciprocidade) moram
// em core/weights.js, a MESMA fonte usada pela Calculadora de Sinastria: aqui só se
// converte nomes (português -> inglês) e se normaliza o peso pra uma escala 0-100.
// Trânsitos, Trânsitos duplos e Composto usam impactScore (core/aspects.js).
// ============================================================================

import { ASPECTS } from './aspects.js';
import { ASPECT_EN } from './constants.js';
import { MAX_ASPECT_WEIGHT, MINOR_ASPECTS, aspectWeight } from './weights.js';

// Nomes deste app (PT) -> nomes em inglês usados em weights.js.
export const PT_TO_EN_POINT = {
  Sol:'Sun', Lua:'Moon', Mercurio:'Mercury', Venus:'Venus', Marte:'Mars',
  Jupiter:'Jupiter', Saturno:'Saturn', Urano:'Uranus', Netuno:'Neptune', Plutao:'Pluto',
  Quiron:'Chiron', NodoNorte:'Node', Lilith:'Lilith',
  Asc:'Ascendant', MC:'MC', DSC:'DSC', IC:'IC', Fortuna:'Fortune', Espirito:'Spirit', Vertice:'Vertex'
};
export const toEnPoint = name => PT_TO_EN_POINT[name] || name;
export const aspectEnName = aspect => ASPECT_EN[aspect.name] || aspect.name;

// Peso bruto (sem normalizar) de um aspecto entre os pontos nameA (pessoa A) e nameB
// (pessoa B). pairCount = quantos aspectos existem entre o mesmo par de pontos nos dois
// sentidos (reciprocidade, ver weights.js); 1 quando não há.
export function rawWeightSynastry(aspect, orb, nameA, nameB, pairCount = 1){
  return aspectWeight(aspectEnName(aspect), toEnPoint(nameA), toEnPoint(nameB), orb, pairCount);
}

// Impacto 0-100: o peso bruto dividido pelo teto teórico (orbe exato x maior tier x
// aspecto maior x reciprocidade, ver MAX_ASPECT_WEIGHT).
export function impactScoreSynastry(aspect, orb, nameA, nameB, pairCount = 1){
  return Math.round(rawWeightSynastry(aspect, orb, nameA, nameB, pairCount) / MAX_ASPECT_WEIGHT * 100);
}

// Agrupamento "Aspectos maiores"/"Aspectos menores" pro select de filtro da Sinastria.
// Reaproveita MINOR_ASPECTS de weights.js pra peso e filtro nunca ficarem dessincronizados.
export const ASPECT_GROUPS_SYN = {
  "Aspectos maiores": ASPECTS.map(a=>a.name).filter(n => !MINOR_ASPECTS.has(ASPECT_EN[n]||n)),
  "Aspectos menores": ASPECTS.map(a=>a.name).filter(n => MINOR_ASPECTS.has(ASPECT_EN[n]||n)),
};
export function aspectMatchesFilterSyn(aspectName, fAspect){
  if(!fAspect) return true;
  if(fAspect.startsWith('grupo:')){
    const group = fAspect.slice(6);
    return (ASPECT_GROUPS_SYN[group]||[]).includes(aspectName);
  }
  return aspectName===fAspect;
}
