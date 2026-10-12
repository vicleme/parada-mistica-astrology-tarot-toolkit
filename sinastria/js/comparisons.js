/**
 * comparisons.js — Lógica da aba Calculadora: CRUD da lista de sinastrias
 * salvas (persistida via state.js), potentialScore(), export/import CSV/JSON,
 * e a renderização do painel de resultado.
 * Depende de: charts.js, compute.js (import circular intencional, ver README),
 * calibration.js, labels.js, pairs.js, dictionary.js (circular), state.js.
 * Usado por: compute.js (circular), dictionary.js (circular), main.js, report.js.
 */

import { renderCategoryVisuals, setAxisHover } from './charts.js';
import { catMetaFor, classify, computeScores } from './compute.js';
import { CALIBRATION } from './calibration.js';
import { CATEGORY_HARMONIC_COLOR, CATEGORY_LABEL_PT, GROUP_META, POTENTIAL_LABEL_BY_FILTER, REL_TYPE_LABEL_PT } from './labels.js';
import { CATEGORY_KEYS } from './pairs.js';
import { refreshDictSynastryOptions } from './dictionary.js';
import { parseText } from './parser.js';
import { categoryEmoji, compatExplainerParts, markerBreakdown } from './scoring.js';
import { comparisons, editingId, saveComparisons, setComparisons, setEditingId } from './state.js';

// Migração automática: reaplica recalcEntry (parseText + computeScores por cima do
// c.raw já salvo) em TODAS as entradas que tiverem o texto original guardado. Existe
// pra que uma mudança de cálculo (ex: o redesign de `pct`/`dominance` pra
// `categoryScores` independente por área) se propague sozinha pro histórico já salvo,
// sem exigir que a pessoa clique em
// "Recalcular" entrada por entrada. Entradas sem c.raw (bem antigas, ou importadas de
// um export que não guardou o texto original) ficam como estão — não tem como
// recalcular sem o relatório de aspectos original. Silenciosa: não altera nada visível
// se não houver nada pra atualizar, e nunca lança erro pra fora (uma entrada com
// c.raw irreconhecível simplesmente não é tocada, graças ao retorno null de
// recalcEntry/recalcOne).
export function recalcAllComparisons(){
  let changed = false;
  setComparisons(comparisons.map(c => {
    if (!c.raw) return c;
    const updated = recalcEntry(c);
    if (!updated) return c;
    changed = true;
    return { ...c, ...updated, ts: c.ts };
  }));
  if (changed) saveComparisons();
}
export function addComparison(entry){
  comparisons.push(entry);
  saveComparisons();
  renderComparisons();
  refreshDictSynastryOptions();
}

export function updateComparison(id, data){
  const idx = comparisons.findIndex(c => c.id === id);
  if (idx === -1){
    // entrada sumiu (ex: removida em outra aba) — salva como nova mesmo assim
    addComparison({ id: Date.now(), ts: Date.now(), ...data });
    return;
  }
  comparisons[idx] = { ...comparisons[idx], ...data, ts: Date.now() };
  saveComparisons();
  renderComparisons();
  refreshDictSynastryOptions();
}

export function removeComparison(id){
  setComparisons(comparisons.filter(c => c.id !== id));
  saveComparisons();
  renderComparisons();
  refreshDictSynastryOptions();
  if (editingId === id) exitEditMode();
}

export function startEdit(id){
  const c = comparisons.find(x => x.id === id);
  if (!c) return;
  setEditingId(id);

  const viewBannerEl = document.getElementById('viewBanner');
  viewBannerEl.style.display = 'none';
  viewBannerEl.innerHTML = '';

  // Os campos de edição (name1/name2/raw/calcBtn) vivem dentro do painel
  // "Colar texto manualmente" — precisa trocar pra essa fonte pra revelá-los,
  // já que "Usar pessoas cadastradas" é o painel padrão agora.
  const sourceToggleColarBtn = document.getElementById('sourceToggleColar');
  if (!sourceToggleColarBtn.classList.contains('active')) sourceToggleColarBtn.click();

  document.getElementById('name1').value = c.n1;
  document.getElementById('name2').value = c.n2;
  document.getElementById('relType').value = c.relType || 'romantico';
  document.getElementById('raw').value = c.raw || '';
  document.getElementById('errorMsg').style.display = 'none';
  document.getElementById('calcBtn').textContent = 'Salvar alterações';

  const banner = document.getElementById('editBanner');
  banner.innerHTML = `<span>Editando a sinastria de <strong>${escapeHtml(c.n1)} &amp; ${escapeHtml(c.n2)}</strong> — ao calcular, essa entrada será atualizada em vez de criar uma nova.</span>`;
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'ghost-btn';
  cancelBtn.textContent = 'Cancelar edição';
  cancelBtn.addEventListener('click', exitEditMode);
  banner.appendChild(cancelBtn);
  banner.style.display = 'flex';

  document.getElementById('raw').scrollIntoView({ behavior:'smooth', block:'center' });
}

export function exitEditMode(){
  setEditingId(null);
  document.getElementById('calcBtn').textContent = 'Calcular sinastria';
  const banner = document.getElementById('editBanner');
  banner.style.display = 'none';
  banner.innerHTML = '';
}

// total de marcadores especiais de uma entrada — usado tanto no modo "markers" quanto
// como um dos critérios de desempate nos outros modos
export function markersTotal(c){
  return (c.saturnCommitmentContacts||0) + (c.nodeDestinyContacts||0) + (c.nodeAxisContacts||0)
    + (c.vertexFatedContacts||0) + (c.chironWoundContacts||0) + (c.lilithMagneticContacts||0)
    + (c.sunTranspersonalContacts||0)
    + (c.fortuneContacts||0) + (c.espiritoContacts||0) + (c.isLuminarySwap?1:0);
}

// "Melhor em veredito" (antigo "Melhor em potencial") — métrica derivada, calculada em
// cima do que já é salvo (não precisa de novo campo persistido, nem quebra entradas
// antigas/importadas — a chave interna continua `potentialScore`, só o nome exibido
// virou Veredito).
//
// Nasceu de uma lacuna real: o compatibilityScore é a média geométrica de Química x
// Estrutura, então dois pares podem empatar nele (79 vs 80) mesmo quando um dos dois é
// visivelmente mais "sólido" nos outros números — harmonia geral bem mais alta, conexão
// mais nítida, e mais contatos de destino/compromisso realmente harmônicos (não só
// presentes — harmônicos). O compatibilityScore sozinho não captura essa diferença
// porque ele não enxerga harmonyPct, strength (Nitidez) nem os marcadores narrativos.
//
// BASE (soma 100%, mesma proporção 40:25:15 da versão anterior — só renormalizada pra
// somar sozinha, já que Nitidez saiu do somatório): 50% compatibilityScore (a base,
// pegação+estrutura já combinadas) + 31,25% harmonyPct (o quanto o mapa inteiro flui,
// não só os dois eixos do compat) + 18,75% saldo de significância além dos eixos já
// contados (Destino puro no romântico, média Estrutura/Destino em amizade/família — ver
// significanceScore abaixo). Se algum componente não existir (entrada antiga sem
// compatibilityScore, por exemplo), ele é descartado e os pesos restantes são
// renormalizados — não vira null igual o compat puro, já que aqui dá pra estimar com o
// que sobrar.
//
// INTENSIFICADOR (Nitidez/strength): decisão pós-discussão — Nitidez saiu de "quarto
// ingrediente somado com peso 20%" e virou multiplicador do desvio da base em relação
// ao ponto neutro (50). Motivo: um mapa muito "carregado" (Nitidez alta) não é bom nem
// ruim por si só — ele só significa que há mais testemunho astrológico pra confiar na
// leitura que a base já deu. Somar Nitidez como quinto peso tratava "muito carregado"
// como sinônimo de "melhor veredito", o que não é verdade pra um vínculo carregado E
// tenso (Nitidez alta só devia reforçar que É tenso, não empurrar pra cima). Agora:
// raw = 50 + (base − 50) × fator(Nitidez), fator interpolado entre
// CALIBRATION.vereditoIntensifier.min (Nitidez=0, desvio amortecido) e .max
// (Nitidez=100, desvio acentuado) — ver comentário completo na constante. Sem dado de
// Nitidez, o fator fica neutro (1×) e a base sai sem ajuste.
//
// O restante da lógica de significanceScore (Destino puro no romântico, média
// Estrutura/Destino em amizade/família) não mudou desde a migração pro modelo de
// harmonyPct por eixo — ver histórico completo:
//
// - Romântico (auditoria pós-discussão): antes a fatia final era só Destino puro,
// com o argumento de que Estrutura já pesa via compatibilityScore (verdade) e por
// isso não devia entrar de novo aqui. Mas essa mesma lógica — "o que fica de fora do
// resto da fórmula entra aqui, sem favorecer um em cima do outro" — já valia também
// pra Emocional e Intelectual, que não entram em NENHUM outro lugar da fórmula
// romântica (Atração/Sexual já está "falada" dentro de compatibilityScore; Afinidade
// via o nudge de Júpiter) e ficavam de fora do Veredito quase por completo, só
// diluídas de forma anônima dentro do harmonyPct geral (31,25%, junto com tudo mais).
// Auditoria concluiu que essa distinção não tinha lastro astrológico: Destino não é
// mais "significativo" que Emocional ou Intelectual a ponto de merecer sozinho toda
// a fatia — os três eixos/categorias estão igualmente "de fora" do resto da soma.
// Solução: a fatia final vira a média PONDERADA (por peso bruto de sinal — ver
// structureWeight/destinyWeight/categoryScores[k].weight) de Destino + Emocional +
// Intelectual, em vez de Destino puro — mesma lógica de ponderação por presence já
// usada em compatibilityScore de amizade/família (ver abaixo), só que aplicada com o
// peso BRUTO (sem escala/teto de 100), porque aqui os três termos podem discrepar
// bastante em volume típico de sinal (Destino tende a ser um pool pequeno; Emocional/
// Intelectual têm listas de pares bem maiores) e o teto de 100 do `presence` normal
// mascararia essa diferença.
//
// - Amizade/Família: por consistência com a mudança acima (duas metades da mesma
// fórmula não deviam pesar eixos de formas diferentes sem motivo astrológico), a
// média de Estrutura+Destino também passou a ser ponderada por peso bruto, em vez de
// simples — mesmo raciocínio: nenhum dos dois entra em compatibilityScore nesse tipo
// de vínculo, então os dois ficam de fora do resto da fórmula igualmente, mas não
// necessariamente com o MESMO volume de sinal typico cada vez.
export function weightedAvgOrSimple(entries){
  // entries: [[valor, peso], ...] já filtrado de nulls. Pondera por peso bruto; cai de
  // volta pra média aritmética simples se todos os pesos vierem zero (ex. entrada
  // antiga sem os campos de peso ainda salvos) — mesmo fallback já usado em
  // compatibilityScore de amizade/família.
  if (!entries.length) return null;
  const totalW = entries.reduce((s, [, w]) => s + (w || 0), 0);
  return totalW > 0
    ? entries.reduce((s, [v, w]) => s + v * (w || 0), 0) / totalW
    : entries.reduce((s, [v]) => s + v, 0) / entries.length;
}
/**
 * Calcula o "Veredito" numérico (0-100) de uma comparação: média ponderada de
 * Compatibilidade Geral (peso 0.50), Harmonia geral (peso 0.3125) e um score de
 * "significância" (peso 0.1875, fórmula muda por relType), depois intensificada pela
 * Nitidez do lado (harmônico/tenso) que a base já apontou como vencedor. Único call
 * site é dentro de computeScores() (ver linha ~832) — chamado com um objeto que reúne
 * campos de fontes diferentes (scores diretos + categoryScores aninhado), fácil
 * esquecer um campo ou passar o objeto errado.
 *
 * @param {Object} c
 * @param {number|null} c.compatibilityScore - Compatibilidade Geral (0-100), peso 0.50.
 * @param {number|null} c.harmonyPct - Harmonia geral (0-100), peso 0.3125.
 * @param {string} [c.relType='romantico'] - 'romantico' usa Destino+Emocional+Intelectual pra significância; qualquer outro valor usa Estrutura+Destino.
 * @param {Object} [c.categoryScores] - Mesmo formato retornado por computeScores (por categoria: `harmonyPct`, `weight`).
 * @param {number|null} [c.destinyHarmonyPct] - % harmônico do eixo Destino, usado na significância.
 * @param {number} [c.destinyWeight] - peso bruto do eixo Destino (para a média ponderada da significância).
 * @param {number|null} [c.structureHarmonyPct] - % harmônico do eixo Estrutura, usado na significância pra amizade/família.
 * @param {number} [c.structureWeight] - peso bruto do eixo Estrutura.
 * @param {number} [c.strengthHarmonic] - Nitidez do lado harmônico; usada como intensificador se a base der >= 50.
 * @param {number} [c.strengthTense] - Nitidez do lado tenso; usada como intensificador se a base der < 50.
 * @param {number} [c.strength] - Nitidez geral; fallback se strengthHarmonic/strengthTense não existirem (dado antigo).
 * @returns {?number} Inteiro 0-100, ou null se nenhuma das três partes (compatibilityScore/harmonyPct/significância) tiver dado.
 */
export function potentialScore(c){
  const parts = [];
  if (c.compatibilityScore != null) parts.push([c.compatibilityScore, 0.50]);
  if (c.harmonyPct != null) parts.push([c.harmonyPct, 0.3125]);
  const cs = c.categoryScores || {};
  let significanceScore;
  if ((c.relType || 'romantico') === 'romantico'){
    significanceScore = weightedAvgOrSimple([
      [c.destinyHarmonyPct, c.destinyWeight],
      [cs.emocional && cs.emocional.harmonyPct, cs.emocional && cs.emocional.weight],
      [cs.intelectual && cs.intelectual.harmonyPct, cs.intelectual && cs.intelectual.weight],
    ].filter(([v]) => v != null));
  } else {
    significanceScore = weightedAvgOrSimple([
      [c.structureHarmonyPct, c.structureWeight],
      [c.destinyHarmonyPct, c.destinyWeight],
    ].filter(([v]) => v != null));
  }
  if (significanceScore != null) parts.push([significanceScore, 0.1875]);
  const totalWeight = parts.reduce((s, [, w]) => s + w, 0);
  if (totalWeight === 0) return null;
  const base = parts.reduce((s, [v, w]) => s + v * w, 0) / totalWeight;

  // Nitidez como intensificador — não soma na base acima, só decide o QUANTO o desvio
  // dessa base em relação a 50 (ponto neutro) é acentuado ou amortecido. Sem Nitidez
  // disponível (entrada antiga, por exemplo), o fator fica neutro e a base sai como
  // veio, sem ajuste.
  //
  // Alinhamento de direção (pós-discussão): usar a Nitidez GERAL aqui podia amplificar
  // a base com "combustível" que, em parte, vinha do lado que PERDEU a leitura — ex.
  // base abaixo de 50 (tendendo tensa) mas com os aspectos mais apertados sendo
  // justamente os harmônicos (só que em menor peso total). Nesse caso a Nitidez geral
  // subia por causa de aspectos que discordam da direção sendo amplificada. Agora o
  // intensificador usa só a Nitidez do lado que a base já apontou como vencedor —
  // strengthHarmonic se base >= 50, strengthTense se base < 50 — ignorando a Nitidez
  // emprestada do lado perdedor. Cai de volta pra c.strength (geral) se o dado
  // por-lado não existir (entrada antiga recalculada antes dessa mudança).
  let intensityFactor = 1;
  const sideStrength = base >= 50 ? c.strengthHarmonic : c.strengthTense;
  const effectiveStrength = sideStrength != null ? sideStrength : c.strength;
  if (effectiveStrength != null){
    const { min, max } = CALIBRATION.vereditoIntensifier;
    intensityFactor = min + (max - min) * (effectiveStrength / 100);
  }
  const raw = 50 + (base - 50) * intensityFactor;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

// Cada modo de ordenação tem uma cadeia de critérios: o principal e, quando ele empata
// (comum entre poucas entradas, já que os números vêm em faixas próximas), os critérios
// seguintes decidem antes de cair no último desempate — id, estável e sempre único —
// pra garantir uma ordem determinística e não depender da ordem de inserção no array.
// presence/harmonyPct de uma categoria pra uma entrada — mesma leitura das barrinhas
// "Marcadores por área" (catDataFor em renderComparisons), mas achatada em números pra
// dar pra usar como chave de ordenação. Entradas antigas sem categoryScores (não
// migradas) caem em presence 0 — vão pro fim da lista nesses modos, não quebram nada.
export function catPresence(c, key){
  return (c.categoryScores && c.categoryScores[key] && c.categoryScores[key].presence) || 0;
}
export function catHarmonyPct(c, key){
  const entry = c.categoryScores && c.categoryScores[key];
  return entry && entry.harmonyPct != null ? entry.harmonyPct : null;
}
// "Melhor" numa área = presente E favorável ao mesmo tempo, não só muito presente (uma
// área tensa e carregada não é "melhor"). Combina os dois na mesma chave: presence
// funciona como o quanto essa área pesa, harmonyPct/100 como o quanto desse peso é
// favorável — o produto pune tanto ausência de sinal quanto sinal predominantemente
// tenso. harmonyPct null (sinal abaixo do piso de confiança) vira 0: não dá pra chamar
// de "melhor" uma leitura que nem dá pra qualificar.
export function catQualityScore(c, key){
  const presence = catPresence(c, key);
  if (presence <= 0) return 0;
  const hPct = catHarmonyPct(c, key);
  return hPct == null ? 0 : presence * hPct / 100;
}
export const SORT_CHAINS = {
  compatibility: [
    c => c.compatibilityScore ?? -1,
    c => c.harmonyPct ?? -1,
    c => c.strength ?? -1,
    c => markersTotal(c),
  ],
  potential: [
    c => c.potentialScore ?? -1,
    c => c.compatibilityScore ?? -1,
    c => c.harmonyPct ?? -1,
    c => c.strength ?? -1,
  ],
  harmony: [
    c => c.harmonyPct ?? -1,
    c => c.compatibilityScore ?? -1,
    c => c.strength ?? -1,
    c => markersTotal(c),
  ],
  destiny: [
    c => c.destinyHarmonyPct ?? -1,
    c => c.compatibilityScore ?? -1,
    c => c.harmonyPct ?? -1,
    c => c.strength ?? -1,
  ],
  strength: [
    c => c.strength ?? -1,
    c => c.compatibilityScore ?? -1,
    c => c.harmonyPct ?? -1,
    c => markersTotal(c),
  ],
  markers: [
    c => markersTotal(c),
    c => c.compatibilityScore ?? -1,
    c => c.harmonyPct ?? -1,
    c => c.strength ?? -1,
  ],
  recent: [
    c => c.ts ?? 0,
  ],
  alphabetical: [
    // string (não número) — sortedComparisons detecta isso e usa localeCompare em vez
    // de subtração; sensitivity 'base' ignora maiúsculas/acentos.
    c => `${c.n1 || ''} & ${c.n2 || ''}`,
  ],
};
// Um modo de ordenação por categoria (cat_emocional, cat_sexual, ...) pra cada área de
// "Marcadores por área" — desempate por presence pura (categoria com mais sinal, mesmo
// que o quality score empate) e depois pelos genéricos de sempre.
CATEGORY_KEYS.forEach(key => {
  SORT_CHAINS[`cat_${key}`] = [
    c => catQualityScore(c, key),
    c => catPresence(c, key),
    c => c.compatibilityScore ?? -1,
    c => c.harmonyPct ?? -1,
  ];
});

export function sortedComparisons(baseList){
  const mode = document.getElementById('sortBy').value;
  const list = (baseList || comparisons).slice();
  const chain = SORT_CHAINS[mode] || SORT_CHAINS.recent;
  list.sort((a, b) => {
    for (const keyFn of chain){
      const va = keyFn(a), vb = keyFn(b);
      // modos numéricos (score, presence, ts...) ordenam maior→menor por subtração;
      // o modo alfabético devolve string, aí usamos localeCompare (A→Z) em vez disso.
      const diff = typeof va === 'string'
        ? va.localeCompare(vb, 'pt-BR', { sensitivity: 'base' })
        : vb - va;
      if (diff !== 0) return diff;
    }
    // desempate final: nunca deixa duas entradas "empatadas de verdade" oscilarem de
    // posição entre renders — id é único e estável.
    return (b.id || 0) - (a.id || 0);
  });
  return list;
}

// tipos de vínculo presentes em `comparisons`, com contagem — alimenta tanto o select
// de filtro (com a contagem entre parênteses) quanto a linha de resumo acima da lista
export function countsByType(list){
  const counts = { total: list.length, romantico: 0, amizade: 0, familia: 0 };
  list.forEach(c => {
    const t = c.relType || 'romantico';
    if (counts[t] != null) counts[t]++;
  });
  return counts;
}

export function populateFilterSelect(){
  const select = document.getElementById('filterRelType');
  const prev = select.value || 'all';
  const counts = countsByType(comparisons);
  select.innerHTML = `
    <option value="all">Todos (${counts.total})</option>
    <option value="romantico">Romântico (${counts.romantico})</option>
    <option value="amizade">Amizade (${counts.amizade})</option>
    <option value="familia">Família (${counts.familia})</option>
  `;
  // se o tipo selecionado ficou sem nenhuma entrada (ex: removeu a última "família"),
  // volta pro "Todos" em vez de deixar o filtro escondendo a lista inteira silenciosamente
  select.value = counts[prev] > 0 || prev === 'all' ? prev : 'all';
}

export function filteredComparisons(){
  const filter = document.getElementById('filterRelType').value || 'all';
  if (filter === 'all') return comparisons.slice();
  return comparisons.filter(c => (c.relType || 'romantico') === filter);
}

export function renderCompareCounts(){
  const el = document.getElementById('compareCounts');
  const counts = countsByType(comparisons);
  if (counts.total === 0){ el.textContent = ''; return; }
  el.innerHTML = `<b>${counts.total}</b> sinastria${counts.total === 1 ? '' : 's'} salva${counts.total === 1 ? '' : 's'} `
    + `· <b>${counts.romantico}</b> romântica${counts.romantico === 1 ? '' : 's'} `
    + `· <b>${counts.amizade}</b> amizade${counts.amizade === 1 ? '' : 's'} `
    + `· <b>${counts.familia}</b> famíli${counts.familia === 1 ? 'a' : 'as'}`;
}

export function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

export function renderComparisons(){
  const container = document.getElementById('compareList');
  populateFilterSelect();
  renderCompareCounts();
  const filterVal = document.getElementById('filterRelType').value || 'all';
  const list = sortedComparisons(filteredComparisons());
  const mode = document.getElementById('sortBy').value;
  const catKeyFromMode = mode.startsWith('cat_') ? mode.slice(4) : null;
  const isRankingMode = mode === 'compatibility' || mode === 'potential' || mode === 'harmony' || mode === 'destiny' || mode === 'strength' || mode === 'markers' || !!catKeyFromMode;

  if (comparisons.length === 0){
    container.innerHTML = '<div class="compare-empty">Nenhuma sinastria calculada ainda. Calcule a primeira acima pra começar a comparação.</div>';
    return;
  }
  if (list.length === 0){
    container.innerHTML = '<div class="compare-empty">Nenhuma sinastria desse tipo de vínculo ainda.</div>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'compare-grid';

  list.forEach((c, idx) => {
    const cPotential = c.potentialScore;
    const cRelType = c.relType || 'romantico';
    const cCatMeta = catMetaFor(cRelType);
    // "sem posição" quando a métrica do modo atual nem existe pra essa entrada (ex:
    // compatibilityScore ausente em cálculos salvos antes da métrica existir, ou
    // presence 0 numa categoria — não dá pra chamar de "melhor em Emocional" quem não
    // tem nenhum marcador emocional) — melhor do que fingir que ela é a última colocada.
    const hasMetric = !((mode === 'compatibility' && c.compatibilityScore == null) || (mode === 'potential' && cPotential == null) || (catKeyFromMode && catPresence(c, catKeyFromMode) <= 0));
    const rank = idx + 1;
    const isTop = idx === 0 && isRankingMode && list.length > 1 && hasMetric;
    const card = document.createElement('div');
    card.className = 'compare-card' + (isTop ? ' top-pick' : '');

    const rankLabel = isRankingMode && hasMetric ? `#${rank} · ` : '';
    const badgeText = isTop
      ? (mode === 'compatibility' ? `★ ${rankLabel}Maior compatibilidade`
        : mode === 'potential' ? `★ ${rankLabel}${POTENTIAL_LABEL_BY_FILTER[filterVal] || POTENTIAL_LABEL_BY_FILTER.all}`
        : mode === 'harmony' ? `★ ${rankLabel}Maior harmonia geral`
        : mode === 'destiny' ? `★ ${rankLabel}Maior harmonia no eixo Destino`
        : mode === 'strength' ? `★ ${rankLabel}Conexão mais nítida`
        : catKeyFromMode ? `★ ${rankLabel}Melhor em ${cCatMeta[catKeyFromMode].label}`
        : `★ ${rankLabel}Mais marcadores`)
      : mode === 'potential' && hasMetric ? `${rankLabel}${cPotential} de veredito`
      : `${rankLabel}${c.aspectsCount} aspectos · ${c.housesCount} casas`;

    // Barras compactas de categoria — mesma lógica de dois eixos do painel principal
    // (renderCategoryVisuals), em miniatura: tamanho = presence, cor = favorável (verde)
    // vs tenso (vermelho) proporcional ao harmonyPct da categoria. Só aparece se a
    // entrada já tiver passado pela migração automática pro modelo categoryScores
    // (recalcAllComparisons); entradas antigas não migradas omitem a seção.
    const catDataFor = (key) => c.categoryScores[key] || { presence: 0, harmonyPct: null, eligibleCount: 0 };
    const domBarsHtml = c.categoryScores ? `
      <div class="dom-chips-label">Marcadores por área</div>
      <div class="mini-bars">
        ${CATEGORY_KEYS.map(key => {
          const meta = cCatMeta[key];
          const { presence, harmonyPct: hPct, eligibleCount } = catDataFor(key);
          // hPct null = peso de sinal abaixo do piso de confiança (presence já é 0
          // nesse caso) — barra vazia e "—" em vez de "0", ver renderCategoryVisuals.
          const harmWidth = hPct !== null ? (presence * hPct / 100) : 0;
          const harmColor = hPct !== null ? CATEGORY_HARMONIC_COLOR : meta.color;
          const tenseWidth = hPct !== null ? (presence * (100 - hPct) / 100) : 0;
          const valLabel = eligibleCount === 0 ? 'sem marcadores' : (hPct !== null ? `<span title="Presença: quantos marcadores dessa área foram encontrados">pres. ${presence}</span> · <span title="% dos marcadores encontrados que é favorável (flui) em vez de tenso (atrita)">${hPct}%🟢</span>` : '—');
          return `
            <div class="mini-bar-row">
              <div class="top">
                <span class="cat-name"><span class="dot" style="background:${meta.color}"></span>${meta.label}</span>
                <span class="val-label">${valLabel}</span>
              </div>
              <div class="mini-bar-track">
                <div class="mini-bar-fill" style="width:${harmWidth}%; background:${harmColor}"></div>
                <div class="mini-bar-fill" style="width:${tenseWidth}%; background:var(--rose)"></div>
              </div>
            </div>`;
        }).join('')}
      </div>` : '';

    // Mesma organização agrupada (Estrutura/Destino/Categorias/Só informativo) e com
    // toggle usada no painel de uma relação aberta — cada card recebe seu próprio
    // "namespace" de accordion (cm-${c.id}) pra não competir com os outros cards da tela.
    const cChipItems = buildMarkerChipItems(c, `cm-${c.id}`);
    const markersHtml = cChipItems.length ? `<div class="markers">${buildGroupedChipsHTML(cChipItems, false)}</div>` : '';

    // Nota (destinyNote) vira toggle fechado por padrão quando existe — o card mostra só
    // o rótulo do perfil de cara, sem empilhar texto extra que a maioria nem vai abrir.
    // Sem destinyNote não tem o que esconder, então fica o label simples (sem seta/summary).
    const cVinculoHtml = c.vinculoProfile ? (
      c.vinculoProfile.destinyNote
        ? `<div class="cvinculo">
        <details class="cvinculo-toggle">
          <summary class="cvinculo-label">💍 ${escapeHtml(c.vinculoProfile.label)}</summary>
          <div class="cvinculo-note">☊ ${escapeHtml(c.vinculoProfile.destinyNote)}</div>
        </details>
      </div>`
        : `<div class="cvinculo">
        <div class="cvinculo-label">💍 ${escapeHtml(c.vinculoProfile.label)}</div>
      </div>`
    ) : '';

    const compatDisplay = c.compatibilityScore != null ? c.compatibilityScore + '%' : '—';
    const potentialDisplay = cPotential != null ? cPotential : '—';
    const destinyDisplay = c.destinyHarmonyPct != null ? c.destinyHarmonyPct + '%' : '—';
    const structureDisplay = c.structureHarmonyPct != null ? c.structureHarmonyPct + '%' : '—';
    const harmonyDisplay = c.harmonyPct != null ? c.harmonyPct + '%' : '—';

    card.innerHTML = `
      <div class="card-header">
        <div class="badge">${escapeHtml(badgeText)}</div>
        <div class="card-actions">
          <button type="button" class="icon-btn view-btn" data-id="${c.id}" title="Ver detalhes completos">👁</button>
          <button type="button" class="icon-btn recalc-btn" data-id="${c.id}" title="Recalcular com a lógica atual">⟳</button>
          <button type="button" class="icon-btn edit-btn" data-id="${c.id}" title="Editar esta sinastria">✎</button>
          <button type="button" class="icon-btn remove-btn" data-id="${c.id}" title="Remover desta comparação">×</button>
        </div>
      </div>
      <div class="cnames">${escapeHtml(c.n1)}<span class="amp">&amp;</span>${escapeHtml(c.n2)}</div>
      <div class="cverdict">${escapeHtml(c.verdictTitle)} <span style="color:var(--muted); font-weight:400;">· ${escapeHtml(REL_TYPE_LABEL_PT[cRelType])}</span></div>
      ${cVinculoHtml}
      ${domBarsHtml}
      <div class="cstats">
        <div class="cstat"><div class="val">${compatDisplay}</div><div class="lbl">Compat.</div></div>
        <div class="cstat"><div class="val">${harmonyDisplay}</div><div class="lbl">Harmonia</div></div>
        <div class="cstat"><div class="val">${structureDisplay}</div><div class="lbl">Estrut.</div></div>
        <div class="cstat"><div class="val">${destinyDisplay}</div><div class="lbl">Destino</div></div>
        <div class="cstat"><div class="val">${c.strength}</div><div class="lbl">Nitidez</div></div>
        <div class="cstat cstat-highlight"><div class="val">${potentialDisplay}</div><div class="lbl">Vered.</div></div>
      </div>
      ${markersHtml}
    `;
    grid.appendChild(card);
  });

  container.innerHTML = '';
  container.appendChild(grid);

  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removeComparison(Number(btn.dataset.id)));
  });
  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => startEdit(Number(btn.dataset.id)));
  });
  container.querySelectorAll('.recalc-btn').forEach(btn => {
    btn.addEventListener('click', () => recalcOne(Number(btn.dataset.id)));
  });
  container.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => viewComparison(Number(btn.dataset.id)));
  });
}

// Reaplica parseText + computeScores + classify em cima do texto original (c.raw) já
// salvo — sem isso, uma sinastria calculada antes de um ajuste na CALIBRATION ou no
// classify() fica com número/veredito desatualizado pra sempre, mesmo que a lógica do
// app tenha mudado depois (ex: um título "tenso" salvo que hoje, com a mesma harmonia,
// seria classificado como "harmônico"). Retorna null se não der pra recalcular (texto
// original ausente — entradas bem antigas podem não ter c.raw — ou texto irreconhecível).
export function recalcEntry(c){
  if (!c.raw) return null;
  const parsed = parseText(c.raw);
  if (parsed.aspects.length === 0) return null;
  const {
    categoryScores, harmonyPct, strength, strengthHarmonic, strengthTense, structureWeight, destinyWeight,
    immediateHarmonyPct, structureHarmonyPct, destinyHarmonyPct, compatibilityScore, potentialScore,
    structureHarmonicDetails, structureTenseDetails, structureAmbivalentDetails, destinyHarmonicDetails, destinyTenseDetails, destinyAmbivalentDetails,
    saturnCommitmentContacts, saturnCommitmentHarmonic, saturnCommitmentAmbivalent, saturnCommitmentTense, saturnCommitmentTenseLight, saturnCommitmentDetails,
    nodeDestinyContacts, nodeDestinyHarmonic, nodeDestinyAmbivalent, nodeDestinyTense, nodeDestinyTenseLight, nodeDestinyDetails,
    nodeAxisContacts, nodeAxisHarmonic, nodeAxisAmbivalent, nodeAxisTense, nodeAxisTenseLight, nodeAxisDetails,
    vertexFatedContacts, vertexFatedHarmonic, vertexFatedAmbivalent, vertexFatedTense, vertexFatedTenseLight, vertexFatedDetails,
    chironWoundContacts, chironWoundHarmonic, chironWoundAmbivalent, chironWoundTense, chironWoundTenseLight, chironWoundDetails,
    lilithMagneticContacts, lilithMagneticHarmonic, lilithMagneticAmbivalent, lilithMagneticTense, lilithMagneticTenseLight, lilithMagneticDetails,
    sunTranspersonalContacts, sunTranspersonalHarmonic, sunTranspersonalAmbivalent, sunTranspersonalTense, sunTranspersonalTenseLight, sunTranspersonalDetails,
    fortuneContacts, fortuneHarmonic, fortuneAmbivalent, fortuneTense, fortuneTenseLight, fortuneDetails,
    espiritoContacts, espiritoHarmonic, espiritoAmbivalent, espiritoTense, espiritoTenseLight, espiritoDetails,
    sunMoonContacts, sunMoonHarmonic, sunMoonAmbivalent, sunMoonTense, sunMoonTenseLight, sunMoonDetails,
    houseConvergenceContacts, houseConvergenceDetails,
    commitmentHouseContacts, commitmentHouseDetails,
    destinyHouseContacts, destinyHouseDetails,
    friendshipHouseContacts, friendshipHouseDetails,
    chironPartnershipHouseContacts, chironPartnershipHouseDetails,
    plutoPartnershipHouseContacts, plutoPartnershipHouseDetails,
    vinculoProfile,
    isLuminarySwap, luminarySwapDetail, luminarySwapCategory,
  } = computeScores(parsed, c.relType || 'romantico');
  const verdict = classify({ categoryScores, harmonyPct, strength, relType: c.relType || 'romantico', immediateHarmonyPct, structureHarmonyPct });
  return {
    categoryScores, harmonyPct, strength, strengthHarmonic, strengthTense, structureWeight, destinyWeight,
    immediateHarmonyPct, structureHarmonyPct, destinyHarmonyPct, compatibilityScore, potentialScore,
    structureHarmonicDetails, structureTenseDetails, structureAmbivalentDetails, destinyHarmonicDetails, destinyTenseDetails, destinyAmbivalentDetails,
    verdictTitle: verdict.title,
    aspectsCount: parsed.aspects.length,
    housesCount: parsed.houses.length,
    saturnCommitmentContacts, saturnCommitmentHarmonic, saturnCommitmentAmbivalent, saturnCommitmentTense, saturnCommitmentTenseLight, saturnCommitmentDetails,
    nodeDestinyContacts, nodeDestinyHarmonic, nodeDestinyAmbivalent, nodeDestinyTense, nodeDestinyTenseLight, nodeDestinyDetails,
    nodeAxisContacts, nodeAxisHarmonic, nodeAxisAmbivalent, nodeAxisTense, nodeAxisTenseLight, nodeAxisDetails,
    vertexFatedContacts, vertexFatedHarmonic, vertexFatedAmbivalent, vertexFatedTense, vertexFatedTenseLight, vertexFatedDetails,
    chironWoundContacts, chironWoundHarmonic, chironWoundAmbivalent, chironWoundTense, chironWoundTenseLight, chironWoundDetails,
    lilithMagneticContacts, lilithMagneticHarmonic, lilithMagneticAmbivalent, lilithMagneticTense, lilithMagneticTenseLight, lilithMagneticDetails,
    sunTranspersonalContacts, sunTranspersonalHarmonic, sunTranspersonalAmbivalent, sunTranspersonalTense, sunTranspersonalTenseLight, sunTranspersonalDetails,
    fortuneContacts, fortuneHarmonic, fortuneAmbivalent, fortuneTense, fortuneTenseLight, fortuneDetails,
    espiritoContacts, espiritoHarmonic, espiritoAmbivalent, espiritoTense, espiritoTenseLight, espiritoDetails,
    sunMoonContacts, sunMoonHarmonic, sunMoonAmbivalent, sunMoonTense, sunMoonTenseLight, sunMoonDetails,
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

export function recalcOne(id){
  const idx = comparisons.findIndex(c => c.id === id);
  if (idx === -1) return;
  const updated = recalcEntry(comparisons[idx]);
  if (!updated){
    alert('Não foi possível recalcular esta entrada — falta o texto original salvo, ou ele não é mais reconhecido pelo formato atual.');
    return;
  }
  comparisons[idx] = { ...comparisons[idx], ...updated, ts: comparisons[idx].ts };
  saveComparisons();
  renderComparisons();
}

// groupName vira o atributo `name` dos <details> — controla o accordion (só um chip
// aberto por vez DENTRO do mesmo grupo de nome). Default 'markers-main' é usado pelo
// painel principal (só existe um por página). Os cards do grid de comparação passam um
// nome único por entrada (`cm-${c.id}`) pra cada card ter seu próprio accordion, em vez
// de todos os cards da tela competirem pelo mesmo grupo de exclusividade.
export function buildMarkerChipItems(c, groupName = 'markers-main'){
  const items = [];
  const push = (group, count, html) => items.push({ group, count, html });

  if (c.isLuminarySwap){
    push(4, 0, `<details class="marker-chip luminary" name="${groupName}"><summary><span class="icon">☉☾</span>${categoryEmoji(c.luminarySwapCategory)}Câmbio de luminares</summary><div class="marker-detail">${escapeHtml(c.luminarySwapDetail || '')}\n\nO Sol de cada um cai no signo da Lua do outro — indício clássico de reconhecimento emocional profundo entre os dois.${c.luminarySwapCategory ? '' : '\n\n(sem orbe suficiente nos aspectos Sol-Lua do relatório pra classificar como harmônico ou tenso — a coincidência de signo é real, só não dá pra qualificar pelo grau.)'}</div></details>`);
  }
  if ((c.saturnCommitmentContacts || 0) > 0){
    push(1, c.saturnCommitmentContacts, `<details class="marker-chip saturn" name="${groupName}"><summary><span class="icon">♄</span>Saturno · compromisso (${c.saturnCommitmentContacts})${markerBreakdown(c.saturnCommitmentHarmonic||0, c.saturnCommitmentAmbivalent||0, c.saturnCommitmentTense||0, c.saturnCommitmentTenseLight||0)}</summary><div class="marker-detail">${escapeHtml((c.saturnCommitmentDetails||[]).join('\n'))}\n\n(Também conta para a categoria Prático.)</div></details>`);
  }
  if ((c.nodeDestinyContacts || 0) > 0){
    push(2, c.nodeDestinyContacts, `<details class="marker-chip node" name="${groupName}"><summary><span class="icon">☊</span>Nodo · eixo do destino (${c.nodeDestinyContacts})${markerBreakdown(c.nodeDestinyHarmonic||0, c.nodeDestinyAmbivalent||0, c.nodeDestinyTense||0, c.nodeDestinyTenseLight||0)}</summary><div class="marker-detail">${escapeHtml((c.nodeDestinyDetails||[]).join('\n'))}\n\n(Também conta para a categoria Prático.)</div></details>`);
  }
  if ((c.nodeAxisContacts || 0) > 0){
    push(2, c.nodeAxisContacts, `<details class="marker-chip node" name="${groupName}"><summary><span class="icon">☊☊</span>Nodo/Vértice · eixo Destino mútuo (${c.nodeAxisContacts})${markerBreakdown(c.nodeAxisHarmonic||0, c.nodeAxisAmbivalent||0, c.nodeAxisTense||0, c.nodeAxisTenseLight||0)}</summary><div class="marker-detail">${escapeHtml((c.nodeAxisDetails||[]).join('\n'))}\n\n(Também conta para a categoria Prático.)</div></details>`);
  }
  if ((c.vertexFatedContacts || 0) > 0){
    push(2, c.vertexFatedContacts, `<details class="marker-chip vertex" name="${groupName}"><summary><span class="icon">✧</span>Vértice · encontro (${c.vertexFatedContacts})${markerBreakdown(c.vertexFatedHarmonic||0, c.vertexFatedAmbivalent||0, c.vertexFatedTense||0, c.vertexFatedTenseLight||0)}</summary><div class="marker-detail">${escapeHtml((c.vertexFatedDetails||[]).join('\n'))}\n\n(Também conta para a categoria Prático.)</div></details>`);
  }
  if ((c.chironWoundContacts || 0) > 0){
    push(1, c.chironWoundContacts, `<details class="marker-chip chiron" name="${groupName}"><summary><span class="icon">⚷</span>Quíron (${c.chironWoundContacts})${markerBreakdown(c.chironWoundHarmonic||0, c.chironWoundAmbivalent||0, c.chironWoundTense||0, c.chironWoundTenseLight||0)}</summary><div class="marker-detail">${escapeHtml((c.chironWoundDetails||[]).join('\n'))}\n\n(Contatos Quíron-Lua também contam para a categoria Emocional.)</div></details>`);
  }
  if ((c.lilithMagneticContacts || 0) > 0){
    push(3, c.lilithMagneticContacts, `<details class="marker-chip lilith" name="${groupName}"><summary><span class="icon">⚸</span>Lilith (${c.lilithMagneticContacts})${markerBreakdown(c.lilithMagneticHarmonic||0, c.lilithMagneticAmbivalent||0, c.lilithMagneticTense||0, c.lilithMagneticTenseLight||0)}</summary><div class="marker-detail">${escapeHtml((c.lilithMagneticDetails||[]).join('\n'))}</div></details>`);
  }
  if ((c.sunTranspersonalContacts || 0) > 0){
    push(3, c.sunTranspersonalContacts, `<details class="marker-chip suntrans" name="${groupName}"><summary><span class="icon">☉⚡</span>Sol transpessoal (${c.sunTranspersonalContacts})${markerBreakdown(c.sunTranspersonalHarmonic||0, c.sunTranspersonalAmbivalent||0, c.sunTranspersonalTense||0, c.sunTranspersonalTenseLight||0)}</summary><div class="marker-detail">${escapeHtml((c.sunTranspersonalDetails||[]).join('\n'))}</div></details>`);
  }
  if ((c.fortuneContacts || 0) > 0){
    push(3, c.fortuneContacts, `<details class="marker-chip fortune" name="${groupName}"><summary><span class="icon">🍀</span>Fortuna (${c.fortuneContacts})${markerBreakdown(c.fortuneHarmonic||0, c.fortuneAmbivalent||0, c.fortuneTense||0, c.fortuneTenseLight||0)}</summary><div class="marker-detail">${escapeHtml((c.fortuneDetails||[]).join('\n'))}</div></details>`);
  }
  if ((c.espiritoContacts || 0) > 0){
    push(3, c.espiritoContacts, `<details class="marker-chip espirito" name="${groupName}"><summary><span class="icon">⊕</span>Espírito (${c.espiritoContacts})${markerBreakdown(c.espiritoHarmonic||0, c.espiritoAmbivalent||0, c.espiritoTense||0, c.espiritoTenseLight||0)}</summary><div class="marker-detail">${escapeHtml((c.espiritoDetails||[]).join('\n'))}</div></details>`);
  }
  if ((c.sunMoonContacts || 0) > 0){
    push(1, c.sunMoonContacts, `<details class="marker-chip sunmoon" name="${groupName}"><summary><span class="icon">☉☾</span>Sol-Lua · eixo de reconhecimento (${c.sunMoonContacts})${markerBreakdown(c.sunMoonHarmonic||0, c.sunMoonAmbivalent||0, c.sunMoonTense||0, c.sunMoonTenseLight||0)}</summary><div class="marker-detail">${escapeHtml((c.sunMoonDetails||[]).join('\n'))}\n\n(Também conta para a categoria Emocional.)</div></details>`);
  }
  if ((c.houseConvergenceContacts || 0) > 0){
    push(4, c.houseConvergenceContacts, `<details class="marker-chip houses" name="${groupName}"><summary><span class="icon">⌂</span>Casas · convergência (${c.houseConvergenceContacts})</summary><div class="marker-detail">${escapeHtml((c.houseConvergenceDetails||[]).join('\n'))}</div></details>`);
  }
  if ((c.commitmentHouseContacts || 0) > 0){
    push(1, c.commitmentHouseContacts, `<details class="marker-chip houses" name="${groupName}"><summary><span class="icon">🏠</span>Casas · estrutura de parceria (${c.commitmentHouseContacts})</summary><div class="marker-detail">${escapeHtml((c.commitmentHouseDetails||[]).join('\n'))}</div></details>`);
  }
  if ((c.destinyHouseContacts || 0) > 0){
    push(2, c.destinyHouseContacts, `<details class="marker-chip houses" name="${groupName}"><summary><span class="icon">☊</span>Casas · eixo Destino (${c.destinyHouseContacts})</summary><div class="marker-detail">${escapeHtml((c.destinyHouseDetails||[]).join('\n'))}</div></details>`);
  }
  if ((c.friendshipHouseContacts || 0) > 0){
    push(3, c.friendshipHouseContacts, `<details class="marker-chip houses" name="${groupName}"><summary><span class="icon">🧑‍🤝‍🧑</span>Casas · círculo social (${c.friendshipHouseContacts})</summary><div class="marker-detail">${escapeHtml((c.friendshipHouseDetails||[]).join('\n'))}</div></details>`);
  }
  if ((c.chironPartnershipHouseContacts || 0) > 0){
    push(3, c.chironPartnershipHouseContacts, `<details class="marker-chip chiron" name="${groupName}"><summary><span class="icon">⚷</span>Quíron · ferida na parceria (7ª) (${c.chironPartnershipHouseContacts})</summary><div class="marker-detail">${escapeHtml((c.chironPartnershipHouseDetails||[]).join('\n'))}</div></details>`);
  }
  if ((c.plutoPartnershipHouseContacts || 0) > 0){
    push(3, c.plutoPartnershipHouseContacts, `<details class="marker-chip pluto" name="${groupName}"><summary><span class="icon">♇</span>Plutão · intensidade na parceria (7ª) (${c.plutoPartnershipHouseContacts})</summary><div class="marker-detail">${escapeHtml((c.plutoPartnershipHouseDetails||[]).join('\n'))}</div></details>`);
  }
  return items;
}
// Monta só a parte dos grupos (Estrutura/Destino/Categorias/Só informativo) a partir de
// uma lista de items já calculada por buildMarkerChipItems — extraído à parte pra dar
// pra reusar no grid de comparação sem duplicar o chip de "Perfil de vínculo" (que lá já
// tem seu próprio box compacto fora dos chips, ver cVinculoHtml em renderComparisons).
// groupsOpen controla se o <details> de cada GRUPO (Estrutura/Destino/...) já nasce
// aberto. Painel principal (1 relação por vez, já é uma tela dedicada) usa o default
// true — "não muda leitura nenhuma, não faz sentido nascer escondido". Grid de
// comparação passa false: com vários cards na tela ao mesmo tempo, tudo aberto de cara
// fica poluído, então cada grupo (e cada chip dentro dele) só expande sob demanda.
export function buildGroupedChipsHTML(items, groupsOpen = true){
  let html = '';
  for (const groupId of [1, 2, 3, 4]){
    const groupItems = items.filter(i => i.group === groupId);
    if (!groupItems.length) continue;
    groupItems.sort((a, b) => b.count - a.count); // desempate: sort estável preserva a ordem de inserção acima
    const meta = GROUP_META[groupId];
    // Contagenzinha do grupo = soma dos contatos de cada chip dentro dele (não a
    // quantidade de chips) — "quantos contatos de Estrutura apareceram no todo", mesmo
    // número que já está escrito em cada chip individual, só somado. Fica de fora quando
    // dá 0 (grupo só com informativo sem contagem própria, ex.: Câmbio de luminares
    // sozinho) — "(0)" não ajudaria ninguém.
    const groupTotal = groupItems.reduce((s, i) => s + (i.count || 0), 0);
    html += `<details class="chips-group"${groupsOpen ? ' open' : ''}><summary><span class="icon">${meta.icon}</span>${meta.label}${groupTotal > 0 ? ` (${groupTotal})` : ''}</summary><div class="chips-group-body">${groupItems.map(i => i.html).join('')}</div></details>`;
  }
  return html;
}
export function buildMarkerChipsHTML(c, groupName = 'markers-main', groupsOpen = true){
  const vinculoHtml = c.vinculoProfile
    ? `<details class="marker-chip vinculo" name="${groupName}"><summary><span class="icon">💍</span>Perfil de vínculo · ${escapeHtml(c.vinculoProfile.label)}</summary><div class="marker-detail">${escapeHtml(c.vinculoProfile.description || '')}\n\n${escapeHtml((c.vinculoProfile.signals||[]).join('\n'))}</div></details>`
    : '';
  const items = buildMarkerChipItems(c, groupName);
  const html = vinculoHtml + buildGroupedChipsHTML(items, groupsOpen);
  return { html, hasContent: !!vinculoHtml || items.length > 0 };
}

export function viewComparison(id){
  const c = comparisons.find(x => x.id === id);
  if (!c) return;
  const relType = c.relType || 'romantico';
  const catMeta = catMetaFor(relType);

  const banner = document.getElementById('viewBanner');
  banner.innerHTML = `<span>Visualizando os detalhes salvos de <strong>${escapeHtml(c.n1)} &amp; ${escapeHtml(c.n2)}</strong> — estes números são os que foram salvos, não um recálculo ao vivo.</span>`;
  const viewBannerActions = document.createElement('div');
  viewBannerActions.style.display = 'flex';
  viewBannerActions.style.gap = '10px';
  const editFromViewBtn = document.createElement('button');
  editFromViewBtn.type = 'button';
  editFromViewBtn.className = 'ghost-btn';
  editFromViewBtn.textContent = '✎ Editar';
  editFromViewBtn.addEventListener('click', () => startEdit(id));
  viewBannerActions.appendChild(editFromViewBtn);
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'ghost-btn';
  closeBtn.textContent = 'Fechar';
  closeBtn.addEventListener('click', () => {
    banner.style.display = 'none';
    banner.innerHTML = '';
    document.getElementById('results').style.display = 'none';
  });
  viewBannerActions.appendChild(closeBtn);
  banner.appendChild(viewBannerActions);
  banner.style.display = 'flex';

  document.getElementById('rName1').textContent = c.n1;
  document.getElementById('rName2').textContent = c.n2;
  document.getElementById('metaLine').textContent =
    `${c.aspectsCount || 0} aspectos e ${c.housesCount || 0} sobreposições de casa interpretados`;

  const confidenceEl = document.getElementById('confidenceNote');
  if ((c.aspectsCount || 0) < CALIBRATION.minAspectsForConfidence){
    confidenceEl.textContent = `⚠ Leitura baseada em poucos aspectos (${c.aspectsCount || 0}) — com uma amostra pequena, 1 ou 2 contatos isolados pesam mais do que deveriam, e o resultado pode mudar bastante se você colar o relatório completo.`;
    confidenceEl.style.display = 'block';
  } else {
    confidenceEl.textContent = '';
    confidenceEl.style.display = 'none';
  }

  renderCategoryVisuals(c.categoryScores || null, relType);

  document.getElementById('strengthVal').textContent = c.strength;
  { const _ce = compatExplainerParts(relType);
    document.getElementById('compatExplainerSummary').textContent = _ce.summary;
    document.getElementById('compatExplainerBody').innerHTML = _ce.bodyHTML; }
  document.getElementById('compatVal').textContent = c.compatibilityScore != null ? c.compatibilityScore + '%' : '—';
  document.getElementById('potentialVal').textContent = c.potentialScore != null ? c.potentialScore : '—';
  document.getElementById('destinyVal').textContent = c.destinyHarmonyPct != null ? c.destinyHarmonyPct + '%' : '—';
  document.getElementById('structureVal').textContent = c.structureHarmonyPct != null ? c.structureHarmonyPct + '%' : '—';
  setAxisHover('destinyVal', c.destinyHarmonicDetails, c.destinyTenseDetails, c.destinyAmbivalentDetails);
  setAxisHover('structureVal', c.structureHarmonicDetails, c.structureTenseDetails, c.structureAmbivalentDetails);
  document.getElementById('harmonyVal').textContent = c.harmonyPct + '%';

  const compatNoteEl = document.getElementById('compatNote');
  if (c.compatibilityScore == null){
    compatNoteEl.textContent = '⚠ Sinal insuficiente pra calcular uma Compatibilidade Geral confiável — cole o relatório completo pra destravar esse número.';
    compatNoteEl.style.display = 'block';
  } else {
    compatNoteEl.textContent = '';
    compatNoteEl.style.display = 'none';
  }

  // título vem salvo (igual ao que aparece no card); a descrição não era salva, então
  // é recomputada aqui a partir dos mesmos números salvos — classify() é determinística.
  // Entradas ainda não migradas pro modelo categoryScores (sem c.raw pra recalcular)
  // não têm base pra reconstruir a descrição — mostramos só o título salvo nesse caso.
  const verdict = c.categoryScores
    ? classify({ categoryScores: c.categoryScores, harmonyPct: c.harmonyPct, strength: c.strength, relType, immediateHarmonyPct: c.immediateHarmonyPct, structureHarmonyPct: c.structureHarmonyPct })
    : { title: c.verdictTitle || '', desc: '⚠ Essa entrada foi calculada com um modelo de categoria antigo — use "Recalcular" no histórico (ou cole o texto original) pra atualizar e ver a descrição completa.' };
  document.getElementById('verdictTitle').textContent = c.verdictTitle || verdict.title;
  document.getElementById('verdictDesc').textContent = verdict.desc;

  const markersEl = document.getElementById('markers');
  const markerChips = buildMarkerChipsHTML(c);
  if (markerChips.hasContent){
    markersEl.innerHTML = markerChips.html;
    markersEl.style.display = 'flex';
  } else {
    markersEl.innerHTML = '';
    markersEl.style.display = 'none';
  }

  const debug = document.getElementById('debugContent');
  debug.innerHTML = `<ul>
    <li>Aspectos reconhecidos: ${c.aspectsCount || 0}</li>
    <li>Casas reconhecidas: ${c.housesCount || 0}</li>
    <li>Peso harmônico: ${c.harmonyPct}% · Nitidez bruta: ${c.strength}</li>
    <li style="color:var(--muted)">Dados de dados brutos (duplicatas ignoradas, linhas não reconhecidas) só ficam disponíveis num cálculo ao vivo — use "Recalcular" pra ver essa checagem atualizada.</li>
  </ul>`;

  document.getElementById('results').style.display = 'block';
  document.getElementById('results').scrollIntoView({ behavior:'smooth', block:'start' });
}

export function recalcAll(){
  if (comparisons.length === 0) return;
  let updatedCount = 0, skippedCount = 0;
  setComparisons(comparisons.map(c => {
    const updated = recalcEntry(c);
    if (!updated){ skippedCount++; return c; }
    updatedCount++;
    return { ...c, ...updated };
  }));
  saveComparisons();
  renderComparisons();
  const skippedNote = skippedCount > 0 ? ` (${skippedCount} pulada${skippedCount > 1 ? 's' : ''} por falta do texto original)` : '';
  alert(`Recálculo concluído: ${updatedCount} sinastria${updatedCount === 1 ? '' : 's'} atualizada${updatedCount === 1 ? '' : 's'}${skippedNote}.`);
}

export function downloadFile(filename, content, mime){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function comparisonsToCSV(){
  const header = [
    'Pessoa 1','Pessoa 2','Tipo de vínculo',
    'Intelectual (presença)','Intelectual (favorável %)',
    'Emocional (presença)','Emocional (favorável %)',
    'Atração (presença)','Atração (favorável %)',
    'Prático (presença)','Prático (favorável %)',
    'Afinidade (presença)','Afinidade (favorável %)',
    'Compatibilidade Geral %','Estrutura (longo prazo) %','Destino (Nodo/Vértice) %','Harmonia geral %','Nitidez','Veredito',
    'Leitura','Aspectos','Casas',
    'Saturno (compromisso) total','Saturno harmônico','Saturno ambivalente','Saturno tenso',
    'Nodo (destino) total','Nodo harmônico','Nodo ambivalente','Nodo tenso',
    'Nodo (eixo mútuo) total','Nodo eixo mútuo harmônico','Nodo eixo mútuo ambivalente','Nodo eixo mútuo tenso',
    'Vértice (encontro fatídico) total','Vértice harmônico','Vértice ambivalente','Vértice tenso',
    'Quíron (ferida e cura) total','Quíron harmônico','Quíron ambivalente','Quíron tenso',
    'Lilith (atração magnética) total','Lilith harmônico','Lilith ambivalente','Lilith tenso',
    'Sol transpessoal (Netuno/Urano/Plutão) total','Sol transpessoal harmônico','Sol transpessoal ambivalente','Sol transpessoal tenso',
    'Fortuna (felicidade/destino) total','Fortuna harmônico','Fortuna ambivalente','Fortuna tenso',
    'Espírito (intenção/vontade) total','Espírito harmônico','Espírito ambivalente','Espírito tenso',
    // Marcadores de casa (Parte 5): sem harmônico/ambivalente/tenso — casa não tem orbe
    // pra graduar isso (ver computeCommitmentHouses etc.), só um total cada. Gap
    // encontrado em auditoria: já tinham chip na UI e sobreviviam ao export/import em
    // JSON, mas nunca chegavam até o CSV.
    'Casas · compromisso (1/4/7/10)', 'Casas · eixo Destino (1/4/7/10)',
    'Casas · círculo social (11ª)', 'Quíron · parceria (7ª casa)', 'Plutão · parceria (7ª casa)',
    'Casas (convergência)','Câmbio de luminares (Sol/Lua)','Câmbio de luminares (classificação)','Data'
  ];
  const esc = v => `"${String(v).replace(/"/g,'""')}"`;
  const pctOrDash = v => (v === null || v === undefined) ? '—' : v;
  // categoryScores pode estar ausente em entradas antigas ainda não migradas (sem
  // c.raw pra recalcular) — nesse caso as 8 colunas de categoria saem como '—', em vez
  // de quebrar a exportação inteira.
  const catCell = (c, key) => {
    const cs = c.categoryScores && c.categoryScores[key];
    return cs ? [cs.presence, pctOrDash(cs.harmonyPct)] : ['—', '—'];
  };
  const rows = sortedComparisons().map(c => [
    c.n1, c.n2, REL_TYPE_LABEL_PT[c.relType || 'romantico'],
    ...catCell(c, 'intelectual'), ...catCell(c, 'emocional'), ...catCell(c, 'sexual'), ...catCell(c, 'pratico'), ...catCell(c, 'afinidade'),
    pctOrDash(c.compatibilityScore), pctOrDash(c.structureHarmonyPct), pctOrDash(c.destinyHarmonyPct), c.harmonyPct, c.strength, pctOrDash(c.potentialScore),
    c.verdictTitle, c.aspectsCount, c.housesCount,
    c.saturnCommitmentContacts || 0, c.saturnCommitmentHarmonic || 0, c.saturnCommitmentAmbivalent || 0, c.saturnCommitmentTense || 0,
    c.nodeDestinyContacts || 0, c.nodeDestinyHarmonic || 0, c.nodeDestinyAmbivalent || 0, c.nodeDestinyTense || 0,
    c.nodeAxisContacts || 0, c.nodeAxisHarmonic || 0, c.nodeAxisAmbivalent || 0, c.nodeAxisTense || 0,
    c.vertexFatedContacts || 0, c.vertexFatedHarmonic || 0, c.vertexFatedAmbivalent || 0, c.vertexFatedTense || 0,
    c.chironWoundContacts || 0, c.chironWoundHarmonic || 0, c.chironWoundAmbivalent || 0, c.chironWoundTense || 0,
    c.lilithMagneticContacts || 0, c.lilithMagneticHarmonic || 0, c.lilithMagneticAmbivalent || 0, c.lilithMagneticTense || 0,
    c.sunTranspersonalContacts || 0, c.sunTranspersonalHarmonic || 0, c.sunTranspersonalAmbivalent || 0, c.sunTranspersonalTense || 0,
    c.fortuneContacts || 0, c.fortuneHarmonic || 0, c.fortuneAmbivalent || 0, c.fortuneTense || 0,
    c.espiritoContacts || 0, c.espiritoHarmonic || 0, c.espiritoAmbivalent || 0, c.espiritoTense || 0,
    c.commitmentHouseContacts || 0, c.destinyHouseContacts || 0,
    c.friendshipHouseContacts || 0, c.chironPartnershipHouseContacts || 0, c.plutoPartnershipHouseContacts || 0,
    c.houseConvergenceContacts || 0,
    c.isLuminarySwap ? 'Sim' : 'Não',
    c.isLuminarySwap ? (CATEGORY_LABEL_PT[c.luminarySwapCategory] || 'Sem dado de grau') : '',
    new Date(c.ts).toLocaleString('pt-BR')
  ].map(esc).join(','));
  return [header.map(esc).join(','), ...rows].join('\r\n');
}
// Valida e normaliza uma entrada vinda de um JSON importado — aceita tanto o formato
// atual quanto exports mais antigos (de antes do marcador de Casas/convergência ou do
// tipo de vínculo existirem), preenchendo os campos que faltarem com defaults seguros
// em vez de rejeitar a entrada inteira. Retorna null se faltar algo essencial (nomes,
// percentuais por categoria, harmonia, nitidez, leitura/verdictTitle) — aí a entrada é ignorada.
export function validateImportedEntry(obj){
  if (!obj || typeof obj !== 'object') return null;
  if (typeof obj.n1 !== 'string' || typeof obj.n2 !== 'string') return null;
  // categoryScores é o modelo atual (presence independente por área, sem soma-100 —
  // ver computeScores). Exports antigos, de antes desse redesign, tinham `pct`/
  // `dominance` no lugar — como esses dois modelos não são conversíveis (presence não
  // é uma reinterpretação de uma fatia de pizza), não tentamos migrar o número aqui.
  // Sem categoryScores, a entrada só é aceita se tiver `raw`: a migração automática
  // (recalcAllComparisons) recalcula tudo do zero a partir do texto original assim
  // que a entrada entrar na lista.
  const hasValidCategoryScores = obj.categoryScores && typeof obj.categoryScores === 'object' &&
    ['intelectual','emocional','sexual','pratico'].every(k =>
      obj.categoryScores[k] && typeof obj.categoryScores[k].presence === 'number');
  if (!hasValidCategoryScores && typeof obj.raw !== 'string') return null;
  if (typeof obj.harmonyPct !== 'number' || typeof obj.strength !== 'number') return null;
  if (typeof obj.verdictTitle !== 'string') return null;

  return {
    n1: obj.n1, n2: obj.n2,
    raw: typeof obj.raw === 'string' ? obj.raw : '',
    relType: ['romantico','amizade','familia'].includes(obj.relType) ? obj.relType : 'romantico',
    categoryScores: hasValidCategoryScores
      ? Object.fromEntries([
          ...['intelectual','emocional','sexual','pratico'].map(k => [k, {
            presence: obj.categoryScores[k].presence,
            harmonyPct: typeof obj.categoryScores[k].harmonyPct === 'number' ? obj.categoryScores[k].harmonyPct : null,
            eligibleCount: typeof obj.categoryScores[k].eligibleCount === 'number' ? obj.categoryScores[k].eligibleCount : 0,
          }]),
          // Afinidade não existia em exports anteriores a esta categoria — default seguro
          // é "sem sinal" (presence 0, harmonyPct null), mesma semântica de qualquer outra
          // categoria com peso abaixo do piso de confiança. Se o export já tiver o campo
          // (comparações salvas depois desta mudança), usamos o valor real.
          ['afinidade', {
            presence: (obj.categoryScores.afinidade && typeof obj.categoryScores.afinidade.presence === 'number') ? obj.categoryScores.afinidade.presence : 0,
            harmonyPct: (obj.categoryScores.afinidade && typeof obj.categoryScores.afinidade.harmonyPct === 'number') ? obj.categoryScores.afinidade.harmonyPct : null,
            eligibleCount: (obj.categoryScores.afinidade && typeof obj.categoryScores.afinidade.eligibleCount === 'number') ? obj.categoryScores.afinidade.eligibleCount : 0,
          }],
        ])
      : null,
    harmonyPct: obj.harmonyPct, strength: obj.strength, verdictTitle: obj.verdictTitle,
    aspectsCount: typeof obj.aspectsCount === 'number' ? obj.aspectsCount : 0,
    housesCount: typeof obj.housesCount === 'number' ? obj.housesCount : 0,
    // eixos imediato/estrutura e compatibilidade geral não existiam em exports antigos —
    // null é o valor correto de "não calculado" (mesma semântica usada quando o pool tem
    // aspectos insuficientes), então a UI já sabe mostrar "—" sem precisar de outro caso.
    immediateHarmonyPct: typeof obj.immediateHarmonyPct === 'number' ? obj.immediateHarmonyPct : null,
    structureHarmonyPct: typeof obj.structureHarmonyPct === 'number' ? obj.structureHarmonyPct : null,
    // Destino é campo novo (nunca existiu em exports antes desta mudança) — mesma
    // semântica de "não calculado" que immediate/structure já usam pra exports antigos:
    // null vira "—" na UI, sem confundir com um harmonyPct real de 0.
    destinyHarmonyPct: typeof obj.destinyHarmonyPct === 'number' ? obj.destinyHarmonyPct : null,
    compatibilityScore: typeof obj.compatibilityScore === 'number' ? obj.compatibilityScore : null,
    // Veredito (chave interna continua `potentialScore`, só o nome exibido mudou) —
    // mesma semântica de "não calculado" que destino/compatibilidade já usam pra exports
    // antigos. Se a entrada tiver texto original salvo (obj.raw), o recalcAllComparisons
    // chamado logo após a importação recalcula e preenche o valor real (já com a Nitidez
    // agindo como intensificador, não como componente somado — ver potentialScore); sem
    // raw, fica null e a UI mostra "—" (mesmo comportamento de qualquer score não
    // calculável).
    potentialScore: typeof obj.potentialScore === 'number' ? obj.potentialScore : null,
    saturnCommitmentContacts: obj.saturnCommitmentContacts || 0,
    saturnCommitmentHarmonic: obj.saturnCommitmentHarmonic || 0,
    saturnCommitmentAmbivalent: obj.saturnCommitmentAmbivalent || 0,
    saturnCommitmentTense: obj.saturnCommitmentTense || 0,
    saturnCommitmentTenseLight: obj.saturnCommitmentTenseLight || 0,
    saturnCommitmentDetails: Array.isArray(obj.saturnCommitmentDetails) ? obj.saturnCommitmentDetails : [],
    nodeDestinyContacts: obj.nodeDestinyContacts || 0,
    nodeDestinyHarmonic: obj.nodeDestinyHarmonic || 0,
    nodeDestinyAmbivalent: obj.nodeDestinyAmbivalent || 0,
    nodeDestinyTense: obj.nodeDestinyTense || 0,
    nodeDestinyTenseLight: obj.nodeDestinyTenseLight || 0,
    nodeDestinyDetails: Array.isArray(obj.nodeDestinyDetails) ? obj.nodeDestinyDetails : [],
    nodeAxisContacts: obj.nodeAxisContacts || 0,
    nodeAxisHarmonic: obj.nodeAxisHarmonic || 0,
    nodeAxisAmbivalent: obj.nodeAxisAmbivalent || 0,
    nodeAxisTense: obj.nodeAxisTense || 0,
    nodeAxisTenseLight: obj.nodeAxisTenseLight || 0,
    nodeAxisDetails: Array.isArray(obj.nodeAxisDetails) ? obj.nodeAxisDetails : [],
    vertexFatedContacts: obj.vertexFatedContacts || 0,
    vertexFatedHarmonic: obj.vertexFatedHarmonic || 0,
    vertexFatedAmbivalent: obj.vertexFatedAmbivalent || 0,
    vertexFatedTense: obj.vertexFatedTense || 0,
    vertexFatedTenseLight: obj.vertexFatedTenseLight || 0,
    vertexFatedDetails: Array.isArray(obj.vertexFatedDetails) ? obj.vertexFatedDetails : [],
    chironWoundContacts: obj.chironWoundContacts || 0,
    chironWoundHarmonic: obj.chironWoundHarmonic || 0,
    chironWoundAmbivalent: obj.chironWoundAmbivalent || 0,
    chironWoundTense: obj.chironWoundTense || 0,
    chironWoundTenseLight: obj.chironWoundTenseLight || 0,
    chironWoundDetails: Array.isArray(obj.chironWoundDetails) ? obj.chironWoundDetails : [],
    lilithMagneticContacts: obj.lilithMagneticContacts || 0,
    lilithMagneticHarmonic: obj.lilithMagneticHarmonic || 0,
    lilithMagneticAmbivalent: obj.lilithMagneticAmbivalent || 0,
    lilithMagneticTense: obj.lilithMagneticTense || 0,
    lilithMagneticTenseLight: obj.lilithMagneticTenseLight || 0,
    lilithMagneticDetails: Array.isArray(obj.lilithMagneticDetails) ? obj.lilithMagneticDetails : [],
    // não existiam em exports anteriores ao marcador de Sol transpessoal (Netuno/Urano/
    // Plutão) — mesmo tratamento do bloco de Fortuna logo abaixo: default seguro é "não
    // detectado" pra entradas antigas que simplesmente não tinham esses campos.
    sunTranspersonalContacts: obj.sunTranspersonalContacts || 0,
    sunTranspersonalHarmonic: obj.sunTranspersonalHarmonic || 0,
    sunTranspersonalAmbivalent: obj.sunTranspersonalAmbivalent || 0,
    sunTranspersonalTense: obj.sunTranspersonalTense || 0,
    sunTranspersonalTenseLight: obj.sunTranspersonalTenseLight || 0,
    sunTranspersonalDetails: Array.isArray(obj.sunTranspersonalDetails) ? obj.sunTranspersonalDetails : [],
    // não existiam em exports anteriores ao marcador de Fortuna — default seguro é
    // "não detectado" (obj antigo simplesmente não tinha esses campos)
    fortuneContacts: obj.fortuneContacts || 0,
    fortuneHarmonic: obj.fortuneHarmonic || 0,
    fortuneAmbivalent: obj.fortuneAmbivalent || 0,
    fortuneTense: obj.fortuneTense || 0,
    fortuneTenseLight: obj.fortuneTenseLight || 0,
    fortuneDetails: Array.isArray(obj.fortuneDetails) ? obj.fortuneDetails : [],
    // não existiam em exports anteriores ao ajuste de paridade Espírito/Fortuna — mesmo
    // default seguro de "não detectado" pra entradas antigas.
    espiritoContacts: obj.espiritoContacts || 0,
    espiritoHarmonic: obj.espiritoHarmonic || 0,
    espiritoAmbivalent: obj.espiritoAmbivalent || 0,
    espiritoTense: obj.espiritoTense || 0,
    espiritoTenseLight: obj.espiritoTenseLight || 0,
    espiritoDetails: Array.isArray(obj.espiritoDetails) ? obj.espiritoDetails : [],
    // não existiam em exports anteriores a este marcador (Sol-Lua/casas de
    // parceria/perfil de vínculo) — defaults seguros de "não detectado"/"não calculado"
    sunMoonContacts: obj.sunMoonContacts || 0,
    sunMoonHarmonic: obj.sunMoonHarmonic || 0,
    sunMoonAmbivalent: obj.sunMoonAmbivalent || 0,
    sunMoonTense: obj.sunMoonTense || 0,
    sunMoonTenseLight: obj.sunMoonTenseLight || 0,
    sunMoonDetails: Array.isArray(obj.sunMoonDetails) ? obj.sunMoonDetails : [],
    commitmentHouseContacts: obj.commitmentHouseContacts || 0,
    commitmentHouseDetails: Array.isArray(obj.commitmentHouseDetails) ? obj.commitmentHouseDetails : [],
    destinyHouseContacts: obj.destinyHouseContacts || 0,
    destinyHouseDetails: Array.isArray(obj.destinyHouseDetails) ? obj.destinyHouseDetails : [],
    friendshipHouseContacts: obj.friendshipHouseContacts || 0,
    friendshipHouseDetails: Array.isArray(obj.friendshipHouseDetails) ? obj.friendshipHouseDetails : [],
    // também não existiam antes do marcador de Quíron/Plutão em casa — mesmo default
    // seguro de "não detectado" pra imports antigos.
    chironPartnershipHouseContacts: obj.chironPartnershipHouseContacts || 0,
    chironPartnershipHouseDetails: Array.isArray(obj.chironPartnershipHouseDetails) ? obj.chironPartnershipHouseDetails : [],
    plutoPartnershipHouseContacts: obj.plutoPartnershipHouseContacts || 0,
    plutoPartnershipHouseDetails: Array.isArray(obj.plutoPartnershipHouseDetails) ? obj.plutoPartnershipHouseDetails : [],
    // vinculoProfile: guarda o que veio no import como fallback de exibição imediata,
    // mas na prática recalcAllComparisons() roda logo em seguida e sobrescreve isso com
    // um vinculoProfile fresco (v2) sempre que a entrada tiver `raw` — o que cobre quase
    // todo mundo. Só fica valendo de verdade pra entradas sem `raw` (export muito antigo
    // sem o texto original). Campos renomeados na v2: structureScore/lessonWeight (v1)
    // viraram structureHarmonyPct/chemistryHarmonyPct — exports v1 puros não têm esses
    // campos novos, então caem em null (== "não calculado", mesma semântica já usada
    // pros outros eixos acima), não em número inventado.
    vinculoProfile: (obj.vinculoProfile && typeof obj.vinculoProfile === 'object' && typeof obj.vinculoProfile.label === 'string')
      ? {
          label: obj.vinculoProfile.label,
          description: typeof obj.vinculoProfile.description === 'string' ? obj.vinculoProfile.description : '',
          structureHarmonyPct: typeof obj.vinculoProfile.structureHarmonyPct === 'number' ? obj.vinculoProfile.structureHarmonyPct : null,
          chemistryHarmonyPct: typeof obj.vinculoProfile.chemistryHarmonyPct === 'number' ? obj.vinculoProfile.chemistryHarmonyPct : null,
          destinyNote: typeof obj.vinculoProfile.destinyNote === 'string' ? obj.vinculoProfile.destinyNote : '',
          signals: Array.isArray(obj.vinculoProfile.signals) ? obj.vinculoProfile.signals : [],
        }
      : null,
    houseConvergenceContacts: obj.houseConvergenceContacts || 0,
    houseConvergenceDetails: Array.isArray(obj.houseConvergenceDetails) ? obj.houseConvergenceDetails : [],
    // não existia em exports anteriores a este marcador — default seguro é "não detectado"
    isLuminarySwap: !!obj.isLuminarySwap,
    luminarySwapDetail: typeof obj.luminarySwapDetail === 'string' ? obj.luminarySwapDetail : '',
    // luminarySwapCategory é mais recente ainda que o marcador em si (exports feitos
    // entre a criação do marcador e a classificação por grau não têm esse campo) —
    // só aceita valores válidos, qualquer outra coisa vira null (sem cor, honesto
    // sobre não ter esse dado, em vez de assumir harmônico por padrão)
    luminarySwapCategory: ['harmonic','ambivalent','tense'].includes(obj.luminarySwapCategory) ? obj.luminarySwapCategory : null,
  };
}

// Importar é ADITIVO: as entradas do arquivo entram como novas sinastrias na lista
// atual (com id novo, pra não colidir com nada que já exista) — não substitui nem
// tenta deduplicar contra o que já está salvo. Se a intenção for restaurar um backup
// do zero, "Limpar tudo" antes de importar resolve.
export function importComparisonsFromJSON(text){
  let data;
  try { data = JSON.parse(text); }
  catch(e){ alert('Esse arquivo não é um JSON válido.'); return; }
  if (!Array.isArray(data)){
    alert('O JSON precisa ser uma lista de sinastrias — o mesmo formato gerado pelo botão "Exportar JSON".');
    return;
  }

  let imported = 0, skipped = 0;
  const now = Date.now();
  // Preserva o id original do arquivo — é o que liga essa sinastria às configs de
  // prompt (promptConfigs) e aos significados "só nesta sinastria" (scope: "unique")
  // do dicionário, ambos guardados por synastryId. Só gera um id novo se faltar, vier
  // num tipo inválido, ou já estiver em uso por outra sinastria já carregada (evita
  // duas sinastrias diferentes colidindo no mesmo id).
  const usedIds = new Set(comparisons.map(c => c.id));
  data.forEach((raw, idx) => {
    const normalized = validateImportedEntry(raw);
    if (!normalized){ skipped++; return; }
    const rawId = (typeof raw.id === 'number' || typeof raw.id === 'string') ? raw.id : null;
    const id = (rawId !== null && !usedIds.has(rawId)) ? rawId : (now + idx);
    usedIds.add(id);
    comparisons.push({
      id,
      ts: typeof raw.ts === 'number' ? raw.ts : now,
      ...normalized,
    });
    imported++;
  });

  if (imported > 0){ recalcAllComparisons(); saveComparisons(); renderComparisons(); }
  const skippedNote = skipped > 0 ? ` (${skipped} ignorada${skipped > 1 ? 's' : ''} por formato inválido)` : '';
  alert(`Importação concluída: ${imported} sinastria${imported === 1 ? '' : 's'} adicionada${imported === 1 ? '' : 's'}${skippedNote}.`);
}
