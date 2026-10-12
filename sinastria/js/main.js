/**
 * main.js — Ponto de entrada do app. Importa os módulos de cada aba, registra
 * todos os event listeners do index.html, e dispara o render inicial.
 * Carregado direto pelo <script type="module"> do index.html — nenhum outro
 * módulo do projeto o importa.
 * Depende de: charts.js, comparisons.js, compute.js, calibration.js,
 * dictionary.js, parser.js.
 */

import { renderCategoryVisuals, setAxisHover } from './charts.js';
import { addComparison, buildMarkerChipsHTML, comparisonsToCSV, downloadFile, exitEditMode, importComparisonsFromJSON, recalcAll, recalcAllComparisons, renderComparisons, sortedComparisons, updateComparison } from './comparisons.js';
import { classify, computeScores } from './compute.js';
import { CALIBRATION } from './calibration.js';
import { detectSiglasFromParsed, getPromptConfig, importDictionaryFromJSON, refreshDictSynastryOptions, renderDictionaryForCurrentSelection, renderPromptConfigPanel, renderPromptConfigPreview, setPromptConfigField } from './dictionary.js';
import { parseText } from './parser.js';
import { buildSinastriaTextFromPessoas } from './from-pessoas.js';
import { attachPessoaSelect, injectStyles as injectPessoaPickerStyles } from '../../assets/js/pessoa-picker.js';
import { buildReportCategoryComparativeHTML, buildReportComparativeHTML, buildReportRelationHTML, getReportOptions, getSelectedReportSynastries } from './report.js';
import { compatExplainerParts } from './scoring.js';
import { comparisons, currentDictFilter, currentDictSynastryId, dictionary, editingId, promptConfigs, saveComparisons, saveDictionary, savePromptConfigs, setComparisons, setCurrentDictFilter, setCurrentDictSynastryId, setDictionary } from './state.js';
import { autoGrowTextarea, switchMainTab } from './ui.js';

recalcAllComparisons();


document.getElementById('exportCsvBtn').addEventListener('click', () => {
  if (comparisons.length === 0){ alert('Nada pra exportar ainda — calcule pelo menos uma sinastria primeiro.'); return; }
  downloadFile('comparacao-sinastrias.csv', '\ufeff' + comparisonsToCSV(), 'text/csv;charset=utf-8;');
});

document.getElementById('exportJsonBtn').addEventListener('click', () => {
  if (comparisons.length === 0){ alert('Nada pra exportar ainda — calcule pelo menos uma sinastria primeiro.'); return; }
  downloadFile('comparacao-sinastrias.json', JSON.stringify(sortedComparisons(), null, 2), 'application/json');
});


document.getElementById('importJsonBtn').addEventListener('click', () => {
  document.getElementById('importJsonInput').click();
});
document.getElementById('importJsonInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => importComparisonsFromJSON(reader.result);
  reader.onerror = () => alert('Não consegui ler esse arquivo.');
  reader.readAsText(file);
  e.target.value = ''; // permite selecionar o mesmo arquivo de novo depois
});

document.getElementById('sortBy').addEventListener('change', renderComparisons);
document.getElementById('filterRelType').addEventListener('change', renderComparisons);
document.getElementById('recalcAllBtn').addEventListener('click', () => {
  if (comparisons.length === 0){ alert('Nada pra recalcular ainda — calcule pelo menos uma sinastria primeiro.'); return; }
  recalcAll();
});
document.getElementById('clearAllBtn').addEventListener('click', () => {
  if (comparisons.length === 0) return;
  if (confirm('Remover todas as sinastrias salvas na comparação? Essa ação não pode ser desfeita.')){
    setComparisons([]);
    saveComparisons();
    renderComparisons();
    exitEditMode();
  }
});

renderComparisons();


[['pcName1','name1'],['pcSigla1','sigla1'],['pcName2','name2'],['pcSigla2','sigla2'],['pcContext','context']].forEach(([elId, field]) => {
  document.getElementById(elId).addEventListener('input', (e) => {
    if (currentDictSynastryId === null) return;
    setPromptConfigField(currentDictSynastryId, field, e.target.value);
    renderPromptConfigPreview(getPromptConfig(currentDictSynastryId));
  });
});

document.getElementById('dictPromptCfgHead').addEventListener('click', () => {
  document.getElementById('dictPromptCfg').classList.toggle('open');
});

document.getElementById('pcDetectSiglas').addEventListener('click', () => {
  if (currentDictSynastryId === null) return;
  const c = comparisons.find(x => x.id === currentDictSynastryId);
  if (!c || !c.raw){ alert('Essa sinastria não tem o texto original salvo, então não dá pra detectar as siglas automaticamente.'); return; }
  let detected;
  try { detected = detectSiglasFromParsed(parseText(c.raw)); }
  catch(e){ alert('Não consegui ler o texto desta sinastria pra detectar as siglas.'); return; }
  if (detected.length === 0){ alert('Nenhuma sigla encontrada nos aspectos/posições desta sinastria.'); return; }
  const cfg = getPromptConfig(currentDictSynastryId);
  if (detected[0]) cfg.sigla1 = detected[0];
  if (detected[1]) cfg.sigla2 = detected[1];
  savePromptConfigs();
  renderPromptConfigPanel(currentDictSynastryId);
});

document.getElementById('dictFilterSelect').addEventListener('change', (e) => {
  setCurrentDictFilter(e.target.value);
  renderDictionaryForCurrentSelection();
});

document.getElementById('toggleAllDictBtn').addEventListener('click', (e) => {
  const rows = document.querySelectorAll('#dictionaryList .dict-row');
  if (rows.length === 0) return;
  const anyClosed = Array.from(rows).some(r => !r.classList.contains('open'));
  rows.forEach(r => {
    r.classList.toggle('open', anyClosed);
    if (anyClosed) r.querySelectorAll('.dict-text-input').forEach(ta => autoGrowTextarea(ta));
  });
  e.target.textContent = anyClosed ? 'Colapsar tudo' : 'Expandir tudo';
});


document.getElementById('dictShowZeroed').addEventListener('change', renderDictionaryForCurrentSelection);

document.getElementById('dictSynastrySelect').addEventListener('change', (e) => {
  setCurrentDictSynastryId(Number(e.target.value));
  renderDictionaryForCurrentSelection();
});

document.getElementById('tabBtnCalc').addEventListener('click', () => switchMainTab('calcTab'));
document.getElementById('tabBtnDict').addEventListener('click', () => switchMainTab('dictTab'));
document.getElementById('tabBtnReport').addEventListener('click', () => switchMainTab('reportTab'));


document.getElementById('clearAllDictBtn').addEventListener('click', () => {
  if (dictionary.length === 0) return;
  if (confirm(`Apagar todo o dicionário (${dictionary.length} significado${dictionary.length === 1 ? '' : 's'} — inclusive os reutilizáveis, de todas as sinastrias)? Essa ação não pode ser desfeita.`)){
    setDictionary([]);
    saveDictionary();
    renderDictionaryForCurrentSelection();
  }
});
document.getElementById('clearSynastryDictBtn').addEventListener('click', () => {
  if (!currentDictSynastryId) return;
  const toRemove = dictionary.filter(e => e.scope === 'unique' && e.synastryId === currentDictSynastryId);
  if (toRemove.length === 0){
    alert('Essa sinastria não tem nenhum significado exclusivo cadastrado — só os reutilizáveis se aplicam a ela, e esses continuam intactos.');
    return;
  }
  if (confirm(`Remover ${toRemove.length} significado${toRemove.length === 1 ? '' : 's'} cadastrado${toRemove.length === 1 ? '' : 's'} só para esta sinastria? Os reutilizáveis (para todos os vínculos ou para a categoria dela) continuam valendo.`)){
    dictionary = dictionary.filter(e => !(e.scope === 'unique' && e.synastryId === currentDictSynastryId));
    saveDictionary();
    renderDictionaryForCurrentSelection();
  }
});
document.getElementById('exportDictBtn').addEventListener('click', () => {
  if (dictionary.length === 0 && Object.keys(promptConfigs).length === 0){
    alert('Nada pra exportar ainda — cadastre pelo menos um significado ou uma config de prompt primeiro.');
    return;
  }
  const payload = { dictionary, promptConfigs };
  downloadFile('dicionario-significados.json', JSON.stringify(payload, null, 2), 'application/json');
});
document.getElementById('importDictBtn').addEventListener('click', () => {
  document.getElementById('importDictInput').click();
});
document.getElementById('importDictInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => importDictionaryFromJSON(reader.result);
  reader.onerror = () => alert('Não consegui ler esse arquivo.');
  reader.readAsText(file);
  e.target.value = '';
});

function runSynastryCalculation(){
  const viewBannerEl = document.getElementById('viewBanner');
  viewBannerEl.style.display = 'none';
  viewBannerEl.innerHTML = '';

  const raw = document.getElementById('raw').value;
  const errEl = document.getElementById('errorMsg');
  errEl.style.display = 'none';

  if (!raw.trim()){
    errEl.textContent = 'Cole o texto da sinastria antes de calcular.';
    errEl.style.display = 'block';
    return;
  }

  const parsed = parseText(raw);
  if (parsed.aspects.length === 0){
    errEl.textContent = 'Não consegui reconhecer nenhum aspecto no texto colado. Confira se o formato é o mesmo do relatório de sinastria (ex: "A\'s Sun in Cancer Trine B\'s Moon in Pisces (Orb: 2°30\')").';
    errEl.style.display = 'block';
    return;
  }

  // auto-detect names if fields empty
  let n1 = document.getElementById('name1').value.trim();
  let n2 = document.getElementById('name2').value.trim();
  const headerMatch = raw.match(/Sinastria(?: entre)?\s*\(?([A-Za-zÀ-ÿ0-9 ]+?)\s+e\s+([A-Za-zÀ-ÿ0-9 ]+?)\)?\s*:/i);
  if (!n1 || !n2){
    if (headerMatch){
      n1 = n1 || headerMatch[1].trim();
      n2 = n2 || headerMatch[2].trim();
    } else {
      n1 = n1 || parsed.aspects[0].p1;
      n2 = n2 || parsed.aspects[0].p2;
    }
    document.getElementById('name1').value = n1;
    document.getElementById('name2').value = n2;
  }

  const relType = document.getElementById('relType').value;

  const {
    categoryScores, harmonyPct, strength, strengthHarmonic, strengthTense, structureWeight, destinyWeight,
    immediateHarmonyPct, structureHarmonyPct, destinyHarmonyPct, compatibilityScore, potentialScore: freshPotential,
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
  } = computeScores(parsed, relType);

  document.getElementById('rName1').textContent = n1;
  document.getElementById('rName2').textContent = n2;
  document.getElementById('metaLine').textContent =
    `${parsed.aspects.length} aspectos e ${parsed.houses.length} sobreposições de casa interpretados`;

  const confidenceEl = document.getElementById('confidenceNote');
  if (parsed.aspects.length < CALIBRATION.minAspectsForConfidence){
    confidenceEl.textContent = `⚠ Leitura baseada em poucos aspectos (${parsed.aspects.length}) — com uma amostra pequena, 1 ou 2 contatos isolados pesam mais do que deveriam, e o resultado pode mudar bastante se você colar o relatório completo.`;
    confidenceEl.style.display = 'block';
  } else {
    confidenceEl.textContent = '';
    confidenceEl.style.display = 'none';
  }

  renderCategoryVisuals(categoryScores, relType);

  document.getElementById('strengthVal').textContent = strength;
  { const _ce = compatExplainerParts(relType);
    document.getElementById('compatExplainerSummary').textContent = _ce.summary;
    document.getElementById('compatExplainerBody').innerHTML = _ce.bodyHTML; }
  document.getElementById('compatVal').textContent = compatibilityScore !== null ? compatibilityScore + '%' : '—';
  document.getElementById('potentialVal').textContent = freshPotential != null ? freshPotential : '—';
  document.getElementById('destinyVal').textContent = destinyHarmonyPct !== null ? destinyHarmonyPct + '%' : '—';
  document.getElementById('structureVal').textContent = structureHarmonyPct !== null ? structureHarmonyPct + '%' : '—';
  setAxisHover('destinyVal', destinyHarmonicDetails, destinyTenseDetails, destinyAmbivalentDetails);
  setAxisHover('structureVal', structureHarmonicDetails, structureTenseDetails, structureAmbivalentDetails);
  document.getElementById('harmonyVal').textContent = harmonyPct + '%';

  const compatNoteEl = document.getElementById('compatNote');
  if (compatibilityScore === null){
    compatNoteEl.textContent = '⚠ Sinal insuficiente pra calcular uma Compatibilidade Geral confiável — cole o relatório completo pra destravar esse número.';
    compatNoteEl.style.display = 'block';
  } else {
    compatNoteEl.textContent = '';
    compatNoteEl.style.display = 'none';
  }

  const verdict = classify({ categoryScores, harmonyPct, strength, relType, immediateHarmonyPct, structureHarmonyPct });
  document.getElementById('verdictTitle').textContent = verdict.title;
  document.getElementById('verdictDesc').textContent = verdict.desc;

  const markersEl = document.getElementById('markers');
  const markerChips = buildMarkerChipsHTML({
    isLuminarySwap, luminarySwapDetail, luminarySwapCategory,
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
  });
  if (markerChips.hasContent){
    markersEl.innerHTML = markerChips.html;
    markersEl.style.display = 'flex';
  } else {
    markersEl.innerHTML = '';
    markersEl.style.display = 'none';
  }

  const debug = document.getElementById('debugContent');
  debug.innerHTML = `<ul>
    <li>Aspectos reconhecidos: ${parsed.aspects.length}</li>
    <li>Casas reconhecidas: ${parsed.houses.length}</li>
    <li>Peso harmônico: ${harmonyPct}% · Nitidez bruta: ${strength}</li>
    ${parsed.duplicatesRemoved > 0 ? `<li>Aspectos duplicados ignorados (contados só uma vez): ${parsed.duplicatesRemoved}</li>` : ''}
    ${((parsed.nodeMirrorsCollapsed||0) + (parsed.ascDscMirrorsCollapsed||0) + (parsed.mcIcMirrorsCollapsed||0)) > 0 ? `<li>Ecos de eixo colapsados (Nodo Norte/Sul, Ascendente/Descendente, MC/IC contados só uma vez): ${(parsed.nodeMirrorsCollapsed||0) + (parsed.ascDscMirrorsCollapsed||0) + (parsed.mcIcMirrorsCollapsed||0)}</li>` : ''}
    ${parsed.unrecognizedCount > 0 ? `<li style="color:var(--rose)">⚠ ${parsed.unrecognizedCount} linha(s) com "Orb:" não reconhecida(s) (aspecto ou formato fora do padrão suportado) — não entraram no cálculo</li>` : ''}
  </ul>`;

  document.getElementById('results').style.display = 'block';
  document.getElementById('results').scrollIntoView({ behavior:'smooth', block:'start' });

  const entryData = {
    n1, n2, raw, relType,
    categoryScores, harmonyPct, strength, strengthHarmonic, strengthTense, structureWeight, destinyWeight,
    immediateHarmonyPct, structureHarmonyPct, destinyHarmonyPct, compatibilityScore, potentialScore: freshPotential,
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

  let synastryId;
  if (editingId !== null){
    synastryId = editingId;
    updateComparison(editingId, entryData);
    exitEditMode();
  } else {
    synastryId = Date.now();
    addComparison({ id: synastryId, ts: synastryId, ...entryData });
  }

  setCurrentDictSynastryId(synastryId);
  refreshDictSynastryOptions();
}

document.getElementById('calcBtn').addEventListener('click', runSynastryCalculation);

// ---------- Importação vinda da Efemérides (botão "Abrir na Sinastria com estes dados") ----------
// A aba Sinastria da página de Efemérides já calcula os mapas e monta o texto de
// aspectos; em vez de duplicar esse motor aqui, só lemos o que ela deixou em
// localStorage (chave 'synastry:pendingImport'), preenchemos o textarea de colagem
// e dos nomes, e disparamos o mesmo cálculo que rodaria se a pessoa tivesse colado
// o texto manualmente. Consumido uma vez só (removido do storage logo em seguida)
// pra não reaplicar em toda visita futura.
(function importPendingSynastryFromEfemerides(){
  let pending;
  try {
    const stored = localStorage.getItem('synastry:pendingImport');
    if (!stored) return;
    pending = JSON.parse(stored);
  } catch (e) {
    return;
  }
  localStorage.removeItem('synastry:pendingImport');
  if (!pending || !pending.text) return;

  document.getElementById('raw').value = pending.text;
  autoGrowTextarea(document.getElementById('raw'));
  if (pending.name1) document.getElementById('name1').value = pending.name1;
  if (pending.name2) document.getElementById('name2').value = pending.name2;

  const viewBannerEl = document.getElementById('viewBanner');
  viewBannerEl.textContent = '↳ Dados recebidos da Efemérides — cálculo rodado automaticamente. Você pode editar o texto acima e recalcular a qualquer momento.';
  viewBannerEl.style.display = 'block';

  runSynastryCalculation();
})();

// ---------- Toggle "Colar texto manualmente" / "Usar pessoas cadastradas" ----------
// Alterna qual painel de origem dos dados fica visível. A classe .active nos
// botões e o display dos dois painéis ficam sempre em sincronia com a fonte
// atual, chamada de setSource() tanto pelo clique nos botões quanto depois de
// calcular a partir do cadastro (pra revelar o texto já preenchido).
const sourceToggleColarBtn = document.getElementById('sourceToggleColar');
const sourceToggleCadastroBtn = document.getElementById('sourceToggleCadastro');
const colarTextoPanelEl = document.getElementById('colarTextoPanel');
const pessoasCadastradasPanelEl = document.getElementById('pessoasCadastradasPanel');

function setSource(source) {
  const isColar = source === 'colar';
  sourceToggleColarBtn.classList.toggle('active', isColar);
  sourceToggleCadastroBtn.classList.toggle('active', !isColar);
  colarTextoPanelEl.style.display = isColar ? '' : 'none';
  pessoasCadastradasPanelEl.style.display = isColar ? 'none' : '';
}

sourceToggleColarBtn.addEventListener('click', () => setSource('colar'));
sourceToggleCadastroBtn.addEventListener('click', () => setSource('cadastro'));

// ---------- Painel "Usar pessoas cadastradas" ----------
// Alternativa à colagem manual: escolhendo duas pessoas do cadastro (o mesmo
// cadastro usado em Mapas Astrais), calcula os dois mapas na hora, monta o
// mesmo texto-ponte que mapas.html gera hoje e roda pelo mesmíssimo
// parseText/pontuação de sempre — nada da lógica de cálculo se duplica, só o
// motor de efemerides passa a ser importado também aqui (ver from-pessoas.js).
// A colagem manual continua funcionando lado a lado, sem nenhuma mudança.
injectPessoaPickerStyles();
let _pessoaSelA = null, _pessoaSelB = null;
const pessoaSelectAEl = document.getElementById('pessoaSelectA');
const pessoaSelectBEl = document.getElementById('pessoaSelectB');
const pessoaSiglaAEl = document.getElementById('pessoaSiglaA');
const pessoaSiglaBEl = document.getElementById('pessoaSiglaB');
attachPessoaSelect(pessoaSelectAEl, { onSelect: (p) => { _pessoaSelA = p; pessoaSiglaAEl.value = p.sigla || ''; } });
attachPessoaSelect(pessoaSelectBEl, { onSelect: (p) => { _pessoaSelB = p; pessoaSiglaBEl.value = p.sigla || ''; } });

document.getElementById('calcFromPessoasBtn').addEventListener('click', () => {
  const msgEl = document.getElementById('pessoasCadastradasMsg');
  msgEl.style.color = '';
  if (!_pessoaSelA || !_pessoaSelB){ msgEl.textContent = 'Escolha as duas pessoas primeiro.'; msgEl.style.color = 'var(--rose)'; return; }
  if (_pessoaSelA.id === _pessoaSelB.id){ msgEl.textContent = 'Escolha duas pessoas diferentes.'; msgEl.style.color = 'var(--rose)'; return; }

  // Sigla do campo (se preenchida) prevalece sobre a sigla salva no cadastro —
  // passamos uma cópia da pessoa com a sigla sobrescrita pra não mexer no
  // registro original nem em from-pessoas.js.
  const siglaAOverride = pessoaSiglaAEl.value.trim();
  const siglaBOverride = pessoaSiglaBEl.value.trim();
  const pessoaAForCalc = siglaAOverride ? { ..._pessoaSelA, sigla: siglaAOverride } : _pessoaSelA;
  const pessoaBForCalc = siglaBOverride ? { ..._pessoaSelB, sigla: siglaBOverride } : _pessoaSelB;

  const built = buildSinastriaTextFromPessoas(pessoaAForCalc, pessoaBForCalc);
  if (!built){ msgEl.textContent = 'Faltam dados de nascimento em alguma das duas pessoas.'; msgEl.style.color = 'var(--rose)'; return; }

  document.getElementById('raw').value = built.text;
  autoGrowTextarea(document.getElementById('raw'));
  document.getElementById('name1').value = built.nameA;
  document.getElementById('name2').value = built.nameB;

  const warn = built.warningA || built.warningB;
  msgEl.textContent = warn ? warn : 'Calculado a partir do cadastro. Você pode editar o texto abaixo e recalcular quando quiser.';

  runSynastryCalculation();
  setSource('colar');
});

// ---------- Aba de Relatório ----------
// A aba lê a mesma lista `comparisons` já usada na aba de Comparação, deixa marcar
// quais entrar no PDF (via checklist) e monta um HTML autocontido dentro de
// #reportPrintArea, que só aparece na tela quando a página está em modo impressão
// (ver @media print no CSS). Gerar o PDF de fato é responsabilidade do navegador —
// chamamos window.print() e a pessoa escolhe "Salvar como PDF" no destino.


document.getElementById('reportSelectAllBtn').addEventListener('click', () => {
  document.querySelectorAll('#reportSynastryList input[type=checkbox]').forEach(cb => cb.checked = true);
});
document.getElementById('reportSelectNoneBtn').addEventListener('click', () => {
  document.querySelectorAll('#reportSynastryList input[type=checkbox]').forEach(cb => cb.checked = false);
});
document.getElementById('reportOptsSelectAllBtn').addEventListener('click', () => {
  document.querySelectorAll('.report-options-list input[type=checkbox]').forEach(cb => cb.checked = true);
});
document.getElementById('reportOptsSelectNoneBtn').addEventListener('click', () => {
  document.querySelectorAll('.report-options-list input[type=checkbox]').forEach(cb => cb.checked = false);
});


document.getElementById('generateReportBtn').addEventListener('click', () => {
  const errEl = document.getElementById('reportError');
  errEl.style.display = 'none';
  errEl.textContent = '';

  const selected = getSelectedReportSynastries();
  if (selected.length === 0){
    errEl.textContent = 'Selecione ao menos uma sinastria pra gerar o relatório.';
    errEl.style.display = 'block';
    return;
  }

  const opts = getReportOptions();
  const showComparative = opts.comparativo && selected.length >= 2;
  const hasAnyContent = opts.resumo || opts.numeros || opts.categorias || opts.marcadores || opts.significados || showComparative;
  if (!hasAnyContent){
    errEl.textContent = 'Marque ao menos um item em "O que incluir no relatório".';
    errEl.style.display = 'block';
    return;
  }

  let html = `<div class="rprint">
    <div class="rprint-cover">
      <h1>${selected.length === 1 ? 'Relatório de sinastria' : 'Relatório de sinastrias'}</h1>
      <div class="sub">${selected.length} relaç${selected.length === 1 ? 'ão' : 'ões'} · gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
    </div>`;
  if (showComparative) html += buildReportComparativeHTML(selected) + buildReportCategoryComparativeHTML(selected);
  html += selected.map(c => buildReportRelationHTML(c, opts)).join('');
  html += `</div>`;

  const area = document.getElementById('reportPrintArea');
  area.innerHTML = html;
  // <details> (usados noutras partes da tela) nascem fechados por padrão — aqui não
  // usamos nenhum, mas por segurança, se algum dia entrar um, força aberto pra não
  // sumir conteúdo na impressão.
  area.querySelectorAll('details').forEach(d => d.open = true);

  // pequeno atraso pra garantir que o browser terminou de aplicar o innerHTML antes
  // de abrir o diálogo de impressão.
  setTimeout(() => window.print(), 50);
});
