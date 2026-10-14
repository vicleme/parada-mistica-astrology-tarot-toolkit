// ============================================================================
// core/time.js
// Conversão de datas de calendário para Dia Juliano (JD), a unidade de tempo
// usada por todo o motor de efemérides/casas. Não depende de nenhum outro módulo.
// ============================================================================

export const RAD = Math.PI / 180;

export function normDeg(d) {
  d = d % 360;
  if (d < 0) d += 360;
  return d;
}

// Dia Juliano a partir de ano/mês/dia/hora em calendário gregoriano (algoritmo padrão, Meeus cap. 7).
export function toJD(y, m, d, h) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + h / 24 + B - 1524.5;
}

// Converte data/hora LOCAL (com fuso tz em horas) para Dia Juliano em UT.
export function dateToJD_UT(y, m, d, localHour, tz) {
  const jdLocal = toJD(y, m, d, localHour);
  return jdLocal - (tz || 0) / 24;
}
