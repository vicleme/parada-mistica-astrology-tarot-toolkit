// ============================================================================
// ui/app-efemerides.js
// Ponto de entrada da página efemerides.html (Trânsitos individuais /
// Trânsitos duplos / Sobre o composto). O mapa natal de referência dos
// Trânsitos individuais vem do cadastro de pessoas (assets/js/pessoas.js):
// a página não tem formulário de nascimento próprio. Trânsitos duplos e Sobre
// o composto também não têm formulário de Pessoa A/B: os dados vêm do que já
// foi calculado em mapas.html > Sinastria, lidos do localStorage
// (loadSynChartsFromStorageOnly, em features/synastry.js).
// ============================================================================

import { applyNatalInput, calcNatal, fillNow, fillPreset, setMode, updateRangeWarn } from '../features/natal.js';

import {
  calcTransits, copyForAI, exportResultsCsv, exportResultsJson, renderAspectsTable,
} from '../features/transits.js';

import {
  calcDoubleTransits, copyDoubleForAI, dtFillNow, dtFillPreset, dtSetMode,
  dtUpdateRangeWarn, exportDoubleCsv, exportDoubleJson, renderDoubleTable, dtInitFromStorage,
} from '../features/double-transits.js';

import {
  calcCompositeTransits, coFillNow, coFillPreset, coSetMode,
  coUpdateRangeWarn, copyCompositeForAI, exportCompositeCsv, exportCompositeJson,
  renderCompositeAspectsTable, coInitFromStorage, coRecomputeFromStorage,
} from '../features/composite.js';

import { getPessoa, PESSOAS_STORAGE_KEY } from '../../../assets/js/pessoas.js';
import { attachPessoaSelect, populatePessoaSelect, injectStyles as injectPessoaPickerStyles } from '../../../assets/js/pessoa-picker.js';

// ---------- mapa natal de referência: vem do cadastro de pessoas ----------
// Escolher uma pessoa preenche os campos ocultos que features/natal.js lê e já
// calcula o mapa. "+ Nova pessoa" abre o mesmo modal usado em mapas.html. A
// última pessoa escolhida é lembrada neste navegador (só o id; os dados sempre
// vêm do cadastro, então edições feitas em Mapas Astrais aparecem aqui).
const NATAL_PESSOA_ID_KEY = 'parada_mistica_efemerides_pessoa_v1';
const natalPessoaSelectEl = document.getElementById('natalPessoaSelect');
const natalPessoaResumoEl = document.getElementById('natalPessoaResumo');

function readSavedPessoaId() {
  try { return localStorage.getItem(NATAL_PESSOA_ID_KEY) || ''; } catch (e) { return ''; }
}
function writeSavedPessoaId(id) {
  try { if (id) localStorage.setItem(NATAL_PESSOA_ID_KEY, id); else localStorage.removeItem(NATAL_PESSOA_ID_KEY); } catch (e) { /* sem storage: segue sem lembrar */ }
}

function formatDataBR(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
}
const HOUSE_LABEL = { whole: 'Signos Inteiros', equal: 'Casas Iguais', placidus: 'Placidus' };

function resumoPessoa(p) {
  const partes = [p.nome + (p.sigla ? ' (' + p.sigla + ')' : '')];
  partes.push(formatDataBR(p.data_nascimento) + (p.hora_nascimento ? ' às ' + p.hora_nascimento : ', sem hora'));
  if (p.cidade) partes.push(p.cidade);
  if (p.fuso_horario !== null && p.fuso_horario !== undefined) partes.push('UTC' + (p.fuso_horario >= 0 ? '+' : '') + p.fuso_horario);
  if (p.hora_nascimento && p.latitude !== null && p.longitude !== null) partes.push(HOUSE_LABEL[p.sistema_casas] || 'Signos Inteiros');
  return partes.join(' · ');
}

function limparNatalOutput(msg) {
  document.getElementById('natalOutput').innerHTML = '<div class="empty">' + msg + '</div>';
}

function carregarPessoaNoNatal(pessoa) {
  if (!pessoa) {
    writeSavedPessoaId('');
    natalPessoaResumoEl.textContent = '';
    limparNatalOutput('Escolha uma pessoa para ver o mapa natal aqui.');
    return;
  }
  applyNatalInput(pessoa);
  writeSavedPessoaId(pessoa.id);
  natalPessoaResumoEl.textContent = resumoPessoa(pessoa);
  calcNatal({ persist: false });
}

// ---------- troca de aba (Trânsitos individuais / Trânsitos duplos / Sobre o composto) ----------
export function setView(v) {
  document.getElementById('tabTransitos').classList.toggle('active', v === 'transitos');
  document.getElementById('tabDuplos').classList.toggle('active', v === 'duplos');
  document.getElementById('tabComposto').classList.toggle('active', v === 'composto');
  document.getElementById('viewTransitos').style.display = v === 'transitos' ? '' : 'none';
  document.getElementById('viewDuplos').style.display = v === 'duplos' ? '' : 'none';
  document.getElementById('viewComposto').style.display = v === 'composto' ? '' : 'none';
  if (history.replaceState) history.replaceState(null, '', '#' + v);
  // Os resumos de A/B (Duplos e Sobre o composto) dependem do que está salvo
  // no momento — recarrega toda vez que a aba é aberta, caso o usuário tenha
  // recalculado a Sinastria em outra aba do navegador nesse meio tempo.
  if (v === 'duplos') dtInitFromStorage();
  if (v === 'composto') coInitFromStorage();
}

// ---------- ponte com os atributos onclick/oninput do HTML ----------
Object.assign(window, {
  // período dos trânsitos individuais
  fillNow, fillPreset, setMode, updateRangeWarn,
  // trânsitos individuais
  calcTransits, copyForAI, exportResultsCsv, exportResultsJson, renderAspectsTable,
  // trânsitos duplos
  calcDoubleTransits, copyDoubleForAI, dtFillNow, dtFillPreset, dtSetMode,
  dtUpdateRangeWarn, exportDoubleCsv, exportDoubleJson, renderDoubleTable,
  // sobre o composto
  calcCompositeTransits, coFillNow, coFillPreset, coSetMode,
  coUpdateRangeWarn, copyCompositeForAI, exportCompositeCsv, exportCompositeJson,
  renderCompositeAspectsTable, coRecomputeFromStorage,
  // navegação entre abas
  setView,
});

// ---------- inicialização: reabre a última pessoa escolhida (se ainda existir no
// cadastro) e a aba indicada na URL (ex: efemerides.html#duplos) ----------
(function init() {
  injectPessoaPickerStyles();
  const savedId = readSavedPessoaId();
  const pessoa = savedId ? getPessoa(savedId) : null;
  attachPessoaSelect(natalPessoaSelectEl, { onSelect: carregarPessoaNoNatal }); // uma vez só: adiciona o listener de change
  if (pessoa) natalPessoaSelectEl.value = pessoa.id;
  if (pessoa) {
    carregarPessoaNoNatal(pessoa);
  } else if (savedId) {
    writeSavedPessoaId(''); // a pessoa foi removida do cadastro
  }

  // Cadastro editado em outra aba do navegador (ex: mapas.html): atualiza a lista
  // e recarrega a pessoa selecionada, para não calcular com dados desatualizados.
  window.addEventListener('storage', (e) => {
    if (e.key !== PESSOAS_STORAGE_KEY) return;
    const id = natalPessoaSelectEl.value;
    const atual = id && id !== '__nova__' ? getPessoa(id) : null;
    populatePessoaSelect(natalPessoaSelectEl, { selectedId: atual ? atual.id : '' });
    if (atual) carregarPessoaNoNatal(atual);
    else if (id && id !== '__nova__') carregarPessoaNoNatal(null);
  });

  const hash = (location.hash || '').replace('#', '');
  if (['transitos', 'duplos', 'composto'].includes(hash)) {
    setView(hash);
  }
  // aba padrão já está visível no HTML, mas os resumos de A/B ainda não
  // foram carregados: eles só carregam quando a aba é aberta

  // Recolher/expandir o mapa natal. Começa recolhido (visual mais limpo pra quem só quer
  // os trânsitos) e lembra a última escolha neste navegador, sem depender do storage.
  const NATAL_ABERTO_KEY = 'efemerides.natalAberto';
  const natalToggleEl = document.getElementById('natalToggle');
  const natalOutputEl = document.getElementById('natalOutput');
  if (natalToggleEl && natalOutputEl) {
    const aplicarNatalAberto = (aberto) => {
      natalOutputEl.hidden = !aberto;
      natalToggleEl.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      natalToggleEl.textContent = aberto ? 'Ocultar mapa natal' : 'Mostrar mapa natal';
    };
    let aberto = false;
    try { aberto = localStorage.getItem(NATAL_ABERTO_KEY) === '1'; } catch (e) { /* sem storage: começa recolhido */ }
    aplicarNatalAberto(aberto);
    natalToggleEl.addEventListener('click', () => {
      aberto = natalOutputEl.hidden;
      aplicarNatalAberto(aberto);
      try { localStorage.setItem(NATAL_ABERTO_KEY, aberto ? '1' : '0'); } catch (e) { /* segue sem lembrar */ }
    });
  }
})();
