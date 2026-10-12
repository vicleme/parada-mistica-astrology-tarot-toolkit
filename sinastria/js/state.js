/**
 * state.js — Estado global do app + persistência em localStorage.
 * Guarda: lista de comparações salvas, dicionário de significados, configs de
 * prompt, e o estado de UI das abas Dicionário/Relatório. Não depende de nenhum
 * outro módulo do projeto.
 * Usado por: comparisons.js, dictionary.js, main.js, report.js.
 */

// ---------- Comparação entre sinastrias ----------
export const COMPARE_KEY = 'sinastria_comparisons_v1';

export let storageAvailable = true;
try {
  const testKey = '__sinastria_storage_test__';
  localStorage.setItem(testKey, '1');
  localStorage.removeItem(testKey);
} catch(e){ storageAvailable = false; }
if (!storageAvailable){
  document.getElementById('storageWarning').style.display = 'flex';
}

export let comparisons = [];
try { comparisons = storageAvailable ? (JSON.parse(localStorage.getItem(COMPARE_KEY)) || []) : []; } catch(e){ comparisons = []; }
export function setComparisons(v){ comparisons = v; }

export function saveComparisons(){
  if (!storageAvailable) return;
  try { localStorage.setItem(COMPARE_KEY, JSON.stringify(comparisons)); } catch(e){ /* storage indisponível, segue só em memória */ }
}

export let editingId = null;
export function setEditingId(v){ editingId = v; }

// ---------- Dicionário de significados ----------
// Reaproveita o mesmo critério de peso já usado no resto do app (orbe + tier do par
// pra aspectos via ORB_DECAY_DIVISOR/axisBoost; angularidade da casa via
// houseMarkerWeightFor) — não reinventa uma escala própria, só ordena por ela.
export const DICT_KEY = 'sinastria_dictionary_v1';
export let dictionary = [];
try { dictionary = storageAvailable ? (JSON.parse(localStorage.getItem(DICT_KEY)) || []) : []; } catch(e){ dictionary = []; }
export function setDictionary(v){ dictionary = v; }
export function saveDictionary(){
  if (!storageAvailable) return;
  try { localStorage.setItem(DICT_KEY, JSON.stringify(dictionary)); } catch(e){ /* storage indisponível */ }
}

// Config do "prompt de preenchimento" (nomes, siglas, contexto do vínculo) usada pelo
// botão "Copiar prompt" de cada linha do dicionário. Guardada por sinastria (mesmo id
// de `comparisons`), porque a sigla de cada pessoa vem do relatório astrológico colado
// (ex: "VL", "MP") e não tem por que bater entre sinastrias diferentes.
export const PROMPT_CFG_KEY = 'sinastria_prompt_config_v1';
export let promptConfigs = {};
try { promptConfigs = storageAvailable ? (JSON.parse(localStorage.getItem(PROMPT_CFG_KEY)) || {}) : {}; } catch(e){ promptConfigs = {}; }
export function savePromptConfigs(){
  if (!storageAvailable) return;
  try { localStorage.setItem(PROMPT_CFG_KEY, JSON.stringify(promptConfigs)); } catch(e){ /* storage indisponível */ }
}

// ---------- Aba do Dicionário: qual sinastria salva está sendo vista ----------
// O dicionário virou uma aba própria (antes ficava dentro dos resultados da
// calculadora, então só mostrava linhas logo depois de clicar "Calcular" — se a
// pessoa recarregasse a página ou abrisse a aba direto, a lista ficava vazia). Agora
// ela sempre lê o texto bruto (c.raw) de uma sinastria já salva na lista de
// comparação, escolhida no seletor abaixo do título.
export let currentDictSynastryId = null;
export function setCurrentDictSynastryId(v){ currentDictSynastryId = v; }

export let currentDictFilter = 'all';
export function setCurrentDictFilter(v){ currentDictFilter = v; }

// reportCheckedIds guarda o estado (marcado/desmarcado) de cada sinastria entre uma
// re-renderização da lista e outra — sem isso, toda vez que a lista fosse redesenhada
// (ex: trocar de aba e voltar) as marcações escolhidas pela pessoa seriam perdidas.
// reportKnownIds serve só pra saber quais ids já apareceram alguma vez: uma sinastria
// nova (calculada depois que a aba já foi aberta) entra marcada por padrão, sem mexer
// no que já estava marcado/desmarcado nas outras.
export let reportCheckedIds = new Set();
export let reportKnownIds = new Set();
