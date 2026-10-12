// ============================================================================
// sinastria/js/from-pessoas.js
// Ponte entre o cadastro de pessoas (assets/js/pessoas.js) e a Calculadora de
// Sinastria (sinastria.html / main.js): a partir de duas pessoas cadastradas,
// calcula os dois mapas usando o mesmíssimo motor de efemérides já usado em
// Mapas Astrais (computeSynChartFromInput, em efemerides/js/features/
// synastry.js) e monta o texto no formato que o parser desta página já sabe
// ler (buildSinastriaText) — nada da lógica de aspectos, pontuação ou parsing
// daqui se duplica; só o cálculo de posições/casas passa a ser importado
// também nesta página. A colagem manual continua funcionando exatamente como
// antes, lado a lado.
// ============================================================================

import { computeSynChartFromInput, computeSynAspectRows, buildSinastriaText } from '../../efemerides/js/features/synastry.js';

// Sigla usada no texto-ponte (ex: "VL's Sun..."). Sem sigla cadastrada, cai
// pro nome; sem nenhum dos dois (não deveria acontecer, nome é obrigatório
// no cadastro), cai pro fallback 'A'/'B'.
function siglaOf(pessoa, fallback) {
  if (pessoa.sigla && pessoa.sigla.trim()) return pessoa.sigla.trim();
  if (pessoa.nome && pessoa.nome.trim()) return pessoa.nome.trim();
  return fallback;
}

// pessoaA, pessoaB: registros do cadastro (ver assets/js/pessoas.js — mesmo
// formato aceito por computeSynChartFromInput: data_nascimento,
// hora_nascimento, fuso_horario, latitude, longitude, sistema_casas).
// Retorna {text, nameA, nameB, warningA, warningB} pronto pro textarea de
// colagem desta página (mesmo formato que a Efemérides já entrega via
// 'synastry:pendingImport'), ou null se faltar data de nascimento em alguma
// das duas pessoas.
export function buildSinastriaTextFromPessoas(pessoaA, pessoaB) {
  if (!pessoaA || !pessoaB || !pessoaA.data_nascimento || !pessoaB.data_nascimento) return null;

  const resultA = computeSynChartFromInput(pessoaA);
  const resultB = computeSynChartFromInput(pessoaB);
  if (!resultA || !resultB) return null;

  const nameA = (pessoaA.nome && pessoaA.nome.trim()) || 'Pessoa A';
  const nameB = (pessoaB.nome && pessoaB.nome.trim()) || 'Pessoa B';
  const siglaA = siglaOf(pessoaA, 'A');
  const siglaB = siglaOf(pessoaB, 'B');

  const rows = computeSynAspectRows(resultA.chart, resultB.chart);
  const text = buildSinastriaText({
    chartA: resultA.chart,
    chartB: resultB.chart,
    nameA, nameB, siglaA, siglaB,
    rows,
  });

  return { text, nameA, nameB, warningA: resultA.warning, warningB: resultB.warning };
}
