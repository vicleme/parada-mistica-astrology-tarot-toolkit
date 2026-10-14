// ============================================================================
// features/profile.js
// Renderização da aba Perfil: lê natalChart (exportado por features/natal.js,
// nunca alterado aqui) e desenha a síntese em cima das categorias calculadas
// em core/profile.js. Mecânica de barra + tooltip de hover é a mesma da
// Sinastria (ver sinastria/js/charts.js: .bar-row/.bar-track/.bar-fill/
// .bar-note + tooltip singleton), reimplementada aqui de forma autocontida
// pra não criar uma dependência de astro/ pra dentro de sinastria/ (que
// tem seu próprio bundle, calibrado só pra sinastria).
// ============================================================================

import { natalChart } from './natal.js';
import { computeNatalProfile, PROFILE_CATEGORIES, PROFILE_CATEGORY_KEYS } from '../core/profile.js';
import { PLANET_LABEL } from '../core/constants.js';

// ---------- tooltip singleton de hover das barras (mesmo padrão de charts.js) ----------
let tipEl = null;
function ensureTip() {
  if (tipEl) return tipEl;
  tipEl = document.createElement('div');
  tipEl.className = 'bar-hover-tooltip';
  document.body.appendChild(tipEl);
  return tipEl;
}
function showTip(lines, emptyLabel) {
  const el = ensureTip();
  el.textContent = lines.length ? lines.join('\n') : emptyLabel;
  el.style.display = 'block';
}
function moveTip(evt) {
  const el = ensureTip();
  const pad = 16;
  const maxLeft = window.innerWidth - el.offsetWidth - pad;
  const maxTop = window.innerHeight - el.offsetHeight - pad;
  el.style.left = Math.max(pad, Math.min(evt.clientX + 14, maxLeft)) + 'px';
  el.style.top = Math.max(pad, Math.min(evt.clientY + 14, maxTop)) + 'px';
}
function hideTip() { if (tipEl) tipEl.style.display = 'none'; }

function ascendantRulerHtml(ar) {
  if (!ar) return '';
  const { ruler, ascSign, rulerSign, house, harmonyPct } = ar;
  const harmTxt = harmonyPct === null ? '' : ` <span class="ar-harmony">(${harmonyPct}% favorável)</span>`;
  const posText = ar.conjunctAsc
    ? `em ${rulerSign}, conjunto ao próprio Ascendente (Casa 1)`
    : `em ${rulerSign}, na Casa ${house}`;
  const lines = [...new Set([...ar.harmonicDetails, ...ar.ambivalentDetails, ...ar.tenseDetails])];
  return `
  <div class="ascendant-ruler-card" id="ascendantRulerCard">
    <div class="ar-top">
      <span class="ar-tag">Regente do Ascendente</span>
      <span class="ar-headline">${PLANET_LABEL[ruler]} ${posText}${harmTxt}</span>
    </div>
    <div class="hint">Ascendente em ${ascSign}, regido por ${PLANET_LABEL[ruler]}.</div>
    ${lines.length ? `<ul class="ar-details">${lines.map(l => `<li>${l}</li>`).join('')}</ul>` : ''}
  </div>`;
}

// Card da Parte da Fortuna / Parte do Espírito — reaproveita as mesmas classes
// CSS do card do Regente do Ascendente (.ascendant-ruler-card/.ar-*, ver
// styles.css), só muda o texto: mesmo padrão visual pros três "pontos
// especiais" do Perfil. `tag`/`id` distinguem os dois pontos derivados, que
// chegam aqui com o mesmo formato (ver computeDerivedPointProfile em
// core/profile.js — Fortuna e Espírito compartilham o mesmo cálculo).
function derivedPointHtml(point, tag, elId) {
  if (!point) return '';
  const { sign, house, dispositors, harmonyPct } = point;
  const harmTxt = harmonyPct === null ? '' : ` <span class="ar-harmony">(${harmonyPct}% favorável)</span>`;
  const lines = [...new Set([...point.harmonicDetails, ...point.ambivalentDetails, ...point.tenseDetails])];
  // Almuten pode empatar — dispositors traz 1 item no caso normal, 2+ num
  // empate; rótulo muda de singular pra plural só quando há mais de um.
  const dispLabel = dispositors.length > 1 ? 'Dispositores (empate)' : 'Dispositor';
  const dispText = dispositors
    .map(d => `${PLANET_LABEL[d.planet]}${d.sign ? ` (em ${d.sign})` : ''}`)
    .join(', ');
  return `
  <div class="ascendant-ruler-card" id="${elId}">
    <div class="ar-top">
      <span class="ar-tag">${tag}</span>
      <span class="ar-headline">em ${sign}, na Casa ${house}${harmTxt}</span>
    </div>
    <div class="hint">${dispLabel}: ${dispText}.</div>
    ${lines.length ? `<ul class="ar-details">${lines.map(l => `<li>${l}</li>`).join('')}</ul>` : ''}
  </div>`;
}
function fortunaHtml(fortune) { return derivedPointHtml(fortune, 'Parte da Fortuna', 'fortunaCard'); }
function espiritoHtml(espirito) { return derivedPointHtml(espirito, 'Parte do Espírito', 'espiritoCard'); }

function axesHtml(axes) {
  const nitTxt = axes.nitidez === null ? '—' : axes.nitidez + '%';
  const harmTxt = axes.harmonia === null ? '—' : axes.harmonia + '%';
  return `
  <div class="stat-row">
    <div class="stat">
      <div class="val">${nitTxt}</div>
      <div class="lbl">Nitidez</div>
      <div class="hint" style="margin-top:6px;">% de aspectos com orbe apertado, entre os elegíveis (exclui pares geracionais Urano/Netuno/Plutão entre si).</div>
    </div>
    <div class="stat">
      <div class="val">${harmTxt}</div>
      <div class="lbl">Harmonia geral</div>
      <div class="hint" style="margin-top:6px;">% harmônico vs. tenso entre os mesmos aspectos elegíveis (ambivalentes contam meio a meio).</div>
    </div>
  </div>`;
}

function renderBars(container, categories) {
  container.innerHTML = '';
  for (const key of PROFILE_CATEGORY_KEYS) {
    const meta = PROFILE_CATEGORIES[key];
    const { presence, harmonyPct: hPct, eligibleCount, harmonicDetails, ambivalentDetails, tenseDetails, houseDetails } = categories[key];
    const valLabel = eligibleCount === 0
      ? 'sem marcadores'
      : (hPct !== null
          ? `<span class="val-presence" title="Presença: quantos marcadores dessa área foram encontrados no mapa, e quão exatos">presença ${presence}</span><span class="val-dot">·</span><span class="val-harmony" title="Entre os marcadores de aspecto encontrados, % que puxa pro lado que flui em vez do que atrita">${hPct}% favorável</span>`
          : '—');
    const noteLabel = eligibleCount > 0
      ? `${eligibleCount} marcador${eligibleCount === 1 ? '' : 'es'} encontrado${eligibleCount === 1 ? '' : 's'}${hPct === null ? ' — sinal fraco/disperso demais pra confiar num número' : ''}`
      : '';

    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="top">
        <span class="cat-name"><span class="dot" style="background:${meta.color}"></span>${meta.label}</span>
        <span class="val-label">${valLabel}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="background:var(--sage)"></div>
        <div class="bar-fill" style="background:var(--rose)"></div>
      </div>
      ${noteLabel ? `<div class="bar-note">${noteLabel}</div>` : ''}
    `;
    container.appendChild(row);

    const fills = row.querySelectorAll('.bar-fill');
    // Ambivalente entra nos dois lados do hover das barras (verde/vermelho) —
    // ele já conta meio a meio no peso de harmonyPct, então precisa aparecer
    // nos dois, senão uma categoria dominada por conjunções (ambivalentes)
    // ficava com hPct definido mas os dois lados "sem marcador específico".
    // Mesmo padrão da Sinastria (ver sinastria/js/compute.js, categoryScores).
    const harmonicHoverLines = [...harmonicDetails, ...ambivalentDetails];
    const tenseHoverLines = [...tenseDetails, ...ambivalentDetails];
    // Tooltip do .bar-note: lista corrida (sem cabeçalho de seção), cada linha
    // já com seu próprio emoji de tom (🟢/🟡/🔴/🏠 — ver core/profile.js) —
    // mesmo formato exato do hover de barra da Sinastria (ver sinastria/js/
    // charts.js, renderCategoryVisuals: allLines). O Set dedupe colapsa os
    // ambivalentes repetidos entre harmonicHoverLines/tenseHoverLines antes de
    // somar os marcadores de casa.
    const toneLines = [...new Set([...harmonicHoverLines, ...tenseHoverLines]), ...houseDetails];
    if (hPct !== null) {
      fills[0].style.cursor = 'help';
      fills[1].style.cursor = 'help';
      fills[0].addEventListener('mouseenter', () => showTip(harmonicHoverLines, 'Nenhum marcador favorável específico nesta área.'));
      fills[1].addEventListener('mouseenter', () => showTip(tenseHoverLines, 'Nenhum marcador tenso específico nesta área.'));
      fills[0].addEventListener('mousemove', moveTip);
      fills[1].addEventListener('mousemove', moveTip);
      fills[0].addEventListener('mouseleave', hideTip);
      fills[1].addEventListener('mouseleave', hideTip);
    }
    const note = row.querySelector('.bar-note');
    if (note && toneLines.length > 0) {
      note.style.cursor = 'help';
      note.addEventListener('mouseenter', () => showTip(toneLines, 'Nenhum marcador específico nesta área.'));
      note.addEventListener('mousemove', moveTip);
      note.addEventListener('mouseleave', hideTip);
    }
    setTimeout(() => {
      if (hPct !== null) {
        fills[0].style.width = (presence * hPct / 100) + '%';
        fills[1].style.width = (presence * (100 - hPct) / 100) + '%';
      } else {
        fills[0].style.width = '0%';
        fills[1].style.width = '0%';
      }
    }, 60);
  }
}

export function renderProfile() {
  const out = document.getElementById('profileOutput');
  if (!out) return;
  if (!natalChart) {
    out.innerHTML = '<div class="empty">Calcule o mapa natal primeiro, na aba Mapa Natal.</div>';
    return;
  }
  const profile = computeNatalProfile(natalChart);

  out.innerHTML = `
    <div class="profile-verdict">
      <div class="tag">Síntese</div>
      <h3>${profile.headline}</h3>
    </div>
    ${ascendantRulerHtml(profile.ascendantRuler)}
    ${fortunaHtml(profile.fortune)}
    ${espiritoHtml(profile.espirito)}
    ${axesHtml(profile.axes)}
    <div class="divider"></div>
    <div class="bars" id="profileBars"></div>
    ${!profile.hasHouses ? '<div class="hint">Sem hora/local completos — os marcadores de casa (3/9, 4/8, 1/10, 5/7, 6/10) não entraram nas barras acima, só os aspectos entre planetas; o bloco de Regente do Ascendente também não aparece (exige o grau exato do Ascendente).</div>' : ''}
  `;
  renderBars(document.getElementById('profileBars'), profile.categories);
}
