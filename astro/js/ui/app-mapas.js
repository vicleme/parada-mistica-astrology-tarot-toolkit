// ============================================================================
// ui/app-mapas.js
// Ponto de entrada da página mapas.html (Mapa Natal / Sinastria / Composto /
// Pessoas). Ver comentário original em app.js (agora
// astro/js/ui/app-efemerides.js) sobre por que as funções são expostas
// em window.*.
// ============================================================================

import {
  applyNatalInput, calcNatal, clearNatalStorage, collectNatalInput, exportNatalInput, fillNow, fillPreset,
  importNatalInput, pickCity, searchCity, setMode, toggleImportBox, updateRangeWarn,
  loadNatalFromStorage, copyNatalForAI, downloadNatalMd, toggleNatalDetailTables,
} from '../features/natal.js';

import {
  applySynInput, calcSynPerson, calcSynastry, clearSynStorage, copyForSinastriaCalc, copySynForAI,
  downloadSynMd, exportSynCsv, exportSynInput, exportSynJson, importSynInput, openInSinastriaCalc, pickCityFor,
  renderSynAspectsTable, searchCityFor, toggleSynImportBox, loadSynFromStorage,
  synChartA, synChartB,
} from '../features/synastry.js';

import {
  calcComposite, copyCompositeChartForAI, downloadCompositeChartMd, toggleCompositeDetailTables,
} from '../features/composite.js';

import { renderProfile } from '../features/profile.js';
import {
  populateProfileCompareSortSelect, removeProfileComparison, renderProfileComparisons, saveProfileForComparison,
} from '../features/profile-comparisons.js';

import { savePessoa } from '../../../assets/js/pessoas.js';
import { attachPessoaSelect, injectStyles as injectPessoaPickerStyles, openPessoaModal, renderPessoasList } from '../../../assets/js/pessoa-picker.js';

// ---------- troca de aba (Mapa Natal / Perfil / Sinastria / Composto / Pessoas) ----------
export function setView(v) {
  document.getElementById('tabNatal').classList.toggle('active', v === 'natal');
  document.getElementById('tabPerfil').classList.toggle('active', v === 'perfil');
  document.getElementById('tabSinastria').classList.toggle('active', v === 'sinastria');
  document.getElementById('tabComposto').classList.toggle('active', v === 'composto');
  document.getElementById('tabPessoas').classList.toggle('active', v === 'pessoas');
  document.getElementById('viewNatal').style.display = v === 'natal' ? '' : 'none';
  document.getElementById('viewPerfil').style.display = v === 'perfil' ? '' : 'none';
  document.getElementById('viewSinastria').style.display = v === 'sinastria' ? '' : 'none';
  document.getElementById('viewComposto').style.display = v === 'composto' ? '' : 'none';
  document.getElementById('viewPessoas').style.display = v === 'pessoas' ? '' : 'none';
  if (v === 'perfil') {
    renderProfile();
    populateProfileCompareSortSelect();
    renderProfileComparisons();
  }
  if (v === 'pessoas') {
    renderPessoasList(document.getElementById('pessoasListContainer'), { onChange: refreshAllPessoaSelects });
  }
  if (history.replaceState) history.replaceState(null, '', '#' + v);
}

// ---------- cadastro de pessoas: seletores das abas Mapa Natal, Perfil,
// Sinastria e Composto ----------
// Os seletores de Mapa Natal e Sinastria só preenchem o formulário
// correspondente (sem calcular sozinhos — a pessoa ainda clica em
// "Calcular..." como sempre). Os de Perfil e Composto (abaixo) são atalhos
// pensados pra não precisar voltar pras abas Mapa Natal/Sinastria: preenchem
// E JÁ calculam, pra trocar de pessoa e ver o resultado na hora.
// "+ Nova pessoa" abre o mesmo modal usado na aba Pessoas, pré-preenchido com
// o que já estiver digitado ali na hora (getPrefill), pra não perder o que a
// pessoa já tinha começado a preencher manualmente.
const natalPessoaSelectEl = document.getElementById('natalPessoaSelect');
const synAPessoaSelectEl = document.getElementById('synAPessoaSelect');
const synBPessoaSelectEl = document.getElementById('synBPessoaSelect');
const profilePessoaSelectEl = document.getElementById('profilePessoaSelect');
const coAPessoaSelectEl = document.getElementById('coAPessoaSelect');
const coBPessoaSelectEl = document.getElementById('coBPessoaSelect');

function refreshAllPessoaSelects() {
  [natalPessoaSelectEl, synAPessoaSelectEl, synBPessoaSelectEl, profilePessoaSelectEl, coAPessoaSelectEl, coBPessoaSelectEl].forEach((el) => {
    if (!el) return;
    const current = el.value;
    attachPessoaSelect(el, el._pmOnSelect ? { onSelect: el._pmOnSelect, getPrefill: el._pmGetPrefill } : {});
    if (current && current !== '__nova__') el.value = current;
  });
}

natalPessoaSelectEl._pmOnSelect = (pessoa) => {
  if (!pessoa) return;
  applyNatalInput(pessoa);
  // mantém o seletor da aba Perfil mostrando a mesma pessoa, já que os dois
  // preenchem o mesmo formulário de Mapa Natal por baixo.
  if (profilePessoaSelectEl) profilePessoaSelectEl.value = pessoa.id;
};
natalPessoaSelectEl._pmGetPrefill = () => collectNatalInput();
attachPessoaSelect(natalPessoaSelectEl, { onSelect: natalPessoaSelectEl._pmOnSelect, getPrefill: natalPessoaSelectEl._pmGetPrefill });

// ---------- aba Perfil: trocar de pessoa sem voltar pra Mapa Natal ----------
profilePessoaSelectEl._pmOnSelect = (pessoa) => {
  if (!pessoa) return;
  applyNatalInput(pessoa);
  calcNatal();
  renderProfile();
  if (natalPessoaSelectEl) natalPessoaSelectEl.value = pessoa.id;
};
profilePessoaSelectEl._pmGetPrefill = () => collectNatalInput();
attachPessoaSelect(profilePessoaSelectEl, { onSelect: profilePessoaSelectEl._pmOnSelect, getPrefill: profilePessoaSelectEl._pmGetPrefill });

function collectSynInputLocal(who) {
  const p = 'syn' + who;
  return {
    nome: document.getElementById(p + 'Name').value || null,
    sigla: document.getElementById(p + 'Sigla').value || null,
    cidade: document.getElementById(p + 'CitySearch').value || null,
    data_nascimento: document.getElementById(p + 'Date').value || null,
    hora_nascimento: document.getElementById(p + 'Time').value || null,
    fuso_horario: document.getElementById(p + 'Tz').value !== '' ? parseFloat(document.getElementById(p + 'Tz').value) : null,
    latitude: document.getElementById(p + 'Lat').value !== '' ? parseFloat(document.getElementById(p + 'Lat').value) : null,
    longitude: document.getElementById(p + 'Lon').value !== '' ? parseFloat(document.getElementById(p + 'Lon').value) : null,
    sistema_casas: document.getElementById(p + 'House').value,
  };
}

synAPessoaSelectEl._pmOnSelect = (pessoa) => { if (pessoa) applySynInput('A', pessoa); };
synAPessoaSelectEl._pmGetPrefill = () => collectSynInputLocal('A');
attachPessoaSelect(synAPessoaSelectEl, { onSelect: synAPessoaSelectEl._pmOnSelect, getPrefill: synAPessoaSelectEl._pmGetPrefill });

synBPessoaSelectEl._pmOnSelect = (pessoa) => { if (pessoa) applySynInput('B', pessoa); };
synBPessoaSelectEl._pmGetPrefill = () => collectSynInputLocal('B');
attachPessoaSelect(synBPessoaSelectEl, { onSelect: synBPessoaSelectEl._pmOnSelect, getPrefill: synBPessoaSelectEl._pmGetPrefill });

// ---------- aba Composto: trocar Pessoa A/B sem voltar pra Sinastria ----------
// Preenche o formulário de Sinastria (por baixo do capô — o composto sempre
// parte de synChartA/synChartB) e já calcula essa pessoa; quando as duas
// (A e B) estiverem calculadas, recalcula o composto na hora também, sem
// precisar clicar em "Calcular mapa composto" de novo.
function onCompostoPessoaSelect(who, pessoa) {
  if (!pessoa) return;
  applySynInput(who, pessoa);
  calcSynPerson(who);
  if (who === 'A' && synAPessoaSelectEl) synAPessoaSelectEl.value = pessoa.id;
  if (who === 'B' && synBPessoaSelectEl) synBPessoaSelectEl.value = pessoa.id;
  if (synChartA && synChartB) calcComposite();
}
coAPessoaSelectEl._pmOnSelect = (pessoa) => onCompostoPessoaSelect('A', pessoa);
coAPessoaSelectEl._pmGetPrefill = () => collectSynInputLocal('A');
attachPessoaSelect(coAPessoaSelectEl, { onSelect: coAPessoaSelectEl._pmOnSelect, getPrefill: coAPessoaSelectEl._pmGetPrefill });

coBPessoaSelectEl._pmOnSelect = (pessoa) => onCompostoPessoaSelect('B', pessoa);
coBPessoaSelectEl._pmGetPrefill = () => collectSynInputLocal('B');
attachPessoaSelect(coBPessoaSelectEl, { onSelect: coBPessoaSelectEl._pmOnSelect, getPrefill: coBPessoaSelectEl._pmGetPrefill });

// ---------- salvar os dados atuais do Mapa Natal como pessoa cadastrada ----------
function salvarNatalNoCadastro() {
  const msgEl = document.getElementById('natalPessoaMsg');
  const data = collectNatalInput();
  if (!data.nome) { msgEl.textContent = 'Preencha o campo Nome antes de salvar no cadastro.'; msgEl.style.color = 'var(--rose)'; return; }
  if (!data.data_nascimento) { msgEl.textContent = 'Preencha ao menos a data de nascimento.'; msgEl.style.color = 'var(--rose)'; return; }
  const selectedId = natalPessoaSelectEl.value && natalPessoaSelectEl.value !== '__nova__' ? natalPessoaSelectEl.value : undefined;
  const pessoa = savePessoa({ id: selectedId, ...data });
  refreshAllPessoaSelects();
  natalPessoaSelectEl.value = pessoa.id;
  msgEl.style.color = '';
  msgEl.textContent = (selectedId ? 'Cadastro de "' : 'Nova pessoa "') + pessoa.nome + '" salvo. Já disponível nas outras ferramentas do site.';
}

// ---------- aba Pessoas: botão "+ Nova pessoa" ----------
function abrirNovaPessoa() {
  openPessoaModal({
    onSave: () => {
      refreshAllPessoaSelects();
      renderPessoasList(document.getElementById('pessoasListContainer'), { onChange: refreshAllPessoaSelects });
    },
  });
}

// ---------- ponte com os atributos onclick/oninput do HTML ----------
Object.assign(window, {
  // natal
  calcNatal, clearNatalStorage, exportNatalInput, fillNow, fillPreset,
  importNatalInput, pickCity, searchCity, setMode, toggleImportBox, updateRangeWarn,
  salvarNatalNoCadastro, copyNatalForAI, downloadNatalMd, toggleNatalDetailTables,
  // sinastria
  calcSynPerson, calcSynastry, clearSynStorage, copyForSinastriaCalc, copySynForAI,
  downloadSynMd, exportSynCsv, exportSynInput, exportSynJson, importSynInput, openInSinastriaCalc, pickCityFor,
  renderSynAspectsTable, searchCityFor, toggleSynImportBox,
  // composto
  calcComposite, copyCompositeChartForAI, downloadCompositeChartMd, toggleCompositeDetailTables,
  // comparação entre mapas (aba Perfil)
  saveProfileForComparison, removeProfileComparison, renderProfileComparisons,
  // pessoas
  abrirNovaPessoa,
  // navegação entre abas
  setView,
});

// ---------- inicialização: recarrega dados salvos localmente, e abre a aba
// indicada na URL (ex: mapas.html#sinastria), se houver ----------
(function init() {
  injectPessoaPickerStyles();
  if (loadNatalFromStorage()) {
    calcNatal();
  }
  if (loadSynFromStorage()) {
    calcSynPerson('A');
    calcSynPerson('B');
  }
  const hash = (location.hash || '').replace('#', '');
  if (['natal', 'perfil', 'sinastria', 'composto', 'pessoas'].includes(hash)) {
    setView(hash);
  }
})();
