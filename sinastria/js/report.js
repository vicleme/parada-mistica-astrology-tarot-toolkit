/**
 * report.js — Lógica da aba Relatório: monta o HTML comparativo entre duas ou
 * mais sinastrias salvas selecionadas.
 * Depende de: comparisons.js, compute.js, labels.js, pairs.js, dictionary.js,
 * parser.js, state.js.
 * Usado por: main.js, ui.js.
 */

import { escapeHtml } from './comparisons.js';
import { catMetaFor, classify } from './compute.js';
import { CATEGORY_HARMONIC_COLOR, GROUP_META, REL_TYPE_LABEL_PT } from './labels.js';
import { CATEGORY_KEYS } from './pairs.js';
import { buildDictionaryPatterns, dictSelectLabel, findBestDictEntry } from './dictionary.js';
import { parseText } from './parser.js';
import { comparisons, reportCheckedIds, reportKnownIds } from './state.js';

export function renderReportSynastryList(){
  const container = document.getElementById('reportSynastryList');
  // salva o estado atual da tela antes de redesenhar, senão a própria re-renderização
  // apagaria as escolhas da pessoa.
  container.querySelectorAll('input[type=checkbox]').forEach(cb => {
    const id = Number(cb.value);
    if (cb.checked) reportCheckedIds.add(id); else reportCheckedIds.delete(id);
  });
  if (comparisons.length === 0){
    container.innerHTML = '<div class="dict-empty">Calcule ao menos uma sinastria na aba Calculadora pra gerar um relatório.</div>';
    return;
  }
  const sorted = [...comparisons].sort((a,b) => dictSelectLabel(a).localeCompare(dictSelectLabel(b), 'pt-BR', { sensitivity:'base' }));
  sorted.forEach(c => {
    if (!reportKnownIds.has(c.id)){
      reportKnownIds.add(c.id);
      reportCheckedIds.add(c.id); // sinastria nova entra marcada, "tudo marcado por padrão"
    }
  });
  container.innerHTML = sorted.map(c => `
    <label class="report-check-item">
      <input type="checkbox" value="${c.id}" ${reportCheckedIds.has(c.id) ? 'checked' : ''}>
      ${escapeHtml(dictSelectLabel(c))}
    </label>`).join('');
}
export function getSelectedReportSynastries(){
  const container = document.getElementById('reportSynastryList');
  const ids = Array.from(container.querySelectorAll('input[type=checkbox]:checked')).map(cb => Number(cb.value));
  // mantém a ordem de cálculo (mais antiga primeiro), não a ordem alfabética da lista
  return comparisons.filter(c => ids.includes(c.id)).sort((a,b) => (a.ts||0) - (b.ts||0));
}

export function getReportOptions(){
  return {
    resumo: document.getElementById('repSecResumo').checked,
    numeros: document.getElementById('repSecNumeros').checked,
    categorias: document.getElementById('repSecCategorias').checked,
    marcadores: document.getElementById('repSecMarcadores').checked,
    significados: document.getElementById('repSecSignificados').checked,
    comparativo: document.getElementById('repSecComparativo').checked,
  };
}

// Resolve o texto de uma entrada do dicionário pro relType da sinastria em questão —
// mesma regra usada no editor do dicionário (ver initDictRowBody/saveDictRowEntry):
// escopo 'unique'/'global_type' guardam um texto só (texts.single); escopo
// 'global_all' guarda um texto único (texts.all) OU um texto por tipo de vínculo,
// dependendo de sameForAll.
export function getDictEntryText(entry, relType){
  if (!entry) return '';
  if (entry.scope === 'global_all'){
    return entry.sameForAll ? (entry.texts.all || '') : (entry.texts[relType] || '');
  }
  return entry.texts.single || '';
}

export function buildReportVerdictHTML(c){
  const relType = c.relType || 'romantico';
  const verdict = c.categoryScores
    ? classify({ categoryScores: c.categoryScores, harmonyPct: c.harmonyPct, strength: c.strength, relType, immediateHarmonyPct: c.immediateHarmonyPct, structureHarmonyPct: c.structureHarmonyPct })
    : { title: c.verdictTitle || '', desc: 'Essa entrada foi calculada com um modelo de categoria antigo — recalcule na aba Comparação pra ver a descrição completa.' };
  const vinculoHtml = c.vinculoProfile ? `<div class="rprint-vinculo">💍 <strong>${escapeHtml(c.vinculoProfile.label)}</strong>${c.vinculoProfile.destinyNote ? `<div class="rprint-vinculo-note">☊ ${escapeHtml(c.vinculoProfile.destinyNote)}</div>` : ''}</div>` : '';
  return `${vinculoHtml}<div class="rprint-verdict-title">${escapeHtml(c.verdictTitle || verdict.title)}</div><div class="rprint-verdict-desc">${escapeHtml(verdict.desc)}</div>`;
}

export function buildReportStatsHTML(c){
  const compat = c.compatibilityScore != null ? c.compatibilityScore + '%' : '—';
  const potential = c.potentialScore != null ? c.potentialScore : '—';
  const harmony = c.harmonyPct != null ? c.harmonyPct + '%' : '—';
  const structure = c.structureHarmonyPct != null ? c.structureHarmonyPct + '%' : '—';
  const destiny = c.destinyHarmonyPct != null ? c.destinyHarmonyPct + '%' : '—';
  const strength = c.strength != null ? c.strength : '—';
  const stat = (v, l, hl) => `<div class="rprint-stat${hl ? ' highlight' : ''}"><div class="v">${v}</div><div class="l">${l}</div></div>`;
  return `<div class="rprint-stats-grid">${stat(compat,'Compatibilidade')}${stat(harmony,'Harmonia')}${stat(structure,'Estrutura')}${stat(destiny,'Destino')}${stat(strength,'Nitidez')}${stat(potential,'Veredito',true)}</div>`;
}

export function buildReportCategoryHTML(categoryScores, relType){
  if (!categoryScores) return '<p class="rprint-empty-note">Categorias não disponíveis para esta entrada (modelo antigo) — recalcule na aba Comparação.</p>';
  const catMeta = catMetaFor(relType);
  return CATEGORY_KEYS.map(key => {
    const meta = catMeta[key];
    const d = categoryScores[key] || { presence:0, harmonyPct:null, eligibleCount:0 };
    const valLabel = d.eligibleCount === 0 ? 'sem marcadores' : (d.harmonyPct !== null ? `presença ${d.presence} · ${d.harmonyPct}% favorável` : '—');
    const harmWidth = d.harmonyPct !== null ? (d.presence * d.harmonyPct / 100) : 0;
    const tenseWidth = d.harmonyPct !== null ? (d.presence * (100 - d.harmonyPct) / 100) : 0;
    return `<div class="rprint-cat-row">
      <div class="rprint-cat-label">${escapeHtml(meta.label)}</div>
      <div class="rprint-cat-bar-track"><div class="rprint-cat-fill" style="width:${harmWidth}%; background:${CATEGORY_HARMONIC_COLOR}"></div><div class="rprint-cat-fill" style="width:${tenseWidth}%; background:#c9707a"></div></div>
      <div class="rprint-cat-pct">${valLabel}</div>
    </div>`;
  }).join('');
}

// Espelha buildMarkerChipItems (usada na UI interativa), mas devolve título/detalhe/nota
// como texto puro em vez de HTML de chip — o layout de impressão (.rprint-marker-item)
// é fixo e não precisa do <details> retrátil da tela.
export function reportMarkerItems(c){
  const items = [];
  const push = (group, count, title, detailLines, note) => items.push({ group, count, title, detail: (detailLines||[]).join('\n'), note: note || '' });
  if (c.isLuminarySwap){
    push(4, 0, '☉☾ Câmbio de luminares', [c.luminarySwapDetail || ''], 'O Sol de cada um cai no signo da Lua do outro — indício clássico de reconhecimento emocional profundo entre os dois.');
  }
  if ((c.saturnCommitmentContacts||0) > 0) push(1, c.saturnCommitmentContacts, `♄ Saturno · compromisso (${c.saturnCommitmentContacts})`, c.saturnCommitmentDetails, 'Também conta para a categoria Prático.');
  if ((c.nodeDestinyContacts||0) > 0) push(2, c.nodeDestinyContacts, `☊ Nodo · eixo do destino (${c.nodeDestinyContacts})`, c.nodeDestinyDetails, 'Também conta para a categoria Prático.');
  if ((c.nodeAxisContacts||0) > 0) push(2, c.nodeAxisContacts, `☊☊ Nodo/Vértice · eixo Destino mútuo (${c.nodeAxisContacts})`, c.nodeAxisDetails, 'Também conta para a categoria Prático.');
  if ((c.vertexFatedContacts||0) > 0) push(2, c.vertexFatedContacts, `✧ Vértice · encontro (${c.vertexFatedContacts})`, c.vertexFatedDetails, 'Também conta para a categoria Prático.');
  if ((c.chironWoundContacts||0) > 0) push(1, c.chironWoundContacts, `⚷ Quíron (${c.chironWoundContacts})`, c.chironWoundDetails, 'Contatos Quíron-Lua também contam para a categoria Emocional.');
  if ((c.lilithMagneticContacts||0) > 0) push(3, c.lilithMagneticContacts, `⚸ Lilith (${c.lilithMagneticContacts})`, c.lilithMagneticDetails, '');
  if ((c.sunTranspersonalContacts||0) > 0) push(3, c.sunTranspersonalContacts, `☉⚡ Sol transpessoal (${c.sunTranspersonalContacts})`, c.sunTranspersonalDetails, '');
  if ((c.fortuneContacts||0) > 0) push(3, c.fortuneContacts, `🍀 Fortuna (${c.fortuneContacts})`, c.fortuneDetails, '');
  if ((c.espiritoContacts||0) > 0) push(3, c.espiritoContacts, `⊕ Espírito (${c.espiritoContacts})`, c.espiritoDetails, '');
  if ((c.sunMoonContacts||0) > 0) push(1, c.sunMoonContacts, `☉☾ Sol-Lua · eixo de reconhecimento (${c.sunMoonContacts})`, c.sunMoonDetails, 'Também conta para a categoria Emocional.');
  if ((c.houseConvergenceContacts||0) > 0) push(4, c.houseConvergenceContacts, `⌂ Casas · convergência (${c.houseConvergenceContacts})`, c.houseConvergenceDetails, '');
  if ((c.commitmentHouseContacts||0) > 0) push(1, c.commitmentHouseContacts, `🏠 Casas · estrutura de parceria (${c.commitmentHouseContacts})`, c.commitmentHouseDetails, '');
  if ((c.destinyHouseContacts||0) > 0) push(2, c.destinyHouseContacts, `☊ Casas · eixo Destino (${c.destinyHouseContacts})`, c.destinyHouseDetails, '');
  if ((c.friendshipHouseContacts||0) > 0) push(3, c.friendshipHouseContacts, `🧑‍🤝‍🧑 Casas · círculo social (${c.friendshipHouseContacts})`, c.friendshipHouseDetails, '');
  if ((c.chironPartnershipHouseContacts||0) > 0) push(3, c.chironPartnershipHouseContacts, `⚷ Quíron · ferida na parceria (7ª) (${c.chironPartnershipHouseContacts})`, c.chironPartnershipHouseDetails, '');
  if ((c.plutoPartnershipHouseContacts||0) > 0) push(3, c.plutoPartnershipHouseContacts, `♇ Plutão · intensidade na parceria (7ª) (${c.plutoPartnershipHouseContacts})`, c.plutoPartnershipHouseDetails, '');
  return items;
}

export function buildReportMarkersHTML(c){
  const items = reportMarkerItems(c);
  const vinculo = c.vinculoProfile
    ? `<div class="rprint-marker-item"><div class="mtitle">💍 Perfil de vínculo · ${escapeHtml(c.vinculoProfile.label)}</div><div class="mdetail">${escapeHtml(c.vinculoProfile.description || '')}${(c.vinculoProfile.signals && c.vinculoProfile.signals.length) ? '\n\n' + escapeHtml(c.vinculoProfile.signals.join('\n')) : ''}</div></div>`
    : '';
  if (!vinculo && items.length === 0) return '<p class="rprint-empty-note">Nenhum marcador narrativo identificado nesta sinastria.</p>';
  let html = vinculo;
  for (const groupId of [1,2,3,4]){
    const groupItems = items.filter(i => i.group === groupId);
    if (!groupItems.length) continue;
    groupItems.sort((a,b) => b.count - a.count);
    const meta = GROUP_META[groupId];
    html += `<div class="rprint-marker-group"><div class="rprint-marker-group-title">${meta.icon} ${meta.label}</div>` +
      groupItems.map(i => `<div class="rprint-marker-item"><div class="mtitle">${escapeHtml(i.title)}</div>${i.detail ? `<div class="mdetail">${escapeHtml(i.detail)}</div>` : ''}${i.note ? `<div class="mnote">${escapeHtml(i.note)}</div>` : ''}</div>`).join('') +
      `</div>`;
  }
  return html;
}

export function buildReportDictHTML(c){
  if (!c.raw) return '<p class="rprint-empty-note">Esta sinastria não tem o texto original salvo, então não dá pra recalcular os padrões dela aqui.</p>';
  const relType = c.relType || 'romantico';
  const parsed = parseText(c.raw);
  const patterns = buildDictionaryPatterns(parsed);
  const withEntries = patterns
    .map(p => ({ p, entry: findBestDictEntry(p.signature, relType, c.id) }))
    .filter(x => x.entry && getDictEntryText(x.entry, relType).trim());
  if (withEntries.length === 0) return '<p class="rprint-empty-note">Nenhum significado cadastrado no dicionário para os padrões desta sinastria.</p>';
  return withEntries.map(({ p, entry }) => `<div class="rprint-dict-item"><div class="dtitle">${escapeHtml(p.label)}</div><div class="dtext">${escapeHtml(getDictEntryText(entry, relType))}</div></div>`).join('');
}

export function buildReportRelationHTML(c, opts){
  const relType = c.relType || 'romantico';
  let html = `<div class="rprint-relation">
    <div class="rprint-relation-title">${escapeHtml(c.n1)} &amp; ${escapeHtml(c.n2)}</div>
    <div class="rprint-relation-meta">${escapeHtml(REL_TYPE_LABEL_PT[relType] || relType)} · ${c.aspectsCount||0} aspectos · ${c.housesCount||0} sobreposições de casa</div>`;
  if (opts.resumo) html += `<div class="rprint-block"><h3>Perfil e veredito</h3>${buildReportVerdictHTML(c)}</div>`;
  if (opts.numeros) html += `<div class="rprint-block"><h3>Números principais</h3>${buildReportStatsHTML(c)}</div>`;
  if (opts.categorias) html += `<div class="rprint-block"><h3>Categorias</h3>${buildReportCategoryHTML(c.categoryScores, relType)}</div>`;
  if (opts.marcadores) html += `<div class="rprint-block"><h3>Marcadores narrativos</h3>${buildReportMarkersHTML(c)}</div>`;
  if (opts.significados) html += `<div class="rprint-block"><h3>Significados cadastrados</h3>${buildReportDictHTML(c)}</div>`;
  html += `</div>`;
  return html;
}

export function buildReportComparativeHTML(list){
  const rows = list.map(c => ({
    c,
    compat: c.compatibilityScore, potential: c.potentialScore, harmony: c.harmonyPct,
    structure: c.structureHarmonyPct, destiny: c.destinyHarmonyPct, strength: c.strength,
  }));
  const maxOf = (key) => {
    const vals = rows.map(r => r[key]).filter(v => v != null);
    return vals.length ? Math.max(...vals) : null;
  };
  const maxCompat = maxOf('compat'), maxPotential = maxOf('potential'), maxHarmony = maxOf('harmony'),
        maxStructure = maxOf('structure'), maxDestiny = maxOf('destiny'), maxStrength = maxOf('strength');
  const cell = (v, max, suffix) => v != null ? `<td class="${max != null && v === max ? 'hl' : ''}">${v}${suffix||''}</td>` : '<td>—</td>';
  const headRow = `<tr><th>Relação</th><th>Vínculo</th><th>Compat.</th><th>Harmonia</th><th>Estrutura</th><th>Destino</th><th>Nitidez</th><th>Veredito</th></tr>`;
  const bodyRows = rows.map(r => `<tr>
    <td>${escapeHtml(r.c.n1)} &amp; ${escapeHtml(r.c.n2)}</td>
    <td>${r.c.vinculoProfile ? escapeHtml(r.c.vinculoProfile.label) : escapeHtml(r.c.verdictTitle || '—')}</td>
    ${cell(r.compat, maxCompat, '%')}
    ${cell(r.harmony, maxHarmony, '%')}
    ${cell(r.structure, maxStructure, '%')}
    ${cell(r.destiny, maxDestiny, '%')}
    ${cell(r.strength, maxStrength, '')}
    ${cell(r.potential, maxPotential, '')}
  </tr>`).join('');
  return `<div class="rprint-compare"><h2>Comparativo entre as sinastrias selecionadas</h2><table class="rprint-compare-table"><thead>${headRow}</thead><tbody>${bodyRows}</tbody></table></div>`;
}

// Mesmo grid de "Marcadores por área" (barras por categoria) que aparece na aba de
// Comparação da calculadora, um bloco por relação — pedido explícito pra poder ver de
// cara a diferença de categorias entre as sinastrias selecionadas, sem precisar abrir
// cada bloco "Categorias" individual mais abaixo no relatório.
export function buildReportCategoryComparativeHTML(list){
  const items = list.map(c => `
    <div class="rprint-cat-compare-item">
      <div class="rprint-cat-compare-name">${escapeHtml(c.n1)} &amp; ${escapeHtml(c.n2)}</div>
      ${buildReportCategoryHTML(c.categoryScores, c.relType || 'romantico')}
    </div>`).join('');
  return `<div class="rprint-compare"><h2>Categorias por relação</h2>${items}</div>`;
}
