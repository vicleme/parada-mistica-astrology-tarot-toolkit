// =============================================================
//  TEMA — Claro / Escuro / Sistema
//
//  Cicla entre três modos: claro → escuro → sistema
//  O modo é persistido no localStorage.
//  O tema é aplicado via data-tema="escuro" no <html>.
//  Um script inline no <head> do index.html evita o flash
//  de tema errado no carregamento.
// =============================================================

const TEMA_KEY  = "cartarium_tema";
const TEMAS     = ["claro", "escuro", "sistema"];
const ICONES    = { claro: "☀️", escuro: "🌙", sistema: "🖥️" };
const ROTULOS   = { claro: "Tema claro", escuro: "Tema escuro", sistema: "Tema do sistema" };

function _temaAtual() {
    return localStorage.getItem(TEMA_KEY) || "sistema";
}

function _aplicarTema(tema) {
    const escuro =
        tema === "escuro" ||
        (tema === "sistema" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    document.documentElement.setAttribute("data-tema", escuro ? "escuro" : "claro");
    _atualizarBotao(tema);
}

function _atualizarBotao(tema) {
    const btn = document.getElementById("btn-tema");
    if (!btn) return;
    btn.textContent = ICONES[tema] || "🖥️";
    btn.title       = ROTULOS[tema] || "Tema";
}

function ciclaTema() {
    const atual  = _temaAtual();
    const idx    = TEMAS.indexOf(atual);
    const proximo = TEMAS[(idx + 1) % TEMAS.length];
    localStorage.setItem(TEMA_KEY, proximo);
    _aplicarTema(proximo);
}
window.ciclaTema = ciclaTema;

// Reage a mudanças na preferência do sistema enquanto no modo "sistema"
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (_temaAtual() === "sistema") _aplicarTema("sistema");
});

document.addEventListener("DOMContentLoaded", () => {
    _aplicarTema(_temaAtual());
});
