// ============================================================================
// assets/js/pessoa-picker.js
// Componentes de UI do cadastro de pessoas, reaproveitados pelas páginas que
// pedem dados de nascimento (mapas.html: Mapa Natal, Sinastria e a aba
// Pessoas; sinastria.html: painel "usar pessoas cadastradas"). Único lugar
// que sabe desenhar o <select> de pessoas e o modal de criar/editar — as
// páginas só chamam essas funções e reagem ao callback onSelect/onSave.
// O modal é sempre o mesmo, independente da página que o abriu: estilo
// próprio (injetado uma vez), usando as variáveis de tema já definidas em
// cada folha de estilo local (--bg, --text, --line, --input-bg, --gold,
// --rose), pra herdar claro/escuro sem depender de nenhuma classe específica
// de astro/css ou sinastria/css.
// ============================================================================

import { deletePessoa, getPessoa, listPessoas, PESSOAS_SORT_OPTIONS, savePessoa, sortPessoas } from './pessoas.js';

export { listPessoas, getPessoa };

const NOVA_PESSOA_VALUE = '__nova__';

let stylesInjected = false;
export function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.id = 'pm-pessoa-picker-styles';
  style.textContent = `
.pm-pessoa-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;}
.pm-pessoa-modal{background:var(--bg, var(--ink));color:var(--text, var(--paper));border:1px solid var(--line);border-radius:10px;max-width:480px;width:100%;max-height:90vh;overflow:auto;padding:20px 22px;}
.pm-pessoa-modal h3{margin:0 0 14px;font-size:1.1em;}
.pm-pessoa-modal label{display:block;font-size:0.8em;opacity:0.75;margin:10px 0 4px;}
.pm-pessoa-modal input,.pm-pessoa-modal select{width:100%;background:var(--input-bg, var(--textarea-bg));border:1px solid var(--line);color:var(--text, var(--paper));padding:8px 10px;border-radius:6px;font-family:inherit;font-size:0.95em;box-sizing:border-box;}
.pm-pessoa-modal .pm-row2{display:grid;grid-template-columns:2fr 1fr;gap:10px;}
.pm-pessoa-modal .pm-row3{display:grid;grid-template-columns:1.15fr 1fr 0.85fr;gap:10px;}
@media(max-width:480px){ .pm-pessoa-modal .pm-row3{grid-template-columns:1fr 1fr;} .pm-pessoa-modal .pm-row3>div:last-child{grid-column:1 / -1;} }
.pm-pessoa-modal .pm-hint{font-size:0.78em;opacity:0.65;margin-top:4px;}
.pm-pessoa-modal .pm-city-option{padding:6px 8px;cursor:pointer;border-radius:5px;font-size:0.85em;}
.pm-pessoa-modal .pm-city-option:hover{background:var(--input-bg, var(--textarea-bg));}
.pm-pessoa-modal .pm-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:18px;}
.pm-pessoa-modal .pm-actions-right{display:flex;gap:8px;}
.pm-pessoa-btn{padding:8px 16px;border-radius:6px;border:1px solid var(--line);background:transparent;color:var(--text, var(--paper));cursor:pointer;font-family:inherit;font-size:0.9em;}
.pm-pessoa-btn.primary{background:var(--gold);border-color:var(--gold);color:#fff;}
.pm-pessoa-btn.danger{border-color:var(--rose);color:var(--rose);}
.pm-pessoas-table{width:100%;border-collapse:collapse;font-size:0.92em;}
.pm-pessoas-table th,.pm-pessoas-table td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);}
.pm-pessoas-sort-row{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;}
.pm-pessoas-sort-row label{font-size:0.8em;opacity:0.75;margin:0;}
.pm-pessoas-sort-row select{width:auto;background:var(--input-bg, var(--textarea-bg));border:1px solid var(--line);color:var(--text, var(--paper));padding:6px 8px;border-radius:6px;font-family:inherit;font-size:0.88em;}
`;
  document.head.appendChild(style);
}

// ---------- modal de criar/editar pessoa ----------
// options: { pessoaId?: string, prefill?: object, onSave(pessoaOuNull, meta?) }
// onSave é chamado com o registro salvo, ou (null, {deleted:true, id}) se a
// pessoa foi excluída pelo modal.
let _cityResults = [];
export function openPessoaModal({ pessoaId = null, prefill = null, onSave } = {}) {
  injectStyles();
  const pessoa = pessoaId ? getPessoa(pessoaId) : null;
  const base = pessoa || prefill || {};

  const overlay = document.createElement('div');
  overlay.className = 'pm-pessoa-modal-overlay';
  overlay.innerHTML = `
    <div class="pm-pessoa-modal" role="dialog" aria-modal="true">
      <h3>${pessoa ? 'Editar pessoa' : 'Nova pessoa'}</h3>
      <div class="pm-row2">
        <div><label>Nome</label><input type="text" id="pmPessoaNome" placeholder="ex: Victor"></div>
        <div><label>Sigla</label><input type="text" id="pmPessoaSigla" maxlength="6" style="text-transform:uppercase;" placeholder="ex: VL"></div>
      </div>
      <div class="pm-hint">A sigla identifica a pessoa no texto da Calculadora de Sinastria (ex: "VL's Sun..."). Se ficar em branco, usa o nome.</div>
      <div class="pm-row3">
        <div><label>Nascimento</label><input type="date" id="pmPessoaData"></div>
        <div><label>Hora</label><input type="time" id="pmPessoaHora"></div>
        <div><label>Fuso (UTC)</label><input type="number" id="pmPessoaTz" step="0.5" placeholder="ex: -3"></div>
      </div>
      <label>Buscar cidade (preenche latitude/longitude)</label>
      <div style="display:flex;gap:8px;">
        <input type="text" id="pmPessoaCitySearch" placeholder="ex: Santos, SP, Brasil" style="flex:1;">
        <button type="button" class="pm-pessoa-btn" id="pmPessoaCityBtn">Buscar</button>
      </div>
      <div id="pmPessoaCityResults"></div>
      <div class="pm-row2" style="grid-template-columns:1fr 1fr;">
        <div><label>Latitude</label><input type="number" id="pmPessoaLat" step="0.0001"></div>
        <div><label>Longitude</label><input type="number" id="pmPessoaLon" step="0.0001"></div>
      </div>
      <label>Sistema de casas</label>
      <select id="pmPessoaHouse">
        <option value="whole">Signos Inteiros</option>
        <option value="equal">Casas Iguais</option>
        <option value="placidus">Placidus</option>
      </select>
      <div class="pm-actions">
        <div>${pessoa ? '<button type="button" class="pm-pessoa-btn danger" id="pmPessoaDelBtn">Excluir</button>' : '<span></span>'}</div>
        <div class="pm-actions-right">
          <button type="button" class="pm-pessoa-btn" id="pmPessoaCancelBtn">Cancelar</button>
          <button type="button" class="pm-pessoa-btn primary" id="pmPessoaSaveBtn">Salvar</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const $ = (id) => overlay.querySelector('#' + id);
  $('pmPessoaNome').value = base.nome || '';
  $('pmPessoaSigla').value = base.sigla || '';
  $('pmPessoaData').value = base.data_nascimento || '';
  $('pmPessoaCitySearch').value = base.cidade || '';
  $('pmPessoaHora').value = base.hora_nascimento || '';
  if (base.fuso_horario !== undefined && base.fuso_horario !== null) $('pmPessoaTz').value = base.fuso_horario;
  if (base.latitude !== undefined && base.latitude !== null) $('pmPessoaLat').value = base.latitude;
  if (base.longitude !== undefined && base.longitude !== null) $('pmPessoaLon').value = base.longitude;
  $('pmPessoaHouse').value = base.sistema_casas || 'whole';

  function close() { overlay.remove(); }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
  });
  $('pmPessoaCancelBtn').addEventListener('click', close);

  async function searchCity() {
    const q = $('pmPessoaCitySearch').value.trim();
    const resultsEl = $('pmPessoaCityResults');
    if (!q) { resultsEl.innerHTML = ''; return; }
    resultsEl.innerHTML = '<div class="pm-hint">Buscando…</div>';
    try {
      const resp = await fetch('https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=6&q=' + encodeURIComponent(q));
      if (!resp.ok) throw new Error('resposta ' + resp.status);
      const data = await resp.json();
      _cityResults = data;
      if (!data.length) { resultsEl.innerHTML = '<div class="pm-hint">Nenhum resultado. Tente incluir estado/país ou preencha manualmente.</div>'; return; }
      resultsEl.innerHTML = data.map((d, idx) => `<div class="pm-city-option" data-idx="${idx}">${escapeHtmlPM(d.display_name)}</div>`).join('');
      resultsEl.querySelectorAll('.pm-city-option').forEach(el => {
        el.addEventListener('click', () => {
          const d = _cityResults[Number(el.dataset.idx)];
          if (!d) return;
          $('pmPessoaLat').value = parseFloat(d.lat).toFixed(4);
          $('pmPessoaLon').value = parseFloat(d.lon).toFixed(4);
          $('pmPessoaCitySearch').value = d.display_name;
          resultsEl.innerHTML = `<div class="pm-hint">Selecionado: ${escapeHtmlPM(d.display_name)}. Confirme o fuso horário (atenção ao horário de verão vigente na data, se houver).</div>`;
        });
      });
    } catch (e) {
      resultsEl.innerHTML = '<div class="pm-hint">Não foi possível buscar agora (sem conexão ou serviço indisponível). Preencha lat/long manualmente.</div>';
    }
  }
  $('pmPessoaCityBtn').addEventListener('click', searchCity);
  $('pmPessoaCitySearch').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchCity(); } });

  if (pessoa) {
    $('pmPessoaDelBtn').addEventListener('click', () => {
      if (!confirm('Remover "' + (pessoa.nome || 'esta pessoa') + '" do cadastro? Essa ação não pode ser desfeita.')) return;
      deletePessoa(pessoa.id);
      close();
      if (onSave) onSave(null, { deleted: true, id: pessoa.id });
    });
  }

  $('pmPessoaSaveBtn').addEventListener('click', () => {
    const nome = $('pmPessoaNome').value.trim();
    const dataNasc = $('pmPessoaData').value;
    if (!nome) { alert('Informe ao menos o nome.'); return; }
    if (!dataNasc) { alert('Informe ao menos a data de nascimento.'); return; }
    const saved = savePessoa({
      id: pessoa ? pessoa.id : undefined,
      nome,
      sigla: $('pmPessoaSigla').value.trim() || null,
      cidade: $('pmPessoaCitySearch').value.trim() || null,
      data_nascimento: dataNasc,
      hora_nascimento: $('pmPessoaHora').value || null,
      fuso_horario: $('pmPessoaTz').value !== '' ? parseFloat($('pmPessoaTz').value) : null,
      latitude: $('pmPessoaLat').value !== '' ? parseFloat($('pmPessoaLat').value) : null,
      longitude: $('pmPessoaLon').value !== '' ? parseFloat($('pmPessoaLon').value) : null,
      sistema_casas: $('pmPessoaHouse').value,
    });
    close();
    if (onSave) onSave(saved);
  });
}

// ---------- <select> de pessoas cadastradas ----------
export function populatePessoaSelect(selectEl, { selectedId = '', includeBlank = true, blankLabel = '— selecionar pessoa cadastrada —' } = {}) {
  const pessoas = listPessoas();
  let html = includeBlank ? `<option value="">${blankLabel}</option>` : '';
  html += pessoas.map(p => `<option value="${p.id}">${p.nome}${p.sigla ? ' (' + p.sigla + ')' : ''}</option>`).join('');
  html += `<option value="${NOVA_PESSOA_VALUE}">+ Nova pessoa…</option>`;
  selectEl.innerHTML = html;
  if (selectedId) selectEl.value = selectedId;
}

// Liga um <select> ao cadastro. Ao escolher "+ Nova pessoa…", abre o modal
// (pré-preenchido com getPrefill(), se fornecido — útil pra aproveitar o que
// já estava digitado manualmente num formulário existente) e, ao salvar,
// deixa a pessoa nova já selecionada. onSelect(pessoa|null) é chamado sempre
// que a seleção muda de fato (null quando volta pro placeholder em branco).
export function attachPessoaSelect(selectEl, { onSelect, getPrefill } = {}) {
  populatePessoaSelect(selectEl);
  selectEl.addEventListener('change', () => {
    const val = selectEl.value;
    if (val === NOVA_PESSOA_VALUE) {
      const prefill = getPrefill ? getPrefill() : null;
      openPessoaModal({
        prefill,
        onSave: (pessoa, meta) => {
          if (meta && meta.deleted) { populatePessoaSelect(selectEl); return; }
          if (!pessoa) { populatePessoaSelect(selectEl); return; }
          populatePessoaSelect(selectEl, { selectedId: pessoa.id });
          if (onSelect) onSelect(pessoa);
        },
      });
    } else if (val === '') {
      if (onSelect) onSelect(null);
    } else {
      if (onSelect) onSelect(getPessoa(val));
    }
  });
}

// ---------- lista de gestão completa (aba "Pessoas" de mapas.html) ----------
// sortBy: guardado no próprio elemento container (dataset), pra sobreviver a
// re-renders (ex: depois de salvar/editar uma pessoa) sem precisar de estado
// externo — cada container de lista lembra sua própria ordenação escolhida.
export function renderPessoasList(containerEl, { onChange } = {}) {
  const sortBy = containerEl.dataset.pmSortBy || 'nome';
  const pessoas = sortPessoas(listPessoas(), sortBy);

  const sortRowHtml = '<div class="pm-pessoas-sort-row"><label for="pmPessoasSort">Ordenar por</label><select id="pmPessoasSort">'
    + PESSOAS_SORT_OPTIONS.map(o => `<option value="${o.value}"${o.value === sortBy ? ' selected' : ''}>${o.label}</option>`).join('')
    + '</select></div>';

  if (!pessoas.length) {
    containerEl.innerHTML = '<div class="empty">Nenhuma pessoa cadastrada ainda. Clique em "+ Nova pessoa" para começar.</div>';
    return;
  }

  containerEl.innerHTML = sortRowHtml
    + '<table class="pm-pessoas-table"><thead><tr><th>Nome</th><th>Sigla</th><th>Nascimento</th><th></th></tr></thead><tbody>'
    + pessoas.map(p => `<tr>
        <td>${p.nome}</td>
        <td>${p.sigla || '—'}</td>
        <td>${p.data_nascimento || '—'}${p.hora_nascimento ? ' · ' + p.hora_nascimento : ''}</td>
        <td><button type="button" class="pm-pessoa-btn pm-pessoa-edit-btn" data-id="${p.id}">Editar</button></td>
      </tr>`).join('')
    + '</tbody></table>';

  containerEl.querySelector('#pmPessoasSort').addEventListener('change', (e) => {
    containerEl.dataset.pmSortBy = e.target.value;
    renderPessoasList(containerEl, { onChange });
  });
  containerEl.querySelectorAll('.pm-pessoa-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openPessoaModal({
        pessoaId: btn.dataset.id,
        onSave: () => { renderPessoasList(containerEl, { onChange }); if (onChange) onChange(); },
      });
    });
  });
}

// Texto vindo de serviço externo (Nominatim) nunca entra no HTML sem escape.
function escapeHtmlPM(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
