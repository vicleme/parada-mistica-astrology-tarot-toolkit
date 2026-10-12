// ============================================================================
// assets/js/pessoas.js
// Cadastro único de pessoas (nome, sigla, dados de nascimento), compartilhado
// por todas as ferramentas do site que precisam de dados de nascimento —
// hoje: Mapa Natal e Sinastria (mapas.html) e a Calculadora de Sinastria
// (sinastria.html). Camada pura de dados (sem DOM nenhum) + persistência em
// localStorage; cada página cuida da própria UI (seletor, modal) importando
// daqui — ver assets/js/pessoa-picker.js para os componentes de UI
// compartilhados que usam este módulo.
// ============================================================================

export const PESSOAS_STORAGE_KEY = 'parada_mistica_pessoas_v1';

export let storageAvailable = true;
try {
  const testKey = '__pm_pessoas_storage_test__';
  localStorage.setItem(testKey, '1');
  localStorage.removeItem(testKey);
} catch (e) { storageAvailable = false; }

function readAll() {
  if (!storageAvailable) return [];
  try { return JSON.parse(localStorage.getItem(PESSOAS_STORAGE_KEY)) || []; }
  catch (e) { return []; }
}
function writeAll(list) {
  if (!storageAvailable) return;
  try { localStorage.setItem(PESSOAS_STORAGE_KEY, JSON.stringify(list)); }
  catch (e) { /* storage indisponível (aba anônima etc.) — segue só em memória */ }
}

// Lista ordenada por nome (pt-BR), pronta pra popular um <select> — usada
// pelos seletores de pessoa (Mapa Natal, Sinastria, Calculadora), que sempre
// querem ordem alfabética pra achar alguém rápido, independente de como a
// aba "Pessoas" (gestão completa) está ordenada no momento.
export function listPessoas() {
  return sortPessoas(readAll(), 'nome');
}

// Critérios de ordenação pra lista de gestão completa (aba "Pessoas").
export const PESSOAS_SORT_OPTIONS = [
  { value: 'nome', label: 'Nome (A-Z)' },
  { value: 'criado_em', label: 'Ordem de cadastro' },
  { value: 'atualizado_em', label: 'Atualizado recentemente' },
  { value: 'nascimento', label: 'Data de nascimento' },
];
export function sortPessoas(list, criterion) {
  const arr = list.slice();
  switch (criterion) {
    case 'criado_em':
      return arr.sort((a, b) => (a.criado_em || '').localeCompare(b.criado_em || ''));
    case 'atualizado_em':
      return arr.sort((a, b) => (b.atualizado_em || '').localeCompare(a.atualizado_em || ''));
    case 'nascimento':
      return arr.sort((a, b) => (a.data_nascimento || '').localeCompare(b.data_nascimento || ''));
    case 'nome':
    default:
      return arr.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
  }
}

export function getPessoa(id) {
  return readAll().find(p => p.id === id) || null;
}

// data: {nome, sigla, data_nascimento, hora_nascimento, fuso_horario, latitude,
// longitude, sistema_casas}. Sem data.id → cria pessoa nova. Com data.id →
// atualiza a existente (mantém criado_em). Retorna o registro salvo, ou null
// se data.id não corresponder a ninguém.
export function savePessoa(data) {
  const list = readAll();
  const now = new Date().toISOString();
  if (data.id) {
    const idx = list.findIndex(p => p.id === data.id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data, atualizado_em: now };
    writeAll(list);
    return list[idx];
  }
  const pessoa = {
    ...data,
    id: 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    criado_em: now,
    atualizado_em: now,
  };
  list.push(pessoa);
  writeAll(list);
  return pessoa;
}

export function deletePessoa(id) {
  writeAll(readAll().filter(p => p.id !== id));
}
