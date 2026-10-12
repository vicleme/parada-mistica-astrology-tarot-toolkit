/**
 * ui.js — Utilidades genéricas de UI que não pertencem a nenhuma aba
 * específica: troca de aba principal, auto-grow de textarea.
 * Depende de: dictionary.js, report.js.
 * Usado por: dictionary.js, main.js.
 */

import { refreshDictSynastryOptions } from './dictionary.js';
import { renderReportSynastryList } from './report.js';

export function switchMainTab(tabId){
  document.querySelectorAll('.tab-view').forEach(el => el.classList.toggle('active', el.id === tabId));
  document.querySelectorAll('.main-tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
  if (tabId === 'dictTab') refreshDictSynastryOptions();
  if (tabId === 'reportTab') renderReportSynastryList();
}
export function autoGrowTextarea(ta){
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

