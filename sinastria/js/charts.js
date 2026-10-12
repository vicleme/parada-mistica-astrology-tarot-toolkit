/**
 * charts.js — Barras de categoria (Intelectual/Emocional/Sexual/...) e o
 * tooltip de hover com os marcadores que compõem cada barra.
 * Depende de: compute.js, labels.js, pairs.js.
 * Usado por: comparisons.js, main.js.
 */

import { catMetaFor } from './compute.js';
import { CATEGORY_HARMONIC_COLOR } from './labels.js';
import { CATEGORY_KEYS } from './pairs.js';

// Tooltip de hover pras barras de categoria — singleton reaproveitado por TODAS as
// barras (em vez de um elemento por segmento), criado uma vez e só reposicionado/
// preenchido a cada hover. position:fixed de propósito: .bar-track tem
// overflow:hidden (pra cortar o preenchimento animado da barra), então um tooltip
// posicionado normalmente dentro dele seria cortado também — fixed tira o elemento do
// fluxo e do containing block de overflow dos ancestrais, escapando do corte.
export let barTooltipEl = null;
export function ensureBarTooltip(){
  if (barTooltipEl) return barTooltipEl;
  barTooltipEl = document.createElement('div');
  barTooltipEl.className = 'bar-hover-tooltip';
  document.body.appendChild(barTooltipEl);
  return barTooltipEl;
}
export function showBarTooltip(lines, emptyLabel){
  const el = ensureBarTooltip();
  el.textContent = lines.length > 0 ? lines.join('\n') : emptyLabel;
  el.style.display = 'block';
}
export function positionBarTooltip(evt){
  const el = ensureBarTooltip();
  const pad = 16;
  // segue o cursor, com clamp pra não estourar a borda direita/inferior da tela
  const maxLeft = window.innerWidth - el.offsetWidth - pad;
  const maxTop = window.innerHeight - el.offsetHeight - pad;
  el.style.left = Math.max(pad, Math.min(evt.clientX + 14, maxLeft)) + 'px';
  el.style.top = Math.max(pad, Math.min(evt.clientY + 14, maxTop)) + 'px';
}
export function hideBarTooltip(){
  if (barTooltipEl) barTooltipEl.style.display = 'none';
}

// Hover dos quadros Estrutura/Destino (stat-row logo acima de "Marcadores por área"):
// mesma mecânica do hover das barras de categoria (showBarTooltip), mas aqui não há
// dois segmentos verde/vermelho pra hover separado — é um número único — então as duas
// listas (harmônico/tenso, alimentadas em computeScores por structure*Details /
// destiny*Details) entram juntas num tooltip só, com cabeçalho por seção. Handlers são
// atribuídos por propriedade (onmouseenter, não addEventListener) porque #destinyVal/
// #structureVal são elementos fixos do HTML, reaproveitados a cada novo cálculo — usar
// addEventListener aqui empilharia um listener novo por cálculo.
export function setAxisHover(valElId, harmonicLines, tenseLines, ambivalentLines){
  const valEl = document.getElementById(valElId);
  if (!valEl) return;
  const box = valEl.closest('.stat') || valEl;
  const h = harmonicLines || [];
  const t = tenseLines || [];
  // Ambivalentes (🟡) ganham seção própria em vez de aparecer nas duas — evita repetir a
  // mesma linha em "Harmônico" e "Tenso" (ver discussão no chat: fica extenso e
  // redundante). Fallback pra harmonicLines∩tenseLines cobre entradas antigas do
  // histórico, calculadas antes dessa separação, que ainda vêm com a linha duplicada nos
  // dois arrays em vez de um terceiro array próprio — "Recalcular" atualiza pro formato novo.
  const a = ambivalentLines || h.filter(line => t.includes(line));
  const hOnly = ambivalentLines ? h : h.filter(line => !a.includes(line));
  const tOnly = ambivalentLines ? t : t.filter(line => !a.includes(line));
  const lines = [];
  if (hOnly.length){ lines.push('✅ Harmônico:', ...hOnly); }
  if (a.length){ if (lines.length) lines.push(''); lines.push('🟡 Ambivalente:', ...a); }
  if (tOnly.length){ if (lines.length) lines.push(''); lines.push('⚠️ Tenso:', ...tOnly); }
  if (lines.length){
    box.style.cursor = 'help';
    box.onmouseenter = () => showBarTooltip(lines, '');
    box.onmousemove = positionBarTooltip;
    box.onmouseleave = hideBarTooltip;
  } else {
    box.style.cursor = '';
    box.onmouseenter = null;
    box.onmousemove = null;
    box.onmouseleave = null;
  }
}

export function renderCategoryVisuals(categoryScores, relType){
  const catMeta = catMetaFor(relType);

  const bars = document.getElementById('bars');
  bars.innerHTML = '';
  if (!categoryScores){
    bars.innerHTML = '<div class="confidence-note" style="margin:0; text-align:left;">⚠ Essa entrada foi calculada com um modelo de categoria antigo — use "Recalcular" no histórico (ou espere a migração automática) pra atualizar.</div>';
    return;
  }
  // Afinidade não existia em algumas entradas salvas antes desta categoria (raras: só
  // localStorage muito antigo que nunca passou por recalcAllComparisons por falta de
  // c.raw) — default seguro evita quebrar o painel inteiro por causa de uma categoria
  // faltando.
  const catDataFor = (key) => categoryScores[key] || { presence: 0, harmonyPct: null, eligibleCount: 0 };
  // Ordem FIXA (CATEGORY_KEYS), não mais reordenada por presence — assim a posição de
  // cada área é sempre a mesma entre entradas/telas diferentes, o que facilita comparar.
  const order = CATEGORY_KEYS;
  for (const key of order){
    const meta = catMeta[key];
    const { presence, harmonyPct: hPct, eligibleCount } = catDataFor(key);
    // hPct null significa peso de sinal abaixo do piso de confiança (ver
    // CALIBRATION.minAxisSignalWeight) — presence já vem 0 nesse caso, mas mostramos
    // "—" em vez do número 0, pra não parecer "zero de verdade" (ausência de química)
    // quando na real é "achei marcadores, mas fracos/dispersos demais pra confiar".
    const valLabel = eligibleCount === 0 ? 'sem marcadores'
      : (hPct !== null
          ? `<span class="val-presence" title="Presença: o quanto essa área apareceu no mapa (quantos marcadores dela foram encontrados, e quão exatos)">presença ${presence}</span><span class="val-dot">·</span><span class="val-harmony" title="Favorável: entre os marcadores encontrados, % que puxa pro lado que flui em vez do que atrita">${hPct}% favorável</span>`
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
        <div class="bar-fill" style="background:${CATEGORY_HARMONIC_COLOR}"></div>
        <div class="bar-fill" style="background:var(--rose)"></div>
      </div>
      ${noteLabel ? `<div class="bar-note">${noteLabel}</div>` : ''}
    `;
    bars.appendChild(row);
    const fills = row.querySelectorAll('.bar-fill');
    // Hover: verde mostra os marcadores que contam pro lado que flui nessa categoria,
    // vermelho os que contam pro lado que atrita (ambivalentes aparecem nos dois — ver
    // comentário em computeScores, onde harmonicDetails/tenseDetails são montados).
    // Marcadores de casa SEM valência definida (a maioria — ver HOUSE_PLANET_VALENCE)
    // não entram no split verde/vermelho: não têm leitura tradicional de lado, só
    // presença (ficam em houseDetails, abaixo). Os COM valência (Vênus/Júpiter/Saturno/
    // Marte/Plutão/Netuno/Quíron/Lilith) JÁ entram direto em harmonicDetails/tenseDetails
    // (ou ambivalentDetails, no caso dos ambivalentes) no loop de casas (ver comentário
    // lá), então aparecem coloridos no hover dos fills como
    // qualquer aspecto — é esse o ponto da mudança pós-discussão.
    const harmonicLines = catDataFor(key).harmonicDetails || [];
    const tenseLines = catDataFor(key).tenseDetails || [];
    const houseLines = catDataFor(key).houseDetails || [];
    // Lista completa pra frase "N marcador(es) encontrado(s)": aspectos (deduplicando
    // ambivalentes, que entram nas duas listas acima) + casas. Sem isso, eligibleCount
    // podia contar um marcador de casa que não aparecia em NENHUM tooltip — "2
    // marcadores encontrados" com só 1 linha visível ao passar o mouse, porque o hover
    // só lia harmonicDetails/tenseDetails (só aspecto). Caso real: Vênus de A na 4ª
    // casa de B, marcador silencioso em Emocional.
    const allLines = [...new Set([...harmonicLines, ...tenseLines]), ...houseLines];
    if (hPct !== null){
      // sinal confiável: a barra tem largura de verdade, então o hover dos dois
      // segmentos preenchidos continua mostrando só aspectos, separados por cor, como
      // sempre foi — casas não entram aqui porque não têm lado (flui/atrita).
      fills[0].style.cursor = 'help';
      fills[1].style.cursor = 'help';
      fills[0].addEventListener('mouseenter', () => showBarTooltip(harmonicLines, 'Nenhum marcador favorável específico nesta área.'));
      fills[1].addEventListener('mouseenter', () => showBarTooltip(tenseLines, 'Nenhum marcador tenso específico nesta área.'));
      fills[0].addEventListener('mousemove', positionBarTooltip);
      fills[1].addEventListener('mousemove', positionBarTooltip);
      fills[0].addEventListener('mouseleave', hideBarTooltip);
      fills[1].addEventListener('mouseleave', hideBarTooltip);
    }
    // A frase "N marcador(es) encontrado(s)" (.bar-note) sempre existe quando
    // eligibleCount > 0, com ou sem sinal confiável — diferente dos .bar-fill, que
    // ficam com 0% de largura (logo, sem área pra hover) quando hPct é null. Por isso
    // o hover completo (aspectos + casas) fica preso nela, não nos fills: é o único
    // elemento garantidamente visível/hoverável nos dois casos.
    const note = row.querySelector('.bar-note');
    if (note && allLines.length > 0){
      note.style.cursor = 'help';
      note.addEventListener('mouseenter', () => showBarTooltip(allLines, 'Nenhum marcador específico nesta área.'));
      note.addEventListener('mousemove', positionBarTooltip);
      note.addEventListener('mouseleave', hideBarTooltip);
    }
    setTimeout(() => {
      if (hPct !== null){
        fills[0].style.width = (presence * hPct / 100) + '%';
        fills[1].style.width = (presence * (100 - hPct) / 100) + '%';
      } else {
        // peso de sinal abaixo do piso de confiança — presence já é 0 aqui, então a
        // barra fica vazia em vez de alegar uma presença que os dados não sustentam.
        fills[0].style.width = '0%';
        fills[1].style.width = '0%';
      }
    }, 60);
  }
}

