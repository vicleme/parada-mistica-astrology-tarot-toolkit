// ============================================================================
// ui/render-helpers.js
// Pequenos helpers de renderização HTML reaproveitados por mais de uma feature
// (Trânsitos, Sinastria, Trânsitos duplos, Composto), pra não duplicar markup.
// ============================================================================

// Renderiza a barrinha de 5 níveis usada nas tabelas de resultado para representar
// visualmente r.score (0-100).
export function impactBar(score) {
  const level = Math.max(1, Math.min(5, Math.ceil(score / 20)));
  let s = '<span class="impact-bar">';
  for (let i = 1; i <= 5; i++) s += '<span class="' + (i <= level ? 'on' : '') + '"></span>';
  return s + '</span>';
}
