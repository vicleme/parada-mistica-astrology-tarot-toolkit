// ============================================================================
// core/orbs.js
// Fonte única da regra de orbe do site: o teto de orbe de cada aspecto e o
// multiplicador desse teto por tipo de astro/ponto. Usada pelos trânsitos e
// mapas (core/aspects.js) e pela Calculadora de Sinastria (sinastria/js/
// parser.js), para que o mesmo aspecto nunca "exista" numa página e some na
// outra. Sem dependência de DOM nem de outros módulos.
//
// Os aspectos são identificados pelo ângulo (0, 60, 90...), que não depende
// do idioma. Os pontos aceitam os dois vocabulários do site: português (os
// mapas, ex.: Urano, NodoNorte) e inglês (o texto do Astro-seek lido pela
// sinastria, ex.: Uranus, Node). Para ajustar uma orbe, mexa só aqui.
// ============================================================================

// Teto de orbe (em graus) por aspecto, indexado pelo ângulo.
export const ORB_BASE_BY_ANGLE = {
  0: 8,     // Conjunção
  180: 8,   // Oposição
  90: 7,    // Quadratura
  120: 7,   // Trígono
  60: 5,    // Sextil
  150: 3,   // Quincúncio
  30: 2,    // Semissextil
  45: 2,    // Semiquadratura
  135: 2,   // Sesquiquadratura
};

// Nome em inglês (como aparece no texto da sinastria) para o ângulo.
export const ASPECT_ANGLE_EN = {
  Conjunction: 0, Opposition: 180, Square: 90, Trine: 120, Sextile: 60,
  Quincunx: 150, Semisextile: 30, Semisquare: 45, Sesquiquadrate: 135,
};

// Teto por tipo de astro/ponto: luminares, planetas pessoais/sociais e os
// ângulos (Asc/MC/DSC/IC) mantêm o teto cheio (1.0). Urano/Netuno/Plutão, por
// serem mais lentos e geracionais, ficam um degrau mais apertados (0.75).
// Quíron, Nodo, Vértice, Parte da Fortuna e Parte do Espírito são pontos
// derivados/discutidos, não planetas no sentido clássico, e pedem orbe bem
// mais estreito (0.35). Lilith (apogeu lunar médio) é puramente um ponto
// matemático, o mais conservador de todos (0.25). Isso é um teto de EXATIDÃO,
// separado do desconto de PESO (planetWeight nos trânsitos; AXIS_BOOST e
// ASPECT_CATEGORY_MULT na sinastria): os dois mecanismos coexistem. Quando os
// dois lados do aspecto têm multiplicadores diferentes, vale o MENOR (o elo
// mais frágil decide até onde o aspecto ainda "existe").
export const ORB_TYPE_MULT = {
  // vocabulário dos mapas (português)
  Urano: 0.75, Netuno: 0.75, Plutao: 0.75,
  Quiron: 0.35, NodoNorte: 0.35, Vertice: 0.35, Fortuna: 0.35, Espirito: 0.35,
  // vocabulário da sinastria (inglês)
  Uranus: 0.75, Neptune: 0.75, Pluto: 0.75,
  Chiron: 0.35, Node: 0.35, SouthNode: 0.35, Vertex: 0.35, Fortune: 0.35, Spirit: 0.35,
  // iguais nos dois
  Lilith: 0.25,
};

export function orbTypeMultiplier(name){ return ORB_TYPE_MULT[name] ?? 1.0; }

// Orbe máxima efetiva de um aspecto (pelo ângulo) entre dois pontos.
// Ângulo desconhecido cai no teto genérico de 8 graus.
export function maxOrbFor(angle, nameA, nameB){
  const base = ORB_BASE_BY_ANGLE[angle] ?? 8;
  return base * Math.min(orbTypeMultiplier(nameA), orbTypeMultiplier(nameB));
}
