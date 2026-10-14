// ============================================================================
// shared/download.js
// Dispara o download de um blob de texto (usado pelos botões "Exportar JSON"
// e "Exportar CSV" de todas as features: Trânsitos, Sinastria, Trânsitos
// duplos e Composto).
// ============================================================================

export function downloadBlob(text, filename, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
