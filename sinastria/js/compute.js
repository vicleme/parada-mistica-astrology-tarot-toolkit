/**
 * compute.js — O motor central do app: computeScores() agrega os aspectos e
 * casas já parseados em scores por categoria/eixo e marcadores narrativos;
 * classify() transforma esses scores no veredito textual; computeVinculoProfile()
 * monta a leitura de "pra que serve esse vínculo"; catMetaFor() expõe metadados
 * de categoria pro resto do app. Ver README para o fluxo completo.
 * Depende de: comparisons.js (import circular intencional, ver README),
 * calibration.js, labels.js, pairs.js, houses.js, parser.js.
 * Usado por: charts.js, comparisons.js, dictionary.js, labels.js (circular),
 * main.js, report.js.
 */

import { potentialScore } from './comparisons.js';
import { CALIBRATION, HOUSE_PLANET_VALENCE } from './calibration.js';
import { generationalDiscount as generationalDiscountFor, orbDecay, reciprocityBoost as reciprocityBoostFor } from '../../astro/js/core/weights.js';
import { CAT_META, EXTREME_TEXT_BY_TYPE, IMBALANCE_TEXT_BY_TYPE, PAIR_INFO_BY_TYPE, PLANET_LABEL_PT, SEXUAL_LABEL_BY_TYPE, VINCULO_CHEM_NOUN_BY_TYPE, VINCULO_MATRIX, VINCULO_TERMS_BY_TYPE } from './labels.js';
import { CORE_PERSONAL_PLANETS, DESTINY_ANCHORS, MARRIAGE_HOUSES, TRANSPERSONAL_PLANETS, VERTEX_FATED_TARGETS } from './pairs.js';
import { computeChironPartnershipHouse, computeCommitmentHouses, computeDestinyHouses, computeFriendshipHouses, computeHouseConvergence, computePlutoPartnershipHouse } from './houses.js';
import { aspectCategoryMult, computeLuminarySwap, effectiveMaxOrb, reciprocityCounts } from './parser.js';
import { axisBoost, axisPoolFor, categoryPoolFor, categoryPoolForHouse, formatMarkerDetail, harmonicFraction, houseAngularityMult, markerCategory } from './scoring.js';

// Histórico: a v1 do vinculoProfile (aposentada — ver bloco v2 logo abaixo) tentava
// responder "pra que serve esse vínculo, estruturalmente" somando um score próprio a
// partir de Sol-Lua/casas angulares (pró-Estrutura) vs Nodo tenso/Quíron (pró-Lição),
// com Saturno entrando dos dois lados conforme harmônico ou tenso. O score do lado
// "lição" se chamava karmaScore, depois renomeado lessonWeight pra não colidir com o
// sentido de "kármico" que o eixo Destino (Nodo+Vértice, ver axisPoolFor) já usava.
// Esse desenho é o que o bloco v2 abaixo substitui — descrição completa da migração e
// do motivo ali.
// --- vinculoProfile v2 (reimaginado) ---
// v1 usava um sistema de pontos próprio (soma de marcadores favoráveis vs desfavoráveis
// numa lista fixa: Sol-Lua, Saturno, Nodo, casas de compromisso, Quíron, Fortuna) que
// discordava do eixo de verdade: os casos A e B tinham o MESMO
// structureHarmonyPct (18%, majoritariamente tenso), mas a v1 dava "Estrutura de
// Parceria Duradoura" pros dois, com folga — porque só via os marcadores favoráveis da
// lista e nunca contrapesava contra o resto do pool de aspectos tensos da família
// Estrutura (que structureHarmonyPct já pondera direito, por orbe, sobre TODOS os
// aspectos do pool). Também não olhava Atração/Afinidade (não distinguia "boa química,
// base frágil" de "nada rolando"), tinha corte binário sem zona de transição, e nunca
// variava texto por relType (único lugar do arquivo fora desse padrão já estabelecido
// em classify/PAIR_INFO_BY_TYPE/catMetaFor).
//
// v2: eixo Estrutura vem direto de structureHarmonyPct (não mais um score próprio).
// Eixo Química vem de Atração (categoryScores.sexual, peso 0.7) + Afinidade
// (categoryScores.afinidade, peso 0.3) — Atração pesa mais por ser o marcador
// tradicional mais direto de "química"; Afinidade entra como reforço mais soft (mesmo
// espírito do peso reduzido que ela já tem em AXIS_BOOST). Cada eixo cai numa de três
// zonas usando o mesmo CALIBRATION.harmonyZone que classify() já usa pra "faixa mista"
// — os 3×3 cruzamentos geram rótulo+descrição (VINCULO_MATRIX abaixo), com uma 4ª
// situação (sinal insuficiente, harmonyPct null) dobrada em 'misto' pra escolha do
// rótulo, mas sinalizada à parte no texto (ver caveat). Os marcadores narrativos
// (signals: Sol-Lua, Saturno, Nodo, Quíron, Fortuna, casas) continuam calculados do
// mesmo jeito que na v1 — essa parte nunca esteve quebrada, só passa a ilustrar o
// "porquê" em vez de decidir o rótulo sozinha.
export function vinculoHarmonyZone(pct){
  if (pct === null || pct === undefined) return 'semSinal';
  const { low, high } = CALIBRATION.harmonyZone;
  if (pct < low) return 'tenso';
  if (pct >= high) return 'harmonico';
  return 'misto';
}

export function combineChemistryHarmonyPct(atracaoPct, afinidadePct){
  if (atracaoPct == null && afinidadePct == null) return null;
  if (atracaoPct == null) return afinidadePct;
  if (afinidadePct == null) return atracaoPct;
  return Math.round(atracaoPct * 0.7 + afinidadePct * 0.3);
}

/**
 * Monta a leitura de "pra que serve esse vínculo" (label + descrição + sinais
 * narrativos) a partir dos scores/contatos já calculados por computeScores().
 * Único call site é dentro de computeScores() (ver linha ~808); veja o histórico
 * v1→v2 acima para o raciocínio por trás da fórmula.
 *
 * @param {Object} inputs
 * @param {string} inputs.relType - 'romantico' | 'amizade' | 'familia' (qualquer outro valor cai em 'romantico').
 * @param {number|null} inputs.structureHarmonyPct - % harmônico do eixo Estrutura (null = sinal insuficiente).
 * @param {number|null} inputs.atracaoHarmonyPct - % harmônico da categoria Atração/Sexual (peso 0.7 na Química).
 * @param {number|null} inputs.afinidadeHarmonyPct - % harmônico da categoria Afinidade (peso 0.3 na Química).
 * @param {number|null} inputs.destinyHarmonyPct - % harmônico do eixo Destino (Nodo/Vértice); só usado pro destinyNote, fora da matriz de propósito.
 * @param {number} inputs.sunMoonHarmonic - contagem de contatos Sol-Lua harmônicos.
 * @param {number} inputs.sunMoonTense - contagem de contatos Sol-Lua tensos.
 * @param {number} inputs.commitmentHouseContacts - sobreposições de Sol/Lua/Saturno nas casas 1/4/7/10.
 * @param {number} inputs.destinyHouseContacts - sobreposições de Nodo/Vértice nas casas 1/4/7/10.
 * @param {number} inputs.saturnCommitmentHarmonic - contatos de Saturno harmônicos ligados a compromisso.
 * @param {number} inputs.saturnCommitmentTense - contatos de Saturno tensos ligados a compromisso.
 * @param {number} inputs.nodeDestinyHarmonic - contatos de Nodo harmônicos.
 * @param {number} inputs.nodeDestinyTense - contatos de Nodo tensos.
 * @param {number} inputs.chironWoundContacts - contatos de Quíron por aspecto.
 * @param {number} inputs.chironPartnershipHouseContacts - Quíron na 7ª casa por posição (não aspecto).
 * @param {number} inputs.fortuneContacts - contatos de Fortuna (peso leve, ponto derivado).
 * @param {number} inputs.espiritoContacts - contatos de Parte do Espírito (peso leve, ponto derivado — paridade com Fortuna).
 * @param {number} inputs.friendshipHouseContacts - sobreposições de Júpiter na 11ª casa.
 * @returns {?{label: string, description: string, structureHarmonyPct: number|null, chemistryHarmonyPct: number|null, destinyNote: string, signals: string[]}}
 *   null quando não há dado suficiente (sem estrutura, sem química E sem nenhum sinal narrativo).
 */
export function computeVinculoProfile(inputs){
  const {
    relType,
    structureHarmonyPct, atracaoHarmonyPct, afinidadeHarmonyPct, destinyHarmonyPct,
    sunMoonHarmonic, sunMoonTense,
    commitmentHouseContacts,
    destinyHouseContacts,
    saturnCommitmentHarmonic, saturnCommitmentTense,
    nodeDestinyHarmonic, nodeDestinyTense,
    chironWoundContacts,
    chironPartnershipHouseContacts,
    fortuneContacts,
    espiritoContacts,
    friendshipHouseContacts,
  } = inputs;

  // Sinais narrativos (bullets do detalhe expandido) — mesma lógica de detecção da v1,
  // agora só ilustrativa: não decide mais o rótulo, só explica o que está por trás dele.
  const signals = [];
  if (sunMoonHarmonic > 0) signals.push(`🟢 ${sunMoonHarmonic} contato(s) Sol-Lua harmônico(s) — reconhecimento mútuo, a base clássica de "isso parece sério"`);
  if (sunMoonTense > 0) signals.push(`🔴 ${sunMoonTense} contato(s) Sol-Lua tenso(s) — atrito na base de identidade/necessidade emocional`);
  if (commitmentHouseContacts > 0) signals.push(`⌂ ${commitmentHouseContacts} sobreposição(ões) de Sol/Lua/Saturno nas casas 1ª/4ª/7ª/10ª — estrutura de vida a dois`);
  if (destinyHouseContacts > 0) signals.push(`☊ ${destinyHouseContacts} sobreposição(ões) de Nodo/Vértice nas casas 1ª/4ª/7ª/10ª — destino instalado na estrutura do vínculo`);
  if (saturnCommitmentHarmonic > 0) signals.push(`♄ ${saturnCommitmentHarmonic} contato(s) de Saturno harmônico(s) — compromisso que sustenta em vez de pesar`);
  if (saturnCommitmentTense > 0) signals.push(`♄ ${saturnCommitmentTense} contato(s) de Saturno tenso(s) — peso/teste, compromisso que custa caro`);
  if (nodeDestinyHarmonic > 0) signals.push(`☊ ${nodeDestinyHarmonic} contato(s) de Nodo harmônico(s) — destino que flui junto`);
  if (nodeDestinyTense > 0) signals.push(`☊ ${nodeDestinyTense} contato(s) de Nodo tenso(s) — padrão cármico a resolver, mais lição que conforto`);
  if (chironWoundContacts > 0) signals.push(`⚷ ${chironWoundContacts} contato(s) de Quíron por aspecto — tema de ferida/cura, mais terapêutico que estrutural`);
  if (chironPartnershipHouseContacts > 0) signals.push(`⚷ Quíron na 7ª casa (posição, não aspecto) — a ferida/cura se instala fisicamente no território da parceria`);
  if (fortuneContacts > 0) signals.push(`🍀 ${fortuneContacts} contato(s) de Fortuna — indício auxiliar de felicidade/destino compartilhado (peso leve, ponto derivado)`);
  if (espiritoContacts > 0) signals.push(`⊕ ${espiritoContacts} contato(s) de Parte do Espírito — indício auxiliar de intenção/vontade consciente compartilhada (peso leve, ponto derivado)`);
  // Júpiter na 11ª (computeFriendshipHouses): gap encontrado em auditoria — o marcador já
  // tinha chip próprio na UI, mas nunca chegava até aqui, apesar de computeVinculoProfile
  // rodar também pra relType 'amizade' (não é filtrado só pra romântico). Sem essa linha,
  // uma leitura de amizade nunca via seu marcador temático mais direto refletido no texto
  // do veredito, enquanto Sol-Lua/Saturno/Nodo (mais "codificados como romance")
  // continuavam aparecendo normalmente pra qualquer tipo de vínculo.
  if (friendshipHouseContacts > 0) signals.push(`🧑‍🤝‍🧑 ${friendshipHouseContacts} sobreposição(ões) de Júpiter na 11ª casa — expansão/incentivo instalado no círculo social do vínculo`);

  const chemistryHarmonyPct = combineChemistryHarmonyPct(atracaoHarmonyPct, afinidadeHarmonyPct);

  // sem nenhum dos dois eixos E sem nenhum sinal narrativo, não há informação
  // suficiente pra classificar — melhor não mostrar nada do que forçar um veredito sem
  // lastro (mesmo espírito do harmonyPct null quando o peso do sub-pool é baixo demais).
  if (structureHarmonyPct == null && chemistryHarmonyPct == null && signals.length === 0) return null;

  const structureZone = vinculoHarmonyZone(structureHarmonyPct);
  const chemistryZone = vinculoHarmonyZone(chemistryHarmonyPct);
  // sinal insuficiente (null) entra no bucket 'misto' pra escolha de rótulo — não temos
  // base pra cravar tenso ou harmônico, e 'misto' já significa "sem direção clara" — mas
  // vira uma ressalva à parte no texto, pra não confundir "insuficiente" com "sinais
  // contraditórios" (são situações diferentes, mesmo caindo na mesma célula da matriz).
  const cell = VINCULO_MATRIX[structureZone === 'semSinal' ? 'misto' : structureZone]
                            [chemistryZone === 'semSinal' ? 'misto' : chemistryZone];

  const type = ['romantico','amizade','familia'].includes(relType) ? relType : 'romantico';
  const chemNoun = VINCULO_CHEM_NOUN_BY_TYPE[type];
  const terms = VINCULO_TERMS_BY_TYPE[type];

  let description = cell.desc(chemNoun, terms);
  const caveats = [];
  if (structureZone === 'semSinal') caveats.push('poucos marcadores de base estrutural encontrados');
  if (chemistryZone === 'semSinal') caveats.push(`poucos marcadores de ${chemNoun} encontrados`);
  if (caveats.length){
    description += ` (leitura mais aberta que conclusiva aqui: ${caveats.join(' e ')}.)`;
  }

  // Destino (Nodo/Vértice) fica de fora da matriz de propósito — não é a mesma pergunta
  // que Estrutura responde (ver discussão no chat: "sensação de fadado" não é sinônimo
  // de "tem osso pra sustentar o dia a dia"). Mas quando os dois divergem forte, um
  // astrólogo não ficaria em silêncio sobre isso na síntese — reaproveita o mesmo
  // limiar/padrão de imbalanceNote em classify() (gap grande = informação real). Fica
  // SEPARADA do bloco de caveats acima (que é sobre sinal insuficiente/fraco) porque essa
  // nota é o oposto disso — é uma leitura com dado forte, não uma ressalva de incerteza;
  // embrulhar ela em "leitura mais aberta que conclusiva" mentiria sobre a confiança do
  // número. Vira sentença própria no description E campo à parte (destinyNote), pro
  // resumo compacto dos cards poder mostrar só essa linha sem o texto todo.
  let destinyNote = '';
  if (structureHarmonyPct != null && destinyHarmonyPct != null){
    const destinyDiff = destinyHarmonyPct - structureHarmonyPct;
    if (destinyDiff >= CALIBRATION.imbalanceThreshold){
      destinyNote = `Vale notar: os pontos de destino (Nodo/Vértice) aqui são bem mais harmônicos (${destinyHarmonyPct}%) do que a base estrutural sugere (${structureHarmonyPct}%) — pode ser um encontro com peso/significado mesmo sem os marcadores clássicos de solidez ainda presentes.`;
    } else if (destinyDiff <= -CALIBRATION.imbalanceThreshold){
      destinyNote = `Vale notar: a base estrutural aqui (${structureHarmonyPct}%) é mais sólida do que os pontos de destino confirmam (${destinyHarmonyPct}%) — sustenta bem no dia a dia sem carregar uma sensação forte de "isso é fadado".`;
    }
  }
  if (destinyNote) description += ` ${destinyNote}`;

  return {
    label: cell.label,
    description,
    structureHarmonyPct: structureHarmonyPct ?? null,
    chemistryHarmonyPct: chemistryHarmonyPct ?? null,
    destinyNote,
    signals,
  };
}

// Contador de "marcador narrativo" (Saturno-pessoal, Nodo-pessoal, Quíron-pessoal etc.)
// — extraído porque o mesmo padrão (contagem total + balde harmônico/ambivalente/tenso/
// tenseLight + lista de details formatados) se repetia, colado, para 9 marcadores
// diferentes dentro de computeScores. Um tracker por marcador; trackMarker() é chamado
// uma vez por aspecto elegível. Mantém os MESMOS nomes de campo (contacts/harmonic/
// ambivalent/tense/tenseLight/details) que os objetos achatados que computeScores
// devolvia antes — só a forma de acumular mudou, não o formato consumido pelo resto do
// app (o retorno de computeScores continua achatado, ver bloco de return no final).
function makeMarkerTracker(){
  return { contacts: 0, harmonic: 0, ambivalent: 0, tense: 0, tenseLight: 0, details: [] };
}
function trackMarker(tracker, markerCat, aspect){
  tracker.contacts++;
  if (markerCat === 'harmonic') tracker.harmonic++;
  else if (markerCat === 'ambivalent') tracker.ambivalent++;
  else if (markerCat === 'tenseLight') tracker.tenseLight++;
  else tracker.tense++;
  tracker.details.push(formatMarkerDetail(aspect, markerCat));
}

export function computeScores(parsed, relType){
  // Validação simples (mesmo padrão usado em classify/obj.relType) — string
  // desconhecida ou ausente cai no comportamento padrão (romântico).
  relType = ['romantico','amizade','familia'].includes(relType) ? relType : 'romantico';
  // Scores de categoria (Intelectual/Emocional/Sexual/Prático) — checklist
  // independente por área, ver categoryPoolFor. Mesmo padrão de sub-pool já usado
  // pelo eixo Imediato/Estrutura logo abaixo: harmoniousW/tenseW/eligibleCount por
  // categoria, sem normalização cruzada entre elas.
  const CATEGORY_KEYS_INTERNAL = ['intelectual','emocional','sexual','pratico','afinidade'];
  // Afinidade continua fora da RAIZ do compat romântico (média geométrica Atração ×
  // Estrutura) — protegeria menos a tensão clássica faísca×permanência do que a diluiria
  // se entrasse como terceiro fator votante (Júpiter é sorte/facilidade, natureza
  // diferente de desejo/permanência, ver ATTRACTION_PAIRS/AFFINITY_JUPITER_PAIRS). Mas
  // não fica inteiramente fora: entra depois como nudge aditivo com teto (ver
  // CALIBRATION.affinityNudgeWeight, aplicado logo abaixo de compatibilityScore) — o
  // meio-termo entre "Júpiter decide junto" (diluiria demais a tensão dos dois eixos
  // centrais) e "Júpiter não conta pra nada no romântico" (perderia uma bênção clássica
  // real da sinastria de casamento).
  // Mas ENTRA CHEIA na média de amizade/família (decisão pós-discussão): ali não existe
  // tensão de dois polos a proteger, é só uma média entre áreas de conteúdo, e "é fácil/
  // bom estar perto" é um componente legítimo dessa leitura — se depois de uso real ela
  // se mostrar desproporcional, pesar diferente das outras 4 em vez de tirar de novo.
  const COMPAT_CATEGORY_KEYS = ['intelectual','emocional','sexual','pratico','afinidade'];
  // harmonicDetails/ambivalentDetails/tenseDetails: string formatada (via
  // formatMarkerDetail) de cada aspecto que caiu nessa categoria, guardada por balde
  // (harmônico/ambivalente/tenso) — usada só pro tooltip de hover das barras
  // (renderCategoryVisuals), pra mostrar QUAIS marcadores específicos compõem o lado
  // verde (favorável) e o lado vermelho (tenso) de cada categoria.
  const catPool = {
    intelectual: { harmoniousW:0, tenseW:0, eligibleCount:0, houseW:0, houseCount:0, harmonicDetails:[], ambivalentDetails:[], tenseDetails:[], houseDetails:[] },
    emocional:   { harmoniousW:0, tenseW:0, eligibleCount:0, houseW:0, houseCount:0, harmonicDetails:[], ambivalentDetails:[], tenseDetails:[], houseDetails:[] },
    sexual:      { harmoniousW:0, tenseW:0, eligibleCount:0, houseW:0, houseCount:0, harmonicDetails:[], ambivalentDetails:[], tenseDetails:[], houseDetails:[] },
    pratico:     { harmoniousW:0, tenseW:0, eligibleCount:0, houseW:0, houseCount:0, harmonicDetails:[], ambivalentDetails:[], tenseDetails:[], houseDetails:[] },
    // Afinidade (Júpiter tocando pessoal + Júpiter-Júpiter + Júpiter-Ascendente +
    // Ascendente-Ascendente + Fortuna tocando pessoal, ver categoryPoolFor/
    // AFFINITY_JUPITER_PAIRS) — chave que faltava aqui, causando TypeError em qualquer
    // aspecto que categoryPoolFor classificasse como 'afinidade'.
    afinidade:   { harmoniousW:0, tenseW:0, eligibleCount:0, houseW:0, houseCount:0, harmonicDetails:[], ambivalentDetails:[], tenseDetails:[], houseDetails:[] },
  };
  let harmoniousW = 0, tenseW = 0;
  let tightCount = 0;             // aspectos com orbe < 2°, usados pra medir "nitidez"
  let strengthEligibleCount = 0;  // total considerado pra "nitidez" (exclui outer-outer, que é geracional, e exclui aspectos sem reconhecimento em categoryPoolFor/axisPoolFor — ver isSignificantForHarmony)
  // Nitidez separada por lado (pós-discussão sobre desalinhamento entre Nitidez e
  // direção harmônica no Veredito): mesmo hFrac fracionário que já divide
  // harmoniousW/tenseW é reaproveitado aqui, sem reprocessar nada — cada aspecto
  // elegível soma hFrac no "peso elegível harmônico" e (1-hFrac) no "peso elegível
  // tenso"; se também for apertado (orb < 2°), a mesma fração soma no lado apertado
  // correspondente. Isso permite calcular, depois, "quanto do que é elegível NO LADO
  // HARMÔNICO está apertado" separado de "quanto do que é elegível NO LADO TENSO está
  // apertado" — em vez de um único número cego a lado.
  let eligibleHarmonicWeight = 0, eligibleTenseWeight = 0;
  let tightHarmonicWeight = 0, tightTenseWeight = 0;
  // contatos de Saturno com pessoais — indicador de compromisso/permanência
  const saturnCommitment = makeMarkerTracker();
  // contatos de Nodo com pessoais — indicador de "sensação de destino"
  const nodeDestiny = makeMarkerTracker();
  // eixo nodal mútuo: quando o Nodo (Norte OU Sul, depois de colapsados os ecos
  // espelhados em parseText) de A toca o Nodo de B — marcador kármico distinto de
  // "Nodo tocando um pessoal", tradicionalmente um dos sinais de destino mais fortes
  const nodeAxis = makeMarkerTracker();
  // contatos de Vértice com pessoais/ângulos/Vértice — indicador de "encontro fatídico"
  const vertexFated = makeMarkerTracker();
  // Quíron com um pessoal do parceiro: marcador narrativo tradicional de "ferida e cura"
  // (o "curador ferido") — tema central na literatura de sinastria, mas que até aqui só
  // entrava no peso de categoria via PLANET_PROFILE, sem virar um marcador visível.
  const chironWound = makeMarkerTracker();
  // Lilith com um pessoal do parceiro: marcador narrativo tradicional de atração
  // magnética/tabu (desejo intenso, dinâmica de poder) — um dos indicadores mais citados
  // de sinastria moderna, na mesma situação que Quíron: só pesava, nunca aparecia.
  const lilithMagnetic = makeMarkerTracker();
  // Sol tocado por um transpessoal do parceiro (Netuno/Urano/Plutão): marcador narrativo
  // próprio, no mesmo espírito de Quíron/Lilith acima — identidade/vitalidade sendo
  // intensificada ou desestabilizada por um planeta geracional do outro (idealização com
  // Netuno, faísca elétrica com Urano, magnetismo/disputa de poder com Plutão). Já entra
  // na categoria Sexual/Atração (ver ATTRACTION_PAIRS) e ganhou peso em AXIS_BOOST, mas sem isso
  // ficava sem nenhum chip visível próprio — diluído dentro de "Sexual", igual Sol-Lua
  // ficava diluído dentro de "Emocional" antes do sunMoon.contacts existir.
  const sunTranspersonal = makeMarkerTracker();
  // Parte da Fortuna com um pessoal do parceiro: marcador tradicional de "felicidade/
  // destino compartilhado" — mas Fortuna é um ponto DERIVADO (Asc+Lua-Sol, invertido à
  // noite), não um corpo real, então a literatura trata ela como evidência auxiliar,
  // nunca decisiva sozinha. Entra no mesmo padrão de contato (conta harmônico/tenso pra
  // exibição) e vira um sinal narrativo no vinculoProfile v2 (ver fortune.contacts em
  // computeVinculoProfile) — mas não decide mais o rótulo sozinho como podia no v1
  // (score próprio, aposentado): v2 tira o rótulo de structureHarmonyPct/
  // chemistryHarmonyPct, então nenhum marcador isolado — nem Fortuna — vira o voto de
  // minerva. Também entra (com peso baixo, ver AXIS_BOOST) na categoria Afinidade, via
  // categoryPoolFor.
  const fortune = makeMarkerTracker();
  // Parte do Espírito com um pessoal do parceiro: ajuste de paridade com a Fortuna acima
  // — mesmo estatuto (tríade Asc/Sol/Lua, ponto derivado, sem massa própria), mesmo
  // tratamento (contato harmônico/tenso pra exibição, sinal narrativo auxiliar no
  // vinculoProfile, peso baixo em Afinidade via AXIS_BOOST). Antes deste ajuste, o
  // Espírito chegava aos aspectos (via a ponte com Mapas Astrais) mas não tinha nenhum
  // tratamento dedicado aqui — ficava como aspecto genérico não-curado.
  const espirito = makeMarkerTracker();
  // Sol-Lua cruzado entre os dois mapas (Sol de A com Lua de B, e vice-versa) e Sol-Sol/
  // Lua-Lua: O marcador mais clássico de "vínculo duradouro/reconhecimento mútuo" que
  // existe em sinastria — a literatura trata especificamente o Sol de um tocando a Lua
  // do outro como o eixo-mãe de "isso tem cara de parceria séria", diferente de Vênus-
  // Marte (que é sobre atração, não sobre reconhecimento de identidade+necessidade
  // emocional). Já entra no cálculo geral (LUMINARY_STRUCTURE_PAIRS, eixo Estrutura) e em
  // Emocional (Moon-Moon/Moon-Sun), mas até aqui não tinha marcador narrativo próprio —
  // ficava diluído junto de dezenas de outros aspectos, sem aparecer como sinal visível.
  const sunMoon = makeMarkerTracker();

  // Eixo Estrutura (longo prazo) e Eixo Destino (Nodo/Vértice) — sub-pools de
  // harmoniousW/tenseW calculados só sobre os aspectos que caem em cada eixo (ver
  // axisPoolFor), pra não deixar a média geral de dezenas de aspectos esconder tensão
  // concentrada especificamente onde ela mais pesa pro tipo de vínculo. O antigo Eixo
  // Imediato foi fundido nas categorias Atração/Afinidade — ver categoryPoolFor.
  // Destino soma harmônico E tenso (diferente dos contadores narrativos nodeDestiny*/
  // vertexFated* mais abaixo, que existem à parte pra alimentar os chips e o saldo de
  // potentialScore) — aqui é só o harmonyPct agregado do eixo, exposto como stat próprio
  // no painel (destinyHarmonyPct), no lugar que antes era ocupado pelo stat "Atração"
  // duplicado (ver categoryScores.sexual, que já cobre esse número).
  let structureHarmoniousW = 0, structureTenseW = 0, structureEligibleCount = 0;
  let destinyHarmoniousW = 0, destinyTenseW = 0, destinyEligibleCount = 0;
  // Mesmo padrão de harmonicDetails/ambivalentDetails/tenseDetails já usado por
  // catPool (ver mais abaixo) — sem isso, os quadros de Estrutura/Destino tinham
  // número mas nenhum jeito de ver QUAIS aspectos formaram aquele número específico
  // (só dava pra reconstruir manualmente combinando vários chips narrativos, e nem
  // todo aspecto que entra aqui tem chip próprio — ex.: Sol-Sol/Lua-Lua/Mercúrio-
  // Mercúrio mútuos, Saturno-ângulo, Saturno-Saturno mútuo, Nodo/Vértice-ângulo).
  let structureHarmonicDetails = [], structureAmbivalentDetails = [], structureTenseDetails = [];
  let destinyHarmonicDetails = [], destinyAmbivalentDetails = [], destinyTenseDetails = [];

  const recipCounts = reciprocityCounts(parsed.aspects);

  for (const a of parsed.aspects){
    // decaimento exponencial: aspectos apertados pesam MUITO mais que os largos.
    // isso evita que a soma de 80+ aspectos regrida pra perto de 25% em cada categoria.
    // o divisor varia por tipo de aspecto (ver ORB_DECAY_DIVISOR): aspectos maiores
    // (conjunção/oposição) toleram orbe mais largo sem perder força; os menores
    // (sextil/quincunx/semisextil) enfraquecem bem mais rápido conforme o orbe abre.
    // Além do decaimento, um teto rígido por tipo de astro (effectiveMaxOrb): passado
    // ele, Quíron/Lilith/Nodo/Vértice/Fortuna/transpessoais deixam de contar de vez —
    // não é só "pesar menos", é considerar que o aspecto não existe mais nesse orbe.
    const orbW = a.orb <= effectiveMaxOrb(a.aspect, a.planet1, a.planet2)
      ? orbDecay(a.aspect, a.orb)
      : 0;

    // fração harmônica do aspecto (considera quem está em conjunção — não só o tipo
    // geométrico — e se a conjunção é "fora de signo", o que a enfraquece)
    const sameSign = a.sign1 && a.sign2 ? (a.sign1.toLowerCase() === a.sign2.toLowerCase()) : true;
    const hFrac = harmonicFraction(a.aspect, a.planet1, a.planet2, sameSign);
    // hoisted (antes só existia dentro do bloco de marcadores significativos abaixo)
    // pra também ficar disponível no bloco de categoria de conteúdo mais abaixo, que
    // agora guarda o detalhe de cada marcador pro tooltip de hover das barras.
    const markerCat = markerCategory(hFrac);
    // versão da fração usada só dentro da categoria Atração (Marte duro com Sol/
    // Ascendente conta como faísca ali, e como tensão no resto)
    const hFracAttr = harmonicFraction(a.aspect, a.planet1, a.planet2, sameSign, 'attraction');
    const markerCatAttr = markerCategory(hFracAttr);

    // eixos Sol-Lua, Vênus-Marte, Nodo e Ascendente/MC/IC com os pessoais pesam mais:
    // são os indicadores clássicos mais citados em sinastria (ver AXIS_BOOST acima)
    const boost = axisBoost(a.planet1, a.planet2, a.aspect);

    // Saturno/Nodo com um planeta pessoal do parceiro: marcadores narrativos de
    // compromisso/destino, rastreados à parte (não alteram o peso do aspecto em si —
    // isso já acontece via HARD_PLANETS/AXIS_BOOST). Só contam se o orbe for apertado
    // o suficiente pra ser um sinal, não ruído de fundo.
    if (orbW > CALIBRATION.significantMarkerOrbWeight){
      // >=0.5 trata a fração harmônica do próprio aspecto (trígono/sextil=1.0,
      // quadratura/oposição=0.0, conjunção variável) como sinal de "flui" vs "atrita" —
      // sem isso, um trígono e uma oposição de Saturno contavam igual dentro do mesmo
      // número, escondendo se aquele "compromisso" tende a apoiar ou pesar.
      if ((a.planet1 === 'Saturn' && CORE_PERSONAL_PLANETS.has(a.planet2)) ||
          (a.planet2 === 'Saturn' && CORE_PERSONAL_PLANETS.has(a.planet1))){
        trackMarker(saturnCommitment, markerCat, a);
      }
      if (((a.planet1 === 'Node' || a.planet1 === 'SouthNode') && CORE_PERSONAL_PLANETS.has(a.planet2)) ||
          ((a.planet2 === 'Node' || a.planet2 === 'SouthNode') && CORE_PERSONAL_PLANETS.has(a.planet1))){
        trackMarker(nodeDestiny, markerCat, a);
      }
      // eixo nodal mútuo: os DOIS lados do aspecto são pontos-âncora de Destino (Nodo
      // Norte, Nodo Sul ou Vértice) — ou seja, os eixos de destino de A e B se tocam
      // diretamente, não só um deles com um planeta pessoal do outro. Usa
      // DESTINY_ANCHORS (mesmo agrupamento já usado em axisPoolFor) em vez de checar
      // só Node/SouthNode, pra também pegar Nodo-Vértice e Nodo Sul-Vértice — a
      // literatura trata esse cruzamento como reforço, não como sinal mais fraco que
      // Nodo-Nodo ou Vértice-Vértice (ver AXIS_BOOST acima).
      if (DESTINY_ANCHORS.has(a.planet1) && DESTINY_ANCHORS.has(a.planet2)){
        trackMarker(nodeAxis, markerCat, a);
      }
      if ((a.planet1 === 'Vertex' && VERTEX_FATED_TARGETS.has(a.planet2)) ||
          (a.planet2 === 'Vertex' && VERTEX_FATED_TARGETS.has(a.planet1))){
        trackMarker(vertexFated, markerCat, a);
      }
      if ((a.planet1 === 'Chiron' && CORE_PERSONAL_PLANETS.has(a.planet2)) ||
          (a.planet2 === 'Chiron' && CORE_PERSONAL_PLANETS.has(a.planet1))){
        trackMarker(chironWound, markerCat, a);
      }
      if ((a.planet1 === 'Lilith' && CORE_PERSONAL_PLANETS.has(a.planet2)) ||
          (a.planet2 === 'Lilith' && CORE_PERSONAL_PLANETS.has(a.planet1))){
        trackMarker(lilithMagnetic, markerCat, a);
      }
      if ((a.planet1 === 'Sun' && TRANSPERSONAL_PLANETS.has(a.planet2)) ||
          (a.planet2 === 'Sun' && TRANSPERSONAL_PLANETS.has(a.planet1))){
        trackMarker(sunTranspersonal, markerCat, a);
      }
      if ((a.planet1 === 'Fortune' && CORE_PERSONAL_PLANETS.has(a.planet2)) ||
          (a.planet2 === 'Fortune' && CORE_PERSONAL_PLANETS.has(a.planet1))){
        trackMarker(fortune, markerCat, a);
      }
      if ((a.planet1 === 'Spirit' && CORE_PERSONAL_PLANETS.has(a.planet2)) ||
          (a.planet2 === 'Spirit' && CORE_PERSONAL_PLANETS.has(a.planet1))){
        trackMarker(espirito, markerCat, a);
      }
      const bothLuminaries = (a.planet1 === 'Sun' || a.planet1 === 'Moon') && (a.planet2 === 'Sun' || a.planet2 === 'Moon');
      if (bothLuminaries){
        trackMarker(sunMoon, markerCat, a);
      }
    }

    // eixo imediato (pegação) vs eixo estrutura (longo prazo) — ver axisPoolFor. Feito
    // com o mesmo harmContribution/hFrac do cálculo de harmonia geral, só que somado
    // num sub-pool separado, pra não deixar dezenas de aspectos neutros diluir o sinal
    // específico de cada eixo.
    const pool = axisPoolFor(a.planet1, a.planet2);
    // categoria(s) de conteúdo (Intelectual/Emocional/Sexual/Afinidade/Prático) — ver
    // categoryPoolFor. Calculado aqui em cima (antes do harmonyPct geral) porque agora
    // os dois pools (categoryPoolFor E axisPoolFor) decidem juntos o que entra na
    // Harmonia geral — ver isSignificantForHarmony logo abaixo.
    const catKeys = categoryPoolFor(a.planet1, a.planet2);

    // dois planetas transpessoais entre si (Urano/Netuno/Plutão) tendem a ser
    // geracionais — compartilhados por qualquer par nascido na mesma época — então
    // pesam bem menos na leitura pessoal do vínculo.
    const bothOuter = TRANSPERSONAL_PLANETS.has(a.planet1) && TRANSPERSONAL_PLANETS.has(a.planet2);
    const generationalDiscount = generationalDiscountFor(a.planet1, a.planet2);

    // reciprocidade: quando o mesmo par de planetas conecta as duas pessoas nos dois
    // sentidos (não só duplicata — dois aspectos de fato diferentes "fechando o eixo"),
    // é um reforço mútuo tradicionalmente lido como sinal mais forte que um contato único
    const planetPair = [a.planet1, a.planet2].sort().join('-');
    const reciprocityBoost = reciprocityBoostFor(recipCounts.get(planetPair));

    // Categoria de aspecto (maior/menor, com desconto composto se menor E sem pessoal
    // nenhum no par; e agora também um desconto mais leve se MAIOR, sem pessoal E sem
    // eixo curado em AXIS_BOOST — ver correção de auditoria #5 em ASPECT_CATEGORY_MULT
    // acima). Passa `boost` (já calculado logo acima) pra função conseguir distinguir
    // "sem pessoal mas eixo curado" (ex.: Nodo-Nodo) de "sem pessoal e sem eixo nenhum"
    // (ex.: Saturno-Lilith).
    const catMult = aspectCategoryMult(a.aspect, a.planet1, a.planet2, boost);

    const harmContribution = orbW * boost * generationalDiscount * reciprocityBoost * catMult;

    // Harmonia geral: antes somava TODO aspecto do relatório, "pizza panorâmica" sem
    // curadoria — decisão pós-discussão foi restringir esse pool a aspectos que já são
    // reconhecidos como significativos em ALGUM lugar do app: alguma categoria de
    // conteúdo (categoryPoolFor) OU algum eixo (axisPoolFor), sem filtrar por QUAL dos
    // dois. Mantém o espírito "visão mais ampla que qualquer eixo isolado" (continua
    // somando através de categorias/eixos diferentes, sem se prender a um só), mas para
    // de deixar ruído sem curadoria nenhuma (pares sem significado tradicional atribuído
    // em nenhuma lista) puxar a leitura pra perto de 50% por diluição.
    const isSignificantForHarmony = !!catKeys || pool !== null;
    if (isSignificantForHarmony){
      harmoniousW += harmContribution * hFrac;
      tenseW      += harmContribution * (1 - hFrac);
    }

    // Mesmo harmContribution/hFrac da Harmonia geral, somado num sub-pool próprio da
    // categoria, sem competir com as outras. categoryPoolFor retorna uma LISTA —
    // normalmente com 1 categoria, mas os pares em DUAL_CATEGORY_PAIRS retornam 2 (o
    // aspecto conta cheio nas duas, sem diluir — ver comentário em DUAL_CATEGORY_PAIRS
    // acima de categoryPoolFor).
    // orbW > 0 abaixo: sem isso, um aspecto zerado pelo teto de exatidão por tipo de astro
    // (effectiveMaxOrb — ver comentário no topo do loop) ainda somava eligibleCount e
    // aparecia no texto do hover das barras de categoria (showBarTooltip), mesmo
    // contribuindo ZERO pro harmoniousW/tenseW reais — o número "(N marcadores)" e a
    // lista ao passar o mouse ficavam desalinhados com o peso de fato usado no cálculo.
    if (catKeys && orbW > 0){
      for (const catKey of catKeys){
        const fr = catKey === 'sexual' ? hFracAttr : hFrac;
        const mc = catKey === 'sexual' ? markerCatAttr : markerCat;
        catPool[catKey].harmoniousW += harmContribution * fr;
        catPool[catKey].tenseW      += harmContribution * (1 - fr);
        catPool[catKey].eligibleCount++;
        if (mc === 'harmonic') catPool[catKey].harmonicDetails.push(formatMarkerDetail(a, mc));
        else if (mc === 'ambivalent') catPool[catKey].ambivalentDetails.push(formatMarkerDetail(a, mc));
        else catPool[catKey].tenseDetails.push(formatMarkerDetail(a, mc));
      }
    }

    // Eixo Imediato foi fundido nas categorias Atração/Afinidade (ver categoryPoolFor) —
    // axisPoolFor só distingue mais 'structure'/'destiny'/null, então só o sub-pool de
    // Estrutura é acumulado aqui. O harmonyPct que fazia o papel do antigo eixo Imediato
    // agora vem do sub-pool da categoria Atração (catPool.sexual, ver mais abaixo, depois
    // que categoryScores é montado).
    // Mesmo gate orbW > 0 do catPool acima — um aspecto zerado (orb além do teto do
    // tipo de astro) não deve inflar eligibleCount nem aparecer nos Details do hover
    // de Estrutura/Destino, mesmo contribuindo 0 pro harmoniousW/tenseW.
    if (pool === 'structure' && orbW > 0){
      structureHarmoniousW += harmContribution * hFrac;
      structureTenseW      += harmContribution * (1 - hFrac);
      structureEligibleCount++;
      if (markerCat === 'harmonic') structureHarmonicDetails.push(formatMarkerDetail(a, markerCat));
      else if (markerCat === 'ambivalent') structureAmbivalentDetails.push(formatMarkerDetail(a, markerCat));
      else structureTenseDetails.push(formatMarkerDetail(a, markerCat));
    } else if (pool === 'destiny' && orbW > 0){
      destinyHarmoniousW += harmContribution * hFrac;
      destinyTenseW      += harmContribution * (1 - hFrac);
      destinyEligibleCount++;
      if (markerCat === 'harmonic') destinyHarmonicDetails.push(formatMarkerDetail(a, markerCat));
      else if (markerCat === 'ambivalent') destinyAmbivalentDetails.push(formatMarkerDetail(a, markerCat));
      else destinyTenseDetails.push(formatMarkerDetail(a, markerCat));
    }

    // Nitidez (strengthEligibleCount/tightCount) agora usa o MESMO pool curado da
    // Harmonia geral (isSignificantForHarmony, calculado acima) — auditoria pós-
    // discussão: antes a Nitidez contava qualquer aspecto não-geracional, inclusive os
    // que a Harmonia geral já passou a ignorar por não terem significado tradicional
    // atribuído em nenhuma categoria/eixo (ver isSignificantForHarmony). Isso deixava a
    // Nitidez "cega" pra curadoria — dois mapas podiam ter Nitidez idêntica por motivos
    // bem diferentes (um cheio de trígonos exatos de Vênus-Marte, outro cheio de
    // aspectos exatos entre pares sem leitura nenhuma aqui), mas os dois empurravam o
    // Veredito com a mesma força via o intensificador. Com o filtro alinhado, Nitidez
    // volta a significar especificamente "quanto do que É reconhecido como astrologicamente
    // significativo está vindo com orbe apertado" — o mesmo universo de aspectos que
    // qualquer outro número do app já lê como sinal real. Também exige orbW > 0 agora
    // (mesmo gate do catPool/estrutura/destino acima): um aspecto zerado pelo teto de
    // exatidão por tipo de astro não é "sinal real" nenhum, então não deve contar nem
    // pro denominador nem pro numerador de Nitidez.
    if (!bothOuter && isSignificantForHarmony && orbW > 0){
      strengthEligibleCount++;
      if (a.orb < CALIBRATION.strengthTightOrb) tightCount++;

      eligibleHarmonicWeight += hFrac;
      eligibleTenseWeight    += (1 - hFrac);
      if (a.orb < CALIBRATION.strengthTightOrb){
        tightHarmonicWeight += hFrac;
        tightTenseWeight    += (1 - hFrac);
      }
    }
  }

  // Sobreposições de casa (planeta de A na casa de B) agora alimentam presence de
  // categoria via o checklist HOUSE_CATEGORY_MARKERS (ver comentário acima). Duas
  // camadas de peso, que se somam sem competir:
  //  1) presence (houseW) — sempre soma, peso-base × angularidade (houseAngularityMult)
  //  2) valência (harmoniousW/tenseW) — SÓ pros planetas em HOUSE_PLANET_VALENCE
  //     (Vênus/Júpiter tendem a favorável, Saturno/Marte tendem a pesado/tenso,
  //     Plutão/Netuno/Quíron/Lilith são genuinamente ambivalentes — ver comentário
  //     lá), também escalada por angularidade. Planetas
  //     fora dessa lista (Sol/Lua/Mercúrio/Urano/Nodos/Vértice/Fortuna)
  //     continuam neutros — só presence, sem empurrar harmoniousW/tenseW/harmonyPct.
  // Continuam também alimentando o chip "Casas · convergência" (computeHouseConvergence).
  //
  // houseDetails guarda o texto dos marcadores SEM valência (planeta neutro) — sem
  // 🟢/🔴 na frente, porque não há leitura de lado. Os COM valência (Vênus/Júpiter/
  // Saturno/Marte/Plutão/Quíron) entram em harmonicDetails/tenseDetails, coloridos
  // como qualquer aspecto, refletindo o viés fixo do planeta em vez de orbe.
  for (const h of parsed.houses){
    // categoryPoolForHouse retorna uma LISTA — normalmente com 1 categoria, mas pares em
    // HOUSE_DUAL_CATEGORY_MARKERS (ex.: Plutão-7) retornam 2 (conta cheio nas duas, sem
    // diluir — mesmo padrão de categoryPoolFor/DUAL_CATEGORY_PAIRS pros aspectos).
    const houseCatKeys = categoryPoolForHouse(h.planet, h.house);
    if (houseCatKeys){
      // Angularidade agora GRADUA o peso de um par já selecionado por tema (ver
      // CALIBRATION.houseAngularityMult) — não compete com a curadoria temática, só
      // ajusta quanto ela pesa uma vez dentro (1/4/7/10 mais forte, 3/6/9/12 mais
      // difuso, resto no meio).
      const angMult = houseAngularityMult(h.house);
      const housePlanetLabel = PLANET_LABEL_PT[h.planet] || h.planet;
      const valenceFrac = HOUSE_PLANET_VALENCE.get(h.planet);
      const houseLabel = `${h.p1} (${housePlanetLabel}) na ${h.house}ª de ${h.p2}`;
      // Sol/Lua em MARRIAGE_HOUSES já ganham sua própria linha colorida ("— compromisso")
      // no bloco de empurrão logo abaixo — sem valência própria em HOUSE_PLANET_VALENCE,
      // então sem esse gate a MESMA casa aparecia 2x na lista do hover (uma neutra aqui,
      // uma verde ali), parecendo duplicada. Saturno também fica de fora do split
      // padrão, mas por outro motivo: TEM valência própria (tenso, 0.20) E o empurrão de
      // compromisso ao mesmo tempo — duas leituras tradicionais reais e distintas (não
      // a mesma frase repetida). Decisão pós-discussão: em vez de mostrar duas linhas
      // separadas (🔴 sozinha aqui + 🟢 "— compromisso" no bloco de empurrão, que
      // parecia contraditório/bugado de novo, mesmo sendo correto), as duas leituras se
      // fundem numa linha 🟡 só, com texto que nomeia as duas explicitamente — ver
      // isSaturnCommitPair abaixo. Só a EXIBIÇÃO muda; harmoniousW/tenseW (aqui) e o
      // harmoniousW extra do empurrão (bloco abaixo) continuam somando exatamente igual.
      const isSunMoonCommitPair = valenceFrac === undefined && MARRIAGE_HOUSES.has(h.house) &&
        (h.planet === 'Sun' || h.planet === 'Moon');
      const isSaturnCommitPair = h.planet === 'Saturn' && MARRIAGE_HOUSES.has(h.house);
      for (const houseCatKey of houseCatKeys){
        catPool[houseCatKey].houseW += CALIBRATION.houseMarkerWeight * angMult;
        catPool[houseCatKey].houseCount++;
        if (valenceFrac !== undefined){
          const valenceWeight = CALIBRATION.houseValenceWeight * angMult;
          catPool[houseCatKey].harmoniousW += valenceWeight * valenceFrac;
          catPool[houseCatKey].tenseW      += valenceWeight * (1 - valenceFrac);
          if (isSaturnCommitPair){
            // Linha fundida: nomeia as duas leituras (peso/restrição do Saturno-casa
            // genérico E o marcador clássico de compromisso do Saturno-ângulo) numa só,
            // pra não repetir a mesma sobreposição colorida de dois jeitos diferentes.
            catPool[houseCatKey].ambivalentDetails.push(`🟡 🏠 ${houseLabel} — pesa, mas também estrutura de compromisso`);
          } else if (valenceFrac > 0.4 && valenceFrac < 0.6){
            // Mesma faixa "genuinamente ambivalente" que markerCategory usa pros
            // aspectos (0.41–0.59, ver comentário lá) — hoje só Lilith (0.5) cai aqui
            // por esse caminho. Vai pra ambivalentDetails (não harmonicDetails/
            // tenseDetails direto): essa lista já é automaticamente somada nos dois
            // lados mais abaixo em categoryScores (ver "ambivalentes entram nos dois
            // lados" perto de poolHarmonyPct) e, no hover combinado (allLines), o Set
            // dedupe colapsa a MESMA string que apareceria nos dois lados numa linha só.
            catPool[houseCatKey].ambivalentDetails.push(`🟡 🏠 ${houseLabel}`);
          } else {
            const prefix = valenceFrac >= 0.5 ? '🟢' : '🔴';
            if (valenceFrac >= 0.5) catPool[houseCatKey].harmonicDetails.push(`${prefix} 🏠 ${houseLabel}`);
            else catPool[houseCatKey].tenseDetails.push(`${prefix} 🏠 ${houseLabel}`);
          }
        } else if (isSunMoonCommitPair){
          // linha suprimida aqui de propósito — o bloco de empurrão abaixo adiciona a
          // versão colorida "— compromisso" pra essa mesma casa, mais informativa.
        } else {
          catPool[houseCatKey].houseDetails.push(`🏠 ${houseLabel}`);
        }
      }
    }
    // Empurrão harmônico estrutural: Sol/Lua/Saturno na 1ª/4ª/7ª/10ª do parceiro (mesmas
    // casas de MARRIAGE_HOUSES/commitmentHouseContacts) — ver CALIBRATION.
    // commitmentHouseStructureWeight acima pro raciocínio completo. Soma direto em
    // structureHarmoniousW (nunca em tenseW: não há leitura tradicional "tensa" pra
    // simplesmente estar nessas casas) e em structureEligibleCount, pra também contar
    // pro piso de confiança (minAxisSignalWeight) do eixo — antes esse marcador não
    // existia em NENHUM dos dois. Saturno entrou junto (auditoria): mesma casa/mesmo
    // fenômeno estrutural que Sol/Lua já cobrem aqui, e Saturno-ângulo era o gap mais
    // citado da tradição que ficava de fora até desse empurrão.
    if (MARRIAGE_HOUSES.has(h.house) && (h.planet === 'Sun' || h.planet === 'Moon' || h.planet === 'Saturn')){
      structureHarmoniousW += CALIBRATION.commitmentHouseStructureWeight;
      structureEligibleCount++;
      structureHarmonicDetails.push(`🏠 ${h.p1} (${PLANET_LABEL_PT[h.planet] || h.planet}) na ${h.house}ª de ${h.p2}`);
      // Decisão pós-discussão (caso real: Sol recíproco na 7ª de cada um) — o MESMO
      // empurrão agora também soma na categoria de conteúdo (Prático/Emocional, via
      // categoryPoolForHouse), não só no eixo Estrutura isolado. Antes, esse marcador
      // (o mais clássico de compromisso em sinastria) movia structureHarmonyPct mas
      // aparecia como neutro na barra de categoria correspondente — inconsistente:
      // não existe leitura tradicional em que "Sol do parceiro na sua 7ª" é favorável
      // num painel e neutro noutro. Nota: pra Saturno, isso soma ao MESMO TEMPO que o
      // viés tenso de HOUSE_PLANET_VALENCE (Saturno está nas duas listas) — proposital,
      // não conflito: são duas leituras tradicionais reais e coexistentes (Saturno-
      // ângulo pesa/restringe por natureza, MAS especificamente numa das 4 casas de
      // compromisso é also o marcador clássico de vínculo que dura — a leitura de
      // "compromisso" vence no total por ter peso maior, sem apagar a de "peso" que a
      // acompanha). Decisão pós-discussão: pra Saturno, a linha de texto das duas
      // leituras já foi escrita FUNDIDA (🟡, "pesa, mas também estrutura de
      // compromisso") no bloco de valência acima (ver isSaturnCommitPair) — aqui só o
      // PESO (harmoniousW) soma, sem escrever uma segunda linha verde "— compromisso"
      // que duplicaria visualmente a mesma sobreposição.
      const commitCatKeys = categoryPoolForHouse(h.planet, h.house);
      if (commitCatKeys){
        for (const catKey of commitCatKeys){
          catPool[catKey].harmoniousW += CALIBRATION.commitmentHouseStructureWeight;
          if (h.planet !== 'Saturn'){
            catPool[catKey].harmonicDetails.push(`🟢 🏠 ${h.p1} (${PLANET_LABEL_PT[h.planet] || h.planet}) na ${h.house}ª de ${h.p2} — compromisso`);
          }
        }
      }
    }
    // Mesmo empurrão, eixo Destino: Nodo/Nodo Sul/Vértice nos mesmos quatro ângulos —
    // ver computeDestinyHouses e CALIBRATION.destinyHouseWeight acima. Antes desse
    // marcador nem existir, um Nodo/Vértice caindo bem na 7ª do parceiro (peso/destino
    // "instalado na estrutura" do vínculo) não tinha NENHUM efeito em destinyHarmonyPct.
    if (MARRIAGE_HOUSES.has(h.house) && DESTINY_ANCHORS.has(h.planet)){
      destinyHarmoniousW += CALIBRATION.destinyHouseWeight;
      destinyEligibleCount++;
      destinyHarmonicDetails.push(`🏠 ${h.p1} (${PLANET_LABEL_PT[h.planet] || h.planet}) na ${h.house}ª de ${h.p2}`);
    }
  }



  const harmonyRaw = (harmoniousW+tenseW) > 0 ? (harmoniousW/(harmoniousW+tenseW)*100) : 50;
  const harmonyPct = Math.min(95, Math.max(5, 50 + (harmonyRaw-50)*CALIBRATION.harmonyStretch));

  // mesma fórmula de stretch/clamp do harmonyPct geral, aplicada só ao sub-pool de um
  // eixo. Retorna null se o PESO do pool (não a contagem — ver CALIBRATION.
  // minAxisSignalWeight) ficar abaixo do piso de confiança, pra não mostrar uma falsa
  // precisão em cima de sinal fraco/disperso.
  function poolHarmonyPct(hW, tW, poolKey){
    if ((hW + tW) < CALIBRATION.minAxisSignalWeight) return null;
    const raw = hW/(hW+tW)*100;
    const stretched = Math.min(95, Math.max(5, 50 + (raw-50)*CALIBRATION.harmonyStretch));
    const ref = CALIBRATION.shrinkRefWeight && CALIBRATION.shrinkRefWeight[poolKey];
    const k = ref ? Math.min(1, (hW + tW) / ref) : 1;
    return Math.round(50 + (stretched - 50) * k);
  }
  const structureHarmonyPct = poolHarmonyPct(structureHarmoniousW, structureTenseW, 'estrutura');
  const destinyHarmonyPct = poolHarmonyPct(destinyHarmoniousW, destinyTenseW, 'destino');
  // Peso bruto de cada eixo (sem escala nem teto de 100 — ao contrário de `presence`
  // nas categorias abaixo) — usado só pra ponderar Estrutura/Destino/Emocional/
  // Intelectual entre si na fatia de "significância" do Veredito (ver potentialScore).
  // Raw, não presence: presence tem teto em 100, o que distorceria a ponderação entre
  // sub-pools que discrepam muito de volume (ex. Destino, tipicamente pequeno, vs
  // Emocional/Intelectual, com listas de pares bem maiores) — dois pools ambos no teto
  // pesariam igual mesmo tendo volumes de sinal bem diferentes de fato.
  const structureWeight = structureHarmoniousW + structureTenseW;
  const destinyWeight = destinyHarmoniousW + destinyTenseW;
  // Antes os ambivalentes entravam nos dois lados (harmônico E tenso), pra refletir que
  // pesam nos dois via hFrac fracionário — mas isso duplicava a MESMA linha nas duas
  // seções do hover (ver discussão no chat: fica extenso e redundante, sobretudo quando
  // vários aspectos caem no meio). O peso fracionário continua indo pros dois lados em
  // structureHarmoniousW/structureTenseW (isso é sobre o número %, não sobre o texto) —
  // só o TEXTO do hover passa a ter uma seção própria "Ambivalente", sem repetir linha.
  const structureHarmonicDetailsFinal = structureHarmonicDetails;
  const structureTenseDetailsFinal = structureTenseDetails;
  const destinyHarmonicDetailsFinal = destinyHarmonicDetails;
  const destinyTenseDetailsFinal = destinyTenseDetails;

  // nitidez: % de aspectos muito exatos (orbe < 2°) dentro do pool curado (ver
  // isSignificantForHarmony), não a soma bruta — evita saturar em 100 sempre
  // (exclui aspectos outer-outer, que são geracionais e não dizem muito sobre o vínculo pessoal)
  const tightRatio = strengthEligibleCount ? (tightCount/strengthEligibleCount*100) : 0;
  const strength = Math.min(100, Math.round(tightRatio * CALIBRATION.strengthTightScale));

  // Nitidez por lado — mesma fórmula/escala do strength geral acima, mas aplicada só
  // ao sub-pool harmônico ou só ao tenso (eligibleHarmonicWeight/tightHarmonicWeight e
  // eligibleTenseWeight/tightTenseWeight, acumulados no loop). Usado pelo
  // intensificador do Veredito em potentialScore() pra amplificar o desvio da base só
  // com a nitidez do lado que a base já apontou como vencedor — nunca com a nitidez
  // "emprestada" do lado que perdeu (ver comentário em potentialScore).
  const tightHarmonicRatio = eligibleHarmonicWeight ? (tightHarmonicWeight/eligibleHarmonicWeight*100) : 0;
  const tightTenseRatio    = eligibleTenseWeight    ? (tightTenseWeight/eligibleTenseWeight*100)       : 0;
  const strengthHarmonic = Math.min(100, Math.round(tightHarmonicRatio * CALIBRATION.strengthTightScale));
  const strengthTense    = Math.min(100, Math.round(tightTenseRatio * CALIBRATION.strengthTightScale));

  const { houseConvergenceContacts, houseConvergenceDetails } = computeHouseConvergence(parsed.houses);
  const { commitmentHouseContacts, commitmentHouseDetails } = computeCommitmentHouses(parsed.houses);
  const { friendshipHouseContacts, friendshipHouseDetails } = computeFriendshipHouses(parsed.houses);
  const { destinyHouseContacts, destinyHouseDetails } = computeDestinyHouses(parsed.houses);
  const { chironPartnershipHouseContacts, chironPartnershipHouseDetails } = computeChironPartnershipHouse(parsed.houses);
  const { plutoPartnershipHouseContacts, plutoPartnershipHouseDetails } = computePlutoPartnershipHouse(parsed.houses);
  const { isLuminarySwap, luminarySwapDetail, luminarySwapCategory } = computeLuminarySwap(parsed.aspects);

  // presence[0-100]: satura conforme o peso acumulado de marcadores encontrados nessa
  // categoria cresce — sem "total do mapa" pra comparar contra, porque a categoria é
  // independente (ver CALIBRATION.categoryPresenceScale). 0 se o PESO ficar abaixo do
  // piso de confiança (CALIBRATION.minAxisSignalWeight — mesmo corte do eixo Imediato/
  // Estrutura, agora por força de sinal, não contagem de aspectos).
  // houseW soma junto de hW/tW pra decidir se há sinal suficiente pra mostrar presence
  // (uma categoria só com marcadores de casa, sem aspecto nenhum, ainda é sinal real) —
  // mas harmonyPct continua vindo só de poolHarmonyPct(hW, tW), sem houseW, porque casa
  // não carrega informação de harmonia/tensão (ver comentário acima).
  function poolPresence(hW, tW, houseW){
    const total = hW + tW + houseW;
    if (total < CALIBRATION.minAxisSignalWeight) return 0;
    return Math.min(100, Math.round(total * CALIBRATION.categoryPresenceScale));
  }
  const categoryScores = {};
  for (const k of CATEGORY_KEYS_INTERNAL){
    const { harmoniousW: hW, tenseW: tW, eligibleCount, houseW, houseCount, harmonicDetails, ambivalentDetails, tenseDetails, houseDetails } = catPool[k];
    categoryScores[k] = {
      // conta aspectos + marcadores de casa juntos — pro usuário, "quantos marcadores
      // encontrei nessa área" inclui os dois tipos de evidência, não só aspectos.
      eligibleCount: eligibleCount + houseCount,
      presence: poolPresence(hW, tW, houseW),
      // Peso bruto (mesma unidade/mesmo cálculo de `presence`, mas sem escala nem teto
      // de 100) — usado só pra ponderar esta categoria contra Estrutura/Destino/outra
      // categoria na fatia de "significância" do Veredito (ver structureWeight/
      // destinyWeight acima e potentialScore). `presence` não serve pra isso porque
      // satura em 100 — duas categorias no teto pesariam igual mesmo com volumes de
      // sinal bem diferentes.
      weight: hW + tW + houseW,
      harmonyPct: poolHarmonyPct(hW, tW, k), // null se o peso do sub-pool de ASPECTOS for baixo demais pra confiar (casas não entram aqui)
      // pro tooltip de hover da barra (renderCategoryVisuals): ambivalentes entram nos
      // dois lados (verde e vermelho) porque matematicamente eles PESAM nos dois
      // (harmoniousW e tenseW simultaneamente, via hFrac fracionário) — não é um "meio
      // termo neutro" que fica de fora, é um marcador que puxa um pouco pra cada lado.
      harmonicDetails: [...harmonicDetails, ...ambivalentDetails],
      tenseDetails: [...tenseDetails, ...ambivalentDetails],
      // marcadores de casa: nem harmônicos nem tensos (ver comentário no loop de
      // casas acima) — ficam de fora do split verde/vermelho de propósito, mas
      // precisam aparecer em ALGUM tooltip, senão eligibleCount conta um marcador
      // que o usuário nunca consegue ver o que é.
      houseDetails,
    };
  }

  // Compatibilidade Geral — a fórmula muda por tipo de vínculo, não só o texto:
  //
  // Romântico: mantém a média GEOMÉTRICA entre os eixos Imediato (faísca/atração) e
  // Estrutura (permanência/compromisso). Aqui o desequilíbrio entre os dois É um sinal
  // real — um par com muita faísca e nenhuma estrutura (ou vice-versa) tende a ser mais
  // instável do que uma média simples sugeriria, e a geométrica pune isso de propósito
  // (só fica alta quando os DOIS eixos são razoavelmente bons).
  //
  // Amizade/família: essa punição específica — divergência entre faísca imediata e
  // estrutura de longo prazo — não faz sentido pro "devagar e sempre" de uma amizade,
  // que não precisa nascer com faísca pra ser sólida, nem precisa que faísca e
  // permanência cresçam juntas. Isso NÃO significa zerar o eixo Imediato: química ainda
  // importa (e continua puxando a categoria Sexual/Intensidade). A diferença é que, em
  // vez da média geométrica entre os dois eixos de "papel" do contato (Imediato x
  // Estrutura), usamos a média ponderada por presence das 5 categorias de CONTEÚDO
  // (Emocional, Intelectual, Sexual/Intensidade, Prático, Afinidade) — ainda reflete
  // desequilíbrio real entre as áreas (uma amizade só emocional, sem nada prático/
  // intelectual, continua puxando a média pra baixo), mas para de punir especificamente
  // por o "clique" imediato não bater com a leitura de longo prazo, que é uma tensão
  // própria de romance, não de amizade.
  // O antigo eixo Imediato foi fundido na categoria de conteúdo Atração (categoryPoolFor
  // usa ATTRACTION_PAIRS ali, já a união dos dois pools originais — chave interna 'sexual' — só o rótulo
  // vira "Atração"/"Sexual / Paixão"/"Afeição" conforme o tipo de vínculo). O campo
  // continua se chamando immediateHarmonyPct no retorno/nos exports (retrocompat com
  // leituras e comparações salvas antes desta mudança — ver deserialização mais abaixo),
  // só a origem do número mudou: antes vinha de um sub-pool próprio (axisPoolFor
  // 'immediate', removido), agora vem do sub-pool da categoria Atração.
  const immediateHarmonyPct = categoryScores.sexual.harmonyPct;

  let compatibilityScore;
  if (relType === 'romantico'){
    compatibilityScore = (immediateHarmonyPct !== null && structureHarmonyPct !== null)
      ? Math.round(Math.sqrt(immediateHarmonyPct * structureHarmonyPct))
      : null;
    // Nudge de Afinidade (Júpiter) — ver CALIBRATION.affinityNudgeWeight pro raciocínio
    // completo. Só se aplica depois de a raiz geométrica já existir (Compat null
    // continua null — não faz sentido "temperar" uma nota que nem foi calculada), e só
    // se Afinidade tiver peso suficiente pra passar do piso de confiança
    // (categoryScores.afinidade.harmonyPct null = sem sinal, sem nudge).
    const afinidadeHarmonyPct = categoryScores.afinidade.harmonyPct;
    if (compatibilityScore !== null && afinidadeHarmonyPct !== null){
      const nudge = (afinidadeHarmonyPct - 50) * CALIBRATION.affinityNudgeWeight;
      compatibilityScore = Math.round(Math.min(100, Math.max(0, compatibilityScore + nudge)));
    }
  } else {
    // Compatibilidade de amizade/família = média das categorias de conteúdo, agora
    // ponderada pela própria `presence` de cada categoria (confiança/quantidade de
    // sinal), não mais uma média simples 1/5 — auditoria com caso real (Marte-Júpiter
    // recíproco): Afinidade com presence 13% (3 aspectos) puxava a média com o MESMO
    // peso que Prático com presence 100% (13 aspectos), deixando um sub-pool fino
    // demais distorcer o resultado tanto quanto um bem estabelecido. Ponderar por
    // presence deixa uma categoria pouco evidenciada influenciar pouco, sem excluí-la —
    // o sinal ainda conta, só proporcional à confiança que temos nele. Fallback pra
    // média simples no caso raro de todos os pesos ficarem em zero.
    const catEntries = COMPAT_CATEGORY_KEYS
      .map(k => ({ v: categoryScores[k].harmonyPct, w: categoryScores[k].presence }))
      .filter(e => e.v !== null);
    const totalWeight = catEntries.reduce((s, e) => s + e.w, 0);
    compatibilityScore = catEntries.length
      ? Math.round(
          totalWeight > 0
            ? catEntries.reduce((s, e) => s + e.v * e.w, 0) / totalWeight
            : catEntries.reduce((s, e) => s + e.v, 0) / catEntries.length
        )
      : null;
  }

  const vinculoProfile = computeVinculoProfile({
    relType,
    structureHarmonyPct,
    atracaoHarmonyPct: categoryScores.sexual.harmonyPct,
    afinidadeHarmonyPct: categoryScores.afinidade.harmonyPct,
    destinyHarmonyPct,
    sunMoonHarmonic: sunMoon.harmonic, sunMoonTense: sunMoon.tense,
    commitmentHouseContacts,
    destinyHouseContacts,
    saturnCommitmentHarmonic: saturnCommitment.harmonic, saturnCommitmentTense: saturnCommitment.tense,
    nodeDestinyHarmonic: nodeDestiny.harmonic, nodeDestinyTense: nodeDestiny.tense,
    chironWoundContacts: chironWound.contacts,
    chironPartnershipHouseContacts,
    fortuneContacts: fortune.contacts,
    espiritoContacts: espirito.contacts,
    friendshipHouseContacts,
  });

  // potentialScore depende de compatibilityScore/harmonyPct/strength/destinyHarmonyPct/
  // structureHarmonyPct, todos já calculados acima — computado aqui (uma vez, junto com
  // o resto dos scores derivados) e persistido no objeto, em vez de recalculado sob
  // demanda em cada lugar que precisa dele (lista, ordenação, export). Isso garante uma
  // única fonte da verdade e faz o campo ser exportado/importado automaticamente junto
  // com o resto da comparação.
  const roundedHarmonyPct = Math.round(harmonyPct);
  const potential = potentialScore({
    compatibilityScore, harmonyPct: roundedHarmonyPct, strength, relType,
    structureHarmonyPct, destinyHarmonyPct, strengthHarmonic, strengthTense,
    structureWeight, destinyWeight, categoryScores,
  });

  return {
    categoryScores, harmonyPct: roundedHarmonyPct, strength, strengthHarmonic, strengthTense,
    structureWeight, destinyWeight,
    immediateHarmonyPct, structureHarmonyPct, destinyHarmonyPct, compatibilityScore,
    potentialScore: potential,
    structureHarmonicDetails: structureHarmonicDetailsFinal, structureTenseDetails: structureTenseDetailsFinal,
    structureAmbivalentDetails, destinyAmbivalentDetails,
    destinyHarmonicDetails: destinyHarmonicDetailsFinal, destinyTenseDetails: destinyTenseDetailsFinal,
    // Achata cada tracker de volta pros nomes de campo originais (contacts/harmonic/
    // ambivalent/tense/tenseLight/details com o prefixo do marcador) — o resto do app
    // (chips, export, dictionary etc.) continua consumindo exatamente esse formato.
    saturnCommitmentContacts: saturnCommitment.contacts, saturnCommitmentHarmonic: saturnCommitment.harmonic, saturnCommitmentAmbivalent: saturnCommitment.ambivalent, saturnCommitmentTense: saturnCommitment.tense, saturnCommitmentTenseLight: saturnCommitment.tenseLight, saturnCommitmentDetails: saturnCommitment.details,
    nodeDestinyContacts: nodeDestiny.contacts, nodeDestinyHarmonic: nodeDestiny.harmonic, nodeDestinyAmbivalent: nodeDestiny.ambivalent, nodeDestinyTense: nodeDestiny.tense, nodeDestinyTenseLight: nodeDestiny.tenseLight, nodeDestinyDetails: nodeDestiny.details,
    nodeAxisContacts: nodeAxis.contacts, nodeAxisHarmonic: nodeAxis.harmonic, nodeAxisAmbivalent: nodeAxis.ambivalent, nodeAxisTense: nodeAxis.tense, nodeAxisTenseLight: nodeAxis.tenseLight, nodeAxisDetails: nodeAxis.details,
    vertexFatedContacts: vertexFated.contacts, vertexFatedHarmonic: vertexFated.harmonic, vertexFatedAmbivalent: vertexFated.ambivalent, vertexFatedTense: vertexFated.tense, vertexFatedTenseLight: vertexFated.tenseLight, vertexFatedDetails: vertexFated.details,
    chironWoundContacts: chironWound.contacts, chironWoundHarmonic: chironWound.harmonic, chironWoundAmbivalent: chironWound.ambivalent, chironWoundTense: chironWound.tense, chironWoundTenseLight: chironWound.tenseLight, chironWoundDetails: chironWound.details,
    lilithMagneticContacts: lilithMagnetic.contacts, lilithMagneticHarmonic: lilithMagnetic.harmonic, lilithMagneticAmbivalent: lilithMagnetic.ambivalent, lilithMagneticTense: lilithMagnetic.tense, lilithMagneticTenseLight: lilithMagnetic.tenseLight, lilithMagneticDetails: lilithMagnetic.details,
    sunTranspersonalContacts: sunTranspersonal.contacts, sunTranspersonalHarmonic: sunTranspersonal.harmonic, sunTranspersonalAmbivalent: sunTranspersonal.ambivalent, sunTranspersonalTense: sunTranspersonal.tense, sunTranspersonalTenseLight: sunTranspersonal.tenseLight, sunTranspersonalDetails: sunTranspersonal.details,
    fortuneContacts: fortune.contacts, fortuneHarmonic: fortune.harmonic, fortuneAmbivalent: fortune.ambivalent, fortuneTense: fortune.tense, fortuneTenseLight: fortune.tenseLight, fortuneDetails: fortune.details,
    espiritoContacts: espirito.contacts, espiritoHarmonic: espirito.harmonic, espiritoAmbivalent: espirito.ambivalent, espiritoTense: espirito.tense, espiritoTenseLight: espirito.tenseLight, espiritoDetails: espirito.details,
    sunMoonContacts: sunMoon.contacts, sunMoonHarmonic: sunMoon.harmonic, sunMoonAmbivalent: sunMoon.ambivalent, sunMoonTense: sunMoon.tense, sunMoonTenseLight: sunMoon.tenseLight, sunMoonDetails: sunMoon.details,
    houseConvergenceContacts, houseConvergenceDetails,
    commitmentHouseContacts, commitmentHouseDetails,
    destinyHouseContacts, destinyHouseDetails,
    friendshipHouseContacts, friendshipHouseDetails,
    chironPartnershipHouseContacts, chironPartnershipHouseDetails,
    plutoPartnershipHouseContacts, plutoPartnershipHouseDetails,
    vinculoProfile,
    isLuminarySwap, luminarySwapDetail, luminarySwapCategory,
  };
}

/**
 * Transforma os scores agregados de computeScores() no veredito textual (título +
 * descrição) mostrado ao usuário. Recebe um único objeto (em vez de posicionais) —
 * refatorado justamente porque os 4 call sites (main.js, comparisons.js ×2, report.js)
 * tinham vários parâmetros do mesmo tipo (number|null) em sequência, fácil trocar
 * `harmonyPct`/`immediateHarmonyPct`/`structureHarmonyPct` de posição sem erro de sintaxe.
 *
 * @param {Object} args
 * @param {{intelectual: Object, emocional: Object, sexual: Object, pratico: Object}} args.categoryScores
 *   Um objeto por categoria com ao menos `presence` (0-100) e `harmonyPct` (number|null).
 * @param {number} args.harmonyPct - Harmonia geral (Imediato × Estrutura, média geométrica), 0-100.
 * @param {number} args.strength - Nitidez geral (0-100); abaixo de 15 já retorna cedo como "Conexão sutil".
 * @param {string} args.relType - 'romantico' | 'amizade' | 'familia' (qualquer outro valor cai em 'romantico').
 * @param {number|null} args.immediateHarmonyPct - % harmônico do eixo Imediato, usado só para a nota de desequilíbrio Imediato×Estrutura.
 * @param {number|null} args.structureHarmonyPct - % harmônico do eixo Estrutura, mesmo uso acima.
 * @returns {{title: string, desc: string}}
 */
export function classify({ categoryScores, harmonyPct, strength, relType, immediateHarmonyPct, structureHarmonyPct }){
  relType = PAIR_INFO_BY_TYPE[relType] ? relType : 'romantico';
  const catMeta = catMetaFor(relType);
  // I/E/S/P agora são `presence` (0-100, independentes entre si — ver computeScores),
  // não mais fatias de uma pizza que soma 100. O ranking abaixo (quem "puxa mais")
  // continua fazendo sentido porque presence é comparável entre categorias, só que sem
  // a obrigação de somar 100.
  const I = categoryScores.intelectual.presence, E = categoryScores.emocional.presence,
        S = categoryScores.sexual.presence, P = categoryScores.pratico.presence;

  // Compatibilidade Geral agrega Imediato x Estrutura numa média geométrica (ver
  // computeScores) — quando os dois eixos têm dados suficientes e estão bem
  // desequilibrados entre si, isso é informação real que o harmonyPct sozinho não
  // captura (ver discussão no chat: um par pode ter harmonia geral "ok" enquanto a
  // tensão está concentrada bem onde mais importa pra um dos dois tipos de vínculo).
  // Sinalizamos isso como uma frase extra no texto, no mesmo padrão do mixedNote abaixo.
  // O texto varia por relType (igual ao resto do arquivo, ver EXTREME_TEXT_BY_TYPE) —
  // antes ficava fixo em linguagem romântica ("pegação", "paixão") mesmo pra
  // amizade/família, o que não fazia sentido nesses vínculos.
  let imbalanceNote = '';
  if (immediateHarmonyPct !== null && immediateHarmonyPct !== undefined &&
      structureHarmonyPct !== null && structureHarmonyPct !== undefined){
    const diff = immediateHarmonyPct - structureHarmonyPct;
    if (Math.abs(diff) >= CALIBRATION.imbalanceThreshold){
      const imb = IMBALANCE_TEXT_BY_TYPE[relType];
      // tier olha o nível absoluto do lado mais FRACO dos dois (não a diferença, que já
      // decidiu se a nota aparece) — mesma harmonyZone usada logo abaixo pra "faixa
      // mista" geral, reaproveitada aqui em vez de um novo limiar dedicado.
      const weakerPct = diff > 0 ? structureHarmonyPct : immediateHarmonyPct;
      const { low: zoneLow, high: zoneHigh } = CALIBRATION.harmonyZone;
      const tier = weakerPct < zoneLow ? 'low' : (weakerPct < zoneHigh ? 'mid' : 'high');
      imbalanceNote = diff > 0
        ? imb.immediateOverStructure(immediateHarmonyPct, structureHarmonyPct, tier)
        : imb.structureOverImmediate(immediateHarmonyPct, structureHarmonyPct, tier);
    }
  }

  // A leitura harmônica/tensa não é um corte binário em 55%: dentro de
  // CALIBRATION.harmonyZone tratamos como uma faixa MISTA — real na prática, já que
  // 54.9% e 55.1% de harmonia não representam vínculos categoricamente diferentes.
  // 'harmonic' ainda escolhe um lado do texto (o majoritário, >=50%) mesmo dentro da
  // zona mista, mas o texto sinaliza explicitamente quando a leitura é intermediária
  // em vez de apresentar uma certeza que o número não sustenta.
  const { low, high } = CALIBRATION.harmonyZone;
  const harmonic = harmonyPct >= 50;
  const isMixedZone = harmonyPct > low && harmonyPct < high;
  const mixedNote = ' A leitura de harmonia aqui está numa faixa intermediária — nem totalmente fluida, nem totalmente tensa; convivem fricção real e momentos de fluidez, sem um dos dois dominar claramente.';

  // Gap encontrado em auditoria (Parte 6→7): antes só disparava com harmonyPct também
  // na faixa mista (40-60%). Mas o problema que este aviso descreve — poucos aspectos
  // exatos, leitura pouco confiável — existe igual quando harmonyPct sai extremo (ex.:
  // 88%) só por causa de 1-2 aspectos esticados pelo harmonyStretch: um número decisivo
  // apoiado em quase nada é MAIS enganoso que um número no meio do caminho, não menos.
  // O texto já é genérico o bastante (usa harmonyPct dinamicamente, sem pressupor faixa)
  // pra cobrir qualquer valor sem reescrita. Restrição de faixa removida — strength
  // baixo sozinho já é o sinal real de "dado fino demais pra confiar no tema/dominância".
  if (strength < CALIBRATION.minStrengthForReading){
    return {
      title: "Conexão sutil",
      desc: `Poucos aspectos bem exatos ligam essas duas cartas — não há uma carga astrológica muito concentrada em nenhuma direção específica (harmonia em ${Math.round(harmonyPct)}%). Pode ser um vínculo mais leve ou ainda pouco explorado.`
    };
  }

  // Sem nenhum marcador de categoria reconhecido em nenhuma das 4 áreas — a leitura de
  // "tema" não tem base pra se apoiar, mesmo que harmonyPct/strength gerais existam
  // (eles vêm de TODOS os aspectos, não só dos marcadores específicos de categoria).
  // Evita apontar um tema (ex: "Emocional domina") quando na real não sobrou nenhum
  // marcador clássico de nenhuma das 4 listas pra sustentar essa afirmação.
  if (Math.max(I,E,S,P) === 0){
    return {
      title: 'Sem marcadores de categoria reconhecidos',
      desc: `Harmonia geral em ${Math.round(harmonyPct)}% e nitidez ${strength} — mas nenhum aspecto do relatório bate com os marcadores clássicos usados aqui pra apontar um tema (Intelectual/Emocional/Sexual/Prático). Costuma acontecer com relatórios pequenos ou concentrados em aspectos fora dessas listas específicas; não significa ausência de conexão, só que não há base suficiente pra dizer ONDE ela se concentra.`
    };
  }

  // dominância extrema de Sexual/Intensidade — caso especial, texto varia por relType.
  // Compara contra o MAIOR dos outros três (não a média): comparar só com a média
  // permitia essa branch disparar mesmo quando Prático (ou outra categoria) está
  // EMPATADO ou quase empatado com Sexual no teto de presence (100) — casos reais
  // encontrados (casos A e B: Sexual=100 E Prático=100 ao mesmo tempo)
  // geravam "é tudo química/intensidade", apagando um sinal estrutural igualmente
  // forte. Exigir que Sexual bata o maior individual, não só a média, evita isso: se
  // houver empate real no topo, cai no ranking normal abaixo, que já tem textos
  // dedicados pra dupla Prático+Sexual (ex.: "Presença com Chão"/"Atração com Chão").
  if (S - Math.max(I,E,P) > CALIBRATION.extremeAttractionGap){
    const ext = EXTREME_TEXT_BY_TYPE[relType];
    const title = harmonic ? ext.harmonicTitle : ext.tenseTitle;
    let flavor = harmonic
      ? ext.harmonicFlavor(S, Math.round(harmonyPct))
      : ext.tenseFlavor(S, Math.round(harmonyPct));
    let desc = capitalize(flavor);
    if (isMixedZone) desc += mixedNote;
    desc += imbalanceNote;
    return { title, desc };
  }

  // As categorias que definem o "tema" central da conexão são escolhidas por PROMINÊNCIA,
  // não só por presence bruta. Motivo (discutido no chat, caso real): presence alta com
  // harmonyPct perto de 50% é um "campo de disputa em aberto" — o tema aparece bastante,
  // mas o que aparece não aponta claramente pra lado nenhum — enquanto a mesma presence
  // com harmonyPct decisivamente favorável OU tenso é, sim, uma força real que caracteriza
  // o vínculo (favorável ou tenso, os dois contam como "decisivo" — não é um bônus só pro
  // lado bom). Um astrólogo de verdade não trataria os dois casos como equivalentes só
  // porque têm o mesmo número de marcadores.
  // decisivenessWeight vai de PROMINENCE_MIN_WEIGHT (harmonyPct=50%, totalmente misto, ou
  // null — sem dado de favorabilidade próprio) até 1.0 (harmonyPct=0% ou 100%, o extremo
  // decisivo). O piso evita zerar categorias mistas — presence real continua pesando,
  // só não carrega o peso de uma leitura já resolvida.
  const PROMINENCE_MIN_WEIGHT = CALIBRATION.prominenceMinWeight;
  function decisivenessWeight(hPct){
    if (hPct === null) return PROMINENCE_MIN_WEIGHT;
    const decisiveness = Math.abs(hPct - 50) / 50;
    return PROMINENCE_MIN_WEIGHT + (1 - PROMINENCE_MIN_WEIGHT) * decisiveness;
  }
  const prominence = {
    intelectual: I * decisivenessWeight(categoryScores.intelectual.harmonyPct),
    emocional:   E * decisivenessWeight(categoryScores.emocional.harmonyPct),
    sexual:      S * decisivenessWeight(categoryScores.sexual.harmonyPct),
    pratico:     P * decisivenessWeight(categoryScores.pratico.harmonyPct),
  };
  // sorted continua guardando presence bruta (pra exibir os números que o usuário
  // reconhece, ex. "Prático (100)") — só a ORDEM vem de prominence, não o valor exibido.
  // EXCETO quando 3+ categorias empatam (ou quase) em prominence no topo (ver topGroup
  // abaixo), caso em que a frase-âncora passa a nomear todas, não só duas.
  const sorted = Object.entries({ intelectual:I, emocional:E, sexual:S, pratico:P })
    .sort((a,b)=> prominence[b[0]] - prominence[a[0]]);
  const [topKey, topVal] = sorted[0];
  const [secondKey, secondVal] = sorted[1];
  const [thirdKey, thirdVal] = sorted[2];
  const [bottomKey, bottomVal] = sorted[3];
  // Os degraus de "empate" abaixo (topGroup, e a nota de "vem logo atrás") também
  // precisam comparar prominence, não presence bruta — a ordem em `sorted` agora vem de
  // prominence, então comparar presence entre posições adjacentes do array reordenado
  // não mede mais "estão empatados no critério que os colocou nessa ordem". Ex.: se
  // Emocional (presence 85, prominence alta) passou à frente de Prático (presence 100,
  // prominence mais baixa), a diferença de presence entre eles (-15) não representa
  // proximidade nenhuma no critério de ranking — é só um artefato da nova ordem.
  const topProm = prominence[topKey], secondProm = prominence[secondKey],
        thirdProm = prominence[thirdKey], bottomProm = prominence[bottomKey];
  const pairKey = [topKey, secondKey].sort().join('+');
  const info = PAIR_INFO_BY_TYPE[relType][pairKey];

  // fora da zona mista, um segundo degrau controla o sufixo de intensidade — mas agora
  // simétrico (existia só pro lado tenso antes; o lado bem harmônico também ganha nota)
  const extremeSuffix = harmonyPct <= CALIBRATION.strongTenseThreshold ? ' (bastante tensa)'
    : harmonyPct >= CALIBRATION.strongHarmonicThreshold ? ' (fluindo bastante)'
    : '';
  const title = (harmonic ? info.title : info.tenseTitle) + extremeSuffix;
  const bodyFlavor = harmonic ? info.harm : info.tense;

  // Empate (ou quase) no topo: até aqui, quando 3+ categorias ficavam coladas na
  // presence mais alta (ex.: Sexual=Intelectual=Prático=100), a frase-âncora só citava
  // as DUAS primeiras do ranking — e qual entrava como "1ª"/"2ª" num empate exato não
  // vinha de nenhum sinal do mapa, só da ordem fixa das chaves do objeto acima
  // (intelectual > emocional > sexual > pratico), o que sempre empurrava a mesma
  // categoria (pratico, por vir por último) pra fora da frase principal, empate real ou
  // não. topGroup encadeia do topo pra baixo, entrando com secondKey/thirdKey/bottomKey
  // só enquanto cada degrau estiver dentro de CALIBRATION.nearTiePctGap do anterior — daí
  // 3 ou 4 vias nomeadas quando o empate é real, sem inventar texto de "trio" novo (o
  // sabor/bodyFlavor continua vindo do par top+second, só a frase-âncora muda).
  const topGroup = [[topKey, topVal]];
  if (topProm - secondProm < CALIBRATION.nearTiePctGap){
    topGroup.push([secondKey, secondVal]);
    if (secondProm - thirdProm < CALIBRATION.nearTiePctGap){
      topGroup.push([thirdKey, thirdVal]);
      if (thirdProm - bottomProm < CALIBRATION.nearTiePctGap) topGroup.push([bottomKey, bottomVal]);
    }
  }
  const isTopTie = topGroup.length >= 3;

  let desc;
  if (isTopTie){
    const names = topGroup.map(([k,v]) => `${catMeta[k].label} (${v})`);
    const namesText = names.length === 2
      ? names.join(' e ')
      : names.slice(0, -1).join(', ') + ' e ' + names[names.length - 1];
    desc = `${namesText} empatam (ou quase) no topo dessa conexão — ${bodyFlavor}`;
  } else {
    desc = `${catMeta[topKey].label} (${topVal}) e ${catMeta[secondKey].label} (${secondVal}) puxam a maior parte dessa conexão — ${bodyFlavor}`;
  }

  // Leitura favorável/tensa ESPECÍFICA de cada categoria citada na frase-âncora (o "eixo
  // de dois lados" pedido na conversa: presence mostra QUANTO essa área aparece,
  // harmonyPct da própria categoria mostra se, entre os marcadores encontrados,
  // predomina o lado que flui ou o que atrita — as duas coisas juntas, não só uma média
  // geral do mapa). Antes só rodava pra topKey; agora roda pra todo membro do topGroup —
  // senão uma categoria citada de igual pra igual na frase principal (ex.: Prático
  // empatado com Sexual) ficava sem nota própria, como se sua presença fosse "neutra"
  // por omissão, quando na real pode estar tão na faixa mista quanto o exemplo do chat
  // (55% favorável, quase empate entre o que flui e o que atrita).
  //
  // Split de tom: quando a categoria mais favorável do topGroup está claramente acima
  // (>=high) e a menos favorável fica bem abaixo dela (gap >= CALIBRATION.imbalanceThreshold
  // — o mesmo limiar já usado pro desequilíbrio Imediato x Estrutura, reaproveitado aqui
  // pela mesma lógica: gap grande = informação real, não ruído), o bodyFlavor único que
  // abre a frase-âncora — calibrado pelo harmonyPct GERAL do mapa, não pelas categorias
  // específicas citadas — está tratando presenças desiguais em favorabilidade como "o
  // mesmo tipo de força". Importante: isso cobre tanto o caso claramente tenso (ex.:
  // Sexual favorável x Prático tenso) quanto o caso mais sutil discutido no chat — uma
  // categoria claramente favorável ao lado de outra só na faixa mista, nem flui nem
  // atrita com clareza (ex.: Sexual 95% x Prático 55%) — que ainda assim não deveria
  // herdar o mesmo tom só por estar colada na mesma frase-âncora.
  const topGroupHarmonyNotes = [];
  let maxH = null, minH = null;
  for (const [k] of topGroup){
    const h = categoryScores[k].harmonyPct;
    if (h === null) continue;
    if (maxH === null || h > maxH) maxH = h;
    if (minH === null || h < minH) minH = h;
    if (h <= low || h >= high){
      topGroupHarmonyNotes.push(h >= high
        ? `em ${catMeta[k].label.toLowerCase()} especificamente, os marcadores encontrados pendem bem pro lado que flui (${h}% favorável)`
        : `em ${catMeta[k].label.toLowerCase()} especificamente, os marcadores encontrados pendem bem pro lado que atrita (${100 - h}% tenso)`);
    }
  }
  const hasSplit = maxH !== null && minH !== null && maxH >= high && (maxH - minH) >= CALIBRATION.imbalanceThreshold;
  if (hasSplit){
    desc += ` Vale um cuidado aqui: dentro desse grupo a presença é forte, mas o tom não é uniforme — tem categoria puxando claramente pro lado que flui (${maxH}% favorável) enquanto outra fica bem mais dividida ou tensa (${minH}%), então o tom único da frase acima simplifica essa combinação; presença forte não é sinônimo de favorável em todas.`;
  }
  if (topGroupHarmonyNotes.length === 1){
    desc += ` ${capitalize(topGroupHarmonyNotes[0])}.`;
  } else if (topGroupHarmonyNotes.length > 1){
    const last = topGroupHarmonyNotes[topGroupHarmonyNotes.length - 1];
    const joined = topGroupHarmonyNotes.slice(0, -1).join('; ') + '; e ' + last;
    desc += ` ${capitalize(joined)}.`;
  }

  // se a 2ª e a 3ª categoria estão muito próximas, o "tema" escolhido é menos decisivo
  // do que o texto sozinho sugere — sinalizamos isso em vez de tratar como resolvido.
  // Fica antes da menção ao último colocado pra seguir a ordem real do ranking
  // (1º, 2º, 3º, último) em vez de pular do 2º pro último e só depois voltar pro 3º.
  // Só dispara quando NÃO já é um empate de topo (isTopTie): nesse caso thirdKey já foi
  // nomeado na frase-âncora acima, e repetir aqui seria redundante.
  if (!isTopTie && secondProm - thirdProm < CALIBRATION.nearTiePctGap){
    desc += ` ${catMeta[thirdKey].label} vem logo atrás, em ${thirdVal} — a diferença é pequena, então esse tema secundário também tem peso real no vínculo.`;
  }

  // bottomKey só fica de fora da frase se ele mesmo não fizer parte do empate de topo
  // (caso de empate a 4 vias, onde não sobra "último" de verdade).
  if (!topGroup.some(([k]) => k === bottomKey)){
    desc += ` ${catMeta[bottomKey].label} fica em último (${bottomVal}), sinal de que isso não é o centro de gravidade do vínculo.`;
  }

  if (isMixedZone) desc += mixedNote;
  desc += imbalanceNote;

  return { title, desc };
}

export function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

export function catMetaFor(relType){
  return {
    ...CAT_META,
    sexual: { ...CAT_META.sexual, label: SEXUAL_LABEL_BY_TYPE[relType] || CAT_META.sexual.label },
  };
}

