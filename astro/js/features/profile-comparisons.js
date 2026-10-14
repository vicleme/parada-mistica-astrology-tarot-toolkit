// ============================================================================
// features/profile-comparisons.js
// "Comparação entre mapas" (aba Perfil, embaixo do Perfil calculado): lista
// de perfis natais salvos, cada um com nome + eixos globais (Nitidez/
// Harmonia) + presença/harmonia por categoria — renderizados em cards,
// ordenáveis (Recentes/Alfabética/Maior Nitidez/Maior Harmonia/Melhor em
// categoria). NÃO é sinastria: não calcula aspecto nenhum entre os perfis
// salvos, só guarda o snapshot de cada um pra ver como eles se parecem ou
// diferem lado a lado — mesmo padrão de UI/ordenação da lista de sinastrias
// salvas (ver sinastria/js/comparisons.js, SORT_CHAINS + renderComparisons),
// adaptado aqui pra perfis individuais em vez de pares.
// ============================================================================

import { computeNatalProfile, PROFILE_CATEGORIES, PROFILE_CATEGORY_KEYS } from '../core/profile.js';
import { natalChart } from './natal.js';

const STORAGE_KEY = 'efemeride_perfil_comparacoes_v1';

let storageAvailable = true;
try {
  const testKey = '__pm_perfil_compare_storage_test__';
  localStorage.setItem(testKey, '1');
  localStorage.removeItem(testKey);
} catch(e){ storageAvailable = false; }

export let profileComparisons = [];
try { profileComparisons = storageAvailable ? (JSON.parse(localStorage.getItem(STORAGE_KEY)) || []) : []; }
catch(e){ profileComparisons = []; }

function saveProfileComparisons(){
  if(!storageAvailable) return;
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(profileComparisons)); }
  catch(e){ /* storage indisponível, segue só em memória */ }
}

// ---------- salvar/remover ----------
export function saveProfileForComparison(){
  const msgEl = document.getElementById('profileCompareMsg');
  if(!natalChart){
    if(msgEl){ msgEl.textContent = 'Calcule o mapa natal primeiro, na aba Mapa Natal.'; msgEl.style.color = 'var(--rose)'; }
    return;
  }
  const nome = (document.getElementById('natalName')?.value || '').trim() || 'Sem nome';
  const profile = computeNatalProfile(natalChart);

  const categories = {};
  PROFILE_CATEGORY_KEYS.forEach(key=>{
    const c = profile.categories[key];
    categories[key] = { presence: c.presence, harmonyPct: c.harmonyPct, eligibleCount: c.eligibleCount };
  });

  profileComparisons.push({
    id: Date.now(),
    ts: Date.now(),
    nome,
    hasHouses: profile.hasHouses,
    headline: profile.headline,
    axes: { nitidez: profile.axes.nitidez, harmonia: profile.axes.harmonia },
    categories,
  });
  saveProfileComparisons();
  renderProfileComparisons();
  if(msgEl){ msgEl.style.color = ''; msgEl.textContent = 'Perfil de "'+nome+'" salvo na comparação.'; }
}

export function removeProfileComparison(id){
  profileComparisons = profileComparisons.filter(c => c.id !== id);
  saveProfileComparisons();
  renderProfileComparisons();
}

// ---------- ordenação ----------
const SORT_CHAINS = {
  recent: [ c => c.ts || 0 ],
  alphabetical: [ c => c.nome || '' ],
  nitidez: [ c => c.axes.nitidez ?? -1 ],
  harmonia: [ c => c.axes.harmonia ?? -1 ],
};
PROFILE_CATEGORY_KEYS.forEach(key=>{
  SORT_CHAINS['cat_'+key] = [
    c => (c.categories[key] ? c.categories[key].presence : -1),
    c => (c.categories[key] && c.categories[key].harmonyPct != null ? c.categories[key].harmonyPct : -1),
  ];
});

function sortedProfileComparisons(){
  const mode = document.getElementById('profileCompareSortBy')?.value || 'recent';
  const chain = SORT_CHAINS[mode] || SORT_CHAINS.recent;
  const list = profileComparisons.slice();
  list.sort((a,b)=>{
    for(const keyFn of chain){
      const va = keyFn(a), vb = keyFn(b);
      const diff = typeof va === 'string' ? va.localeCompare(vb, 'pt-BR', {sensitivity:'base'}) : vb - va;
      if(diff !== 0) return diff;
    }
    return (b.id||0) - (a.id||0); // desempate estável
  });
  return list;
}

// ---------- render ----------
function escapeHtmlLocal(s){
  return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function miniBarsHtml(entry){
  return '<div class="mini-bars">' + PROFILE_CATEGORY_KEYS.map(key=>{
    const meta = PROFILE_CATEGORIES[key];
    const c = entry.categories[key] || {presence:0, harmonyPct:null, eligibleCount:0};
    const harmWidth = c.harmonyPct != null ? (c.presence * c.harmonyPct / 100) : 0;
    const tenseWidth = c.harmonyPct != null ? (c.presence * (100 - c.harmonyPct) / 100) : 0;
    const valLabel = c.eligibleCount === 0 ? 'sem marcadores' : (c.harmonyPct != null ? `pres. ${c.presence} · ${c.harmonyPct}%🟢` : '—');
    return `
    <div class="mini-bar-row">
      <div class="top">
        <span class="cat-name"><span class="dot" style="background:${meta.color}"></span>${meta.label}</span>
        <span class="val-label">${valLabel}</span>
      </div>
      <div class="mini-bar-track">
        <div class="mini-bar-fill" style="width:${harmWidth}%; background:var(--sage)"></div>
        <div class="mini-bar-fill" style="width:${tenseWidth}%; background:var(--rose)"></div>
      </div>
    </div>`;
  }).join('') + '</div>';
}

export function renderProfileComparisons(){
  const container = document.getElementById('profileCompareList');
  const countEl = document.getElementById('profileCompareCount');
  if(!container) return;

  if(countEl) countEl.textContent = profileComparisons.length ? profileComparisons.length+' perfil(is) salvo(s)' : '';

  if(profileComparisons.length === 0){
    container.innerHTML = '<div class="compare-empty">Nenhum perfil salvo ainda. Calcule um mapa natal acima e clique em "Salvar perfil atual na comparação".</div>';
    return;
  }

  const mode = document.getElementById('profileCompareSortBy')?.value || 'recent';
  const catKeyFromMode = mode.startsWith('cat_') ? mode.slice(4) : null;
  const isRankingMode = mode === 'nitidez' || mode === 'harmonia' || !!catKeyFromMode;
  const list = sortedProfileComparisons();

  const grid = document.createElement('div');
  grid.className = 'compare-grid';

  list.forEach((c, idx)=>{
    const hasMetric = !(
      (mode === 'nitidez' && c.axes.nitidez == null) ||
      (mode === 'harmonia' && c.axes.harmonia == null) ||
      (catKeyFromMode && (!c.categories[catKeyFromMode] || c.categories[catKeyFromMode].presence <= 0))
    );
    const isTop = idx === 0 && isRankingMode && list.length > 1 && hasMetric;
    const card = document.createElement('div');
    card.className = 'compare-card' + (isTop ? ' top-pick' : '');

    // badge (★) só marca o 1º colocado num modo de ranking — nunca substitui
    // os números de Nitidez/Harmonia, que ficam numa linha própria sempre
    // visível (senão dava pra comparar só o card do topo, não os outros).
    const badgeText = isTop
      ? (mode === 'nitidez' ? '★ Nitidez mais alta'
        : mode === 'harmonia' ? '★ Maior harmonia geral'
        : `★ Melhor em ${PROFILE_CATEGORIES[catKeyFromMode].label}`)
      : '';
    const statsText = c.axes.nitidez != null ? `Nitidez ${c.axes.nitidez}% · Harmonia ${c.axes.harmonia}%` : 'poucos aspectos exatos';

    card.innerHTML = `
      <div class="compare-card-head">
        <div class="compare-card-title">${escapeHtmlLocal(c.nome)}</div>
        ${badgeText ? `<div class="compare-card-badge">${badgeText}</div>` : ''}
      </div>
      <div class="compare-card-stats">${statsText}</div>
      <div class="hint" style="margin:2px 0 12px;">${escapeHtmlLocal(c.headline || '')}</div>
      ${miniBarsHtml(c)}
      <div style="margin-top:12px; display:flex; justify-content:flex-end;">
        <button class="btn secondary small" onclick="removeProfileComparison(${c.id})">Remover</button>
      </div>`;
    grid.appendChild(card);
  });

  container.innerHTML = '';
  container.appendChild(grid);
}

// ---------- popula as opções "Melhor em <categoria>" do <select> uma única
// vez (as 5 categorias de PROFILE_CATEGORIES, mesmas do Perfil de um mapa só) ----------
export function populateProfileCompareSortSelect(){
  const sel = document.getElementById('profileCompareSortBy');
  if(!sel || sel.dataset.populated) return;
  PROFILE_CATEGORY_KEYS.forEach(key=>{
    const opt = document.createElement('option');
    opt.value = 'cat_'+key;
    opt.textContent = 'Melhor em '+PROFILE_CATEGORIES[key].label;
    sel.appendChild(opt);
  });
  sel.dataset.populated = '1';
}
