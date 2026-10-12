/**
 * dictionary.js — Lógica da aba Dicionário: lista de significados por
 * sinastria salva, e o painel de configuração do "prompt de preenchimento"
 * (pra colar num assistente de texto externo).
 * Depende de: comparisons.js (import circular intencional, ver README),
 * compute.js, calibration.js, labels.js, pairs.js, parser.js, state.js.
 * Usado por: comparisons.js (circular), main.js, report.js, ui.js.
 */

import { escapeHtml } from './comparisons.js';
import { catMetaFor } from './compute.js';
import { NODE_MIRROR_ASPECT, ORB_DECAY_DIVISOR } from './calibration.js';
import { ANGLE_AXIS_LABEL_PT, ASPECT_LABEL_PT, DICT_FLAVOR_ICON, DICT_FLAVOR_LABEL, OPPOSITE_SIGN, PLANET_LABEL_PT, SIGN_LABEL_PT } from './labels.js';
import { CATEGORY_KEYS, DESTINY_ANCHORS, DSC_ASC_SYMMETRIC_ASPECTS, MARRIAGE_HOUSES, SYMMETRIC_MERGED_LABEL_ASPECTS, TRANSPERSONAL_PLANETS } from './pairs.js';
import { aspectCategoryMult, effectiveMaxOrb, parseText } from './parser.js';
import { axisBoost, axisPoolFor, categoryPoolFor, categoryPoolForHouse, formatMarkerDetail, harmonicFraction, houseMarkerWeightFor, markerCategory } from './scoring.js';
import { comparisons, currentDictFilter, currentDictSynastryId, dictionary, promptConfigs, saveDictionary, savePromptConfigs, setCurrentDictFilter, setCurrentDictSynastryId } from './state.js';
import { autoGrowTextarea } from './ui.js';

// Varre os aspectos e posições de casa já interpretados (parseText) e devolve as duas
// primeiras siglas distintas encontradas, na ordem em que aparecem no texto — essas
// siglas (ex: "DD", "MEV") são exatamente o que o software de astrologia usa antes do
// "'s" em cada linha, então não têm relação com o nome digitado em "Pessoa 1/2".
export function detectSiglasFromParsed(parsed){
  const found = [];
  const pushSigla = (s) => { if (s && !found.includes(s)) found.push(s); };
  (parsed.aspects || []).forEach(a => { pushSigla(a.p1); pushSigla(a.p2); });
  (parsed.houses || []).forEach(h => { pushSigla(h.p1); pushSigla(h.p2); });
  return found.slice(0, 2);
}

// Retorna a config da sinastria atual, criando um default (nomes vindos de c.n1/c.n2,
// siglas detectadas automaticamente a partir do texto colado, contexto vazio) na
// primeira vez que essa sinastria é aberta na aba.
export function getPromptConfig(synastryId){
  const key = String(synastryId);
  if (!promptConfigs[key]){
    const c = comparisons.find(x => x.id === synastryId);
    let sigla1 = '', sigla2 = '';
    if (c && c.raw){
      try {
        const detected = detectSiglasFromParsed(parseText(c.raw));
        sigla1 = detected[0] || '';
        sigla2 = detected[1] || '';
      } catch(e){ /* raw ilegível, deixa as siglas em branco */ }
    }
    promptConfigs[key] = { name1: c ? (c.n1 || '') : '', sigla1, name2: c ? (c.n2 || '') : '', sigla2, context: '' };
    savePromptConfigs();
  }
  return promptConfigs[key];
}

export function setPromptConfigField(synastryId, field, value){
  const cfg = getPromptConfig(synastryId);
  cfg[field] = value;
  savePromptConfigs();
}

// "Nome (SIGLA)" — se faltar nome ou sigla, cai pro que tiver disponível.
export function formatPromptPerson(name, sigla){
  name = (name || '').trim();
  sigla = (sigla || '').trim();
  if (name && sigla) return `${name} (${sigla})`;
  return name || sigla || '?';
}

// Monta o prompt padrão de preenchimento: "Em no máximo dois parágrafos, forneça o
// significado de [aspecto] entre [Nome1 (Sigla1)] e [Nome2 (Sigla2)], num contexto de
// [definição do vínculo]." — o [aspecto] é exatamente o texto de "Nesta sinastria:"
// daquela linha (mesmo texto vindo de instanceLines em initDictRowBody).
export function buildDictPrompt(aspectText, cfg){
  const p1 = formatPromptPerson(cfg.name1, cfg.sigla1);
  const p2 = formatPromptPerson(cfg.name2, cfg.sigla2);
  const context = (cfg.context || '').trim();
  const contextPart = context ? `, num contexto de ${context}` : '';
  return `Em no máximo dois parágrafos, forneça o significado de ${aspectText} entre ${p1} e ${p2}${contextPart}.`;
}

export async function copyTextToClipboard(text){
  if (navigator.clipboard && navigator.clipboard.writeText){
    try { await navigator.clipboard.writeText(text); return true; } catch(e){ /* cai pro fallback abaixo */ }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch(e){ return false; }
}

export function renderPromptConfigPreview(cfg){
  const preview = document.getElementById('dictPromptCfgPreview');
  if (!preview) return;
  const example = buildDictPrompt('[aspecto ou posição da linha]', cfg);
  preview.innerHTML = `<strong>Prévia:</strong> ${escapeHtml(example)}`;
}

export function renderPromptConfigPanel(synastryId){
  const cfg = getPromptConfig(synastryId);
  document.getElementById('pcName1').value = cfg.name1 || '';
  document.getElementById('pcSigla1').value = cfg.sigla1 || '';
  document.getElementById('pcName2').value = cfg.name2 || '';
  document.getElementById('pcSigla2').value = cfg.sigla2 || '';
  document.getElementById('pcContext').value = cfg.context || '';
  renderPromptConfigPreview(cfg);
}
// Normaliza planeta(s) e aspecto de um contato pro lado canônico Ascendente/MC:
// DSC→Ascendente e IC→MC sempre trocam o aspecto pelo seu espelho geométrico
// (NODE_MIRROR_ASPECT: conjunção↔oposição, quadratura fica quadratura) quando o
// aspecto é um dos três travados ao eixo; fora deles, planeta e aspecto voltam sem
// alteração. Se os dois lados do contato forem pontos do eixo (ex.: DSC-IC), a troca é
// aplicada uma vez por lado — duas trocas em conjunção/oposição se cancelam (volta ao
// aspecto original), o que é geometricamente correto: deslocar os dois pontos por 180°
// não muda o ângulo relativo entre eles.
export function normalizeAxisAspect(planet1, planet2, aspect){
  let p1 = planet1, p2 = planet2, asp = aspect;
  if (DSC_ASC_SYMMETRIC_ASPECTS.has(asp)){
    if (p1 === 'DSC'){ p1 = 'Ascendant'; asp = NODE_MIRROR_ASPECT[asp] || asp; }
    else if (p1 === 'IC'){ p1 = 'MC'; asp = NODE_MIRROR_ASPECT[asp] || asp; }
    if (p2 === 'DSC'){ p2 = 'Ascendant'; asp = NODE_MIRROR_ASPECT[asp] || asp; }
    else if (p2 === 'IC'){ p2 = 'MC'; asp = NODE_MIRROR_ASPECT[asp] || asp; }
  }
  return { p1, p2, aspect: asp };
}
export function aspectSignature(a){
  const { p1, p2, aspect } = normalizeAxisAspect(a.planet1, a.planet2, a.aspect);
  const pair = [p1, p2].sort();
  return `ASPECT|${pair[0]}|${pair[1]}|${aspect}`;
}
export function aspectPatternLabel(a){
  const { p1, p2, aspect } = normalizeAxisAspect(a.planet1, a.planet2, a.aspect);
  const useMergedLabel = SYMMETRIC_MERGED_LABEL_ASPECTS.has(aspect);
  const pair = [p1, p2].sort();
  const labelFor = (p) => (useMergedLabel && ANGLE_AXIS_LABEL_PT[p]) || PLANET_LABEL_PT[p] || p;
  const l1 = labelFor(pair[0]);
  const l2 = labelFor(pair[1]);
  const asp = ASPECT_LABEL_PT[aspect] || aspect;
  return `${l1} ${asp} ${l2}`;
}
// Nota complementar pra lista "Nesta sinastria:" (pedido do usuário): mostra a leitura
// espelhada do outro lado do eixo pros três aspectos travados. Conjunção/oposição
// invertem aspecto E signo (Ascendente e Descendente estão sempre em signos opostos —
// "Ascendente oposição Lua em Touro" é a mesma coisa que "Descendente conjunção Lua em
// Escorpião"); quadratura só acrescenta o eco no signo oposto, sem trocar o aspecto
// (Ascendente e Descendente quadram a Lua ao mesmo tempo, só que vistos de signos
// opostos).
export function axisMirrorNote(a){
  if (!DSC_ASC_SYMMETRIC_ASPECTS.has(a.aspect)) return '';
  const AXIS_POINTS = new Set(['Ascendant', 'DSC', 'MC', 'IC']);
  const p1IsAxis = AXIS_POINTS.has(a.planet1);
  const p2IsAxis = AXIS_POINTS.has(a.planet2);
  if (p1IsAxis === p2IsAxis) return ''; // nem um nem os dois lados isolados no eixo: sem nota simples (ex: DSC-IC)
  const axisPlanet = p1IsAxis ? a.planet1 : a.planet2;
  const axisSign = p1IsAxis ? a.sign1 : a.sign2;
  const otherLabel = PLANET_LABEL_PT[p1IsAxis ? a.planet2 : a.planet1] || (p1IsAxis ? a.planet2 : a.planet1);
  const mirrorPoint = { Ascendant: 'DSC', DSC: 'Ascendant', MC: 'IC', IC: 'MC' }[axisPlanet];
  const mirrorLabel = PLANET_LABEL_PT[mirrorPoint] || mirrorPoint;
  const mirrorSign = axisSign ? OPPOSITE_SIGN[axisSign] : null;
  const mirrorSignLabel = mirrorSign ? (SIGN_LABEL_PT[mirrorSign] || mirrorSign) : '';
  if (a.aspect === 'Square'){
    return ` [o ${mirrorLabel}${mirrorSignLabel ? ', em '+mirrorSignLabel : ''}, também quadra ${otherLabel}]`;
  }
  const mirrorAspect = NODE_MIRROR_ASPECT[a.aspect];
  const mirrorAspLabel = ASPECT_LABEL_PT[mirrorAspect] || mirrorAspect;
  return ` [= ${mirrorLabel} ${mirrorAspLabel} ${otherLabel}${mirrorSignLabel ? ' em '+mirrorSignLabel : ''}]`;
}
// Mesma fórmula usada em computeScores: decaimento exponencial por orbe (varia por
// tipo de aspecto) × boost de eixo/tier do par (AXIS_BOOST via axisBoost — pares sem
// entrada específica caem no genérico 1.0, então TODO aspecto reconhecido entra aqui,
// mesmo os sem peso extra de categoria/eixo).
//
// Correção de auditoria #4 (calibrado com o usuário, caso Plutão-Plutão): esta função
// não aplicava o generationalDiscount (0.3× pra Urano/Netuno/Plutão mútuos entre si —
// ver TRANSPERSONAL_PLANETS/bothOuter em computeScores) que a Harmonia geral já usa.
// Sem isso, um Plutão-Plutão conjunção a 2.36° (boost genérico 1.0, sem entrada em
// AXIS_BOOST) empatava/superava uma Lua semiquadratura Quíron quase exata (0.455 vs
// 0.454) — apesar de Plutão-Plutão mútuo ser o exemplo clássico de "falso sinal" em
// sinastria (planeta lento: qualquer par de idade parecida tem esse aspecto, então ele
// mede geração, não o vínculo específico entre as duas pessoas). Faltava replicar aqui
// o mesmo desconto que a Harmonia geral já aplica, senão a lista de dicionário e o
// impacto exibido tratam esse falso sinal como equivalente a um aspecto pessoal real.
export function aspectWeight(a){
  const orbW = a.orb <= effectiveMaxOrb(a.aspect, a.planet1, a.planet2)
    ? Math.exp(-a.orb / (ORB_DECAY_DIVISOR[a.aspect] || 2.5))
    : 0;
  const bothOuter = TRANSPERSONAL_PLANETS.has(a.planet1) && TRANSPERSONAL_PLANETS.has(a.planet2);
  const generationalDiscount = bothOuter ? 0.3 : 1.0;
  // boost calculado uma vez e reaproveitado pro catMult (correção de auditoria #5 — ver
  // comentário em ASPECT_CATEGORY_MULT/aspectCategoryMult): precisa do mesmo `boost` que
  // computeScores já usa, pra distinguir par sem pessoal MAS com eixo curado (ex.:
  // Nodo-Nodo, boost>1.0) de par sem pessoal E sem eixo nenhum (ex.: Saturno-Lilith,
  // boost genérico 1.0) — sem isso esta função (usada na lista de "impacto" exibida)
  // ficava dessincronizada da fórmula de Harmonia geral, que já recebeu a correção.
  const boost = axisBoost(a.planet1, a.planet2, a.aspect);
  return orbW * boost * aspectCategoryMult(a.aspect, a.planet1, a.planet2, boost) * generationalDiscount;
}
export function houseSignature(h){
  return `HOUSE|${h.planet}|${h.house}`;
}
export function housePatternLabel(h){
  return `${PLANET_LABEL_PT[h.planet] || h.planet} na Casa ${h.house}`;
}
// Casa não tem orbe pra graduar — usa o mesmo peso fixo por angularidade
// (houseMarkerWeightFor) já usado no resto do app.
export function houseWeight(h){
  return houseMarkerWeightFor(h.house);
}

// Agrupa aspectos + casas reconhecidos nesta sinastria por padrão (assinatura),
// guardando as instâncias reais (pra mostrar orbe/pessoas de contexto) e o maior peso
// entre elas, depois ordena do mais pro menos importante.
// Classifica um padrão em harmônico/ambivalente/desarmônico (pro filtro do dicionário) —
// reaproveita harmonicFraction+markerCategory (mesma lógica já usada nas barras de
// categoria e nos chips de eixo). tenseLight e tense colapsam num único "desarmônico"
// pro filtro, já que a distinção fina entre os dois não é o que a pessoa normalmente
// quer separar aqui (é mais "flui" vs "flui com ressalva" vs "atrita" — 3 baldes, não
// 4). Casa não tem orbe/sinal pra graduar harmonia (é presença, não fricção — ver
// comentário em categoryPoolForHouse), então retorna null: não aparece em nenhum dos 3
// filtros de harmonia, só nos de categoria/eixo.
export function patternFlavor(pattern){
  if (pattern.kind !== 'aspect') return null;
  const a = pattern.instances[0];
  const sameSign = a.sign1 && a.sign2 ? (a.sign1.toLowerCase() === a.sign2.toLowerCase()) : true;
  const cat = markerCategory(harmonicFraction(a.aspect, a.planet1, a.planet2, sameSign));
  // tenseLight vira seu próprio flavor (não mais colapsado em 'tense') — sem isso, um
  // aspecto calibrado como "fricção real, mas um degrau mais brando" (ex: Ascendente
  // oposição Júpiter, 0.3) aparecia no Dicionário com o mesmo 🔴 "Desarmônico" de um
  // maléfico puro tipo Marte-Saturno (0.0–0.2), escondendo justamente a distinção que
  // markerCategory foi desenhada pra preservar (ver comentário em markerCategory).
  return cat; // 'harmonic' | 'ambivalent' | 'tenseLight' | 'tense'
}

// Categorias de conteúdo do padrão (reaproveita categoryPoolFor/categoryPoolForHouse —
// mesmo checklist curado usado nas barras "Marcadores por área"). Pode retornar mais de
// uma (pares double-dipping, ex: Vênus-Marte) ou nenhuma (padrão reconhecido pelo
// parser mas sem curadoria de categoria, ex: aspectos genéricos entre pontos externos).
export function patternCategories(pattern){
  const a = pattern.instances[0];
  if (pattern.kind === 'aspect') return categoryPoolFor(a.planet1, a.planet2) || [];
  return categoryPoolForHouse(a.planet, a.house) || [];
}

// Eixo (Estrutura/Destino) do padrão. Pro lado de casa, espelha o mesmo empurrão
// estrutural/destino já usado em computeScores (Sol/Lua/Saturno ou Nodo/Vértice numa
// das quatro casas de MARRIAGE_HOUSES) — não existe uma função genérica separada pra
// isso porque, até agora, só era calculado inline ali dentro do loop de agregação.
export function patternAxis(pattern){
  const a = pattern.instances[0];
  if (pattern.kind === 'aspect') return axisPoolFor(a.planet1, a.planet2);
  if (MARRIAGE_HOUSES.has(a.house) && (a.planet === 'Sun' || a.planet === 'Moon' || a.planet === 'Saturn')) return 'structure';
  if (MARRIAGE_HOUSES.has(a.house) && DESTINY_ANCHORS.has(a.planet)) return 'destiny';
  return null;
}

// Um padrão é "só informativo" (mesmo termo/ícone 📝 já usado no agrupamento dos chips
// de "Marcadores por área" — grupo 4, GROUP_META) quando não entra em NENHUM dos outros
// filtros: sem eixo, sem categoria e sem harmonia própria. Na prática isso é quase
// sempre casa (planeta numa casa sem curadoria de categoria — a maioria das casas do
// relatório, já que só um punhado de pares planeta+casa está em HOUSE_CATEGORY_MARKERS/
// MARRIAGE_HOUSES) — aspecto sempre tem flavor (harmônico/ambivalente/desarmônico), então
// só cai aqui se também não tiver nem categoria nem eixo, o que hoje não acontece (todo
// aspecto reconhecido pelo parser cai em pelo menos harmonicFraction). Não travado nisso
// de propósito: se um dia existir um tipo de padrão sem harmonia própria E sem categoria
// nem eixo, ele entra aqui automaticamente, sem precisar checar `kind`.
export function patternIsInformative(pattern){
  return !pattern.flavor && pattern.categories.length === 0 && !pattern.axis;
}

export function buildDictionaryPatterns(parsed){
  const map = new Map();
  for (const a of parsed.aspects){
    const sig = aspectSignature(a);
    const w = aspectWeight(a);
    if (!map.has(sig)) map.set(sig, { kind:'aspect', signature: sig, label: aspectPatternLabel(a), weight: w, instances: [] });
    const entry = map.get(sig);
    entry.instances.push(a);
    if (w > entry.weight) entry.weight = w;
  }
  for (const h of parsed.houses){
    const sig = houseSignature(h);
    const w = houseWeight(h);
    if (!map.has(sig)) map.set(sig, { kind:'house', signature: sig, label: housePatternLabel(h), weight: w, instances: [] });
    map.get(sig).instances.push(h);
  }
  const patterns = Array.from(map.values());
  patterns.forEach(p => {
    p.flavor = patternFlavor(p);
    p.categories = patternCategories(p);
    p.axis = patternAxis(p);
    p.informative = patternIsInformative(p);
  });
  return patterns.sort((x,y) => y.weight - x.weight);
}

// Aplica o filtro selecionado em #dictFilterSelect sobre a lista já construída por
// buildDictionaryPatterns. filterValue vem no formato "tipo:valor" (ex:
// "flavor:harmonic", "cat:sexual", "axis:structure"), "informative" ou "all".
export function applyDictFilter(patterns, filterValue){
  if (!filterValue || filterValue === 'all') return patterns;
  if (filterValue === 'informative') return patterns.filter(p => p.informative);
  const [kind, value] = filterValue.split(':');
  if (kind === 'flavor') return patterns.filter(p => p.flavor === value);
  if (kind === 'cat') return patterns.filter(p => p.categories.includes(value));
  if (kind === 'axis') return patterns.filter(p => p.axis === value);
  return patterns;
}
// Padrões com weight 0 (aspecto cujo orbe passou do teto específico do tipo de astro —
// ver effectiveMaxOrb/ORB_TYPE_MULT) ficam escondidos por padrão, mesmo critério e mesmo
// rótulo do checkbox "Mostrar zerados" já usado nos 4 painéis de aspectos da Efeméride
// Pessoal. Casa nunca zera (houseWeight não depende de orbe), então esse filtro só afeta
// padrões kind==='aspect'.
export function applyDictZeroedFilter(patterns, showZeroed){
  if (showZeroed) return patterns;
  return patterns.filter(p => p.weight > 0);
}

export function findDictEntry(signature, scope, relType, synastryId){
  return dictionary.find(e => e.signature === signature && e.scope === scope &&
    (scope === 'unique' ? e.synastryId === synastryId : scope === 'global_type' ? e.relType === relType : true));
}
// Prioridade de exibição quando existe mais de uma versão salva pro mesmo padrão:
// nota única desta sinastria > reutilizável só deste tipo de vínculo > reutilizável geral.
export function findBestDictEntry(signature, relType, synastryId){
  return findDictEntry(signature, 'unique', null, synastryId)
    || findDictEntry(signature, 'global_type', relType, synastryId)
    || findDictEntry(signature, 'global_all', null, synastryId);
}

export function renderDictionaryPanel(parsed, relType, synastryId){
  const container = document.getElementById('dictionaryList');
  const allPatterns = buildDictionaryPatterns(parsed);
  const filterValue = document.getElementById('dictFilterSelect').value;
  const showZeroed = document.getElementById('dictShowZeroed').checked;
  const patterns = applyDictZeroedFilter(applyDictFilter(allPatterns, filterValue), showZeroed);
  container.innerHTML = '';
  if (allPatterns.length === 0){
    container.innerHTML = '<div class="dict-empty">Nenhum aspecto ou casa reconhecido nesta sinastria.</div>';
    return;
  }
  if (patterns.length === 0){
    container.innerHTML = '<div class="dict-empty">Nenhum padrão desse filtro nesta sinastria.</div>';
    return;
  }
  const toggleAllBtn = document.getElementById('toggleAllDictBtn');
  if (toggleAllBtn) toggleAllBtn.textContent = 'Expandir tudo';

  patterns.forEach(pattern => {
    const row = document.createElement('div');
    row.className = 'dict-row';
    if (findBestDictEntry(pattern.signature, relType, synastryId)) row.classList.add('has-entry');

    const head = document.createElement('div');
    head.className = 'dict-row-head';
    renderDictRowHead(row, head, pattern);
    head.addEventListener('click', () => {
      row.classList.toggle('open');
      if (row.classList.contains('open')){
        body.querySelectorAll('.dict-text-input').forEach(ta => autoGrowTextarea(ta));
      }
    });

    const body = document.createElement('div');
    body.className = 'dict-row-body';

    row.appendChild(head);
    row.appendChild(body);
    container.appendChild(row);

    initDictRowBody(row, body, pattern, relType, synastryId);
  });
}

export function renderDictRowHead(row, head, pattern){
  const hasEntry = row.classList.contains('has-entry');
  const kindIcon = pattern.kind === 'aspect' ? '🪐' : '🏠';
  const countBadge = pattern.instances.length > 1
    ? ` <span title="Aparece ${pattern.instances.length}x nesta sinastria">×${pattern.instances.length}</span>` : '';
  const flavorIcon = DICT_FLAVOR_ICON[pattern.flavor] || '';
  head.innerHTML = `
    <div class="dict-row-title">${hasEntry ? '<span class="dict-dot" title="Já tem significado cadastrado"></span>' : ''}${flavorIcon ? `<span class="flavor-icon" title="${DICT_FLAVOR_LABEL[pattern.flavor]}">${flavorIcon}</span> ` : ''}<span class="kind-icon">${kindIcon}</span>${pattern.label}${countBadge}</div>
    <div class="dict-row-meta">
      <span class="dict-weight-badge">peso ${pattern.weight.toFixed(2)}</span>
      ${hasEntry ? '<span class="dict-saved-badge">✓ preenchido</span>' : ''}
    </div>`;
}
export function dictSelectLabel(c){
  const relLabel = { romantico:'Romântico', amizade:'Amizade', familia:'Família' }[c.relType] || c.relType || '';
  return `${c.n1 || '?'} & ${c.n2 || '?'} — ${relLabel}`;
}

// Rótulo da categoria "sexual" muda por tipo de vínculo (ver SEXUAL_LABEL_BY_TYPE /
// catMetaFor) — repopula as opções de categoria toda vez que a sinastria selecionada
// muda, pra sempre bater com o relType dela. currentDictFilter é preservado entre
// trocas de sinastria (só reseta pra "all" se, por algum motivo, o valor selecionado
// deixasse de existir — não deveria acontecer hoje, já que as chaves são fixas).
export function populateDictFilterOptions(relType){
  const select = document.getElementById('dictFilterSelect');
  const catMeta = catMetaFor(relType || 'romantico');
  const catOptions = CATEGORY_KEYS.map(key => `<option value="cat:${key}">${catMeta[key].label}</option>`).join('');
  select.innerHTML = `
    <option value="all">Todos os padrões</option>
    <optgroup label="Harmonia">
      <option value="flavor:harmonic">Harmônico</option>
      <option value="flavor:ambivalent">Ambivalente</option>
      <option value="flavor:tenseLight">Tenso leve</option>
      <option value="flavor:tense">Desarmônico</option>
    </optgroup>
    <optgroup label="Categoria">${catOptions}</optgroup>
    <optgroup label="Eixo">
      <option value="axis:structure">Estrutura</option>
      <option value="axis:destiny">Destino</option>
    </optgroup>
    <optgroup label="Outros">
      <option value="informative">Só informativo</option>
    </optgroup>`;
  select.value = currentDictFilter;
  if (select.value !== currentDictFilter){ setCurrentDictFilter('all'); select.value = 'all'; }
}
export function refreshDictSynastryOptions(){
  const select = document.getElementById('dictSynastrySelect');
  const selectRows = document.querySelectorAll('.dict-select-row');
  if (comparisons.length === 0){
    selectRows.forEach(row => row.style.display = 'none');
    select.innerHTML = '';
    setCurrentDictSynastryId(null);
    document.getElementById('dictPromptCfg').style.display = 'none';
    document.getElementById('dictionaryList').innerHTML =
      '<div class="dict-empty">Calcule ao menos uma sinastria na aba Calculadora pra usar o dicionário.</div>';
    return;
  }
  selectRows.forEach(row => row.style.display = '');
  document.getElementById('dictPromptCfg').style.display = '';
  const sorted = [...comparisons].sort((a,b) => dictSelectLabel(a).localeCompare(dictSelectLabel(b), 'pt-BR', { sensitivity:'base' }));
  const stillValid = comparisons.some(c => c.id === currentDictSynastryId);
  setCurrentDictSynastryId(stillValid ? currentDictSynastryId : sorted[0].id);
  select.innerHTML = sorted.map(c =>
    `<option value="${c.id}" ${c.id === currentDictSynastryId ? 'selected' : ''}>${dictSelectLabel(c)}</option>`
  ).join('');
  renderDictionaryForCurrentSelection();
}

export function renderDictionaryForCurrentSelection(){
  const container = document.getElementById('dictionaryList');
  const c = comparisons.find(x => x.id === currentDictSynastryId);
  if (!c){
    container.innerHTML = '<div class="dict-empty">Calcule ao menos uma sinastria na aba Calculadora pra usar o dicionário.</div>';
    return;
  }
  populateDictFilterOptions(c.relType);
  renderPromptConfigPanel(c.id);
  if (!c.raw){
    container.innerHTML = '<div class="dict-empty">Essa sinastria não tem o texto original salvo (entrada antiga ou importada sem ele), então não dá pra recalcular os padrões dela aqui.</div>';
    return;
  }
  renderDictionaryPanel(parseText(c.raw), c.relType || 'romantico', c.id);
}
export function initDictRowBody(row, body, pattern, relType, synastryId){
  const initial = findBestDictEntry(pattern.signature, relType, synastryId);
  const state = {
    scope: initial ? initial.scope : 'unique',
    relTypeSel: (initial && initial.scope === 'global_type') ? initial.relType : relType,
    sameForAll: initial && typeof initial.sameForAll === 'boolean' ? initial.sameForAll : true,
    texts: initial ? { ...initial.texts } : {},
  };

  const scopeMatcher = (st) => e => e.signature === pattern.signature && e.kind === pattern.kind && e.scope === st.scope &&
    (st.scope === 'unique' ? e.synastryId === synastryId : st.scope === 'global_type' ? e.relType === st.relTypeSel : true);

  function draw(){
    const instanceLines = pattern.instances.slice(0, 6).map(inst => pattern.kind === 'aspect'
      ? formatMarkerDetail(inst) + axisMirrorNote(inst)
      : `${inst.p1} (${PLANET_LABEL_PT[inst.planet] || inst.planet}) na ${inst.house}ª de ${inst.p2}`
    ).join(' · ');

    let textFieldsHtml = '';
    if (state.scope === 'global_all'){
      textFieldsHtml += `
        <label class="dict-repeat-toggle">
          <input type="checkbox" class="dict-same-toggle" ${state.sameForAll ? 'checked' : ''}>
          Repetir o mesmo texto pra Romântico, Amizade e Família (desligue pra escrever versões diferentes)
        </label>`;
      textFieldsHtml += state.sameForAll ? `
          <div class="dict-text-group">
            <div class="dict-text-field">
              <label>Significado (todos os vínculos)</label>
              <textarea class="dict-text-input" data-slot="all" placeholder="Escreva o significado...">${escapeHtml(state.texts.all || '')}</textarea>
            </div>
          </div>` : `
          <div class="dict-text-group">
            <div class="dict-text-field"><label>Romântico</label><textarea class="dict-text-input" data-slot="romantico" placeholder="Significado no romance...">${escapeHtml(state.texts.romantico || '')}</textarea></div>
            <div class="dict-text-field"><label>Amizade</label><textarea class="dict-text-input" data-slot="amizade" placeholder="Significado na amizade...">${escapeHtml(state.texts.amizade || '')}</textarea></div>
            <div class="dict-text-field"><label>Família</label><textarea class="dict-text-input" data-slot="familia" placeholder="Significado em família...">${escapeHtml(state.texts.familia || '')}</textarea></div>
          </div>`;
    } else {
      textFieldsHtml += `
        <div class="dict-text-group">
          <div class="dict-text-field">
            <label>Significado</label>
            <textarea class="dict-text-input" data-slot="single" placeholder="Escreva o significado...">${escapeHtml(state.texts.single || '')}</textarea>
          </div>
        </div>`;
    }

    const hasSavedForState = dictionary.some(scopeMatcher(state));

    body.innerHTML = `
      <div class="dict-row-instance">Nesta sinastria: ${instanceLines}</div>
      <div class="dict-scope-row">
        <div class="field">
          <label>Aplicação deste significado</label>
          <select class="field-select dict-scope-select">
            <option value="unique" ${state.scope==='unique'?'selected':''}>Só nesta sinastria</option>
            <option value="global_all" ${state.scope==='global_all'?'selected':''}>Reutilizável — qualquer vínculo</option>
            <option value="global_type" ${state.scope==='global_type'?'selected':''}>Reutilizável — só um tipo de vínculo</option>
          </select>
        </div>
        ${state.scope === 'global_type' ? `
        <div class="field">
          <label>Qual tipo de vínculo</label>
          <select class="field-select dict-reltype-select">
            <option value="romantico" ${state.relTypeSel==='romantico'?'selected':''}>Romântico</option>
            <option value="amizade" ${state.relTypeSel==='amizade'?'selected':''}>Amizade</option>
            <option value="familia" ${state.relTypeSel==='familia'?'selected':''}>Família</option>
          </select>
        </div>` : ''}
      </div>
      ${textFieldsHtml}
      <div class="dict-row-actions">
        <button type="button" class="dict-save-btn">Salvar significado</button>
        <button type="button" class="ghost-btn dict-copy-btn">Copiar prompt</button>
        <button type="button" class="ghost-btn dict-copy-aspect-btn">Copiar aspecto</button>
        ${hasSavedForState ? '<button type="button" class="ghost-btn dict-delete-btn">Remover</button>' : ''}
        <span class="dict-save-note">Salvo ✓</span>
        <span class="dict-copy-note">Copiado ✓</span>
        <span class="dict-copy-aspect-note">Copiado ✓</span>
      </div>
    `;

    body.querySelector('.dict-scope-select').addEventListener('change', (e) => {
      state.scope = e.target.value;
      const found = state.scope === 'unique' ? findDictEntry(pattern.signature, 'unique', null, synastryId)
        : state.scope === 'global_type' ? findDictEntry(pattern.signature, 'global_type', state.relTypeSel, synastryId)
        : findDictEntry(pattern.signature, 'global_all', null, synastryId);
      state.texts = found ? { ...found.texts } : {};
      state.sameForAll = found && typeof found.sameForAll === 'boolean' ? found.sameForAll : true;
      draw();
    });

    const relSel = body.querySelector('.dict-reltype-select');
    if (relSel){
      relSel.addEventListener('change', (e) => {
        state.relTypeSel = e.target.value;
        const found = findDictEntry(pattern.signature, 'global_type', state.relTypeSel, synastryId);
        state.texts = found ? { ...found.texts } : {};
        draw();
      });
    }

    const sameToggle = body.querySelector('.dict-same-toggle');
    if (sameToggle){
      sameToggle.addEventListener('change', (e) => {
        state.sameForAll = e.target.checked;
        draw();
      });
    }

    body.querySelectorAll('.dict-text-input').forEach(ta => {
      autoGrowTextarea(ta);
      ta.addEventListener('input', (e) => {
        state.texts[e.target.dataset.slot] = e.target.value;
        autoGrowTextarea(e.target);
      });
    });

    body.querySelector('.dict-save-btn').addEventListener('click', () => {
      saveDictRowEntry(pattern, state, synastryId);
      row.classList.add('has-entry');
      refreshDictRowHead(row, pattern);
      const note = body.querySelector('.dict-save-note');
      note.classList.add('show');
      setTimeout(() => note.classList.remove('show'), 1600);
      draw();
    });

    body.querySelector('.dict-copy-btn').addEventListener('click', async () => {
      const cfg = getPromptConfig(synastryId);
      const promptText = buildDictPrompt(instanceLines, cfg);
      const ok = await copyTextToClipboard(promptText);
      const note = body.querySelector('.dict-copy-note');
      note.textContent = ok ? 'Copiado ✓' : 'Não foi possível copiar';
      note.classList.add('show');
      setTimeout(() => note.classList.remove('show'), 1600);
    });

    body.querySelector('.dict-copy-aspect-btn').addEventListener('click', async () => {
      const ok = await copyTextToClipboard(instanceLines);
      const note = body.querySelector('.dict-copy-aspect-note');
      note.textContent = ok ? 'Copiado ✓' : 'Não foi possível copiar';
      note.classList.add('show');
      setTimeout(() => note.classList.remove('show'), 1600);
    });

    const delBtn = body.querySelector('.dict-delete-btn');
    if (delBtn){
      delBtn.addEventListener('click', () => {
        deleteDictRowEntry(pattern, state, synastryId);
        state.texts = {};
        if (!dictionary.some(e => e.signature === pattern.signature && e.kind === pattern.kind)) row.classList.remove('has-entry');
        refreshDictRowHead(row, pattern);
        draw();
      });
    }
  }

  draw();
}

// Reconstrói o cabeçalho de uma linha já existente a partir do pattern (usado depois de
// salvar/remover um significado, pra atualizar o ponto dourado e o badge "preenchido"
// na hora, sem esperar reabrir a aba ou trocar de sinastria).
export function refreshDictRowHead(row, pattern){
  const head = row.querySelector('.dict-row-head');
  if (!head) return;
  renderDictRowHead(row, head, pattern);
}

export function saveDictRowEntry(pattern, state, synastryId){
  const hasAnyText = state.scope === 'global_all'
    ? (state.sameForAll
        ? !!(state.texts.all || '').trim()
        : !!((state.texts.romantico || '').trim() || (state.texts.amizade || '').trim() || (state.texts.familia || '').trim()))
    : !!(state.texts.single || '').trim();

  const matcher = e => e.signature === pattern.signature && e.kind === pattern.kind && e.scope === state.scope &&
    (state.scope === 'unique' ? e.synastryId === synastryId : state.scope === 'global_type' ? e.relType === state.relTypeSel : true);
  const idx = dictionary.findIndex(matcher);

  if (!hasAnyText){
    if (idx !== -1) dictionary.splice(idx, 1);
    saveDictionary();
    return;
  }

  const entry = {
    id: idx !== -1 ? dictionary[idx].id : (Date.now() + Math.random()),
    signature: pattern.signature,
    kind: pattern.kind,
    label: pattern.label,
    scope: state.scope,
    relType: state.scope === 'global_type' ? state.relTypeSel : null,
    synastryId: state.scope === 'unique' ? synastryId : null,
    sameForAll: state.scope === 'global_all' ? state.sameForAll : null,
    texts: { ...state.texts },
    updatedAt: Date.now(),
  };

  if (idx !== -1) dictionary[idx] = entry; else dictionary.push(entry);
  saveDictionary();
}

export function deleteDictRowEntry(pattern, state, synastryId){
  const matcher = e => e.signature === pattern.signature && e.kind === pattern.kind && e.scope === state.scope &&
    (state.scope === 'unique' ? e.synastryId === synastryId : state.scope === 'global_type' ? e.relType === state.relTypeSel : true);
  const idx = dictionary.findIndex(matcher);
  if (idx !== -1){ dictionary.splice(idx, 1); saveDictionary(); }
}

// Valida uma entrada de dicionário vinda de um JSON importado — só aceita o formato
// atual (assinatura + escopo + textos); qualquer coisa fora disso é ignorada em vez de
// travar a importação inteira.
export function validateImportedDictEntry(obj){
  if (!obj || typeof obj !== 'object') return null;
  if (typeof obj.signature !== 'string' || !obj.signature) return null;
  if (!['aspect','house'].includes(obj.kind)) return null;
  if (!['unique','global_all','global_type'].includes(obj.scope)) return null;
  if (!obj.texts || typeof obj.texts !== 'object') return null;
  return {
    id: (typeof obj.id === 'number' || typeof obj.id === 'string') ? obj.id : (Date.now() + Math.random()),
    signature: obj.signature,
    kind: obj.kind,
    label: typeof obj.label === 'string' ? obj.label : obj.signature,
    scope: obj.scope,
    relType: obj.scope === 'global_type' && ['romantico','amizade','familia'].includes(obj.relType) ? obj.relType : null,
    // synastryId de uma entrada "unique" só faz sentido se a sinastria correspondente
    // também existir neste navegador — se não existir, a entrada fica salva mas não
    // aparece em lugar nenhum até você importar/recriar aquela sinastria com o mesmo id.
    synastryId: obj.scope === 'unique' ? (obj.synastryId ?? null) : null,
    sameForAll: obj.scope === 'global_all' ? (obj.sameForAll !== false) : null,
    texts: {
      single: typeof obj.texts.single === 'string' ? obj.texts.single : '',
      all: typeof obj.texts.all === 'string' ? obj.texts.all : '',
      romantico: typeof obj.texts.romantico === 'string' ? obj.texts.romantico : '',
      amizade: typeof obj.texts.amizade === 'string' ? obj.texts.amizade : '',
      familia: typeof obj.texts.familia === 'string' ? obj.texts.familia : '',
    },
    updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : Date.now(),
  };
}

// Valida uma config de prompt (nomes/siglas/contexto) vinda de um JSON importado —
// aceita só o formato atual; qualquer coisa fora disso é ignorada.
export function validateImportedPromptConfig(obj){
  if (!obj || typeof obj !== 'object') return null;
  return {
    name1: typeof obj.name1 === 'string' ? obj.name1 : '',
    sigla1: typeof obj.sigla1 === 'string' ? obj.sigla1 : '',
    name2: typeof obj.name2 === 'string' ? obj.name2 : '',
    sigla2: typeof obj.sigla2 === 'string' ? obj.sigla2 : '',
    context: typeof obj.context === 'string' ? obj.context : '',
  };
}

// Importar é um MERGE por (assinatura + escopo + tipo de vínculo/sinastria): se já
// existir uma entrada igual, o arquivo importado substitui o texto dela (mais recente
// vence); senão entra como nova. Evita duplicar dicionário toda vez que você importa
// de novo um backup — diferente do import de "Comparar sinastrias" (aditivo puro), que
// não faz sentido pra deduplicar sinastrias inteiras, mas faz total sentido aqui.
// Aceita dois formatos: o antigo (uma lista pura de significados) e o atual (objeto com
// "dictionary" + "promptConfigs"), pra não quebrar backups exportados antes dos prompts
// existirem.
export function importDictionaryFromJSON(text){
  let data;
  try { data = JSON.parse(text); }
  catch(e){ alert('Esse arquivo não é um JSON válido.'); return; }

  let dictData, promptData = null;
  if (Array.isArray(data)){
    dictData = data;
  } else if (data && typeof data === 'object' && Array.isArray(data.dictionary)){
    dictData = data.dictionary;
    if (data.promptConfigs && typeof data.promptConfigs === 'object') promptData = data.promptConfigs;
  } else {
    alert('O JSON precisa estar no formato gerado pelo botão "Exportar JSON" do dicionário.');
    return;
  }

  let imported = 0, updated = 0, skipped = 0;
  dictData.forEach(raw => {
    const normalized = validateImportedDictEntry(raw);
    if (!normalized){ skipped++; return; }
    const matcher = e => e.signature === normalized.signature && e.kind === normalized.kind && e.scope === normalized.scope &&
      (normalized.scope === 'unique' ? e.synastryId === normalized.synastryId
        : normalized.scope === 'global_type' ? e.relType === normalized.relType : true);
    const idx = dictionary.findIndex(matcher);
    if (idx !== -1){ dictionary[idx] = { ...normalized, id: dictionary[idx].id }; updated++; }
    else { dictionary.push(normalized); imported++; }
  });
  saveDictionary();

  let promptImported = 0, promptSkipped = 0;
  if (promptData){
    Object.keys(promptData).forEach(key => {
      const normalized = validateImportedPromptConfig(promptData[key]);
      if (!normalized){ promptSkipped++; return; }
      promptConfigs[key] = normalized;
      promptImported++;
    });
    savePromptConfigs();
  }

  renderDictionaryForCurrentSelection();
  const skippedNote = skipped > 0 ? ` (${skipped} ignorada${skipped > 1 ? 's' : ''} por formato inválido)` : '';
  const promptNote = promptData ? ` · ${promptImported} config${promptImported === 1 ? '' : 's'} de prompt importada${promptImported === 1 ? '' : 's'}${promptSkipped > 0 ? ` (${promptSkipped} ignorada${promptSkipped>1?'s':''})` : ''}` : '';
  alert(`Importação concluída: ${imported} nova${imported === 1 ? '' : 's'}, ${updated} atualizada${updated === 1 ? '' : 's'}${skippedNote}${promptNote}.`);
}
