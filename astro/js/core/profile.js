// ============================================================================
// core/profile.js
// Cálculo da aba Perfil: recorta os aspectos intra-mapa (o mesmo tipo de dado
// já usado em Leitura estrutural — ver structural.js) em 5 categorias
// temáticas (Intelectual/Emocional/Ação-Vontade/Vínculo-Afeto/Estrutura-
// Disciplina), cada uma com um planeta-regente (ou dois) + um par de casas.
// Mesma mecânica de "presença + % harmônico" da Sinastria (ver
// sinastria/js/charts.js e compute.js), só que aplicada a UM mapa em vez de
// dois — por isso o cálculo aqui é autocontido (não importa nada de
// sinastria/js) em vez de reaproveitar o motor de pontuação de lá, que é
// calibrado especificamente pra pares de mapas.
//
// REVISÃO (fidelidade astrológica): a versão anterior tirava o tom
// harmônico/tenso só da geometria do aspecto (Trígono sempre "verde",
// Quadratura sempre "vermelho"), sem olhar pra natureza dos planetas nem pra
// condição do próprio regente. Isso já foi sinalizado como simplificação real
// — aqui incorpora três coisas que a tradição (clássica/helenística) usa e
// que o app já calcula em outras telas (dignities.js, structural.js) mas não
// reaproveitava aqui:
//  1) Benéfico/maléfico com seita (Vênus/Júpiter benéficos, Marte/Saturno
//     maléficos, ajustados por seita diurna/noturna do mapa) — combinado com
//     a geometria do aspecto, não no lugar dela.
//  2) Dignidade essencial do próprio regente da categoria (Domicílio/
//     Exaltação/Triplicidade/Termo/Face vs Queda/Detrimento/Combustão) —
//     reaproveitando dignityPointsFor/debilitiesFor/combustionCheck de
//     dignities.js.
//  3) Valência por natureza da própria casa (Hellenística: casas
//     angulares/sucedentes/cadentes boas e más — 6/8/12 pesadas, 1/5/11
//     favoráveis), aplicada mesmo a Sol/Lua/Mercúrio/Urano, que antes só
//     contavam como presença sem lado nenhum.
// Ação/Vontade continua com Sol+Marte como corregentes (síntese moderna
// defensável — Sol=vitalidade/identidade, Marte=vontade/ação — mas não é a
// regência tradicional), só que agora Marte pesa mais que o Sol nos
// marcadores dessa categoria (ver ACAO_RULER_WEIGHTS), pra não inflar
// "Ação" com coisa que a tradição atribuiria só à vitalidade solar.
//
// REVISÃO 2 (regência tradicional): a versão anterior não trazia o regente
// do Ascendente pro cálculo em lugar nenhum — sinalizado como o buraco maior
// que sobrava depois da REVISÃO 1. Ver computeAscendantRuler abaixo: onde
// está o dono da Casa 1 (signo do Asc → DOMICILE_RULER), em que casa ele
// cai, com que dignidade/debilidade/combustão — exposto à parte das 5
// categorias (campo `ascendantRuler` do retorno de computeNatalProfile),
// porque é o significador do mapa como um todo, não mais um marcador de uma
// área específica.
//
// REVISÃO 3 (recepção mútua): ver mutualReceptionOf/blendedHarmonyFrac
// acima — quando os dois planetas de um aspecto se hospedam mutuamente
// (cada um no domicílio ou exaltação do outro), a fração de harmonia desse
// aspecto é empurrada pra cima (RECEPTION_BOOST_WEIGHT/RECEPTION_FRAC),
// entra tanto nas barras de categoria quanto nos eixos globais (Nitidez/
// Harmonia), e o texto do marcador ganha o sufixo "recepção mútua: ...".
//
// REVISÃO 4 (peregrino): rulerConditionMarkers (usada tanto pro regente de
// cada categoria quanto pro regente do Ascendente) agora também marca
// Peregrino — regente sem nenhuma das 5 dignidades essenciais na própria
// posição (usableScore===0) — como enfraquecimento brando e independente de
// Queda/Detrimento (ver comentário acima de RULER_PEREGRINE_WEIGHT). Não
// precisou de dado novo: reusa o mesmo dignityPointsFor já calculado pra
// decidir a dignidade.
//
// REVISÃO 5 (Hayz e Sob os raios): ver hayzStatus e underBeamsCheck
// (dignities.js) acima — Hayz é a convergência de seita + posição acima/
// abaixo do horizonte + gênero do signo (as três precisam bater; convergem
// pra "hayz", divergem todas pra "contra-hayz", combinação parcial fica sem
// marcador — a tradição não nomeia meio-termo). Sob os raios estende a
// mesma lógica de combustão (dignities.js) pra um orbe mais largo (8°30' a
// 17° do Sol), com enfraquecimento mais brando; mutuamente exclusivo com
// combustão/cazimi por construção. Os dois entram em rulerConditionMarkers,
// então já valem tanto pro regente de categoria quanto pro regente do
// Ascendente, sem código extra em nenhum dos dois.
//
// REVISÃO 6 (regência de casa em geral): ver computeHouseRulerMarkers abaixo
// — pra cada casa do par de cada categoria, identifica quem rege a Casa X
// (regente por domicílio do signo na cúspide, não só o planeta natural da
// categoria) e traz posição + condição (dignidade/debilidade/combustão/
// peregrino/Hayz) desse regente como marcadores extras, com peso reduzido
// (HOUSE_RULER_WEIGHT_FACTOR) por ser corroboração e não substituição do
// planeta natural. Mesma mecânica de computeAscendantRuler, generalizada
// pras 5 categorias em vez de só a Casa 1.
//
// REVISÃO 7 (Parte da Fortuna): ver computeFortune abaixo — ponto derivado
// (Asc+Lua−Sol de dia / Asc+Sol−Lua de noite, já calculado em
// core/aspects.js pra outras telas) não entrava em nada do Perfil até aqui.
// Fortuna não tem dignidade própria (não é planeta), então sua leitura é
// valência da própria Casa onde cai + condição do dispositor (regente por
// domicílio do signo em que cai, via rulerConditionMarkers). Exposta como
// bloco próprio no retorno (`fortune`) e como marcador extra em qualquer
// categoria cujo par de casas inclua a Casa da Fortuna.
//
// REVISÃO 8 (stellium/predominância de signo): ver computeStelliumMarkers
// abaixo — reaproveita computeDensity (structural.js, já calculado pra Fase
// 1) sem duplicar a lógica de contagem. Stellium de SIGNO conta pra uma
// categoria quando o regente por domicílio desse signo é um dos rulers
// naturais dela; stellium de CASA conta quando a casa é uma do par da
// categoria. Marcador de intensidade (frac fixo em 0.5, sem lado
// harmônico/tenso próprio — a tradição não atribui valência automática a um
// stellium), com peso proporcional ao número de corpos: puxa a PRESENÇA pra
// cima e dilui harmonyPct em direção a 50% quando presente, em vez de
// inflar um lado artificialmente.
//
// Com isso fecha a lista de pendências sinalizada na conversa de design:
// recepção mútua, peregrino, Hayz/sob os raios, regente do Ascendente,
// regência de casa em geral, Parte da Fortuna e stellium/predominância de
// signo — todas incorporadas ao Perfil.
//
// REVISÃO 9 (aplicativo/separativo): ver computeSpeeds/motionOf abaixo — até
// aqui o peso de um aspecto vinha só de orbe + peso-base do tipo (ASPECTS[].w),
// geometria estática, sem olhar pra direção do movimento. Um aspecto
// APLICATIVO (orbe ainda diminuindo, os dois astros caminhando pro exato) é
// tratado na tradição como mais operante que o mesmo aspecto já SEPARATIVO
// (orbe aumentando, o exato já passou) — dimensão que faltava por inteiro.
// Entra só como multiplicador de PESO do marcador (nunca do tom — aplicativo
// não torna uma quadratura harmônica, só mais enfática); usa a mesma técnica
// de diferença finita (posição de hoje menos posição de ontem) já usada em
// features/natal.js pras Velocidades planetárias, recalculada aqui de forma
// autocontida (profile.js não importa de features/).
//
// REVISÃO 13 (Parte do Espírito): ver computeEspirito abaixo — mesmo
// tratamento dado à Fortuna na REVISÃO 7, agora espelhado pro complemento
// dela (ver espiritoLon em core/aspects.js). Fortuna e Espírito têm o mesmo
// estatuto pro Perfil (ponto derivado, sem dignidade essencial própria):
// as duas revisões agora compartilham a mesma lógica interna
// (computeDerivedPointProfile), só trocando a longitude e os textos. Espírito
// entra em bloco próprio no retorno (`espirito`) e como marcador extra em
// qualquer categoria cujo par de casas inclua a Casa do Espírito — mesma
// mecânica de `fortuneHouse`/`fortunaMarkers`, ver `espiritoHouse` em
// computeCategory.
//
// Eixos globais (não por categoria):
//  - Nitidez: % dos aspectos elegíveis com orbe apertado (<=35% do orbe
//    máximo efetivo), excluindo pares geracionais outer-outer (Urano/Netuno/
//    Plutão entre si — são lentos e comuns a uma janela de anos inteira, não
//    dizem muito sobre a pessoa especificamente, mesmo critério já usado na
//    Marca Geracional de structural.js).
//  - Harmonia geral: média do blendedHarmonyFrac (ver abaixo) do mesmo
//    conjunto elegível.
//
// REVISÃO 10 (retrogradação): ver bloco "Retrogradação" dentro de
// rulerConditionMarkers abaixo — reaproveita computeSpeeds (já usada na
// REVISÃO 9) pra marcar quando o próprio regente da categoria está
// retrógrado no momento do nascimento. Debilidade acidental clássica:
// planeta retrógrado tem efeito represado/introspectivo, difere de
// Queda/Detrimento (que são posicionais/essenciais) por isso entra com peso
// menor e frac mais próximo do meio, no mesmo espírito de Peregrino. Só os 5
// planetas que de fato retrogradam entram (Mercúrio, Vênus, Marte, Júpiter,
// Saturno) — Sol e Lua nunca retrogradam (geocentricamente) e ficam de fora
// por definição, não por omissão.
//
// REVISÃO 11 (Casa de Gozo): ver JOY_HOUSE_BY_PLANET/bloco dentro de
// rulerConditionMarkers — condição acidental clássica (Firmicus/Lilly), uma
// casa fixa por planeta onde ele "atua com mais naturalidade" (Sol=9, Lua=3,
// Mercúrio=1, Vênus=5, Marte=6, Júpiter=11, Saturno=12), independente do
// signo. Ao contrário de Hayz, não tem lado oposto ("contra-gozo") — a
// tradição só define o bônus por estar na própria casa, nunca uma penalidade
// por não estar. Peso deliberadamente leve (RULER_JOY_WEIGHT=0.2, o menor
// entre os marcadores de condição) — é reforço acidental pequeno, não um
// pilar de força como dignidade essencial ou Hayz.
// ============================================================================

import { ASPECTS, orbFromAspect, effectiveMaxOrb, fortunaLon, espiritoLon } from './aspects.js';
import { houseOf, signOf } from './houses.js';
import { STRUCTURAL_BODIES, ASPECT_TONE, computeSect, POLARITY_BY_SIGN, computeDensity } from './structural.js';
import { OUTER, PLANET_LABEL, SIGNS } from './constants.js';
import { CLASSICAL_PLANETS, dignityPointsFor, debilitiesFor, combustionCheck, underBeamsCheck, DIGNITY_LABEL, DOMICILE_RULER, EXALTATION, computeAlmutenOf } from './dignities.js';
import { computeDayPositions } from './ephemeris.js';

// Pesos por regente dentro de cada categoria — default 1.0 pra todo mundo em
// `rulers`; só Ação/Vontade tem pesos diferentes (ver nota acima).
const ACAO_RULER_WEIGHTS = { Marte: 1.0, Sol: 0.55 };
function rulerWeightOf(meta, planet) {
  if (meta.rulerWeights && meta.rulerWeights[planet] !== undefined) return meta.rulerWeights[planet];
  return 1.0;
}

export const PROFILE_CATEGORIES = {
  intelectual: { label: 'Intelectual',        adjective: 'Intelectual', color: 'var(--violet)',   rulers: ['Mercurio'],        houses: [3, 9] },
  emocional:   { label: 'Emocional',           adjective: 'Emocional',   color: 'var(--rose)',      rulers: ['Lua'],             houses: [4, 8] },
  acao:        { label: 'Ação/Vontade',        adjective: 'Volitivo',    color: 'var(--gold)',      rulers: ['Marte', 'Sol'],    houses: [1, 10], rulerWeights: ACAO_RULER_WEIGHTS },
  vinculo:     { label: 'Vínculo/Afeto',       adjective: 'Afetivo',     color: 'var(--sage)',      rulers: ['Venus'],           houses: [5, 7] },
  estrutura:   { label: 'Estrutura/Disciplina', adjective: 'Estrutural', color: 'var(--gold-dim)',  rulers: ['Saturno'],         houses: [6, 10] },
};
export const PROFILE_CATEGORY_KEYS = Object.keys(PROFILE_CATEGORIES);

// ---------------------------------------------------------------------------
// Benéfico/maléfico clássico com seita. Só os 5 planetas não-luminares
// clássicos entram nessa camada (Vênus/Júpiter/Marte/Saturno); Sol, Lua e
// Mercúrio ficam neutros aqui (Mercúrio é tradicionalmente "comum" — segue o
// que aspecta —, e dar-lhe um lado fixo seria simplificação na direção
// oposta). Os transpessoais (Urano/Netuno/Plutão) também ficam neutros nessa
// camada: não têm natureza benéfica/maléfica consensual na tradição, e já são
// descontados de peso em outros lugares (ORB_TYPE_MULT, planetWeight) — dar
// a eles um lado aqui seria inventar doutrina, não corrigi-la.
const BENEFIC = ['Venus', 'Jupiter'];
const MALEFIC = ['Marte', 'Saturno'];
// fração de "natureza harmônica" (1=puramente benéfico, 0=puramente
// maléfico, 0.5=neutro) por planeta, ajustada por seita quando isDay é
// conhecido. "De seita" (Júpiter/mapa diurno, Vênus/mapa noturno, Saturno/
// mapa diurno, Marte/mapa noturno) é tradicionalmente mais brando (benéfico
// mais benéfico, maléfico menos maléfico); "contrário à seita" é mais
// extremado. Sem hora de nascimento (isDay===null), usa o valor clássico
// sem ajuste de seita.
function natureFracOf(planet, isDay) {
  if (BENEFIC.includes(planet)) {
    if (isDay === null || isDay === undefined) return 0.9;
    const ofSect = (planet === 'Jupiter' && isDay) || (planet === 'Venus' && !isDay);
    return ofSect ? 1.0 : 0.82;
  }
  if (MALEFIC.includes(planet)) {
    if (isDay === null || isDay === undefined) return 0.15;
    const ofSect = (planet === 'Saturno' && isDay) || (planet === 'Marte' && !isDay);
    return ofSect ? 0.28 : 0.05;
  }
  return 0.5; // Sol, Lua, Mercúrio, pontos derivados, transpessoais
}
// Fração "geométrica" do tom do aspecto — mesma classificação de ASPECT_TONE,
// só que numérica (0..1) pra poder ser combinada com a natureza dos planetas
// em vez de decidir o tom sozinha.
function geometryFracOf(aspectName) {
  const tone = ASPECT_TONE[aspectName];
  return tone === 'harmonico' ? 1 : (tone === 'tenso' ? 0 : 0.5);
}
// Peso relativo geometria x natureza na fração final de harmonia de um
// aspecto. Metade e metade: a geometria continua sendo o que define o TIPO
// de interação (fricção vs. fluidez), mas a natureza dos planetas decide o
// quanto essa fricção/fluidez pesa de fato — é a distinção que faltava entre
// "Vênus trígono Júpiter" e "Saturno trígono Plutão".
const GEOMETRY_WEIGHT = 0.5;
function blendedHarmonyFrac(aspectName, p1, p2, isDay, positions) {
  const geo = geometryFracOf(aspectName);
  const nat = (natureFracOf(p1, isDay) + natureFracOf(p2, isDay)) / 2;
  let frac = GEOMETRY_WEIGHT * geo + (1 - GEOMETRY_WEIGHT) * nat;
  // Recepção (ver receptionBetween abaixo) empurra a fração pra cima —
  // "antídoto clássico": mesmo numa quadratura/oposição, os planetas
  // cooperam apesar da tensão geométrica. Mútua empurra o RECEPTION_BOOST_WEIGHT
  // inteiro; mão única, só metade (ONE_WAY_RECEPTION_FACTOR) — conta, mas
  // pesa menos que a cooperação recíproca plena. Só aplica quando `positions`
  // é passado (os dois call sites de blendedHarmonyFrac já têm o mapa
  // disponível; deixei o parâmetro opcional só pra não quebrar nenhum outro
  // uso futuro que eventualmente não tenha posições à mão).
  if (positions) {
    const recep = receptionBetween(p1, p2, positions);
    if (recep) {
      const boost = recep.mutual ? RECEPTION_BOOST_WEIGHT : RECEPTION_BOOST_WEIGHT * ONE_WAY_RECEPTION_FACTOR;
      frac = frac + boost * (RECEPTION_FRAC - frac);
    }
  }
  return Math.max(0, Math.min(1, frac));
}

// ---------------------------------------------------------------------------
// Recepção: A está no signo regido por B (domicílio ou exaltação) — A é
// "hospedado" por B. Quando isso acontece nos dois sentidos (A hospeda B E B
// hospeda A) é recepção MÚTUA; quando só um lado hospeda o outro é recepção
// de MÃO ÚNICA (assimétrica — A depende da cooperação de B, mas não o
// contrário). Efeito clássico nos dois casos: os planetas cooperam mesmo sob
// geometria tensa, então funciona como um antídoto que suaviza quadratura/
// oposição e reforça trígono/sextil (ver blendedHarmonyFrac abaixo) — mão
// única conta, só que mais fraco que mútua, doutrinariamente (a maioria das
// fontes trata reciprocidade como o caso pleno e unilateral como parcial).
// Só planetas clássicos entram aqui — Domicílio/Exaltação (dignities.js) só
// têm regente definido para os 7 clássicos.
//
// RECEPTION_FRAC=0.85 (não 1.0): recepção mútua é tratada como forte, não
// absoluta — mesmo valor de ordem de grandeza já usado pra Cazimi (0.9) e
// dignidade plena (frac:1 mas combinado com peso próprio, não domina
// sozinho). RECEPTION_BOOST_WEIGHT=0.4: a fração final anda 40% do caminho
// da fração geometria+natureza até RECEPTION_FRAC quando é MÚTUA — "suaviza
// bastante", como descrito na conversa, sem apagar de vez a tensão
// geométrica de uma quadratura/oposição (que ainda pesa nos outros 60%).
// ONE_WAY_RECEPTION_FACTOR=0.5: recepção de mão única anda só metade desse
// caminho — reconhece o efeito sem tratá-lo como equivalente à cooperação
// recíproca plena.
// ---------------------------------------------------------------------------
const RECEPTION_FRAC = 0.85;
const RECEPTION_BOOST_WEIGHT = 0.4;
const ONE_WAY_RECEPTION_FACTOR = 0.5;
function receptionRulerType(hostSignIdx, guestPlanet) {
  if (DOMICILE_RULER[hostSignIdx] === guestPlanet) return 'domicilio';
  const ex = EXALTATION[hostSignIdx];
  if (ex && ex.planet === guestPlanet) return 'exaltacao';
  return null;
}
// Generaliza o antigo mutualReceptionOf: agora devolve também o caso de mão
// única (só type1 OU só type2), em vez de descartar o resultado quando não
// há reciprocidade nos dois sentidos. `mutual` sinaliza qual dos dois casos é.
function receptionBetween(p1, p2, positions) {
  if (!CLASSICAL_PLANETS.includes(p1) || !CLASSICAL_PLANETS.includes(p2)) return null;
  const lon1 = positions[p1], lon2 = positions[p2];
  if (lon1 == null || lon2 == null) return null;
  const sign1 = signOf(lon1), sign2 = signOf(lon2);
  const type1 = receptionRulerType(sign1, p2); // p1 hospedado por p2 (domicílio/exaltação de p2 em sign1)
  const type2 = receptionRulerType(sign2, p1); // p2 hospedado por p1 (domicílio/exaltação de p1 em sign2)
  if (!type1 && !type2) return null;
  return { type1, type2, mutual: !!(type1 && type2) };
}
const RECEPTION_TYPE_LABEL = { domicilio: 'domicílio', exaltacao: 'exaltação' };
function receptionText(p1, p2, recep) {
  if (recep.mutual) {
    return `recepção mútua: ${PLANET_LABEL[p1]} em ${RECEPTION_TYPE_LABEL[recep.type1]} de ${PLANET_LABEL[p2]}, ${PLANET_LABEL[p2]} em ${RECEPTION_TYPE_LABEL[recep.type2]} de ${PLANET_LABEL[p1]}`;
  }
  const guestIsP1 = !!recep.type1;
  const guest = guestIsP1 ? p1 : p2, host = guestIsP1 ? p2 : p1;
  const type = guestIsP1 ? recep.type1 : recep.type2;
  return `recepção de mão única: ${PLANET_LABEL[guest]} em ${RECEPTION_TYPE_LABEL[type]} de ${PLANET_LABEL[host]}`;
}
// Lista os "anfitriões" (regentes por domicílio e/ou exaltação) do signo em
// que um planeta cai — usada pela mitigação de debilidade abaixo (o planeta
// debilitado é sempre o "hóspede"; aqui não importa se ele mesmo hospeda o
// anfitrião de volta, é recepção de mão única por construção: quem está em
// Queda/Detrimento não é o regente do próprio signo).
function receptionHostsOfSign(signIdx) {
  const hosts = {};
  const dom = DOMICILE_RULER[signIdx];
  hosts[dom] = (hosts[dom] || []).concat('domicilio');
  const ex = EXALTATION[signIdx];
  if (ex) hosts[ex.planet] = (hosts[ex.planet] || []).concat('exaltacao');
  return Object.entries(hosts).map(([planet, types]) => ({ planet, types }));
}

function toneEmojiFor(frac) { return frac >= 0.66 ? '🟢' : (frac <= 0.33 ? '🔴' : '🟡'); }
function pushByFrac(frac, text, harmonicDetails, ambivalentDetails, tenseDetails) {
  if (frac >= 0.66) harmonicDetails.push(`${toneEmojiFor(frac)} ${text}`);
  else if (frac <= 0.33) tenseDetails.push(`${toneEmojiFor(frac)} ${text}`);
  else ambivalentDetails.push(`${toneEmojiFor(frac)} ${text}`);
}

// ---------------------------------------------------------------------------
// Valência por natureza da própria casa (doutrina helenística de casas
// boas/más, independente de qual planeta está nela): angulares (1,4,7,10)
// fortes mas nem todas "boas"; sucedentes/cadentes se dividem entre Boa
// Fortuna/Bom Espírito (5,11,9,3 — em grau menor) e Má Fortuna/Mau Espírito
// (6,8,12 — as três casas classicamente mais pesadas). Isso é o que faltava
// pra Lua na Casa 8 (tensão emocional clássica) ou Sol na Casa 4 aparecerem
// com algum lado, em vez de neutros por definição só por não estarem na
// tabela de planetas com valência própria.
const HOUSE_NATURE_VALENCE = { 1: 0.65, 2: 0.55, 3: 0.62, 4: 0.5, 5: 0.78, 6: 0.18, 7: 0.5, 8: 0.15, 9: 0.72, 10: 0.6, 11: 0.78, 12: 0.15 };

// Orbe é considerado "apertado" até 35% do teto efetivo daquele aspecto/par de
// pontos — mesma ideia de effectiveMaxOrb (core/aspects.js), só que aqui vira
// o corte usado pra Nitidez.
const TIGHT_ORB_FRACTION = 0.35;
// Piso de confiança pra reportar harmonyPct de uma categoria (em vez de "—")
// — mesmo espírito do CALIBRATION.minAxisSignalWeight da Sinastria, mas com
// valor próprio (esse cálculo não é comparável em escala ao de lá).
const MIN_HARMONY_SIGNAL = 0.25;

// Mesma tabela HOUSE_PLANET_VALENCE da Sinastria (ver sinastria/js/
// calibration.js), reduzida aos 6 planetas com natureza benéfica/maléfica
// consensual (Vênus/Júpiter/Saturno/Marte/Plutão/Netuno). Sol, Lua, Mercúrio
// e Urano NÃO têm entrada aqui de propósito — não têm lado fixo próprio — e
// por isso a valência final de qualquer planeta numa casa agora é a MÉDIA
// entre isso (quando existe) e HOUSE_NATURE_VALENCE (natureza da própria
// casa, sempre definida): assim Vênus na Casa 8 fica ambivalente (favorável
// + pesada), e Lua na Casa 8 fica tensa (neutra + pesada), em vez de neutra
// por padrão só por não estar nesta tabela.
const HOUSE_PLANET_VALENCE = { Venus: 0.80, Jupiter: 0.80, Saturno: 0.20, Marte: 0.20, Plutao: 0.50, Netuno: 0.50 };
function houseValenceFracFor(planet, house) {
  const houseFrac = HOUSE_NATURE_VALENCE[house] ?? 0.5;
  const planetFrac = HOUSE_PLANET_VALENCE[planet];
  return planetFrac === undefined ? houseFrac : (planetFrac + houseFrac) / 2;
}
// Peso-base de um marcador de casa valenciado — mesma ordem de grandeza de
// CALIBRATION.houseValenceWeight (0.28) da Sinastria, escalado aqui pelo
// mesmo bônus de regente (isRuler) já usado no resto da presença.
const HOUSE_VALENCE_WEIGHT = 0.45;

// ---------------------------------------------------------------------------
// Hayz: condição de força tripla — o planeta está (1) de acordo com a seita
// do mapa (planeta diurno num mapa diurno, ou noturno num mapa noturno), (2)
// na posição de céu esperada pra essa seita (diurno acima do horizonte,
// noturno abaixo), e (3) em signo do gênero certo (diurno em signo
// masculino/yang, noturno em feminino/yin). As três precisam bater juntas —
// não é "mais um bônus por condição isolada", é a convergência que a
// tradição chama de Hayz. Só os 5 planetas com seita fixa entram aqui
// (Sol/Júpiter/Saturno diurnos; Lua/Vênus/Marte noturnos) — Mercúrio é
// tradicionalmente "comum" (sem seita fixa, ver mesma ressalva já feita pra
// BENEFIC/MALEFIC acima) e fica de fora, não classificado nem a favor nem
// contra. Quando as três condições vão TODAS contra (seita errada + posição
// errada + gênero errado), o mesmo raciocínio dá o oposto — "contrário a
// Hayz" —, enfraquecimento leve; combinações parciais (1 ou 2 de 3) não têm
// nome na tradição e ficam sem marcador aqui, pra não inventar uma categoria
// que a doutrina não define.
// ---------------------------------------------------------------------------
const SECT_DIURNAL = ['Sol', 'Jupiter', 'Saturno'];
const SECT_NOCTURNAL = ['Lua', 'Venus', 'Marte'];
function sectTeamOf(planet) {
  if (SECT_DIURNAL.includes(planet)) return 'diurno';
  if (SECT_NOCTURNAL.includes(planet)) return 'noturno';
  return null;
}
function hayzStatus(planet, signIdx, house, isDay) {
  const team = sectTeamOf(planet);
  if (!team || isDay === null || isDay === undefined) return null;
  const wantsDay = team === 'diurno';
  const sectMatch = wantsDay === isDay;
  const aboveHorizon = house >= 7 && house <= 12;
  const horizonMatch = wantsDay ? aboveHorizon : !aboveHorizon;
  const genderMatch = wantsDay ? POLARITY_BY_SIGN[signIdx] === 'yang' : POLARITY_BY_SIGN[signIdx] === 'yin';
  if (sectMatch && horizonMatch && genderMatch) return 'hayz';
  if (!sectMatch && !horizonMatch && !genderMatch) return 'contra-hayz';
  return null;
}
const RULER_HAYZ_WEIGHT = 0.35;
const HAYZ_FRAC = 0.9;
const CONTRA_HAYZ_FRAC = 0.15;

// ---------------------------------------------------------------------------
// Condição do próprio regente da categoria: dignidade essencial (Domicílio/
// Exaltação/Triplicidade/Termo/Face), debilidade (Queda/Detrimento),
// combustão/Cazimi/Sob os raios, Peregrino e Hayz, reaproveitando
// dignities.js (mesmos dados já usados nas telas de Mapa Natal/Almuten). Só
// planetas clássicos (CLASSICAL_PLANETS) entram aqui — Urano não tem
// dignidade essencial na tradição. Triplicidade e Hayz dependem de saber se
// o mapa é diurno ou noturno (isDay); sem hora de nascimento (isDay===null)
// essas faixas são puladas (as outras não dependem de seita) pra não
// estimar condição sem base — e por isso Peregrino, que depende do MESMO
// score usável (usableScore), herda a mesma ressalva: sem hora de
// nascimento, um planeta pode aparecer peregrino aqui só porque a
// Triplicidade (uma das 5 dignidades possíveis) não pôde ser avaliada, não
// porque ele realmente não tem teto nenhum — narrado no texto do marcador
// quando isDay é null.
//
// Peregrino: nenhuma das 5 dignidades essenciais pontua na própria posição
// (usableScore===0) — classicamente "sem teto", planeta fora de qualquer
// condição própria de força, tratado como enfraquecimento brando e
// específico: mais "errático/instável" do que "debilitado" (Queda/
// Detrimento é oposição ativa a uma dignidade; Peregrino é ausência de
// qualquer uma das 5, o que é mais comum e mais fraco que estar oposto a uma
// delas) — por isso frac mais próximo do meio (0.35, ainda tenso mas não tão
// baixo quanto Queda/Detrimento em frac:0) e peso menor que
// RULER_DEBILITY_WEIGHT. Pode coexistir com Queda/Detrimento (frequente,
// mas não garantido: Termo/Face podem dar teto a um planeta mesmo no signo
// de detrimento/queda de outro) — os dois marcadores entram
// independentemente quando ambos se aplicam.
//
// Sob os raios: mutuamente exclusivo com combustão por construção
// (underBeamsCheck só é true fora da faixa de combustão, ver dignities.js)
// — por isso entra como "else if" depois de checar combustão/cazimi, nunca
// os dois ao mesmo tempo pro mesmo planeta.
// ---------------------------------------------------------------------------
const RULER_DIGNITY_WEIGHT = 0.5;
const RULER_DEBILITY_WEIGHT = 0.45;
const RULER_COMBUSTION_WEIGHT = 0.3;
const RULER_UNDER_BEAMS_WEIGHT = 0.22;
const RULER_PEREGRINE_WEIGHT = 0.3;
const RULER_RETROGRADE_WEIGHT = 0.28;
const RULER_JOY_WEIGHT = 0.2;
const PEREGRINE_FRAC = 0.35;
const UNDER_BEAMS_FRAC = 0.35;
const RETROGRADE_FRAC = 0.35;
const JOY_FRAC = 0.75;
// Casa de gozo (joy) de cada planeta clássico — condição acidental onde a
// tradição diz que o planeta "atua com mais conforto/naturalidade" (Firmicus/
// Lilly). Diferente de Hayz (convergência de 3 fatores) e da dignidade
// essencial (posição no zodíaco): é só sobre a CASA, independe de signo.
// Peso propositalmente mais leve que dignidade/Hayz — é reforço acidental
// pequeno, não um pilar de força como domicílio/exaltação. Não existe
// "contra-gozo": a tradição não define enfraquecimento por estar fora da
// própria casa de gozo, só o bônus por estar nela — por isso, ao contrário
// de Hayz/contra-Hayz, aqui só há o lado favorável, nunca o tenso.
const JOY_HOUSE_BY_PLANET = { Sol: 9, Lua: 3, Mercurio: 1, Venus: 5, Marte: 6, Jupiter: 11, Saturno: 12 };
const RETROGRADE_CAPABLE = ['Mercurio', 'Venus', 'Marte', 'Jupiter', 'Saturno'];

// ---------------------------------------------------------------------------
// Mitigação de debilidade por recepção — o "meio-termo" combinado na
// conversa entre exigir aspecto (Lilly, mais rigoroso: só conta se os dois
// planetas realmente "se falam") e aceitar recepção só posicional (Bonatti,
// mais permissivo: hospedar já basta, mesmo sem aspecto). Aqui os dois
// contam, mas em graus diferentes — não é uma escolha binária entre as duas
// escolas, é uma escala:
//   - Recepção COM aspecto entre o debilitado e seu anfitrião (domicílio/
//     exaltação do signo em que caiu): mitigação forte
//     (DEBILITY_MITIGATION_ASPECT_FRAC) — o caso que nenhuma das duas
//     escolas discute, ambas concordam que é o mais forte.
//   - Recepção só POSICIONAL (o anfitrião está em outro lugar do mapa, sem
//     aspecto): mitigação parcial (DEBILITY_MITIGATION_POSITIONAL_FRAC) —
//     conta, como Bonatti aceita, mas com reserva, porque falta a "conversa"
//     entre os dois que Lilly exige pro caso pleno.
//   - Sem recepção nenhuma: nenhuma mitigação, Queda/Detrimento cru como já
//     era antes.
// Reaproveita receptionHostsOfSign (mesmo primitivo de recepção usado em
// receptionBetween, só que aplicado ao regente do PRÓPRIO signo do planeta
// debilitado, não a outro planeta em aspecto) e bestAspectBetween (definida
// mais abaixo no arquivo, hoisted).
// ---------------------------------------------------------------------------
const DEBILITY_MITIGATION_ASPECT_FRAC = 0.55;
const DEBILITY_MITIGATION_POSITIONAL_FRAC = 0.28;
function receptionMitigationFor(planet, lon, natalChart) {
  const sign = signOf(lon);
  const hosts = receptionHostsOfSign(sign).filter(h => h.planet !== planet && CLASSICAL_PLANETS.includes(h.planet));
  for (const host of hosts) {
    const hostLon = natalChart.positions[host.planet];
    if (hostLon == null) continue;
    const asp = bestAspectBetween(lon, hostLon, planet, host.planet);
    if (asp) return { tier: 'aspecto', host: host.planet, types: host.types, aspect: asp.aspect };
  }
  const positional = hosts.find(h => natalChart.positions[h.planet] != null);
  if (positional) return { tier: 'posicional', host: positional.planet, types: positional.types };
  return null;
}
function rulerConditionMarkers(rulers, natalChart, isDay, rulerWeightFn, speeds) {
  const markers = [];
  rulers.forEach(planet => {
    if (!CLASSICAL_PLANETS.includes(planet)) return;
    const lon = natalChart.positions[planet];
    if (lon == null) return;
    const rw = rulerWeightFn(planet);
    const sign = signOf(lon);
    const { score, parts } = dignityPointsFor(planet, lon, isDay === null ? false : isDay);
    const usableParts = isDay === null ? parts.filter(p => p.type !== 'triplicidade') : parts;
    const usableScore = usableParts.reduce((s, p) => s + p.pts, 0);
    if (usableScore > 0) {
      const w = RULER_DIGNITY_WEIGHT * rw * Math.min(1, usableScore / 5);
      const partLabels = usableParts.map(p => DIGNITY_LABEL[p.type]).join(' + ');
      markers.push({ frac: 1, w, text: `${PLANET_LABEL[planet]} em ${SIGNS[sign]} — ${partLabels} (regente com dignidade)` });
    } else {
      const isDayCaveat = isDay === null ? ' (Triplicidade não avaliada — sem hora de nascimento)' : '';
      markers.push({ frac: PEREGRINE_FRAC, w: RULER_PEREGRINE_WEIGHT * rw, text: `${PLANET_LABEL[planet]} em ${SIGNS[sign]} — Peregrino, sem dignidade essencial própria (regente errático/instável)${isDayCaveat}` });
    }
    const debs = debilitiesFor(planet, lon);
    if (debs.length) {
      const w = RULER_DEBILITY_WEIGHT * rw;
      const debLabel = debs.map(d => d === 'queda' ? 'Queda' : 'Detrimento').join(' + ');
      const mitig = receptionMitigationFor(planet, lon, natalChart);
      if (mitig) {
        const typeLabel = mitig.types.map(t => RECEPTION_TYPE_LABEL[t]).join(' + ');
        if (mitig.tier === 'aspecto') {
          markers.push({ frac: DEBILITY_MITIGATION_ASPECT_FRAC, w, text: `${PLANET_LABEL[planet]} em ${SIGNS[sign]} — ${debLabel}, mas recebido (${typeLabel}) por ${PLANET_LABEL[mitig.host]} em aspecto — debilidade bastante mitigada` });
        } else {
          markers.push({ frac: DEBILITY_MITIGATION_POSITIONAL_FRAC, w, text: `${PLANET_LABEL[planet]} em ${SIGNS[sign]} — ${debLabel}, recebido (${typeLabel}) por ${PLANET_LABEL[mitig.host]} só posicionalmente (sem aspecto) — debilidade parcialmente mitigada` });
        }
      } else {
        markers.push({ frac: 0, w, text: `${PLANET_LABEL[planet]} em ${SIGNS[sign]} — ${debLabel} (regente debilitado)` });
      }
    }
    if (speeds && RETROGRADE_CAPABLE.includes(planet) && speeds[planet] != null && speeds[planet] < 0) {
      markers.push({ frac: RETROGRADE_FRAC, w: RULER_RETROGRADE_WEIGHT * rw, text: `${PLANET_LABEL[planet]} retrógrado — regente com efeito represado/introspectivo (debilidade acidental)` });
    }
    const combustion = combustionCheck(planet, natalChart.positions);
    if (combustion === 'combusto') {
      markers.push({ frac: 0.1, w: RULER_COMBUSTION_WEIGHT * rw, text: `${PLANET_LABEL[planet]} combusto (muito perto do Sol) — regente enfraquecido` });
    } else if (combustion === 'cazimi') {
      markers.push({ frac: 0.9, w: RULER_COMBUSTION_WEIGHT * rw, text: `${PLANET_LABEL[planet]} cazimi (no coração do Sol) — regente fortalecido` });
    } else if (underBeamsCheck(planet, natalChart.positions)) {
      markers.push({ frac: UNDER_BEAMS_FRAC, w: RULER_UNDER_BEAMS_WEIGHT * rw, text: `${PLANET_LABEL[planet]} sob os raios (entre 8°30' e 17° do Sol) — regente ofuscado, enfraquecimento mais brando que a combustão` });
    }
    if (natalChart.hasHouses) {
      const house = houseOf(lon, natalChart.cusps);
      const hayz = hayzStatus(planet, sign, house, isDay);
      if (hayz === 'hayz') {
        markers.push({ frac: HAYZ_FRAC, w: RULER_HAYZ_WEIGHT * rw, text: `${PLANET_LABEL[planet]} em Hayz (seita + posição acima/abaixo do horizonte + gênero do signo alinhados) — regente fortalecido` });
      } else if (hayz === 'contra-hayz') {
        markers.push({ frac: CONTRA_HAYZ_FRAC, w: RULER_HAYZ_WEIGHT * rw, text: `${PLANET_LABEL[planet]} contrário a Hayz (seita + posição + gênero do signo desalinhados) — regente enfraquecido` });
      }
      if (JOY_HOUSE_BY_PLANET[planet] === house) {
        markers.push({ frac: JOY_FRAC, w: RULER_JOY_WEIGHT * rw, text: `${PLANET_LABEL[planet]} na própria Casa de Gozo (Casa ${house}) — regente atuando com mais naturalidade` });
      }
    }
  });
  return markers;
}

// ---------------------------------------------------------------------------
// Regente do Ascendente — separado das 5 categorias temáticas de propósito:
// não é "mais um marcador de uma área da vida", é o significador do mapa
// como um todo na regência tradicional (onde está o dono da Casa 1, em que
// casa ele cai, com que dignidade) — por isso o pilar mais citado de leitura de
// perfil que faltava (ver conversa de design). Exige Ascendente exato
// (hasHouses); sem hora/local não há signo do Asc confiável, então retorna
// null (mesmo padrão de computeSect/computeAlmutenAscendentis).
//
// Reaproveita rulerConditionMarkers (dignidade/debilidade/combustão) e
// houseValenceFracFor (valência casa+planeta) já usados nas 5 categorias —
// não é uma pontuação nova, é o mesmo motor de tom aplicado a UM planeta
// (o regente) em vez de a um grupo. Peso do próprio regente aqui é sempre
// 1.0 (não há "regente do regente" pra ponderar).
// ---------------------------------------------------------------------------
const ASC_RULER_HOUSE_WEIGHT = HOUSE_VALENCE_WEIGHT;
export function computeAscendantRuler(natalChart, isDay, speeds) {
  if (!natalChart.hasHouses || natalChart.asc == null) return null;
  const ascSignIdx = signOf(natalChart.asc);
  const ruler = DOMICILE_RULER[ascSignIdx];
  const lon = natalChart.positions[ruler];
  if (lon == null) return null;

  const rulerSignIdx = signOf(lon);
  const house = houseOf(lon, natalChart.cusps);
  const conjunctAsc = house === 1;

  const harmonicDetails = [], ambivalentDetails = [], tenseDetails = [];
  let toneWeight = 0, harmWeight = 0;

  // Casa onde o regente cai — mesma valência casa+planeta das 5 categorias
  // (HOUSE_NATURE_VALENCE + HOUSE_PLANET_VALENCE quando o planeta tem lado
  // próprio); reforçada (×1.2) quando o regente está conjunto ao próprio
  // Ascendente (Casa 1), que a tradição trata como condição
  // particularmente forte, não só "mais uma casa".
  const houseFrac = houseValenceFracFor(ruler, house);
  const houseW = ASC_RULER_HOUSE_WEIGHT * (conjunctAsc ? 1.2 : 1);
  toneWeight += houseW;
  harmWeight += houseW * houseFrac;
  const houseText = conjunctAsc
    ? `${PLANET_LABEL[ruler]} (regente do Asc) conjunto ao próprio Ascendente, na Casa 1`
    : `${PLANET_LABEL[ruler]} (regente do Asc) na Casa ${house}`;
  pushByFrac(houseFrac, houseText, harmonicDetails, ambivalentDetails, tenseDetails);

  // Dignidade/debilidade/combustão do próprio regente — mesmo cálculo usado
  // pro regente de cada categoria (rulerConditionMarkers), com peso 1.0.
  rulerConditionMarkers([ruler], natalChart, isDay, () => 1, speeds).forEach(d => {
    toneWeight += d.w;
    harmWeight += d.w * d.frac;
    pushByFrac(d.frac, d.text, harmonicDetails, ambivalentDetails, tenseDetails);
  });

  const harmonyPct = toneWeight >= MIN_HARMONY_SIGNAL ? Math.round(100 * harmWeight / toneWeight) : null;

  return {
    ruler,
    ascSign: SIGNS[ascSignIdx],
    rulerSign: SIGNS[rulerSignIdx],
    house,
    conjunctAsc,
    harmonyPct,
    harmonicDetails,
    ambivalentDetails,
    tenseDetails,
  };
}

// ---------------------------------------------------------------------------
// Regência de casa em geral (regência tradicional): até aqui o único "quem
// rege a Casa X" calculado era o regente do Ascendente (computeAscendantRuler,
// sempre Casa 1). Nas 5 categorias, o Perfil usava só "planeta natural + par
// de casas" (ex.: Mercúrio + Casas 3/9 pra Intelectual) — sem nunca perguntar
// quem de fato rege a Casa 3 e a Casa 9 NESTE mapa (dono do signo na
// cúspide), que pode ser um planeta diferente do natural. Isso é regência
// tradicional de verdade — sinalizada na conversa de design como a ausência
// maior, maior que qualquer uma das revisões anteriores.
//
// computeHouseRulerMarkers busca, pra cada casa do par da categoria, o
// regente por domicílio do signo na cúspide (DOMICILE_RULER), e — quando esse
// regente NÃO é já um dos rulers naturais da categoria (pra não contar
// Mercúrio duas vezes quando a cúspide da Casa 3 calha de ser Gêmeos/Virgem)
// — adiciona sua posição (casa + valência) e condição (dignidade/debilidade/
// combustão/peregrino/Hayz, via rulerConditionMarkers) como marcadores extras
// da categoria. Exige cúspides exatas (hasHouses); sem hora/local retorna []
// (mesma ressalva de sempre — mesmo padrão de computeAscendantRuler).
//
// HOUSE_RULER_WEIGHT_FACTOR=0.7: peso relativo ao do regente natural (1.0) —
// calibração minha, não doutrina. O regente topical de UMA casa do par pesa
// menos que o planeta natural da categoria (que cobre as duas casas do par
// ao mesmo tempo e é o significador mais citado da área como um todo), mas
// ainda mais que um aspecto solto — é corroboração, não substituição.
//
// REVISÃO 12 (regência por Almuten): até aqui "quem rege a Casa X" e "quem
// dispõe a Fortuna" (ver computeFortune abaixo) usavam só DOMICILE_RULER —
// dono do domicílio do signo na cúspide, ignorando que outro planeta pode
// ter mais dignidade essencial combinada (Exaltação+Triplicidade+Termo+Face)
// naquele grau exato sem ser o dono do domicílio ali. Troca pra
// computeAlmutenOf (dignities.js, mesma pontuação do Almuten Ascendentis),
// aplicado ao grau EXATO da cúspide — não só o signo — pra também captar
// Termo/Face, que variam dentro do signo. Empate (Almuten com 2+ vencedores)
// deixa de ser um problema resolvido à força: cada vencedor entra como
// marcador próprio, com o peso de HOUSE_RULER_WEIGHT_FACTOR dividido entre
// eles (mesmo orçamento de peso total de antes, só distribuído).
// ---------------------------------------------------------------------------
const HOUSE_RULER_WEIGHT_FACTOR = 0.7;
function computeHouseRulerMarkers(meta, natalChart, isDay, speeds) {
  if (!natalChart.hasHouses) return [];
  const found = new Set();
  const markers = [];
  meta.houses.forEach(houseNum => {
    const cuspLon = natalChart.cusps[houseNum - 1];
    if (cuspLon == null) return;
    const almuten = computeAlmutenOf(cuspLon, isDay === null ? false : isDay);
    const winners = almuten.winners;
    const rulerWeight = HOUSE_RULER_WEIGHT_FACTOR / winners.length;
    winners.forEach(ruler => {
      if (meta.rulers.includes(ruler) || found.has(ruler)) return;
      found.add(ruler);
      const lon = natalChart.positions[ruler];
      if (lon == null) return;
      const rulerHouse = houseOf(lon, natalChart.cusps);
      const rulerSignIdx = signOf(lon);
      const houseFrac = houseValenceFracFor(ruler, rulerHouse);
      const w = HOUSE_VALENCE_WEIGHT * rulerWeight;
      const tieNote = winners.length > 1 ? ` — Almuten empatado com ${winners.filter(x => x !== ruler).map(x => PLANET_LABEL[x]).join(', ')}` : '';
      const text = `${PLANET_LABEL[ruler]} (Almuten da Casa ${houseNum}${tieNote}) em ${SIGNS[rulerSignIdx]}, na Casa ${rulerHouse}`;
      markers.push({ frac: houseFrac, w, text });
      rulerConditionMarkers([ruler], natalChart, isDay, () => rulerWeight, speeds).forEach(d => markers.push(d));
    });
  });
  return markers;
}

// ---------------------------------------------------------------------------
// Parte da Fortuna — REVISÃO 7: ponto derivado (ver fortunaLon em
// core/aspects.js, já usada noutras telas do app) até aqui não entrava em
// nada do Perfil. Fortuna não é planeta — não tem dignidade essencial
// própria —, então a leitura tradicional pra ela é: em que Casa cai
// (valência da própria casa, HOUSE_NATURE_VALENCE — não HOUSE_PLANET_VALENCE,
// que é por planeta) e quem é seu dispositor (regente por domicílio do
// signo em que cai), cuja condição (dignidade/debilidade/combustão/
// peregrino/Hayz) empresta força ou fragilidade à Fortuna por associação —
// reaproveita rulerConditionMarkers, mesmo padrão do regente do Ascendente.
//
// Exposta em dois lugares: bloco próprio no retorno de computeNatalProfile
// (`fortune`, mesmo formato de `ascendantRuler`) e como marcador extra
// dentro de qualquer categoria cujo par de casas inclua a Casa da Fortuna
// (ver `fortuneHouse` em computeCategory) — dois mapas com presença/
// harmonia idênticas nas 5 categorias por aspecto ainda podem diferir se um
// tem a Fortuna caindo numa das casas da categoria e o outro não. Exige
// Ascendente exato (hasHouses); sem hora/local retorna null.
// ---------------------------------------------------------------------------
const FORTUNA_CATEGORY_WEIGHT = 0.4;
// REVISÃO 13: mesmo peso da Fortuna — Espírito tem o mesmo estatuto dela pro
// Perfil (ponto derivado da tríade Asc/Sol/Lua, sem corpo físico próprio),
// não há razão astrológica pra pesar mais ou menos que ela aqui.
const ESPIRITO_CATEGORY_WEIGHT = 0.4;

// ---------------------------------------------------------------------------
// Núcleo compartilhado entre Fortuna e Espírito (REVISÃO 13): os dois são
// pontos derivados da mesma tríade Asc/Sol/Lua, sem dignidade essencial
// própria, e recebem exatamente a mesma leitura — valência da Casa onde caem
// (HOUSE_NATURE_VALENCE) + condição do dispositor (regente por domicílio do
// signo em que caem, via rulerConditionMarkers). `dispositorPhrase` é só o
// texto que muda entre os dois ("da Fortuna" / "do Espírito", concordância
// de "de" com o artigo de cada um).
// ---------------------------------------------------------------------------
function computeDerivedPointProfile(natalChart, isDay, speeds, lon, label, dispositorPhrase) {
  if (!natalChart.hasHouses || natalChart.asc == null) return null;
  const signIdx = signOf(lon);
  const house = houseOf(lon, natalChart.cusps);
  const almuten = computeAlmutenOf(lon, isDay === null ? false : isDay);
  const dispositors = almuten.winners;

  const harmonicDetails = [], ambivalentDetails = [], tenseDetails = [];
  let toneWeight = 0, harmWeight = 0;

  const houseFrac = HOUSE_NATURE_VALENCE[house] ?? 0.5;
  toneWeight += HOUSE_VALENCE_WEIGHT;
  harmWeight += HOUSE_VALENCE_WEIGHT * houseFrac;
  pushByFrac(houseFrac, `${label} na Casa ${house}`, harmonicDetails, ambivalentDetails, tenseDetails);

  const dispositorWeight = 1 / dispositors.length;
  dispositors.forEach(dispositor => {
    const dispositorLon = natalChart.positions[dispositor];
    if (dispositorLon == null) return;
    const tieNote = dispositors.length > 1 ? `, empatado com ${dispositors.filter(x => x !== dispositor).map(x => PLANET_LABEL[x]).join(', ')}` : '';
    rulerConditionMarkers([dispositor], natalChart, isDay, () => dispositorWeight, speeds).forEach(d => {
      toneWeight += d.w;
      harmWeight += d.w * d.frac;
      pushByFrac(d.frac, `${d.text} (dispositor ${dispositorPhrase}${tieNote})`, harmonicDetails, ambivalentDetails, tenseDetails);
    });
  });

  const harmonyPct = toneWeight >= MIN_HARMONY_SIGNAL ? Math.round(100 * harmWeight / toneWeight) : null;

  // Lista de dispositores com signo — REVISÃO 12: computeAlmutenOf pode
  // empatar (2+ vencedores), então dispositor deixa de ser um único
  // planeta; dispositors traz um item por vencedor. dispositor/
  // dispositorSign (singular) ficam como espelho do primeiro da lista só
  // pra quem ainda lê esses campos sem checar o array — sempre o mesmo
  // valor de antes quando não há empate.
  const dispositorDetails = dispositors
    .map(planet => {
      const dLon = natalChart.positions[planet];
      return dLon == null ? null : { planet, sign: SIGNS[signOf(dLon)] };
    })
    .filter(Boolean);

  return {
    sign: SIGNS[signIdx],
    house,
    dispositors: dispositorDetails,
    dispositor: dispositorDetails[0]?.planet ?? null,
    dispositorSign: dispositorDetails[0]?.sign ?? null,
    harmonyPct,
    harmonicDetails,
    ambivalentDetails,
    tenseDetails,
  };
}
export function computeFortune(natalChart, isDay, speeds) {
  if (!natalChart.hasHouses || natalChart.asc == null) return null;
  return computeDerivedPointProfile(natalChart, isDay, speeds, fortunaLon(natalChart), 'Parte da Fortuna', 'da Fortuna');
}
// REVISÃO 13 (Parte do Espírito): espelho exato de computeFortune, trocando
// só a longitude (espiritoLon em vez de fortunaLon) e os textos — ver nota no
// topo de computeDerivedPointProfile.
export function computeEspirito(natalChart, isDay, speeds) {
  if (!natalChart.hasHouses || natalChart.asc == null) return null;
  return computeDerivedPointProfile(natalChart, isDay, speeds, espiritoLon(natalChart), 'Parte do Espírito', 'do Espírito');
}

// ---------------------------------------------------------------------------
// Stellium / predominância de signo — REVISÃO 8: computeDensity
// (structural.js) já calcula concentrações de 3+ corpos no mesmo signo ou na
// mesma casa, mas isso nunca influenciava o Perfil. Um stellium de SIGNO
// conta pra uma categoria quando o regente por domicílio desse signo é um
// dos rulers naturais dela (ex.: stellium em Gêmeos/Virgem conta pra
// Intelectual, cujo regente é Mercúrio); um stellium de CASA conta quando a
// casa é uma das do par da categoria. Marcador de intensidade, não de tom:
// frac fixo em 0.5 (a tradição não atribui valência automática a um
// stellium), com peso proporcional ao número de corpos — puxa a PRESENÇA da
// categoria pra cima sem arrastar a harmonia pra nenhum lado; harmonyPct
// tende a diluir em direção a 50% quando há stellium nela, que é o
// comportamento certo (mais peso, tom mais misto) em vez de inflar um lado.
// ---------------------------------------------------------------------------
const STELLIUM_FRAC = 0.5;
const STELLIUM_WEIGHT_PER_BODY = 0.22;
function computeStelliumMarkers(meta, density) {
  const markers = [];
  if (!density) return markers;
  density.signStelliums.forEach(s => {
    if (!meta.rulers.includes(DOMICILE_RULER[s.sign])) return;
    const w = STELLIUM_WEIGHT_PER_BODY * s.bodies.length;
    const text = `Stellium em ${SIGNS[s.sign]} (${s.bodies.map(b => PLANET_LABEL[b]).join(', ')}) — signo regido por ${PLANET_LABEL[DOMICILE_RULER[s.sign]]}`;
    markers.push({ frac: STELLIUM_FRAC, w, text });
  });
  if (density.hasHouses) {
    density.houseStelliums.forEach(h => {
      if (!meta.houses.includes(h.house)) return;
      const w = STELLIUM_WEIGHT_PER_BODY * h.bodies.length;
      const text = `Stellium na Casa ${h.house} (${h.bodies.map(b => PLANET_LABEL[b]).join(', ')})`;
      markers.push({ frac: STELLIUM_FRAC, w, text });
    });
  }
  return markers;
}

// ---------------------------------------------------------------------------
// Velocidade diária de cada corpo (graus/dia, sinal negativo = retrógrado) —
// mesma diferença finita (posição de hoje menos posição de ontem) já usada em
// features/natal.js (speedsTableHtml/speedsTableMd) pra "Velocidades
// planetárias"; recalculada aqui de forma autocontida (profile.js não
// importa nada de features/). Alimenta motionOf (aplicativo/separativo) e,
// desde a REVISÃO 10, também o marcador de retrogradação em
// rulerConditionMarkers. Sem natalChart.T (não deveria acontecer no fluxo
// normal, mas defensivo), retorna null e ambos degradam sem essa camada
// (aspecto sem aplicativo/separativo, regente sem marcador de retrogradação).
// ---------------------------------------------------------------------------
function computeSpeeds(natalChart) {
  if (natalChart.T == null) return null;
  const prev = computeDayPositions(natalChart.T - 1 / 36525);
  const speeds = {};
  STRUCTURAL_BODIES.forEach(name => {
    const now = natalChart.positions[name], before = prev[name];
    if (now == null || before == null) return;
    let d = now - before;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    speeds[name] = d;
  });
  return speeds;
}

// ---------------------------------------------------------------------------
// Aplicativo vs. separativo — ver REVISÃO 9 no topo do arquivo. motionOf
// projeta as duas longitudes um pouco à frente no tempo (MOTION_PROJECTION_
// DAYS) usando a velocidade diária de cada corpo e compara o orbe agora com
// o orbe projetado: orbe menor à frente = aplicativo, maior = separativo.
// Projeção curta (6h) de propósito — suficiente pra pegar o sinal da
// variação mesmo pra Lua (~13°/dia) sem passar do exato e inverter o sinal
// por overshoot. O efeito entra só como multiplicador de peso do marcador
// (APPLYING_WEIGHT_MULT/SEPARATING_WEIGHT_MULT), nunca do tom.
// ---------------------------------------------------------------------------
const MOTION_PROJECTION_DAYS = 0.25;
const APPLYING_WEIGHT_MULT = 1.15;
const SEPARATING_WEIGHT_MULT = 0.85;
function motionOf(lon1, lon2, angle, speed1, speed2) {
  if (speed1 == null || speed2 == null) return null;
  const orbNow = orbFromAspect(lon2, lon1, angle);
  const orbFuture = orbFromAspect(lon2 + speed2 * MOTION_PROJECTION_DAYS, lon1 + speed1 * MOTION_PROJECTION_DAYS, angle);
  if (orbFuture < orbNow - 1e-6) return 'aplicativo';
  if (orbFuture > orbNow + 1e-6) return 'separativo';
  return null;
}
function motionWeightMult(motion) {
  if (motion === 'aplicativo') return APPLYING_WEIGHT_MULT;
  if (motion === 'separativo') return SEPARATING_WEIGHT_MULT;
  return 1.0;
}
const ASPECT_ANGLE_BY_NAME = Object.fromEntries(ASPECTS.map(a => [a.name, a.angle]));

function bestAspectBetween(lon1, lon2, nameA, nameB, speed1, speed2) {
  let best = null;
  for (const asp of ASPECTS) {
    const orb = orbFromAspect(lon1, lon2, asp.angle);
    const maxOrb = effectiveMaxOrb(asp, nameA, nameB);
    if (orb <= maxOrb && (!best || orb < best.orb)) {
      best = { aspect: asp.name, glyph: asp.glyph, orb, maxOrb, w: asp.w };
    }
  }
  if (best) best.motion = motionOf(lon1, lon2, ASPECT_ANGLE_BY_NAME[best.aspect], speed1, speed2);
  return best;
}

// Todos os aspectos intra-mapa entre os corpos "estruturais" (mesma lista de
// structural.js — os 10 planetas clássicos+modernos, sem pontos derivados).
function computeAllAspects(natalChart, speeds) {
  const bodies = STRUCTURAL_BODIES.filter(n => natalChart.positions[n] != null);
  const list = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const p1 = bodies[i], p2 = bodies[j];
      const s1 = speeds ? speeds[p1] : null, s2 = speeds ? speeds[p2] : null;
      const a = bestAspectBetween(natalChart.positions[p1], natalChart.positions[p2], p1, p2, s1, s2);
      if (a) list.push({ p1, p2, ...a });
    }
  }
  return list;
}

function computeGlobalAxes(allAspects, isDay, positions) {
  const eligible = allAspects.filter(a => !(OUTER.includes(a.p1) && OUTER.includes(a.p2)));
  if (eligible.length === 0) return { nitidez: null, harmonia: null, eligibleCount: 0 };
  const tightCount = eligible.filter(a => a.orb <= a.maxOrb * TIGHT_ORB_FRACTION).length;
  const nitidez = Math.round(100 * tightCount / eligible.length);
  let harmSum = 0;
  eligible.forEach(a => { harmSum += blendedHarmonyFrac(a.aspect, a.p1, a.p2, isDay, positions); });
  const harmonia = Math.round(100 * harmSum / eligible.length);
  return { nitidez, harmonia, eligibleCount: eligible.length };
}

function computeCategory(meta, natalChart, allAspects, isDay, density, fortuneHouse, espiritoHouse, speeds) {
  const rulers = meta.rulers;
  const rw = (planet) => rulerWeightOf(meta, planet);
  const aspectMarkers = allAspects.filter(a => rulers.includes(a.p1) || rulers.includes(a.p2));

  const houseMarkers = [];
  if (natalChart.hasHouses) {
    STRUCTURAL_BODIES.forEach(p => {
      if (natalChart.positions[p] == null) return;
      const h = houseOf(natalChart.positions[p], natalChart.cusps);
      if (meta.houses.includes(h)) houseMarkers.push({ planet: p, house: h, isRuler: rulers.includes(p) });
    });
  }

  const dignityMarkers = rulerConditionMarkers(rulers, natalChart, isDay, rw, speeds);
  const houseRulerMarkers = computeHouseRulerMarkers(meta, natalChart, isDay, speeds);
  const stelliumMarkers = computeStelliumMarkers(meta, density);
  const fortunaMarkers = (fortuneHouse != null && meta.houses.includes(fortuneHouse))
    ? [{ frac: HOUSE_NATURE_VALENCE[fortuneHouse] ?? 0.5, w: FORTUNA_CATEGORY_WEIGHT, text: `Parte da Fortuna na Casa ${fortuneHouse} (própria da categoria)` }]
    : [];
  // REVISÃO 13: mesmo marcador da Fortuna acima, espelhado pro Espírito —
  // ver comentário da REVISÃO 13 mais acima no arquivo.
  const espiritoMarkers = (espiritoHouse != null && meta.houses.includes(espiritoHouse))
    ? [{ frac: HOUSE_NATURE_VALENCE[espiritoHouse] ?? 0.5, w: ESPIRITO_CATEGORY_WEIGHT, text: `Parte do Espírito na Casa ${espiritoHouse} (própria da categoria)` }]
    : [];

  // Peso do marcador de aspecto escalado pelo peso do(s) regente(s) que
  // participam dele — em Ação/Vontade, um aspecto ao Marte pesa mais do que
  // o mesmo aspecto ao Sol (ver ACAO_RULER_WEIGHTS).
  const aspectRulerWeight = (a) => Math.max(
    rulers.includes(a.p1) ? rw(a.p1) : 0,
    rulers.includes(a.p2) ? rw(a.p2) : 0,
  );

  // Presença: soma ponderada de marcadores (aspecto: peso do aspecto × quão
  // exato × peso do regente envolvido; casa: peso fixo, maior se for o(s)
  // próprio(s) regente(s) da categoria na casa; dignidade/debilidade/
  // combustão do regente: peso próprio) passada por uma curva de saturação —
  // cresce rápido com os primeiros marcadores e se achata perto de 100, em
  // vez de precisar de um teto arbitrário calibrado por categoria.
  let weightSum = 0;
  aspectMarkers.forEach(a => { weightSum += a.w * Math.max(0, 1 - a.orb / a.maxOrb) * aspectRulerWeight(a) * motionWeightMult(a.motion); });
  houseMarkers.forEach(h => { weightSum += (h.isRuler ? 0.6 * rw(h.planet) : 0.35); });
  dignityMarkers.forEach(d => { weightSum += d.w; });
  houseRulerMarkers.forEach(d => { weightSum += d.w; });
  stelliumMarkers.forEach(d => { weightSum += d.w; });
  fortunaMarkers.forEach(d => { weightSum += d.w; });
  // REVISÃO 13: mesma soma da Fortuna acima, espelhada pro Espírito.
  espiritoMarkers.forEach(d => { weightSum += d.w; });
  const presence = Math.round(100 * (1 - Math.exp(-weightSum / 2)));

  // Harmonia da categoria: aspectos (geometria + natureza/seita dos
  // planetas, ver blendedHarmonyFrac) + marcadores de casa (valência da
  // própria casa combinada com a do planeta, quando o planeta tem uma) +
  // condição do regente (dignidade/debilidade/combustão). Cada linha nasce
  // com seu próprio emoji de tom (🟢/🟡/🔴) — mesmo esquema visual da
  // Sinastria (ver sinastria/js/scoring.js, formatMarkerDetail), pra o hover
  // das barras ficar consistente entre as duas telas: lista corrida com
  // emoji por linha, sem cabeçalho de seção agrupando por tom (ver
  // features/profile.js).
  let toneWeight = 0, harmWeight = 0;
  const harmonicDetails = [], ambivalentDetails = [], tenseDetails = [], houseDetails = [];
  aspectMarkers.forEach(a => {
    const w = a.w * Math.max(0, 1 - a.orb / a.maxOrb) * aspectRulerWeight(a) * motionWeightMult(a.motion);
    if (w <= 0) return;
    toneWeight += w;
    const frac = blendedHarmonyFrac(a.aspect, a.p1, a.p2, isDay, natalChart.positions);
    harmWeight += w * frac;
    const recep = receptionBetween(a.p1, a.p2, natalChart.positions);
    const receptionSuffix = recep ? ` — ${receptionText(a.p1, a.p2, recep)}` : '';
    const motionSuffix = a.motion ? `, ${a.motion}` : '';
    const base = `${PLANET_LABEL[a.p1]} ${a.aspect} ${PLANET_LABEL[a.p2]} — orbe ${a.orb.toFixed(1)}°${motionSuffix}${receptionSuffix}`;
    pushByFrac(frac, base, harmonicDetails, ambivalentDetails, tenseDetails);
  });
  houseMarkers.forEach(h => {
    const houseLabel = `${PLANET_LABEL[h.planet]} na Casa ${h.house}`;
    const frac = houseValenceFracFor(h.planet, h.house);
    const w = HOUSE_VALENCE_WEIGHT * (h.isRuler ? 1.2 * rw(h.planet) : 1);
    toneWeight += w;
    harmWeight += w * frac;
    // Toda casa agora tem valência (planeta+casa combinados, ver
    // houseValenceFracFor) — por isso entra colorida em harmonic/ambivalent/
    // tenseDetails, e `houseDetails` (o antigo balde "presença sem lado")
    // fica de propósito vazio; mantido no retorno só por compatibilidade com
    // features/profile.js, que ainda espreme esse array na lista do hover.
    pushByFrac(frac, `🏠 ${houseLabel}`, harmonicDetails, ambivalentDetails, tenseDetails);
  });
  dignityMarkers.forEach(d => {
    toneWeight += d.w;
    harmWeight += d.w * d.frac;
    pushByFrac(d.frac, d.text, harmonicDetails, ambivalentDetails, tenseDetails);
  });
  houseRulerMarkers.forEach(d => {
    toneWeight += d.w;
    harmWeight += d.w * d.frac;
    pushByFrac(d.frac, d.text, harmonicDetails, ambivalentDetails, tenseDetails);
  });
  stelliumMarkers.forEach(d => {
    toneWeight += d.w;
    harmWeight += d.w * d.frac;
    pushByFrac(d.frac, d.text, harmonicDetails, ambivalentDetails, tenseDetails);
  });
  fortunaMarkers.forEach(d => {
    toneWeight += d.w;
    harmWeight += d.w * d.frac;
    pushByFrac(d.frac, d.text, harmonicDetails, ambivalentDetails, tenseDetails);
  });
  // REVISÃO 13: mesmo tratamento da Fortuna acima, espelhado pro Espírito.
  espiritoMarkers.forEach(d => {
    toneWeight += d.w;
    harmWeight += d.w * d.frac;
    pushByFrac(d.frac, d.text, harmonicDetails, ambivalentDetails, tenseDetails);
  });

  const harmonyPct = toneWeight >= MIN_HARMONY_SIGNAL ? Math.round(100 * harmWeight / toneWeight) : null;
  const eligibleCount = aspectMarkers.length + houseMarkers.length + dignityMarkers.length + houseRulerMarkers.length + stelliumMarkers.length + fortunaMarkers.length + espiritoMarkers.length;

  return { presence, harmonyPct, eligibleCount, harmonicDetails, ambivalentDetails, tenseDetails, houseDetails };
}

function buildHeadline(categories, axes, hasHouses) {
  const sorted = PROFILE_CATEGORY_KEYS.slice().sort((a, b) => categories[b].presence - categories[a].presence);
  const top = sorted[0], second = sorted[1];
  let base;
  if (categories[top].presence === 0) {
    base = 'Perfil sem predominância clara';
  } else if (categories[second] && (categories[top].presence - categories[second].presence) <= 8) {
    base = `Perfil ${PROFILE_CATEGORIES[top].adjective}-${PROFILE_CATEGORIES[second].adjective}`;
  } else {
    base = `Perfil ${PROFILE_CATEGORIES[top].adjective}`;
  }
  if (axes.nitidez === null) return base + ', poucos aspectos exatos no mapa pra uma leitura mais nítida.';
  const nitDesc = axes.nitidez >= 60 ? 'bem definido' : (axes.nitidez >= 35 ? 'moderadamente definido' : 'difuso');
  const harmDesc = axes.harmonia >= 60 ? 'majoritariamente harmônico' : (axes.harmonia >= 40 ? 'com tensão e fluidez em equilíbrio' : 'majoritariamente tenso');
  let headline = `${base}, ${nitDesc} e ${harmDesc}`;
  if (!hasHouses) headline += ' (sem hora/local completos — casas não entraram na leitura)';
  return headline + '.';
}

export function computeNatalProfile(natalChart) {
  // Seita (diurno/noturno) do mapa — alimenta o benéfico/maléfico ajustado
  // (natureFracOf) e a dignidade de triplicidade (rulerConditionMarkers).
  // null quando não há hora/local (sem casas): as duas camadas caem pro
  // valor clássico sem ajuste de seita nesse caso (ver comentários acima).
  const sect = natalChart.hasHouses ? computeSect(natalChart) : null;
  const isDay = sect ? sect.diurno : null;
  const speeds = computeSpeeds(natalChart);
  const allAspects = computeAllAspects(natalChart, speeds);
  const axes = computeGlobalAxes(allAspects, isDay, natalChart.positions);
  const density = computeDensity(natalChart);
  const fortune = computeFortune(natalChart, isDay, speeds);
  const fortuneHouse = fortune ? fortune.house : null;
  // REVISÃO 13: mesmo cálculo da Fortuna acima, espelhado pro Espírito.
  const espirito = computeEspirito(natalChart, isDay, speeds);
  const espiritoHouse = espirito ? espirito.house : null;
  const categories = {};
  PROFILE_CATEGORY_KEYS.forEach(key => {
    categories[key] = computeCategory(PROFILE_CATEGORIES[key], natalChart, allAspects, isDay, density, fortuneHouse, espiritoHouse, speeds);
  });
  const ascendantRuler = computeAscendantRuler(natalChart, isDay, speeds);
  const headline = buildHeadline(categories, axes, !!natalChart.hasHouses);
  return { categories, axes, headline, hasHouses: !!natalChart.hasHouses, isDay, ascendantRuler, fortune, espirito };
}
