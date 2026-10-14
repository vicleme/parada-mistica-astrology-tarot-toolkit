// ============================================================================
// core/constants.js
// Tabelas estáticas: nomes/glifos de signos e planetas (PT e EN — o EN só é
// usado pela exportação "Copiar para Calculadora de Sinastria", ver
// features/synastry.js/copyForSinastriaCalc), agrupamentos de planetas por
// categoria, e a estimativa de velocidade/duração típica de um aspecto.
// ============================================================================

export const SIGNS = ["Áries","Touro","Gêmeos","Câncer","Leão","Virgem","Libra","Escorpião","Sagitário","Capricórnio","Aquário","Peixes"];
export const SIGN_GLYPH = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
export const PLANET_GLYPH = {Sol:"☉",Lua:"☽",Mercurio:"☿",Venus:"♀",Marte:"♂",Jupiter:"♃",Saturno:"♄",Urano:"♅",Netuno:"♆",Plutao:"♇",Quiron:"⚷",NodoNorte:"☊",Lilith:"⚸",Asc:"Asc",MC:"MC",DSC:"Dsc",IC:"IC",Fortuna:"⊗",Espirito:"⊕",Vertice:"Vx"};
export const PLANET_LABEL = {Sol:"Sol",Lua:"Lua",Mercurio:"Mercúrio",Venus:"Vênus",Marte:"Marte",Jupiter:"Júpiter",Saturno:"Saturno",Urano:"Urano",Netuno:"Netuno",Plutao:"Plutão",Quiron:"Quíron",NodoNorte:"Nodo Norte",Lilith:"Lilith",Asc:"Ascendente",MC:"Meio do Céu",DSC:"Descendente",IC:"Fundo do Céu",Fortuna:"Parte da Fortuna",Espirito:"Parte do Espírito",Vertice:"Vértice"};
// Tabelas de tradução usadas só pela exportação "Copiar para Calculadora de Sinastria"
// (ver copyForSinastriaCalc): a Calculadora de Sinastria espera o texto no formato de
// exportação em inglês do Astro-seek ("AI-ChatGPT - Astrology Data Export"), então esses
// nomes precisam bater exatamente com o que o parser dela (parseText/normPlanet) reconhece.
// A Calculadora de Sinastria (pasta sinastria/) é um sistema à parte, com parser e
// calibração próprios (não lê Espírito de export nenhum) — por isso PLANET_EN.Espirito
// não tem uso hoje, mas fica definido por simetria com Fortuna/os demais pontos.
export const SIGNS_EN = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
export const PLANET_EN = {Sol:"Sun",Lua:"Moon",Mercurio:"Mercury",Venus:"Venus",Marte:"Mars",Jupiter:"Jupiter",Saturno:"Saturn",Urano:"Uranus",Netuno:"Neptune",Plutao:"Pluto",Quiron:"Chiron",NodoNorte:"Node",Lilith:"Lilith",Asc:"Ascendant",MC:"MC",DSC:"DSC",IC:"IC",Fortuna:"Fortune",Espirito:"Spirit",Vertice:"Vertex"};
export const ASPECT_EN = {"Conjunção":"Conjunction","Oposição":"Opposition","Quadratura":"Square","Trígono":"Trine","Sextil":"Sextile","Quincúncio":"Quincunx","Semissextil":"Semisextile","Semiquadratura":"Semisquare","Sesquiquadratura":"Sesquiquadrate"};
export const TRANSIT_BODIES = ["Sol","Lua","Mercurio","Venus","Marte","Jupiter","Saturno","Urano","Netuno","Plutao","Quiron","NodoNorte","Lilith"];
// pontos angulares/derivados que só existem quando o mapa tem hora+local (hasHouses) —
// não são "corpos" com posição própria calculada em computeDayPositions, e sim
// derivados de Asc/MC/Sol/Lua já calculados (ver natalLon/synPointLon). Espírito entrou
// aqui do lado da Fortuna (mesma dependência de Asc/Sol/Lua) — isso já basta pra ele
// aparecer automaticamente em Trânsitos, Sinastria (via SYN_ANGLE_POINTS) e Composto,
// sem precisar tocar nesses três arquivos.
export const ANGLE_POINTS = ["Asc","MC","DSC","IC","Fortuna","Espirito"];
// Vértice entra só na Sinastria (ver SYN_ANGLE_POINTS/synPointList), não no mapa natal
// individual nem no Composto — pedido específico foi "calcular Vértice na parte do
// cálculo da Sinastria". ANGLE_POINTS continua igual pros outros usos (natal, trânsito,
// composto) pra não mudar comportamento fora do escopo pedido.
export const SYN_ANGLE_POINTS = ANGLE_POINTS.concat(["Vertice"]);
export const PERSONAL = ["Sol","Lua","Mercurio","Venus","Marte","Asc","MC","DSC","IC","Fortuna","Espirito"];
export const OUTER = ["Urano","Netuno","Plutao"];
export const SOCIAL = ["Jupiter","Saturno"];
export const CENTAUR = ["Quiron","Lilith"];
export const PLANET_GROUPS = {
  "Pessoais":   ["Sol","Lua","Mercurio","Venus","Marte"],
  "Sociais":    ["Jupiter","Saturno"],
  "Geracionais":["Urano","Netuno","Plutao"],
  "Pontos":     ["Quiron","NodoNorte","Lilith"]
};
// Velocidade média diária (graus/dia), em módulo — usada só pra estimar a duração
// típica de um aspecto (não para posição). Mercúrio/Marte variam bastante por causa
// de retrogradações; os valores aqui são médias de longo prazo, então a duração
// estimada é uma referência, não uma previsão exata daquele trânsito específico.
export const AVG_SPEED = {
  Sol:0.9856, Lua:13.176, Mercurio:1.383, Venus:1.2, Marte:0.524,
  Jupiter:0.0831, Saturno:0.0335, Urano:0.0117, Netuno:0.006, Plutao:0.004,
  Quiron:0.0194, NodoNorte:0.0529, Lilith:0.1114
};
export function typicalSpanDays(transitName, aspectOrbDeg){
  const speed = AVG_SPEED[transitName]||1;
  return (2*aspectOrbDeg)/speed;
}
export function speedTag(transitName, aspectOrbDeg){
  const days = typicalSpanDays(transitName, aspectOrbDeg);
  let label, cls, approx;
  if(days<7){ label='Rápido'; cls='fast'; }
  else if(days<90){ label='Médio'; cls='medium'; }
  else { label='Lento'; cls='slow'; }
  if(days<1) approx='~'+Math.max(1,Math.round(days*24))+'h';
  else if(days<30) approx='~'+Math.round(days)+'d';
  else if(days<365) approx='~'+Math.round(days/30)+'m';
  else approx='~'+(days/365).toFixed(1)+'a';
  return {label, cls, approx};
}

