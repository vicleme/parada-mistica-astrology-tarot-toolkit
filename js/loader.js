// =============================================================
//  LOADER DE BARALHOS — v2
//
//  Responsabilidades:
//    1. Cria window.DECKS antes de qualquer script de baralho
//    2. Cada deck.js chama DECKS.registrar({ id, nome, ... })
//    3. Após todos carregarem, popula os <select> de sistema e baralho
//    4. Gerencia estado de sessão (baralho consumido vs. reiniciado)
// =============================================================

// ── Registro global de decks ──────────────────────────────────
window.DECKS = {
    _lista: {},
    registrar(deck) { this._lista[deck.id] = deck; },
    get(id)         { return this._lista[id]; },
    remover(id)     { delete this._lista[id]; }
};

// ── Estado da sessão ──────────────────────────────────────────
window.SESSAO = {
    ativa: false,           // true = Modo Sessão
    cartasRestantes: [],    // índices das cartas que ainda não saíram
    deckId: null,           // id do deck ativo na sessão
    copias: 1,              // quantos baralhos iguais formam o monte (1, 2 ou 3)

    iniciar(deckId, copias = 1) {
        this.ativa   = true;
        this.deckId  = deckId;
        this.copias  = copias;
        this.cartasRestantes = criarPool(DECKS.get(deckId), copias);
        esconderAvisoTroca();
        this._atualizarContador();
    },

    reiniciar() {
        if (!this.deckId) return;
        this.cartasRestantes = criarPool(DECKS.get(this.deckId), this.copias);
        this._atualizarContador();
    },

    encerrar() {
        this.ativa  = false;
        this.deckId = null;
        this.copias = 1;
        esconderAvisoTroca();
        this.cartasRestantes = [];
        this._atualizarContador();
    },

    retirar(n) {
        // Retorna n índices do topo do baralho, atualizando cartasRestantes
        const retiradas = this.cartasRestantes.splice(0, n);
        this._atualizarContador();
        return retiradas;
    },

    _atualizarContador() {
        const el = document.getElementById("sessao-contador");
        if (!el) return;
        if (!this.ativa) { el.textContent = ""; return; }
        const deck = DECKS.get(this.deckId);
        const total = deck ? deck.cartas.length * this.copias : "?";
        const tipo  = this.copias === 2 ? " (baralho duplo)" : this.copias === 3 ? " (baralho triplo)" : "";
        el.textContent = `🃏 Sessão ativa${tipo}: ${this.cartasRestantes.length} / ${total} cartas restantes`;
    }
};

// ── Utilitário: embaralhar array (Fisher-Yates) ───────────────
function embaralhar(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
window.embaralhar = embaralhar;

// ── Monte de cartas ───────────────────────────────────────────
// Devolve os índices das cartas já embaralhados. Com copias > 1 o monte
// tem várias cópias do baralho (duplo, triplo), então o mesmo índice
// aparece mais de uma vez.
function criarPool(deck, copias = 1) {
    const n = deck.cartas.length;
    return embaralhar(Array.from({ length: n * copias }, (_, i) => i % n));
}
window.criarPool = criarPool;

function obterCopias() {
    const el = document.getElementById("copias");
    return el ? (parseInt(el.value, 10) || 1) : 1;
}
window.obterCopias = obterCopias;

// ── Baralhos incompletos: completam com outro baralho ─────────────
// Um deck pode declarar `fallbackDeck: "idDoBaralhoBase"`. Suas cartas
// (nomes, significados e imagens) valem até onde ele tem arte própria;
// as posições seguintes vêm do baralho base. Assim um baralho em
// criação já funciona completo. Chamado quando todos os decks carregaram.
function resolverFallbacks() {
    Object.values(DECKS._lista).forEach(deck => {
        if (!deck.fallbackDeck || deck._fallbackOk) return;
        const base = DECKS.get(deck.fallbackDeck);
        if (!base) {
            console.warn(`[loader] Baralho base "${deck.fallbackDeck}" não carregou; "${deck.id}" fica incompleto.`);
            return;
        }
        deck.totalProprias = deck.cartas.length;
        deck.cartas        = [...deck.cartas, ...base.cartas.slice(deck.totalProprias)];
        deck.significados  = { ...base.significados, ...deck.significados };
        deck._fallbackOk   = true;
    });
}

// ── URL de imagem ─────────────────────────────────────────────
function imagemCarta(deck, indiceCarta) {
    let fonte = deck;
    if (deck.totalProprias && indiceCarta > deck.totalProprias) {
        fonte = DECKS.get(deck.fallbackDeck) || deck;
    }
    // Baralho personalizado (importado ou criado no navegador): as imagens já são URLs de blob.
    if (fonte.imagens) return fonte.imagens[indiceCarta - 1];
    const pasta = fonte.imagemPasta || fonte.id;
    const ext   = fonte.imagemExtensao || ".jpg";
    return `images/${pasta}/${indiceCarta}${ext}`;
}
window.imagemCarta = imagemCarta;

// ── Popula os selects de sistema e baralho ────────────────────
function popularSelects() {
    resolverFallbacks();
    const selSistema  = document.getElementById("sistema");
    const selBaralho  = document.getElementById("deck");

    if (!selSistema || !selBaralho) return;

    // Popula sistemas
    preencherSistemas(selSistema);

    // ── Restaura sistema favorito antes de popular baralhos ───
    const favSistema = localStorage.getItem("cartarium_favorito_sistema");
    if (favSistema && selSistema.querySelector(`option[value="${favSistema}"]`)) {
        selSistema.value = favSistema;
    }
    // ──────────────────────────────────────────────────────────

    // Ao mudar sistema, atualiza baralhos, spreads e sugestões de pergunta
    selSistema.addEventListener("change", () => {
        popularBaralhos(selSistema.value);
        popularSpreads(selSistema.value);
        if (typeof renderizarSugestoes === "function") {
            document.querySelectorAll(".pergunta-bloco").forEach(bloco => {
                renderizarSugestoes(bloco, parseInt(bloco.dataset.id));
            });
        }
    });

    // Popula baralhos do primeiro sistema
    popularBaralhos(selSistema.value);
    popularSpreads(selSistema.value);

    // Reage à troca de baralho para mostrar/esconder checkbox de inversão
    selBaralho.addEventListener("change", () => {
        atualizarCheckboxInversao(selBaralho.value);
        _atualizarBotaoFavorito(selBaralho.value);
        popularCreditos(selBaralho.value);
        if (typeof atualizarMaxCartas === "function") atualizarMaxCartas();
        // Se há sessão ativa com outro deck, avisa
        if (SESSAO.ativa && SESSAO.deckId !== selBaralho.value) {
            mostrarAvisoTrocaDeck();
        } else if (SESSAO.ativa && SESSAO.copias === obterCopias()) {
            esconderAvisoTroca();
        }
    });

    // Reage à troca da quantidade de baralhos (simples, duplo, triplo)
    const selCopias = document.getElementById("copias");
    if (selCopias) {
        selCopias.addEventListener("change", () => {
            if (typeof atualizarMaxCartas === "function") atualizarMaxCartas();
            if (SESSAO.ativa && SESSAO.copias !== obterCopias()) {
                mostrarAvisoTrocaDeck();
            } else if (SESSAO.ativa && SESSAO.deckId === selBaralho.value) {
                esconderAvisoTroca();
            }
        });
    }

    atualizarCheckboxInversao(selBaralho.value);

    // Re-renderiza sugestões agora que questions.js e os decks já carregaram
    // (a pergunta inicial é criada antes, quando o banco ainda era undefined)
    if (typeof renderizarSugestoes === "function") {
        document.querySelectorAll(".pergunta-bloco").forEach(bloco => {
            renderizarSugestoes(bloco, parseInt(bloco.dataset.id));
        });
    }
}

// Baralhos que o usuário ocultou (só vale no navegador dele; ver js/custom-decks.js)
function baralhoVisivel(id) {
    return !(window.CUSTOM_DECKS && window.CUSTOM_DECKS.estaOculto(id));
}

function preencherSistemas(selSistema) {
    selSistema.innerHTML = "";
    SISTEMAS.forEach(s => {
        // Só exibe sistemas que tenham pelo menos um deck carregado e visível
        const temDeck = s.baralhos.some(id => DECKS.get(id) && baralhoVisivel(id));
        if (!temDeck) return;
        const opt       = document.createElement("option");
        opt.value       = s.id;
        opt.textContent = s.nome;
        selSistema.appendChild(opt);
    });
}

// Repopula os selects depois de importar, criar, excluir ou ocultar um baralho.
// `deckIdPreferido` (opcional) é o baralho que deve ficar selecionado.
function recarregarSeletores(deckIdPreferido) {
    const selSistema = document.getElementById("sistema");
    const selBaralho = document.getElementById("deck");
    if (!selSistema || !selBaralho) return;

    const sistemaAnterior = selSistema.value;
    const deckAlvo        = deckIdPreferido || selBaralho.value;
    preencherSistemas(selSistema);

    let sistemaAlvo = sistemaAnterior;
    if (deckIdPreferido) {
        const dono = SISTEMAS.find(s => s.baralhos.includes(deckIdPreferido));
        if (dono) sistemaAlvo = dono.id;
    }
    if (!selSistema.querySelector(`option[value="${sistemaAlvo}"]`)) {
        sistemaAlvo = selSistema.options[0] ? selSistema.options[0].value : "";
    }
    selSistema.value = sistemaAlvo;

    popularBaralhos(sistemaAlvo);
    if (selBaralho.querySelector(`option[value="${deckAlvo}"]`)) selBaralho.value = deckAlvo;
    popularSpreads(sistemaAlvo);

    if (sistemaAlvo !== sistemaAnterior && typeof renderizarSugestoes === "function") {
        document.querySelectorAll(".pergunta-bloco").forEach(bloco => {
            renderizarSugestoes(bloco, parseInt(bloco.dataset.id));
        });
    }
    // Atualiza créditos, checkbox de inversão e limite de cartas para o baralho atual
    selBaralho.dispatchEvent(new Event("change"));
}
window.recarregarSeletores = recarregarSeletores;

function popularBaralhos(sistemaId) {
    const selBaralho = document.getElementById("deck");
    selBaralho.innerHTML = "";

    const sistema = SISTEMAS.find(s => s.id === sistemaId);
    if (!sistema) return;

    sistema.baralhos.forEach(id => {
        const deck = DECKS.get(id);
        if (!deck || !baralhoVisivel(id)) return;
        const opt       = document.createElement("option");
        opt.value       = deck.id;
        opt.textContent = deck.nome;
        selBaralho.appendChild(opt);
    });

    // ── Seleciona favorito se disponível neste sistema ────────
    const fav = localStorage.getItem("cartarium_favorito");
    if (fav && selBaralho.querySelector(`option[value="${fav}"]`)) {
        selBaralho.value = fav;
    }
    _atualizarBotaoFavorito(selBaralho.value);
    // ──────────────────────────────────────────────────────────

    atualizarCheckboxInversao(selBaralho.value);
    popularCreditos(selBaralho.value);
}

function popularSpreads(sistemaId) {
    const selSpread = document.getElementById("spread");
    if (!selSpread) return;
    selSpread.innerHTML = "";

    // Agrupa spreads por campo `grupo`, preservando a ordem de inserção
    const grupos = new Map();
    SPREADS.forEach(sp => {
        const compativel = sp.sistemas.length === 0 || sp.sistemas.includes(sistemaBase(sistemaId));
        if (!compativel) return;
        const g = sp.grupo || "Outros";
        if (!grupos.has(g)) grupos.set(g, []);
        grupos.get(g).push(sp);
    });

    // Se só há um grupo, não cria optgroup (mantém seletor simples)
    const usarGrupos = grupos.size > 1;

    grupos.forEach((spreads, nomeGrupo) => {
        const container = usarGrupos ? document.createElement("optgroup") : selSpread;
        if (usarGrupos) {
            container.label = nomeGrupo;
        }
        spreads.forEach(sp => {
            const opt       = document.createElement("option");
            opt.value       = sp.id;
            opt.textContent = sp.nome;
            container.appendChild(opt);
        });
        if (usarGrupos) selSpread.appendChild(container);
    });

    atualizarUISpread(selSpread.value);
    selSpread.onchange = () => atualizarUISpread(selSpread.value);
}

function atualizarUISpread(spreadId) {
    const spread        = SPREADS.find(s => s.id === spreadId);
    const wrapperPos    = document.getElementById("wrapper-posicoes");
    const infoSpread    = document.getElementById("spread-info");

    if (!spread) return;

    const livre = spread.posicoes.length === 0;

    // Modo com posições: exibe descrição das posições
    if (wrapperPos && infoSpread) {
        if (!livre) {
            infoSpread.innerHTML = spread.posicoes
                .map((p, i) => `<div class="posicao-info"><span class="posicao-num">${i+1}.</span> <strong>${p.nome}</strong> — ${p.descricao}</div>`)
                .join("");
            wrapperPos.style.display = "block";
        } else {
            wrapperPos.style.display = "none";
        }
    }
}

// ── Créditos do baralho (opcional) ────────────────────────────
// Se o deck define `creditos: { texto, url, link, nota }`, mostra uma
// linha de crédito abaixo do seletor. Sem `creditos`, a linha some.
function popularCreditos(deckId) {
    const el = document.getElementById("deck-creditos");
    if (!el) return;
    el.textContent = "";
    const deck = DECKS.get(deckId);
    const c = deck?.creditos;
    if (!c && deck?.personalizado) {
        const aviso = document.createElement("span");
        aviso.textContent = "🎨 Baralho personalizado, salvo só neste navegador.";
        el.appendChild(aviso);
        el.style.display = "block";
        return;
    }
    if (!c) { el.style.display = "none"; return; }

    const linha = document.createElement("span");
    linha.textContent = `🎨 ${c.texto}`;
    if (c.url && /^https:\/\//.test(c.url)) {
        const a = document.createElement("a");
        a.href = c.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = c.link || c.url;
        linha.append(" · ", a);
    }
    el.appendChild(linha);
    if (c.nota) {
        const nota = document.createElement("span");
        nota.className = "deck-creditos-nota";
        nota.textContent = c.nota;
        el.appendChild(nota);
    }
    (c.fontes || []).forEach(f => {
        const linhaFonte = document.createElement("span");
        linhaFonte.className = "deck-creditos-nota";
        linhaFonte.append("Fonte: ");
        if (f.url && /^https:\/\//.test(f.url)) {
            const a = document.createElement("a");
            a.href = f.url;
            a.target = "_blank";
            a.rel = "noopener";
            a.textContent = f.link || f.url;
            linhaFonte.appendChild(a);
        } else {
            linhaFonte.append(f.link || "");
        }
        if (f.acesso) linhaFonte.append(` · Acesso em ${f.acesso}`);
        el.appendChild(linhaFonte);
    });
    if (deck.totalProprias) {
        const base = DECKS.get(deck.fallbackDeck);
        const aviso = document.createElement("span");
        aviso.className = "deck-creditos-nota";
        aviso.textContent = `Arte própria em ${deck.totalProprias} de ${deck.cartas.length} cartas. As demais usam o ${base.nome} até o artista publicar as novas.`;
        el.appendChild(aviso);
    }
    el.style.display = "block";
}

function atualizarCheckboxInversao(id) {
    const deck    = DECKS.get(id);
    const wrapper = document.getElementById("wrapper-invertida");
    if (!wrapper) return;
    const aceita  = deck && deck.aceitaInversao;
    wrapper.style.display = aceita ? "block" : "none";
    if (!aceita) {
        const cb = document.getElementById("invertida");
        if (cb) cb.checked = false;
    }
}

// ── Favorito ──────────────────────────────────────────────────
function toggleFavorito() {
    const deckId    = document.getElementById("deck").value;
    const sistemaId = document.getElementById("sistema").value;
    const atual     = localStorage.getItem("cartarium_favorito");
    const novoFav   = atual === deckId ? null : deckId;
    if (novoFav) {
        localStorage.setItem("cartarium_favorito", novoFav);
        localStorage.setItem("cartarium_favorito_sistema", sistemaId);
    } else {
        localStorage.removeItem("cartarium_favorito");
        localStorage.removeItem("cartarium_favorito_sistema");
    }
    _atualizarBotaoFavorito(deckId);
}
window.toggleFavorito = toggleFavorito;

function _atualizarBotaoFavorito(deckId) {
    const btn = document.getElementById("btn-favorito");
    if (!btn) return;
    const fav = localStorage.getItem("cartarium_favorito");
    btn.textContent = fav === deckId ? "★" : "☆";
    btn.title       = fav === deckId ? "Remover favorito" : "Definir como favorito";
}

function mostrarAvisoTrocaDeck() {
    const aviso = document.getElementById("aviso-troca-deck");
    if (aviso) aviso.style.display = "block";
}

function esconderAvisoTroca() {
    const aviso = document.getElementById("aviso-troca-deck");
    if (aviso) aviso.style.display = "none";
}

// ── Carregamento dinâmico dos scripts de deck ─────────────────
function finalizarCarregamento() {
    // Baralhos criados pelo usuário (IndexedDB) entram depois dos baralhos do site
    const personalizados = window.CUSTOM_DECKS ? window.CUSTOM_DECKS.carregar() : Promise.resolve();
    personalizados.catch(() => {}).then(popularSelects);
}

function carregarBaralhos() {
    let pendentes = BARALHOS_CONFIG.length;
    if (pendentes === 0) return;

    BARALHOS_CONFIG.forEach(id => {
        const script   = document.createElement("script");
        script.src     = `decks/${id}.js`;
        script.onload  = () => { pendentes--; if (pendentes === 0) finalizarCarregamento(); };
        script.onerror = () => { console.error(`[loader] Falha: decks/${id}.js`); pendentes--; if (pendentes === 0) finalizarCarregamento(); };
        document.body.appendChild(script);
    });
}

document.addEventListener("DOMContentLoaded", carregarBaralhos);
