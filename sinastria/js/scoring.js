/**
 * scoring.js — Primitivas de pontuação por aspecto individual: fração
 * harmônica, boost por eixo clássico, em qual categoria/eixo um par de
 * planetas cai, peso de marcador de casa. É a camada entre a taxonomia
 * (pairs.js/calibration.js) e o motor de agregação (compute.js).
 * Depende de: calibration.js, labels.js, pairs.js.
 * Usado por: comparisons.js, compute.js, dictionary.js, main.js, parser.js.
 */

import { AXIS_BOOST, CALIBRATION, DSC_ASC_INTERMEDIATE_TIER } from './calibration.js';
import { ASPECT_LABEL_PT, PLANET_LABEL_PT, SIGN_LABEL_PT } from './labels.js';
import { AFFINITY_JUPITER_PAIRS, AMBIVALENT_CONJUNCTION_POINTS, ANGULAR_HOUSES, ATTRACTION_PAIRS, CADENT_HOUSES, CORE_PERSONAL_PLANETS, DESTINY_ANCHORS, DSC_ASC_SYMMETRIC_ASPECTS, DSC_PERSONAL_PLANETS, DUAL_CATEGORY_PAIRS, EMOCIONAL_PAIRS, HARD_PLANETS, HOUSE_CATEGORY_MARKERS, HOUSE_DUAL_CATEGORY_MARKERS, INTELECTUAL_PAIRS, LUMINARY_STRUCTURE_PAIRS, MARS_CHEMISTRY_CONJUNCTION_PARTNERS, MENTAL_STRUCTURE_PAIRS, PRATICO_ANCHORS, STRUCTURE_ANCHORS, TRANSPERSONAL_PLANETS, VENUS_BENIGN_HARD_PARTNERS } from './pairs.js';

// Eixo Imediato (Química) deixou de existir como eixo próprio — foi fundido nas
// categorias de conteúdo Atração/Afinidade (ver ATTRACTION_PAIRS/AFFINITY_JUPITER_PAIRS
// logo abaixo de categoryPoolFor). axisPoolFor agora só distingue Estrutura de Destino;
// a Compatibilidade Geral usa o harmonyPct da categoria Atração no lugar do antigo
// immediateHarmonyPct (ver computeScores).
export function axisPoolFor(planet1, planet2){
  const pairKey = [planet1, planet2].sort().join('-');
  if (LUMINARY_STRUCTURE_PAIRS.has(pairKey) || MENTAL_STRUCTURE_PAIRS.has(pairKey)) return 'structure';
  // IC e DSC entraram aqui junto com Ascendente/MC (auditoria: antes só Asc/MC contavam
  // como "ângulo" nesse teste — o que deixava Nodo-IC, Nodo-DSC, Vértice-IC e Vértice-DSC
  // fora do eixo Destino inteiramente, já que IC/DSC não são personal planets nem
  // Ascendente/MC. Pro lado Estrutura isso não muda nada na prática, porque IC/DSC já são
  // membros de STRUCTURE_ANCHORS e caem no fallback "os dois são âncora" logo abaixo).
  const anchorHitsPersonal = (anchors, anchor, other) =>
    anchors.has(anchor) && (CORE_PERSONAL_PLANETS.has(other) || other === 'Ascendant' || other === 'MC' || other === 'IC' || other === 'DSC');
  if (anchorHitsPersonal(STRUCTURE_ANCHORS, planet1, planet2) || anchorHitsPersonal(STRUCTURE_ANCHORS, planet2, planet1)) return 'structure';
  if (anchorHitsPersonal(DESTINY_ANCHORS, planet1, planet2) || anchorHitsPersonal(DESTINY_ANCHORS, planet2, planet1)) return 'destiny';
  // dois pontos "âncora" entre si (Nodo-Nodo, Saturno-Saturno, MC-MC etc.) também são
  // sinal mútuo — em especial o eixo nodal alinhado entre os dois mapas, que a
  // literatura trata como um dos marcadores kármicos/de destino mais fortes que existem.
  // Antes ficava de fora (retornava null) porque a checagem exigia que UM lado fosse
  // pessoal/ângulo.
  if (STRUCTURE_ANCHORS.has(planet1) && STRUCTURE_ANCHORS.has(planet2)) return 'structure';
  if (DESTINY_ANCHORS.has(planet1) && DESTINY_ANCHORS.has(planet2)) return 'destiny';
  return null;
}

export function categoryPoolFor(planet1, planet2){
  const pairKey = [planet1, planet2].sort().join('-');
  if (DUAL_CATEGORY_PAIRS.has(pairKey)) return DUAL_CATEGORY_PAIRS.get(pairKey);
  if (INTELECTUAL_PAIRS.has(pairKey)) return ['intelectual'];
  if (EMOCIONAL_PAIRS.has(pairKey)) return ['emocional'];
  if (ATTRACTION_PAIRS.has(pairKey)) return ['sexual'];
  if (AFFINITY_JUPITER_PAIRS.has(pairKey)) return ['afinidade'];
  // Ascendente-Ascendente e Fortuna tocando pessoal também entram em Afinidade — modos
  // que combinam desde a primeira impressão (Ascendente) e indício auxiliar de
  // felicidade/destino compartilhado (Fortuna, ponto derivado). Casos menos centrais que
  // Júpiter, então pesam menos aqui (ver peso reduzido em AXIS_BOOST) — mas cabem na
  // mesma família de "leveza/facilidade" que não é sobre desejo nem sobre estrutura.
  if (planet1 === 'Ascendant' && planet2 === 'Ascendant') return ['afinidade'];
  if ((planet1 === 'Fortune' && CORE_PERSONAL_PLANETS.has(planet2)) ||
      (planet2 === 'Fortune' && CORE_PERSONAL_PLANETS.has(planet1))) return ['afinidade'];
  // Parte do Espírito tocando pessoal: ajuste de paridade com a Fortuna acima — mesmo
  // estatuto de ponto derivado, mesma família de "leveza/facilidade" em Afinidade.
  if ((planet1 === 'Spirit' && CORE_PERSONAL_PLANETS.has(planet2)) ||
      (planet2 === 'Spirit' && CORE_PERSONAL_PLANETS.has(planet1))) return ['afinidade'];
  if (planet1 === 'Saturn' && planet2 === 'Saturn') return ['pratico'];
  if ((planet1 === 'Node' || planet1 === 'SouthNode') && (planet2 === 'Node' || planet2 === 'SouthNode')) return ['pratico'];
  if (planet1 === 'Vertex' && planet2 === 'Vertex') return ['pratico'];
  // anchorHitsPersonal aqui espelha a versão de axisPoolFor (linha ~827): reconhece os
  // quatro ângulos (Ascendente/MC/IC/DSC) como alvo válido de âncora prática, não só os
  // 5 planetas pessoais. Antes só checava CORE_PERSONAL_PLANETS — gap encontrado em
  // auditoria: Saturno/Nodo/Nodo Sul/Vértice tocando Ascendente ou DSC já tinham peso
  // elevado em AXIS_BOOST (1.30-1.35) e já contavam pro eixo Estrutura/Destino via
  // axisPoolFor, mas caíam sem categoria de conteúdo nenhuma — Prático ficava cego pra
  // esses contatos. MC/IC não precisam entrar na lista de ângulos aqui porque já são
  // membros do próprio PRATICO_ANCHORS (o teste `anchor` já cobre esse lado).
  const anchorHitsPersonal = (anchor, other) =>
    PRATICO_ANCHORS.has(anchor) &&
    (CORE_PERSONAL_PLANETS.has(other) || other === 'Ascendant' || other === 'MC' || other === 'IC' || other === 'DSC');
  if (anchorHitsPersonal(planet1, planet2) || anchorHitsPersonal(planet2, planet1)) return ['pratico'];
  return null;
}
export function categoryPoolForHouse(planet, house){
  const key = `${planet}-${house}`;
  if (HOUSE_DUAL_CATEGORY_MARKERS.has(key)) return HOUSE_DUAL_CATEGORY_MARKERS.get(key);
  const single = HOUSE_CATEGORY_MARKERS.get(key);
  return single ? [single] : null;
}

// Resumo compacto tipo " · 🔴1" ou " · 🟢2 🔴1" pro resumo do chip.
// Antes só aparecia quando o marcador tinha MAIS DE UM "sabor" misturado — a ideia era
// "se for tudo do mesmo tipo, o número principal já basta". Só que isso escondia a cor
// justamente no caso mais enganoso: um único contato TENSO (ex: 1 oposição Sol-Lua)
// ficava sem nenhum indicador no resumo, e o número "(1)" sozinho, ao lado de um rótulo
// como "vínculo duradouro", passa a impressão errada de que é sinal positivo. Agora
// mostra sempre que houver pelo menos 1 contato — o "número principal já basta" só
// valia se o resumo fosse neutro, e ele não é.
export function markerBreakdown(harmonic, ambivalent, tense, tenseLight){
  const parts = [];
  if (harmonic > 0) parts.push(`🟢${harmonic}`);
  if (ambivalent > 0) parts.push(`🟡${ambivalent}`);
  if (tenseLight > 0) parts.push(`🟠${tenseLight}`);
  if (tense > 0) parts.push(`🔴${tense}`);
  return parts.length > 0 ? ` · ${parts.join(' ')}` : '';
}

export function categoryEmoji(cat){
  if (cat === 'harmonic') return '🟢 ';
  if (cat === 'tense') return '🔴 ';
  if (cat === 'tenseLight') return '🟠 ';
  if (cat === 'ambivalent') return '🟡 ';
  return '';
}

// Quatro estados em vez de três: hFrac >= 0.6 flui de verdade, 0.41–0.59 é a faixa
// genuinamente ambivalente (conjunção de Saturno sozinha, conjunção transpessoal), e o
// lado tenso agora se divide em dois — hFrac <= 0.2 é tensão "de verdade" (Marte-Saturno,
// Júpiter-Saturno, maléficos clássicos) e 0.21–0.4 é tensão "leve/crônica" (Vênus benigno
// em quadratura/oposição, quincúncio, semiquadratura — desconforto real, mas de um degrau
// bem mais brando que o bloqueio duro). O corte em 0.2 foi confirmado com o usuário
// especificamente pra manter quincúncio e semiquadratura (ambos fixos em 0.2) do lado
// "tenso de verdade" — só quem fica ESTRITAMENTE acima de 0.2 vira tenso leve.
export function markerCategory(hFrac){
  if (hFrac >= 0.6) return 'harmonic';
  if (hFrac <= 0.2) return 'tense';
  if (hFrac <= 0.4) return 'tenseLight';
  return 'ambivalent';
}

// isHarmonic (opcional): quando informado, prefixa a linha com 🟢/🔴 pra distinguir,
// dentro do mesmo marcador (ex: "2 contatos de Saturno"), quais contatos fluem fácil
// e quais vêm com atrito — sem isso, um trígono e uma oposição contavam igual dentro
// do mesmo número, escondendo se aquele "compromisso" tende a apoiar ou pesar.
// category: 'harmonic' | 'ambivalent' | 'tense' | undefined (undefined = sem cor,
// usado nos poucos lugares que ainda chamam sem essa info). Terceiro estado adicionado
// porque alguns contatos (ex: conjunção de Saturno sozinha) são genuinamente 50/50 —
// forçá-los em "verde" ou "vermelho" escondia essa ambivalência real.
export function formatMarkerDetail(a, category){
  const p1Label = PLANET_LABEL_PT[a.planet1] || a.planet1;
  const p2Label = PLANET_LABEL_PT[a.planet2] || a.planet2;
  const aspLabel = ASPECT_LABEL_PT[a.aspect] || a.aspect;
  const sign1Label = a.sign1 ? (SIGN_LABEL_PT[a.sign1] || a.sign1) : '';
  const sign2Label = a.sign2 ? (SIGN_LABEL_PT[a.sign2] || a.sign2) : '';
  const prefix = category === 'harmonic' ? '🟢 ' : category === 'ambivalent' ? '🟡 ' : category === 'tenseLight' ? '🟠 ' : category === 'tense' ? '🔴 ' : '';
  return `${prefix}${a.p1} (${p1Label}${sign1Label ? ' em '+sign1Label : ''}) ${aspLabel} ${a.p2} (${p2Label}${sign2Label ? ' em '+sign2Label : ''}) — orbe ${a.orb.toFixed(1)}°`;
}

export function houseMarkerWeightFor(house){
  if (ANGULAR_HOUSES.has(house)) return CALIBRATION.houseMarkerWeightAngular;
  if (CADENT_HOUSES.has(house)) return CALIBRATION.houseMarkerWeightCadent;
  return CALIBRATION.houseMarkerWeight;
}

// Multiplicador de angularidade aplicado aos pares curados de HOUSE_CATEGORY_MARKERS
// (peso de presence E, agora, de valência — ver HOUSE_PLANET_VALENCE abaixo) — ver
// CALIBRATION.houseAngularityMult pro raciocínio completo de por que isso não compete
// com a curadoria temática, só a gradua.
export function houseAngularityMult(house){
  if (ANGULAR_HOUSES.has(house)) return CALIBRATION.houseAngularityMult.angular;
  if (CADENT_HOUSES.has(house)) return CALIBRATION.houseAngularityMult.cadent;
  return CALIBRATION.houseAngularityMult.succedent;
}

export function axisBoost(planet1, planet2, aspect){
  // Conjunção/oposição/quadratura ao Descendente são geometricamente IDÊNTICAS ao
  // mesmo aspecto formado com o Ascendente (mesmo eixo, 180° opostos — 90°/180°/0° de
  // um ponto é sempre o mesmo ângulo do seu oposto). Isso vale pra QUALQUER planeta ou
  // ponto, não só os pessoais — por isso, nesses três aspectos, tratamos DSC como
  // Ascendente pra fins de consulta no AXIS_BOOST, herdando o peso que o Ascendente já
  // tiver com aquele planeta (1.35, 1.20, ou o genérico 1.0, o que for).
  if (DSC_ASC_SYMMETRIC_ASPECTS.has(aspect)){
    const p1 = planet1 === 'DSC' ? 'Ascendant' : planet1;
    const p2 = planet2 === 'DSC' ? 'Ascendant' : planet2;
    const pair = [p1, p2].sort().join('-');
    return AXIS_BOOST.get(pair) || 1.0;
  }

  // Fora desses três aspectos, a simetria geométrica não existe de verdade (um trígono
  // ao Ascendente vira sextil ao Descendente — ângulos diferentes) — aí sim a leitura
  // "papel de parceria de longo prazo" (Descendente) pode legitimamente pesar diferente
  // da "reconhecimento instantâneo" (Ascendente). DSC-pessoal usa o tier intermediário;
  // qualquer outro par de DSC usa o que já estiver no mapa (ex.: DSC-Saturn/DSC-Node/
  // DSC-Vertex, já deliberadamente iguais ao Ascendente em todos os aspectos por
  // decisão anterior) ou cai no genérico 1.0.
  const isDscPersonal = (planet1 === 'DSC' && DSC_PERSONAL_PLANETS.has(planet2))
    || (planet2 === 'DSC' && DSC_PERSONAL_PLANETS.has(planet1));
  if (isDscPersonal) return DSC_ASC_INTERMEDIATE_TIER;

  const pair = [planet1, planet2].sort().join('-');
  return AXIS_BOOST.get(pair) || 1.0;
}

// Texto do explainer de Compatibilidade Geral muda com a fórmula (ver comentário em
// computeScores) — sem isso, a explicação na tela ficava desatualizada/errada pra
// amizade e família assim que a fórmula deixou de ser sempre a média geométrica.
export function compatExplainerParts(relType){
  if (relType === 'amizade' || relType === 'familia'){
    return {
      summary: 'Média ponderada das 5 áreas de conteúdo, pelo quanto cada uma apareceu no mapa.',
      bodyHTML: `
        <ul>
          <li>Média ponderada por <strong>presence</strong> das 5 áreas de conteúdo (Emocional, Intelectual, Prático, Atração e Afinidade) — reflete desequilíbrio real entre elas.</li>
          <li>Não pune especificamente se a atração diverge da leitura de longo prazo — essa diferença importa pra romance, não pra amizade/família.</li>
          <li><strong>Afinidade</strong> entra cheia aqui (mesmo peso que as outras 4, proporcional à própria presence dela) — diferente do romântico, onde ela fica fora da raiz Atração×Estrutura e só entra depois como ajuste fino.</li>
        </ul>`
    };
  }
  return {
    summary: 'Combina Atração e Estrutura — só fica alta quando os dois eixos são bons.',
    bodyHTML: `
      <ul>
        <li>Média <strong>geométrica</strong> entre Atração e Estrutura (não simples) — um eixo forte não "carrega" sozinho o outro fraco.</li>
        <li><strong>Afinidade</strong> (Júpiter) entra depois, só como ajuste fino de até <span class="fx">±3,6 pts</span> — não decide sozinha, só tempera.</li>
      </ul>`
  };
}

export function isMarsChemistryConjunction(planet1, planet2){
  if (planet1 === 'Mars' && MARS_CHEMISTRY_CONJUNCTION_PARTNERS.has(planet2)) return true;
  if (planet2 === 'Mars' && MARS_CHEMISTRY_CONJUNCTION_PARTNERS.has(planet1)) return true;
  return false;
}
export function isMarsMoonConjunction(planet1, planet2){
  return (planet1 === 'Mars' && planet2 === 'Moon') || (planet1 === 'Moon' && planet2 === 'Mars');
}

// Júpiter em quadratura/oposição: ainda é fricção real (a tradição não trata como
// harmônico disfarçado), mas de uma família diferente da tensão de Saturno/Marte —
// Júpiter é o planeta do excesso/expansão, então o desconforto típico é "exagero mal
// calibrado" (prometer demais, autoconfiança inflada, gastar/arriscar além da conta,
// choque de crenças/filosofia de vida em sinastria) em vez de bloqueio ou dor. Boa
// parte da literatura (da helenística à moderna) trata os aspectos duros de Júpiter
// como os mais brandos entre os classicamente "tensos" — não isento de atrito, mas um
// degrau acima do 0.0 genérico que Marte/Saturno/pessoais recebem em quadratura/oposição.
export function isJupiterHardAspect(planet1, planet2){
  return planet1 === 'Jupiter' || planet2 === 'Jupiter';
}

// Exceção dentro da exceção: Júpiter-Saturno é o eixo clássico de tensão social
// (expansão vs. contenção — "quero crescer/arriscar" vs "quero segurar/estruturar")
// mais citado na literatura como genuinamente desgastante, não como o "exagero mal
// calibrado" que justifica o amortecimento genérico de Júpiter acima. A pessoa-Saturno
// tende a ler a pessoa-Júpiter como irresponsável; a pessoa-Júpiter tende a ler a
// pessoa-Saturno como sufocante — é fricção de fundo (limite vs. expansão), não excesso
// pontual. Fica mais perto do 0.0 que Saturno recebe em outros contatos duros do que do
// 0.3 genérico de Júpiter, mas não idêntico a 0.0: mesmo aqui, a leitura clássica não
// trata Júpiter-Saturno como tão bloqueante quanto Marte-Saturno ou Saturno-pessoal.
export function isJupiterSaturnHardAspect(planet1, planet2){
  return (planet1 === 'Jupiter' && planet2 === 'Saturn') || (planet1 === 'Saturn' && planet2 === 'Jupiter');
}

export function isVenusBenignAspect(planet1, planet2){
  if (planet1 === 'Venus' && VENUS_BENIGN_HARD_PARTNERS.has(planet2)) return true;
  if (planet2 === 'Venus' && VENUS_BENIGN_HARD_PARTNERS.has(planet1)) return true;
  return false;
}

export function harmonicFraction(aspectWord, planet1, planet2, sameSign){
  if (aspectWord === 'Trine' || aspectWord === 'Sextile') return 1.0;
  if (aspectWord === 'Square' || aspectWord === 'Opposition'){
    if (isJupiterSaturnHardAspect(planet1, planet2)) return 0.1;
    if (isJupiterHardAspect(planet1, planet2)) return 0.3;
    // Marte-Vênus/Marte-Marte em quadratura/oposição: mesmo par de química já tratado
    // como exceção na conjunção (ver MARS_CHEMISTRY_CONJUNCTION_PARTNERS acima, 0.65) —
    // mas até esta correção, quadratura/oposição desses pares caía no 0.0 genérico, igual
    // a Marte-Saturno (bloqueio puro, sem química nenhuma). Isso contradiz a própria
    // leitura que o código já validou na conjunção: a tradição lê quadratura/oposição
    // Marte-Vênus como o caso clássico de "atração magnética com atrito" (paixão,
    // ciúme, tensão sexual) — genuinamente dividido, não puramente ruim. Fica em 0.45
    // (ambivalente, ligeiramente pendendo pra fricção) em vez do 0.65 da conjunção,
    // porque quadratura/oposição é de fato mais atrito que a fusão da conjunção, mesmo
    // dentro do mesmo par de química — preserva a diferença entre os dois tipos de
    // aspecto sem tratar a quadratura/oposição como puramente tensa.
    if (isMarsChemistryConjunction(planet1, planet2)) return 0.45;
    // Vênus-Mercúrio/Sol/Lua/Vênus em quadratura/oposição: ver isVenusBenignAspect acima —
    // testado com o caso real Vênus oposição Mercúrio (confirmado com o usuário).
    if (isVenusBenignAspect(planet1, planet2)) return 0.25;
    return 0.0;
  }
  // Semisextile (30°) é um aspecto menor entre signos vizinhos — sem harmonia real de
  // elemento nem modalidade entre eles, então a tradição não sustenta tratá-lo como
  // "levemente favorável" por padrão. Fica neutro (nem puxa pro harmônico, nem pro
  // tenso) em vez de um valor otimista sem base clássica clara.
  if (aspectWord === 'Semisextile') return 0.5;
  // Quincunx (150°) é classicamente um aspecto de "ajuste": nem harmônico nem
  // diretamente tenso como quadratura/oposição — mais um desconforto crônico, de
  // baixo grau, que pede adaptação constante entre os dois temas envolvidos.
  if (aspectWord === 'Quincunx') return 0.2;
  // Semiquadratura (45°) e sesquiquadratura (135°) são versões "menores" de quadratura/
  // oposição — mesma natureza de atrito, só que mais branda e mais difusa (irritação de
  // baixo grau em vez de conflito aberto). Sesquiquadratura tende a ser lida como
  // ligeiramente mais desestabilizadora que semiquadratura (mistura a tensão da
  // quadratura com o desconforto de ajuste da oposição), daí o valor um pouco menor.
  if (aspectWord === 'Semisquare') return 0.2;
  if (aspectWord === 'Sesquiquadrate') return 0.15;
  if (aspectWord === 'Conjunction'){
    let frac;
    if (isMarsChemistryConjunction(planet1, planet2)) frac = 0.65;
    // 0.45, não 0.4: markerCategory() só trata como 'ambivalent' o intervalo 0.41–0.59 —
    // em 0.4 exatos, esse contato caía em 'tense' puro, apesar do comentário acima
    // descrevê-lo como "genuinamente dividido, levemente pendendo pra fricção" (auditoria
    // confirmada com o usuário). 0.45 corrige a classificação pra ambivalente, mas fica
    // abaixo do 0.5 usado por Saturno-sozinho/Marte-Mercúrio (esses sim genuinamente
    // 50/50), preservando o viés de fricção que o comentário já pretendia.
    else if (isMarsMoonConjunction(planet1, planet2)) frac = 0.45;
    // Marte-Saturno conjunto: os dois "maléficos clássicos" juntos — aqui sim a leitura
    // dura se sustenta (ação bloqueada, frustração crônica), então fica ANTES da checagem
    // genérica de Saturno logo abaixo, senão cairia no ramo ambivalente por engano.
    else if ((planet1 === 'Mars' && planet2 === 'Saturn') || (planet1 === 'Saturn' && planet2 === 'Mars')) frac = 0.15;
    // Quíron-Marte conjunto: sem essa checagem explícita, caía no fallback genérico de
    // HARD_PLANETS (0.15) só por Marte estar ali — tratado igual a Marte-Saturno, um
    // maléfico puro. Mas a leitura tradicional (Reinhart e a maioria da sinastria
    // moderna) é dividida de verdade: o jeito de Marte agir/afirmar toca direto num
    // nervo exposto (pode disparar defensividade, brigas em torno de ferida
    // mal-resolvida) OU catalisa coragem de agir apesar da ferida. Ambivalente por
    // natureza, mesmo peso que Quíron sozinho já recebe (AMBIVALENT_CONJUNCTION_POINTS,
    // 0.5) — fica ANTES do fallback de HARD_PLANETS, senão nunca alcançaria esse ramo.
    else if ((planet1 === 'Chiron' && planet2 === 'Mars') || (planet1 === 'Mars' && planet2 === 'Chiron')) frac = 0.5;
    // Lilith-Marte conjunto: mesmo problema de ordem, mas leitura diferente — este é um
    // dos contatos mais citados de magnetismo/química crua em sinastria moderna (desejo
    // primitivo, faísca sexual intensa), não um meio-termo ambivalente como Quíron-Marte.
    // Correção de auditoria: o peso de categoria (AXIS_BOOST) NÃO é tier 1 (1.35, família
    // Mars-Venus/Mars-Mars) como se pensava antes — é tier 3 (1.20), mesma família de
    // Mars-Pluto/Mars-Neptune/Mars-Uranus (ver bloco logo abaixo). Ou seja, o próprio
    // sistema já trata Lilith-Mars como "química forte com um transpessoal", não como a
    // química pura de Marte-Vênus. 0.55 reconhece isso: mais favorável que a ambivalência
    // genérica de Marte-transpessoal (0.5, pelo magnetismo real do par), mas abaixo do
    // 0.65 "química com fio desencapado" de Marte-Vênus/Marte-Marte, que tem peso de
    // categoria mais alto e nenhum componente de sombra/repressão envolvido.
    else if ((planet1 === 'Lilith' && planet2 === 'Mars') || (planet1 === 'Mars' && planet2 === 'Lilith')) frac = 0.55;
    // Lilith-Saturno conjunto: diferente dos outros três pares de Quíron/Lilith acima,
    // este pende de verdade pro lado de atrito — Saturno tende a reprimir/policiar
    // exatamente o que Lilith representa (desejo não domesticado, instinto, poder
    // pessoal bruto), geralmente lido como vergonha em torno da sexualidade/poder ou
    // dinâmica de controle. Sem esta checagem, caía na regra genérica "Saturno sozinho"
    // logo abaixo (0.5, mesmo peso "neutro" de Quíron-Saturno) — mas a leitura aqui é
    // mais pesada que isso, sem ser o bloqueio puro de Marte-Saturno (0.15). Fica em 0.4
    // (dentro da faixa 🟠 "tenso, mas nem tanto"), ANTES da regra genérica de Saturno,
    // senão nunca seria alcançada. Quíron-Saturno NÃO precisa de checagem própria: já
    // cai certinho em 0.5 pela regra genérica de Saturno logo abaixo, e essa é
    // exatamente a leitura pretendida pra ele (ambivalente, mais "sério"/lento que
    // Quíron-Marte, mas sem o viés extra de repressão que só Lilith-Saturno carrega).
    else if ((planet1 === 'Lilith' && planet2 === 'Saturn') || (planet1 === 'Saturn' && planet2 === 'Lilith')) frac = 0.4;
    // Saturno conjunto (sozinho, sem Marte) a um pessoal ou ângulo: tradicionalmente lido
    // como o "aspecto de compromisso" por excelência — mas é genuinamente ambivalente, não
    // maléfico. Pode ancorar o vínculo por décadas (peso real, sensação de seriedade) OU
    // ser sentido como sufocante/crítico — qual lado domina depende de fatores que este
    // sistema não enxerga (fase de vida, se os dois topam esse peso, outros aspectos de
    // apoio). Tratar como 0.15 (quase-maléfico) supercarrega o lado ruim; 0.5 (o mesmo
    // valor "neutro" usado pros transpessoais) reflete melhor esse 50/50 real.
    else if (planet1 === 'Saturn' || planet2 === 'Saturn') frac = 0.5;
    // Marte-Mercúrio conjunto: mente/fala rápida e decisiva de um lado, mas Marte
    // (guerra/impulso) intensificando Mercúrio (comunicação) também é a receita clássica
    // de discussão, palavras cortantes, impaciência verbal. Não é um "maléfico" simples
    // como Marte-Saturno (ação bloqueada) nem puramente positivo — é genuinamente 50/50,
    // mesma família de tratamento de Saturno sozinho logo acima. Fica ANTES do fallback
    // genérico de HARD_PLANETS, senão cairia direto em 0.15 (quase-maléfico) só por
    // Marte estar ali, ignorando o lado construtivo (assertividade, clareza) do contato.
    else if ((planet1 === 'Mars' && planet2 === 'Mercury') || (planet1 === 'Mercury' && planet2 === 'Mars')) frac = 0.5;
    // Marte conjunto a um transpessoal (Urano/Netuno/Plutão): mesmo problema de ordem que
    // resolvemos pra Quíron/Lilith-Marte — sem checagem própria, caía no fallback genérico
    // de HARD_PLANETS (0.15) só por Marte estar ali, antes de alcançar TRANSPERSONAL_PLANETS
    // logo abaixo. Os três NÃO recebem o mesmo valor — cada um tem sabor tradicional
    // diferente, então cada par ganha seu próprio branch em vez de cair no fallback
    // genérico de TRANSPERSONAL_PLANETS (que trataria os três como idênticos):
    //
    // Marte-Urano: "faísca elétrica" — impulsividade, ação repentina, tesão de romper
    // regras/rotina. Pode ser emocionante (magnetismo, liberdade compartilhada) ou
    // explosivo/errático (brigas repentinas, imprevisibilidade cansativa) — volatilidade
    // genuína, não bloqueio. 0.5, ambivalente 50/50 puro.
    else if ((planet1 === 'Mars' && planet2 === 'Uranus') || (planet1 === 'Uranus' && planet2 === 'Mars')) frac = 0.5;
    // Marte-Netuno: também ambivalente, mas com viés mais pesado pro lado difícil que
    // Urano — a leitura tradicional pende mais pra "dissolução/confusão" (desejo nebuloso,
    // ação sabotada por idealização/ilusão, passivo-agressividade) do que pra faísca
    // eletrizante; ainda tem o lado construtivo (ação inspirada, quase mística), mas não é
    // 50/50 puro. 0.4, mesma faixa 🟠 "tenso, mas nem tanto" de Lilith-Saturno.
    else if ((planet1 === 'Mars' && planet2 === 'Neptune') || (planet1 === 'Neptune' && planet2 === 'Mars')) frac = 0.4;
    // Marte-Plutão: ao contrário dos outros dois, este é um dos contatos de
    // atração/desejo mais citados em toda a sinastria (paixão avassaladora, magnetismo
    // quase compulsivo) — não um meio-termo neutro, e o próprio AXIS_BOOST já reflete isso
    // (tier 3, mesma família de Lilith-Mars). O lado de sombra é dinâmica de
    // poder/controle/obsessão, não confusão ou bloqueio. Mesmo valor de Lilith-Mars
    // (0.55) — reconhece o magnetismo real sem empatar com a química pura de Marte-Vênus.
    else if ((planet1 === 'Mars' && planet2 === 'Pluto') || (planet1 === 'Pluto' && planet2 === 'Mars')) frac = 0.55;
    else if (HARD_PLANETS.has(planet1) || HARD_PLANETS.has(planet2)) frac = 0.15;
    else if (TRANSPERSONAL_PLANETS.has(planet1) || TRANSPERSONAL_PLANETS.has(planet2)) frac = 0.5;
    // Quíron/Lilith conjuntos a qualquer coisa: ambivalentes por definição simbólica
    // (ver comentário em AMBIVALENT_CONJUNCTION_POINTS), não puramente harmônicos.
    else if (AMBIVALENT_CONJUNCTION_POINTS.has(planet1) || AMBIVALENT_CONJUNCTION_POINTS.has(planet2)) frac = 0.5;
    else frac = 1.0;
    // conjunção "fora de signo" (dissociate): mesma proximidade em graus, mas os dois
    // planetas caem em signos diferentes (comum perto de 0°/29°) — tradicionalmente um
    // contato mais fraco e ambíguo do que uma fusão plena no mesmo signo, então puxamos
    // o resultado 30% em direção ao neutro (0.5) em vez de manter a leitura "cheia".
    if (sameSign === false) frac = 0.5 + (frac - 0.5) * 0.7;
    return frac;
  }
  return 0.5;
}

