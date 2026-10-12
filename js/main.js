// =============================================================
//  MAIN — LÓGICA PRINCIPAL DO CARTARIUM
//
//  Responsabilidades:
//    - Modo de operação (Consulta Única / Sessão)
//    - Gerenciamento de perguntas múltiplas
//    - Sorteio e renderização de cartas
//    - Registro de tiragens
//    - Modal de baralho esgotado
//    - Cópia de resultados
//    - Exibição do baralho completo
//    - Sugestões de perguntas por área
//    - Utilitários gerais
// =============================================================


// ══════════════════════════════════════════════════════════════
//  ESTADO GLOBAL
// ══════════════════════════════════════════════════════════════
let modoAtual        = "unica";   // "unica" | "sessao"
let perguntasAtivas  = [];        // [ { id, texto, numCartas } ]
let contadorPerg     = 0;

// Estado pendente para o modal de baralho esgotado
let _pendente = null;


// ══════════════════════════════════════════════════════════════
//  MODO DE OPERAÇÃO
// ══════════════════════════════════════════════════════════════
const MODO_AJUDA = {
    unica:  'Consulta Única: a cada "Tirar", o baralho é embaralhado do zero. A mesma carta pode se repetir de uma tiragem para a outra.',
    sessao: 'Sessão: o baralho é embaralhado uma vez e as cartas que saem não voltam até o baralho acabar ou você encerrar a sessão, como numa consulta presencial com várias perguntas.'
};

function definirModo(modo) {
    modoAtual = modo;

    const ajuda = document.getElementById("modo-ajuda");
    if (ajuda) ajuda.textContent = MODO_AJUDA[modo];

    document.getElementById("btn-modo-unica").classList.toggle("ativo", modo === "unica");
    document.getElementById("btn-modo-sessao").classList.toggle("ativo", modo === "sessao");
    document.getElementById("btn-encerrar-sessao").style.display = modo === "sessao" ? "inline-block" : "none";

    if (modo === "unica" && SESSAO.ativa) {
        SESSAO.encerrar();
    }
    esconderAvisoTroca();
}

function encerrarSessao() {
    if (!confirm("Encerrar a sessão atual? As cartas usadas voltam ao baralho.")) return;
    SESSAO.encerrar();
    definirModo("unica");
}


// ══════════════════════════════════════════════════════════════
//  PERGUNTAS MÚLTIPLAS
// ══════════════════════════════════════════════════════════════
// Máximo de cartas por pergunta: tamanho do monte (baralho x cópias).
// Sem baralho carregado ainda, usa 78 como antes.
function maxCartasAtual() {
    const sel  = document.getElementById("deck");
    const deck = sel ? DECKS.get(sel.value) : null;
    return deck ? deck.cartas.length * obterCopias() : 78;
}

function atualizarMaxCartas() {
    const max = maxCartasAtual();
    document.querySelectorAll('#perguntas-lista input[type="number"]').forEach(i => { i.max = max; });
}

const MODO_TEXTO_KEY = "cartarium_modo_texto_custom";

function _getModoTexto() {
    return localStorage.getItem(MODO_TEXTO_KEY) === "1";
}

function adicionarPergunta(texto = "", numCartas = null, focar = true, posicoesCustomInicial = null) {
    contadorPerg++;
    const id      = contadorPerg;
    const spread  = SPREADS.find(s => s.id === document.getElementById("spread").value);
    const nPadrao = spread && spread.posicoes.length > 0 ? spread.posicoes.length : (numCartas || 3);
    const isCustom = spread && spread.id === "personalizado";
    const modoTexto = isCustom ? _getModoTexto() : false;

    perguntasAtivas.push({ id, texto, numCartas: nPadrao, posicoesCustom: isCustom ? (posicoesCustomInicial || []) : null, modoTexto });

    const lista = document.getElementById("perguntas-lista");
    const bloco = document.createElement("div");
    bloco.className  = "pergunta-bloco";
    bloco.dataset.id = id;

    const spreadLivre = !spread || spread.posicoes.length === 0;
    const labelBtn    = modoTexto ? "Campos" : "Área de texto";

    bloco.innerHTML = `
        <div class="bloco-header">
            <span class="bloco-num">${id}</span>
            <input type="text" placeholder="Digite a pergunta…" value="${escapeHtml(texto)}"
                   oninput="atualizarPergunta(${id}, 'texto', this.value)"
                   onkeydown="if(event.key==='Enter'){event.preventDefault();sortearTudo();}">
            <button class="btn-remover-pergunta" onclick="removerPergunta(${id})" title="Remover esta pergunta">✕</button>
        </div>
        ${isCustom ? `
        <div class="bloco-footer bloco-footer-custom">
            <label>Cartas:</label>
            <input type="number" min="1" max="${maxCartasAtual()}" value="${nPadrao}" class="input-num-custom"
                   oninput="atualizarNumCustom(${id}, parseInt(this.value)||1)">
            <button type="button" class="btn-modo-texto" onclick="toggleModoTexto(${id})">${labelBtn}</button>
        </div>
        <div class="posicoes-custom-wrap" id="posicoes-custom-${id}"></div>` :
        spreadLivre ? `
        <div class="bloco-footer">
            <label>Cartas:</label>
            <input type="number" min="1" max="${maxCartasAtual()}" value="${nPadrao}"
                   oninput="atualizarPergunta(${id}, 'numCartas', parseInt(this.value)||1)">
        </div>` : `
        <div class="bloco-footer">
            <span style="font-size:0.82rem;color:var(--accent-hover)">🃏 ${nPadrao} carta${nPadrao !== 1 ? 's' : ''} — seguindo o spread selecionado</span>
        </div>`}
    `;

    lista.appendChild(bloco);

    if (isCustom) {
        if (modoTexto) {
            _aplicarModoTexto(id);
        } else {
            _renderizarPosicoesCustom(id, nPadrao);
        }
    }

    if (focar) bloco.querySelector("input[type=text]").focus();
    renderizarSugestoes(bloco, id);
}

function removerPergunta(id) {
    if (perguntasAtivas.length <= 1) {
        alert("É preciso ter ao menos uma pergunta.");
        return;
    }
    perguntasAtivas = perguntasAtivas.filter(p => p.id !== id);
    document.querySelector(`.pergunta-bloco[data-id="${id}"]`)?.remove();
    renumerarBlocos();
}

function atualizarPergunta(id, campo, valor) {
    const p = perguntasAtivas.find(p => p.id === id);
    if (p) p[campo] = valor;
}

function renumerarBlocos() {
    document.querySelectorAll(".pergunta-bloco").forEach((bloco, i) => {
        const num = bloco.querySelector(".bloco-num");
        if (num) num.textContent = i + 1;
    });
}

// Sincroniza dados dos inputs com o estado antes de sortear
function sincronizarPerguntas() {
    document.querySelectorAll(".pergunta-bloco").forEach(bloco => {
        const id  = parseInt(bloco.dataset.id);
        const p   = perguntasAtivas.find(p => p.id === id);
        if (!p) return;
        const txtInput = bloco.querySelector("input[type=text]");
        const numInput = bloco.querySelector("input[type=number]");
        if (txtInput) p.texto = txtInput.value.trim();
        if (numInput) p.numCartas = parseInt(numInput.value) || 1;

        // Coleta nomes das posições customizadas
        if (p.posicoesCustom !== null) {
            // Modo textarea
            const textarea = bloco.querySelector(".posicoes-textarea");
            if (textarea) {
                p.posicoesCustom = textarea.value.split("\n").map(l => l.trim());
                p.numCartas = p.posicoesCustom.filter(Boolean).length || p.numCartas;
            } else {
                bloco.querySelectorAll(".posicao-custom-input").forEach((input, i) => {
                    p.posicoesCustom[i] = input.value.trim();
                });
            }
        }
    });
}

// Inicializa com uma pergunta
document.addEventListener("DOMContentLoaded", () => {
    adicionarPergunta();
    document.getElementById("spread")?.addEventListener("change", atualizarBlocosSpread);
    definirOrdemCopia(ordemCopia);
});

function atualizarBlocosSpread() {
    const spread     = SPREADS.find(s => s.id === document.getElementById("spread").value);
    const nPosicoes  = spread && spread.posicoes.length > 0 ? spread.posicoes.length : null;
    const isCustom   = spread && spread.id === "personalizado";

    perguntasAtivas.forEach(p => {
        if (nPosicoes) p.numCartas = nPosicoes;
        if (isCustom && !p.posicoesCustom) p.posicoesCustom = [];
        if (!isCustom) p.posicoesCustom = null;

        const bloco = document.querySelector(`.pergunta-bloco[data-id="${p.id}"]`);
        if (!bloco) return;
        const footer = bloco.querySelector(".bloco-footer");
        if (!footer) return;

        if (isCustom) {
            const modoTexto = _getModoTexto();
            p.modoTexto = modoTexto;
            const labelBtn  = modoTexto ? "Campos" : "Área de texto";
            footer.className = "bloco-footer bloco-footer-custom";
            footer.innerHTML = `
                <label>Cartas:</label>
                <input type="number" min="1" max="${maxCartasAtual()}" value="${p.numCartas}" class="input-num-custom"
                       oninput="atualizarNumCustom(${p.id}, parseInt(this.value)||1)">
                <button type="button" class="btn-modo-texto" onclick="toggleModoTexto(${p.id})">${labelBtn}</button>`;
            // Garante container de posições
            if (!bloco.querySelector(".posicoes-custom-wrap")) {
                const wrap = document.createElement("div");
                wrap.className = "posicoes-custom-wrap";
                wrap.id = `posicoes-custom-${p.id}`;
                bloco.appendChild(wrap);
            }
            if (modoTexto) {
                _aplicarModoTexto(p.id);
            } else {
                _renderizarPosicoesCustom(p.id, p.numCartas);
            }
        } else if (nPosicoes) {
            footer.className = "bloco-footer";
            footer.innerHTML = `<span style="font-size:0.82rem;color:var(--accent-hover)">🃏 ${nPosicoes} carta${nPosicoes !== 1 ? 's' : ''} — seguindo o spread selecionado</span>`;
            bloco.querySelector(".posicoes-custom-wrap")?.remove();
        } else {
            const num = p.numCartas || 3;
            footer.className = "bloco-footer";
            footer.innerHTML = `
                <label>Cartas:</label>
                <input type="number" min="1" max="${maxCartasAtual()}" value="${num}"
                       oninput="atualizarPergunta(${p.id}, 'numCartas', parseInt(this.value)||1)">`;
            bloco.querySelector(".posicoes-custom-wrap")?.remove();
        }
        renderizarSugestoes(bloco, p.id);
    });
}

// ── Renderiza os campos de nome de posição para spread personalizado ──
let _debounceCustom = {};

function atualizarNumCustom(pergId, n) {
    const p = perguntasAtivas.find(p => p.id === pergId);
    if (!p) return;
    p.numCartas = n;

    clearTimeout(_debounceCustom[pergId]);
    _debounceCustom[pergId] = setTimeout(() => _renderizarPosicoesCustom(pergId, n), 300);
}
window.atualizarNumCustom = atualizarNumCustom;

function _renderizarPosicoesCustom(pergId, n) {
    const p    = perguntasAtivas.find(p => p.id === pergId);
    const wrap = document.getElementById(`posicoes-custom-${pergId}`);
    if (!p || !wrap) return;

    if (!p.posicoesCustom) p.posicoesCustom = [];

    // Preserva nomes existentes; só adiciona/remove campos necessários
    const atual = wrap.querySelectorAll(".posicao-custom-input");
    const qtdAtual = atual.length;

    if (n > qtdAtual) {
        // Adiciona campos faltando
        for (let i = qtdAtual; i < n; i++) {
            const row = document.createElement("div");
            row.className = "posicao-custom-row";
            row.dataset.idx = i;

            const num = document.createElement("span");
            num.className = "posicao-custom-num";
            num.textContent = `${i + 1}.`;

            const input = document.createElement("input");
            input.type = "text";
            input.className = "posicao-custom-input";
            input.placeholder = `Nome da posição ${i + 1}`;
            input.value = p.posicoesCustom[i] || "";
            input.dataset.idx = i;
            input.oninput = () => {
                p.posicoesCustom[i] = input.value.trim();
            };

            row.appendChild(num);
            row.appendChild(input);
            wrap.appendChild(row);
        }
    } else if (n < qtdAtual) {
        // Remove campos excedentes — mas só os vazios
        const rows = [...wrap.querySelectorAll(".posicao-custom-row")];
        let removidos = 0;
        for (let i = rows.length - 1; i >= n && removidos < (qtdAtual - n); i--) {
            const input = rows[i].querySelector(".posicao-custom-input");
            if (!input.value.trim()) {
                rows[i].remove();
                p.posicoesCustom[i] = undefined;
                removidos++;
            }
        }
        // Marca como "excedentes" os que têm conteúdo mas estão além do número pedido
        wrap.querySelectorAll(".posicao-custom-row").forEach((row, i) => {
            const excedente = i >= n;
            row.classList.toggle("posicao-excedente", excedente);
            const aviso = row.querySelector(".posicao-aviso-excedente");
            if (excedente && !aviso) {
                const span = document.createElement("span");
                span.className = "posicao-aviso-excedente";
                span.title = "Esta posição excede o número de cartas e será ignorada";
                span.textContent = "ignorada";
                row.appendChild(span);
            } else if (!excedente && aviso) {
                aviso.remove();
            }
        });
    }
}
window._renderizarPosicoesCustom = _renderizarPosicoesCustom;

// ── Alterna entre modo inputs individuais e textarea para colar posições ──
function toggleModoTexto(pergId) {
    const p = perguntasAtivas.find(p => p.id === pergId);
    if (!p) return;
    p.modoTexto = !p.modoTexto;
    // Persiste preferência global
    localStorage.setItem(MODO_TEXTO_KEY, p.modoTexto ? "1" : "0");
    // Propaga para todos os outros blocos custom ativos
    perguntasAtivas.forEach(outra => {
        if (outra.id !== pergId && outra.posicoesCustom !== null) {
            outra.modoTexto = p.modoTexto;
        }
    });
    if (p.modoTexto) {
        _aplicarModoTexto(pergId);
        perguntasAtivas.forEach(outra => {
            if (outra.id !== pergId && outra.posicoesCustom !== null) _aplicarModoTexto(outra.id);
        });
    } else {
        _aplicarModoInputs(pergId);
        perguntasAtivas.forEach(outra => {
            if (outra.id !== pergId && outra.posicoesCustom !== null) _aplicarModoInputs(outra.id);
        });
    }
}
window.toggleModoTexto = toggleModoTexto;

// Modo textarea: uma linha = uma posição
function _aplicarModoTexto(pergId) {
    const p    = perguntasAtivas.find(p => p.id === pergId);
    const wrap = document.getElementById(`posicoes-custom-${pergId}`);
    const btn  = document.querySelector(`.pergunta-bloco[data-id="${pergId}"] .btn-modo-texto`);
    if (!p || !wrap) return;

    // Sincroniza posicoesCustom dos inputs antes de trocar
    document.querySelectorAll(`#posicoes-custom-${pergId} .posicao-custom-input`).forEach((input, i) => {
        p.posicoesCustom[i] = input.value.trim();
    });

    const valorAtual = p.posicoesCustom.filter(Boolean).join("\n");

    wrap.innerHTML = `
        <div class="posicoes-textarea-wrap">
            <p class="posicoes-textarea-hint">Uma posição por linha. A quantidade de cartas será ajustada automaticamente.</p>
            <textarea class="posicoes-textarea" rows="5" placeholder="Ex:\nPassado\nPresente\nFuturo">${escapeHtml(valorAtual)}</textarea>
        </div>`;

    const textarea = wrap.querySelector(".posicoes-textarea");
    textarea.addEventListener("input", () => {
        const linhas = textarea.value.split("\n").map(l => l.trim()).filter(Boolean);
        p.posicoesCustom = linhas;
        p.numCartas      = linhas.length || 1;
        // Atualiza o input de número de cartas
        const numInput = document.querySelector(`.pergunta-bloco[data-id="${pergId}"] .input-num-custom`);
        if (numInput) numInput.value = p.numCartas;
    });

    if (btn) { btn.textContent = "Campos"; btn.title = "Voltar para campos individuais"; }
}
window._aplicarModoTexto = _aplicarModoTexto;

// Modo inputs: um campo por posição (padrão)
function _aplicarModoInputs(pergId) {
    const p    = perguntasAtivas.find(p => p.id === pergId);
    const wrap = document.getElementById(`posicoes-custom-${pergId}`);
    const btn  = document.querySelector(`.pergunta-bloco[data-id="${pergId}"] .btn-modo-texto`);
    if (!p || !wrap) return;

    // Sincroniza do textarea antes de trocar
    const textarea = wrap.querySelector(".posicoes-textarea");
    if (textarea) {
        const linhas = textarea.value.split("\n").map(l => l.trim());
        p.posicoesCustom = linhas;
        p.numCartas      = linhas.filter(Boolean).length || p.numCartas;
        const numInput = document.querySelector(`.pergunta-bloco[data-id="${pergId}"] .input-num-custom`);
        if (numInput) numInput.value = p.numCartas;
    }

    wrap.innerHTML = "";
    _renderizarPosicoesCustom(pergId, p.numCartas);

    if (btn) { btn.textContent = "Área de texto"; btn.title = "Alternar modo de entrada"; }
}
window._aplicarModoInputs = _aplicarModoInputs;


// ══════════════════════════════════════════════════════════════
//  SORTEIO PRINCIPAL
// ══════════════════════════════════════════════════════════════
function sortearTudo() {
    sincronizarPerguntas();

    // Sessão ativa: vale o baralho e a quantidade de cópias da sessão
    const sessaoAtiva  = modoAtual === "sessao" && SESSAO.ativa;
    const deckId       = sessaoAtiva ? SESSAO.deckId : document.getElementById("deck").value;
    const deck         = DECKS.get(deckId);
    const copias       = sessaoAtiva ? SESSAO.copias : obterCopias();
    const spreadId     = document.getElementById("spread").value;
    const spread       = SPREADS.find(s => s.id === spreadId);
    const incluirInv   = document.getElementById("invertida").checked && deck.aceitaInversao;

    const vazias = perguntasAtivas.filter(p => !p.texto);
    if (vazias.length > 0) {
        alert("Preencha todas as perguntas antes de sortear.");
        return;
    }

    const totalNecessario = perguntasAtivas.reduce((s, p) => s + p.numCartas, 0);

    const tamanhoMonte = deck.cartas.length * copias;
    if (totalNecessario > tamanhoMonte) {
        alert(`O baralho "${deck.nome}" tem ${tamanhoMonte} carta${tamanhoMonte !== 1 ? 's' : ''}, mas você pediu ${totalNecessario}. Reduza a quantidade de cartas${copias < 3 ? " ou aumente a quantidade de baralhos" : ""}.`);
        return;
    }

    if (modoAtual === "sessao") {
        if (!SESSAO.ativa) {
            SESSAO.iniciar(deckId, copias);
        }
        if (SESSAO.cartasRestantes.length < totalNecessario) {
            _pendente = { deckId, deck, spread, incluirInv, totalNecessario, copias };
            mostrarModalEsgotado(SESSAO.cartasRestantes.length, totalNecessario);
            return;
        }
    }

    executarSorteio(deck, spread, incluirInv, copias);
}

function executarSorteio(deck, spread, incluirInv, copias = 1) {
    const resultadosDiv = document.getElementById("resultados-sessao");
    resultadosDiv.innerHTML = "";

    let pool;
    if (modoAtual === "sessao" && SESSAO.ativa) {
        pool = [...SESSAO.cartasRestantes];
    } else {
        pool = criarPool(deck, copias);
    }

    let posicaoPool = 0;
    const todasTiragens = [];

    perguntasAtivas.forEach((perg, iPerg) => {
        const n       = perg.numCartas;
        const indices = pool.slice(posicaoPool, posicaoPool + n);
        posicaoPool += n;

        const cartasSorteadas = indices.map(idx => {
            const isInvert = incluirInv && Math.random() < 0.5;
            return { idx, nome: deck.cartas[idx], invertida: isInvert };
        });

        todasTiragens.push({ perg, cartasSorteadas });

        const secao = document.createElement("div");
        secao.className = "tiragem-secao";

        const titulo = document.createElement("h2");
        titulo.textContent = `Pergunta ${iPerg + 1}: ${perg.texto}`;
        secao.appendChild(titulo);

        const containerCartas = renderizarCartas(cartasSorteadas, deck, spread, incluirInv, perg.posicoesCustom);
        secao.appendChild(containerCartas);

        resultadosDiv.appendChild(secao);
    });

    if (modoAtual === "sessao" && SESSAO.ativa) {
        const totalUsado = perguntasAtivas.reduce((s, p) => s + p.numCartas, 0);
        SESSAO.retirar(totalUsado);
    }

    registrarTiragens(todasTiragens, deck, spread, incluirInv, copias);

    document.querySelector(".botoes-acao").style.display = "flex";
    document.getElementById("resultados-sessao").scrollIntoView({ behavior: "smooth", block: "start" });

    setTimeout(reiniciarPerguntas, 400);
}


// ══════════════════════════════════════════════════════════════
//  RENDERIZAÇÃO DE CARTAS
// ══════════════════════════════════════════════════════════════
function renderizarCartas(cartas, deck, spread, incluirInv, posicoesCustom) {
    const temSpread  = spread && spread.posicoes.length > 0;
    const temLayout  = temSpread && spread.layout;
    const cruzamento = temLayout && spread.layout.especial?.cruzamento;

    // Posições efetivas: spread fixo, ou nomes customizados, ou null
    const posicoes = temSpread
        ? spread.posicoes
        : (posicoesCustom && posicoesCustom.some(Boolean)
            ? posicoesCustom.map(nome => nome ? { nome, descricao: "" } : null)
            : null);

    if (temLayout && spread.layout.tipo === "circular") {
        return renderizarRoda(cartas, deck, spread, incluirInv);
    }

    if (temLayout && spread.layout.tipo === "ferradura") {
        return renderizarFerradura(cartas, deck, spread, incluirInv);
    }

    if (temLayout && spread.layout.tipo === "coracao") {
        return renderizarCoracao(cartas, deck, spread, incluirInv);
    }

    if (temLayout && spread.layout.tipo === "decisao") {
        return renderizarDecisao(cartas, deck, spread, incluirInv);
    }

    if (temLayout) {
        const grid = document.createElement("div");
        grid.className = "spread-grid";
        grid.style.gridTemplateAreas   = spread.layout.areas;
        grid.style.gridTemplateColumns = spread.layout.cols;
        if (spread.layout.rows) grid.style.gridTemplateRows = spread.layout.rows;
        if (spread.layout.gap)  grid.style.gap = spread.layout.gap;

        cartas.forEach((c, i) => {
            const posNum   = String(i + 1);
            const areaName = spread.layout.mapa[posNum];
            const posInfo  = spread.posicoes[i];
            const esCruz   = cruzamento === posNum;

            const card = criarCard(c, deck, posInfo?.nome, esCruz, incluirInv);
            if (areaName) card.style.gridArea = areaName;
            if (spread.layout.alinhamento?.[posNum]) {
                card.style.alignSelf = spread.layout.alinhamento[posNum];
            }
            grid.appendChild(card);
        });

        return grid;
    } else {
        const linha = document.createElement("div");
        linha.className = "results";
        cartas.forEach((c, i) => {
            const posInfo = posicoes ? posicoes[i] : null;
            linha.appendChild(criarCard(c, deck, posInfo?.nome || null, false, incluirInv));
        });
        return linha;
    }
}

// ── Roda zodiacal: 12 cards posicionados em círculo via trigonometria ──
function renderizarRoda(cartas, deck, spread, incluirInv) {
    const roda = document.createElement("div");
    roda.className = "roda-astrologica";

    const anguloInicio = 180; // Casa 1 (Ascendente) à esquerda (9h)
    const passo        = -30; // sentido anti-horário
    const raioBase     = 0.38;
    const raioBonus    = 0.08; // casas 1 e 7 ficam mais afastadas

    cartas.forEach((c, i) => {
        const anguloGraus = anguloInicio + passo * i;
        const anguloRad   = (anguloGraus * Math.PI) / 180;
        const numeroCasa  = i + 1;

        const raioFrac = (numeroCasa === 1 || numeroCasa === 7)
            ? raioBase + raioBonus
            : raioBase;

        const posInfo   = spread.posicoes[i];
        const labelCasa = posInfo?.nome.split(" — ")[0] ?? `Casa ${numeroCasa}`;
        const labelTema = posInfo?.nome.split(" — ")[1] ?? "";

        const card = criarCard(c, deck, labelTema, false, incluirInv);
        card.dataset.angulo   = anguloRad;
        card.dataset.raioFrac = raioFrac;
        card.dataset.casa     = numeroCasa;

        const numEl = document.createElement("span");
        numEl.className = "card-casa-num";
        numEl.textContent = labelCasa;
        card.insertBefore(numEl, card.firstChild);

        roda.appendChild(card);
    });

    function posicionarCards() {
        const size = roda.offsetWidth;
        if (!size) return;
        const cx = size / 2;
        const cy = size / 2;
        roda.querySelectorAll(".card").forEach(card => {
            const ang  = parseFloat(card.dataset.angulo);
            const raio = parseFloat(card.dataset.raioFrac) * size;
            card.style.left = (cx + Math.cos(ang) * raio) + "px";
            card.style.top  = (cy + Math.sin(ang) * raio) + "px";
        });
    }

    requestAnimationFrame(() => {
        posicionarCards();
        if (window.ResizeObserver) {
            const ro = new ResizeObserver(posicionarCards);
            ro.observe(roda);
        }
    });

    return roda;
}

// ── Ferradura: cards em arco de U via trigonometria ──────────
// layout.invertida = true → arco abre para cima (∩) em vez de para baixo (U)
function renderizarFerradura(cartas, deck, spread, incluirInv) {
    const wrap = document.createElement("div");
    const invertida  = spread.layout?.invertida === true;
    wrap.className = invertida ? "ferradura-wrap ferradura-invertida" : "ferradura-wrap";

    const total      = cartas.length;
    const inicio     = 220;
    const passoGraus = -260 / (total - 1);

    cartas.forEach((c, i) => {
        const graus   = inicio + passoGraus * i;
        const rad     = (graus * Math.PI) / 180;
        const posInfo = spread.posicoes[i];
        const card    = criarCard(c, deck, posInfo?.nome, false, incluirInv);
        card.dataset.angRad = rad;
        wrap.appendChild(card);
    });

    function posicionar() {
        const W = wrap.offsetWidth;
        const H = wrap.offsetHeight;
        if (!W || !H) return;
        const cx     = W * 0.50;
        const cy     = invertida ? H * 0.65 : H * 0.42;
        const rx     = W * 0.40;
        const ry     = H * 0.52;
        const sinDir = invertida ? -1 : 1;
        wrap.querySelectorAll(".card").forEach(card => {
            const ang = parseFloat(card.dataset.angRad);
            card.style.left = (cx + Math.cos(ang) * rx) + "px";
            card.style.top  = (cy + sinDir * Math.sin(ang) * ry) + "px";
        });
    }

    requestAnimationFrame(() => {
        posicionar();
        if (window.ResizeObserver) {
            const ro = new ResizeObserver(posicionar);
            ro.observe(wrap);
        }
    });

    return wrap;
}

// ── Coração: 10 cards posicionados via coordenadas % ─────────
function renderizarCoracao(cartas, deck, spread, incluirInv) {
    const wrap = document.createElement("div");
    wrap.className = "coracao-wrap";

    cartas.forEach((c, i) => {
        const posNum  = String(i + 1);
        const coord   = spread.layout.coords[posNum];
        const posInfo = spread.posicoes[i];
        const card    = criarCard(c, deck, posInfo?.nome, false, incluirInv);
        if (coord.textoAcima) card.classList.add("card-texto-acima");
        card.dataset.cx = coord.x;
        card.dataset.cy = coord.y;
        wrap.appendChild(card);
    });

    function posicionar() {
        const W = wrap.offsetWidth;
        const H = wrap.offsetHeight;
        if (!W || !H) return;
        wrap.querySelectorAll(".card").forEach(card => {
            const cx = parseFloat(card.dataset.cx) / 100 * W;
            const cy = parseFloat(card.dataset.cy) / 100 * H;
            card.style.left = cx + "px";
            card.style.top  = cy + "px";
        });
    }

    requestAnimationFrame(() => {
        posicionar();
        if (window.ResizeObserver) {
            const ro = new ResizeObserver(posicionar);
            ro.observe(wrap);
        }
    });

    return wrap;
}

// ── Decisão: layout 3 colunas com labels Opção A/B ───────────
// Estrutura visual:
//
//  [ Energia ]  [ ─── Opção A ─── ]  [ Conselho ]
//               [ Considerar (2) ]
//               [ Resultado  (3) ]
//               [ ─── Opção B ─── ]
//               [ Considerar (4) ]
//               [ Resultado  (5) ]
//
function renderizarDecisao(cartas, deck, spread, incluirInv) {
    const wrap = document.createElement("div");
    wrap.className = "decisao-wrap";

    // Coluna esquerda — Energia geral (carta 1)
    const colEsq = document.createElement("div");
    colEsq.className = "decisao-col decisao-col-lateral";
    const labelEsq = document.createElement("span");
    labelEsq.className = "decisao-label-lateral";
    labelEsq.textContent = "Contexto";
    colEsq.appendChild(labelEsq);
    colEsq.appendChild(criarCard(cartas[0], deck, spread.posicoes[0]?.nome, false, incluirInv));

    // Coluna centro — Opção A (cartas 2,3) + Opção B (cartas 4,5)
    const colCentro = document.createElement("div");
    colCentro.className = "decisao-col decisao-col-centro";

    const blocoA = document.createElement("div");
    blocoA.className = "decisao-bloco";
    const labelA = document.createElement("div");
    labelA.className = "decisao-label-opcao decisao-label-A";
    labelA.textContent = "Opção A";
    blocoA.appendChild(labelA);
    blocoA.appendChild(criarCard(cartas[1], deck, spread.posicoes[1]?.nome, false, incluirInv));
    blocoA.appendChild(criarCard(cartas[2], deck, spread.posicoes[2]?.nome, false, incluirInv));

    const blocoB = document.createElement("div");
    blocoB.className = "decisao-bloco";
    const labelB = document.createElement("div");
    labelB.className = "decisao-label-opcao decisao-label-B";
    labelB.textContent = "Opção B";
    blocoB.appendChild(labelB);
    blocoB.appendChild(criarCard(cartas[3], deck, spread.posicoes[3]?.nome, false, incluirInv));
    blocoB.appendChild(criarCard(cartas[4], deck, spread.posicoes[4]?.nome, false, incluirInv));

    colCentro.appendChild(blocoA);
    colCentro.appendChild(blocoB);

    // Coluna direita — Conselho (carta 6)
    const colDir = document.createElement("div");
    colDir.className = "decisao-col decisao-col-lateral";
    const labelDir = document.createElement("span");
    labelDir.className = "decisao-label-lateral";
    labelDir.textContent = "Conselho";
    colDir.appendChild(labelDir);
    colDir.appendChild(criarCard(cartas[5], deck, spread.posicoes[5]?.nome, false, incluirInv));

    wrap.appendChild(colEsq);
    wrap.appendChild(colCentro);
    wrap.appendChild(colDir);

    return wrap;
}

function criarCard(carta, deck, nomePosicao, esCruzamento, incluirInv) {
    const div = document.createElement("div");
    div.className = "card" + (carta.invertida ? " invertida" : "") + (esCruzamento ? " card-cruzamento" : "");

    const sig    = deck.significados[carta.nome];
    const sufixo = incluirInv ? (carta.invertida ? " (Invertida)" : " (Direta)") : "";
    const txt    = sig
        ? (incluirInv
            ? (carta.invertida ? sig.invertida : sig.direta)
            : (sig.significado ?? sig.direta))
        : "Significado não disponível";

    div.innerHTML = `
        <img src="${imagemCarta(deck, carta.idx + 1)}" alt="${escapeHtml(carta.nome)}" title="${escapeHtml(txt)}">
        <span class="card-nome">${escapeHtml(carta.nome)}</span>
        ${nomePosicao ? `<span class="card-posicao">${escapeHtml(nomePosicao)}</span>` : ""}
        ${incluirInv && carta.invertida ? `<span class="card-invertida-badge">↕ Invertida</span>` : ""}
    `;

    return div;
}


// ══════════════════════════════════════════════════════════════
//  REGISTRO
// ══════════════════════════════════════════════════════════════
let registroEntradas = []; // { id, texto, html, plain, cartas, deckId, spreadId, incluirInv }
let contadorRegistro = 0;

// ── Monta o resumo de cartas por linha (texto e HTML) ─────────
function _resumoCartas(cartasSorteadas, deck, spread, incluirInv, posicoesCustom) {
    let html  = "";
    let plain = "";

    cartasSorteadas.forEach((c, i) => {
        const sig      = deck.significados[c.nome];
        const sufixo   = incluirInv ? (c.invertida ? " (Invertida)" : " (Direta)") : "";
        const txt      = sig
            ? (incluirInv
                ? (c.invertida ? sig.invertida : sig.direta)
                : (sig.significado ?? sig.direta))
            : "Significado não disponível";

        // Posição: spread fixo → spread.posicoes[i]; personalizado → posicoesCustom[i]; livre → nada
        const nomePosicao = (spread && spread.posicoes[i])
            ? spread.posicoes[i].nome
            : (posicoesCustom && posicoesCustom[i]) ? posicoesCustom[i] : null;
        const posLabel = nomePosicao ? ` [${nomePosicao}]` : "";

        html  += `<p><strong>${escapeHtml(c.nome)}${sufixo}${escapeHtml(posLabel)}:</strong> ${escapeHtml(txt)}</p>`;
        plain += `${c.nome}${sufixo}${posLabel}: ${txt}\n`;
    });

    return { html, plain };
}

// ── Formata uma entrada como texto simples (para cópia) ───────
function _nomeCopias(copias) {
    return copias === 2 ? "duplo" : copias === 3 ? "triplo" : "";
}

function formatarEntradaTexto({ perg, cartasSorteadas, deck, spread, incluirInv, timestamp, copias = 1 }) {
    const temSpread    = spread && spread.posicoes.length > 0;
    const tiragemTexto = cartasSorteadas.map(c => {
        const sufixo = incluirInv ? (c.invertida ? " (Invertida)" : " (Direta)") : "";
        return c.nome + sufixo;
    }).join(", ");

    const { plain: descPlain } = _resumoCartas(cartasSorteadas, deck, spread, incluirInv, perg.posicoesCustom);

    return `Pergunta: ${perg.texto}\nBaralho: ${deck.nome}\n${copias > 1 ? `Quantidade de baralhos: ${copias} (${_nomeCopias(copias)})\n` : ""}${temSpread ? `Spread: ${spread.nome}\n` : ""}Tiragem: ${tiragemTexto}\n${descPlain}`;
}

// ── Formata uma entrada como HTML (para o registro visual) ────
function formatarEntradaHTML({ rid, perg, cartasSorteadas, deck, spread, incluirInv, timestamp, copias = 1 }) {
    const temSpread    = spread && spread.posicoes.length > 0;
    const tiragemTexto = cartasSorteadas.map(c => {
        const sufixo = incluirInv ? (c.invertida ? " (Invertida)" : " (Direta)") : "";
        return escapeHtml(c.nome) + sufixo;
    }).join(", ");

    const { html: descHTML } = _resumoCartas(cartasSorteadas, deck, spread, incluirInv, perg.posicoesCustom);

    return `
        <div class="registro-item" data-rid="${rid}">
            <div class="reg-header">
                <span class="reg-pergunta">❓ ${escapeHtml(perg.texto)}</span>
            </div>
            <p><strong>Tiragem:</strong> ${tiragemTexto}</p>
            ${temSpread ? `<p><strong>Spread:</strong> ${spread.nome}</p>` : ""}
            ${descHTML}
            <div class="reg-rodape">
                <span class="reg-meta">${escapeHtml(deck.nome)}${copias > 1 ? ` · baralho ${_nomeCopias(copias)}` : ""} · ${timestamp}</span>
                <button class="btn-visualizar-reg" onclick="visualizarRegistro(${rid})" title="Ver as cartas desta tiragem">🖼 Visualizar</button>
            </div>
        </div>`;
}

// ── Gerencia estado e DOM do registro ─────────────────────────
function registrarTiragens(todasTiragens, deck, spread, incluirInv, copias = 1) {
    const registroDiv = document.getElementById("registro");
    const titulo      = registroDiv.querySelector("h3");
    const timestamp   = new Date().toLocaleString("pt-BR");

    todasTiragens.forEach(({ perg, cartasSorteadas }) => {
        contadorRegistro++;
        const rid     = contadorRegistro;
        const ctx     = { rid, perg, cartasSorteadas, deck, spread, incluirInv, timestamp, copias };

        const htmlEntrada  = formatarEntradaHTML(ctx);
        const plainEntrada = formatarEntradaTexto(ctx);

        registroEntradas.unshift({ id: rid, texto: perg.texto, html: htmlEntrada, plain: plainEntrada,
            cartas: cartasSorteadas, deckId: deck.id, spreadId: spread ? spread.id : null, incluirInv,
            posicoesCustom: perg.posicoesCustom ? [...perg.posicoesCustom] : null });

        titulo
            ? titulo.insertAdjacentHTML("afterend", htmlEntrada)
            : registroDiv.insertAdjacentHTML("afterbegin", "<h3>Registro de Perguntas e Tiragens</h3>" + htmlEntrada);
    });
}


// ══════════════════════════════════════════════════════════════
//  BARALHO ESGOTADO — MODAL
// ══════════════════════════════════════════════════════════════
function mostrarModalEsgotado(restantes, necessario) {
    document.getElementById("textoEsgotado").innerHTML =
        `Restam <strong>${restantes}</strong> carta${restantes !== 1 ? 's' : ''} no baralho, mas esta rodada precisa de <strong>${necessario}</strong>.`;
    document.getElementById("modalBaralhoEsgotado").style.display = "flex";
}

function opcaoEsgotado(opcao) {
    document.getElementById("modalBaralhoEsgotado").style.display = "none";
    if (!_pendente) return;
    const { deck, spread, incluirInv, copias } = _pendente;

    if (opcao === "continuar") {
        SESSAO.reiniciar();
        executarSorteio(deck, spread, incluirInv, copias);
    } else if (opcao === "nova-sessao") {
        SESSAO.iniciar(deck.id, obterCopias());
        executarSorteio(deck, spread, incluirInv, SESSAO.copias);
    } else if (opcao === "alterar") {
        alert("Ajuste a quantidade de cartas nas perguntas e clique em Sortear novamente.");
    }
    // "cancelar": não faz nada

    _pendente = null;
}


// ══════════════════════════════════════════════════════════════
//  VISUALIZAR TIRAGEM DO REGISTRO
// ══════════════════════════════════════════════════════════════
function visualizarRegistro(rid) {
    const entrada = registroEntradas.find(e => e.id === rid);
    if (!entrada) return;

    const deck   = DECKS.get(entrada.deckId);
    const spread = entrada.spreadId ? SPREADS.find(s => s.id === entrada.spreadId) : null;
    if (!deck) { alert("Baralho desta tiragem não está mais disponível."); return; }

    const resultadosDiv = document.getElementById("resultados-sessao");
    resultadosDiv.innerHTML = "";

    const secao = document.createElement("div");
    secao.className = "tiragem-secao";

    const titulo = document.createElement("h2");
    titulo.textContent = `❓ ${entrada.texto}`;
    secao.appendChild(titulo);

    const containerCartas = renderizarCartas(entrada.cartas, deck, spread, entrada.incluirInv, entrada.posicoesCustom);
    secao.appendChild(containerCartas);

    resultadosDiv.appendChild(secao);
    document.querySelector(".botoes-acao").style.display = "flex";
    resultadosDiv.scrollIntoView({ behavior: "smooth", block: "start" });
}
window.visualizarRegistro = visualizarRegistro;


// ══════════════════════════════════════════════════════════════
//  PREENCHER REGISTRO MANUAL (para tiragens copiadas)
// ══════════════════════════════════════════════════════════════
function abrirPainelPreencherRegistro() {
    const painel = document.getElementById("painel-preencher-registro");
    if (!painel) return;
    const aberto = painel.style.display !== "none";
    painel.style.display = aberto ? "none" : "block";
    document.getElementById("btn-preencher-toggle").textContent =
        aberto ? "✏️ Preencher registro" : "✖ Fechar";
}
window.abrirPainelPreencherRegistro = abrirPainelPreencherRegistro;

function processarTextoRegistro() {
    const texto = (document.getElementById("input-registro-manual").value || "").trim();
    if (!texto) { alert("Cole o texto da tiragem antes de processar."); return; }

    // Tenta parsear o formato padrão do Cartarium:
    // Pergunta: ...
    // Baralho: ...
    // Spread: ...
    // Tiragem: Carta1, Carta2 (Invertida), Carta3
    const linhas = texto.split("\n").map(l => l.trim()).filter(Boolean);

    let perguntaTxt = "";
    let deckId      = null;
    let spreadId    = null;
    let cartasNomes = [];

    linhas.forEach(linha => {
        if (/^Pergunta:/i.test(linha))  perguntaTxt = linha.replace(/^Pergunta:\s*/i, "");
        if (/^Baralho:/i.test(linha)) {
            const nomeDeck = linha.replace(/^Baralho:\s*/i, "").trim();
            // Tenta achar o deck pelo nome
            const encontrado = Object.values(DECKS._lista).find(d =>
                d.nome.toLowerCase() === nomeDeck.toLowerCase());
            if (encontrado) deckId = encontrado.id;
        }
        if (/^Spread:/i.test(linha)) {
            const nomeSpread = linha.replace(/^Spread:\s*/i, "").trim();
            const encontrado = SPREADS.find(s => s.nome.toLowerCase() === nomeSpread.toLowerCase());
            if (encontrado) spreadId = encontrado.id;
        }
        if (/^Tiragem:/i.test(linha)) {
            const listaTxt = linha.replace(/^Tiragem:\s*/i, "");
            cartasNomes = listaTxt.split(",").map(c => c.trim()).filter(Boolean);
        }
    });

    // Fallback: usa deck selecionado no momento
    if (!deckId) deckId = document.getElementById("deck").value;
    // Fallback spread: usa o selecionado se o número de cartas bater
    if (!spreadId) {
        const selSpreadId = document.getElementById("spread").value;
        const selSpread   = SPREADS.find(s => s.id === selSpreadId);
        if (selSpread && selSpread.posicoes.length > 0 && selSpread.posicoes.length === cartasNomes.length) {
            spreadId = selSpreadId;
        }
    }

    const deck   = DECKS.get(deckId);
    const spread = spreadId ? SPREADS.find(s => s.id === spreadId) : null;
    if (!deck) { alert("Não foi possível identificar o baralho. Verifique o texto."); return; }

    if (!perguntaTxt) perguntaTxt = "Tiragem manual";
    if (cartasNomes.length === 0) { alert("Não encontrei a linha 'Tiragem:' com os nomes das cartas."); return; }

    // Mapeia nomes → índices no deck
    const cartasSorteadas = cartasNomes.map(nomeRaw => {
        const invertida = /\(Invertida\)/i.test(nomeRaw);
        const nomeLimpo = nomeRaw.replace(/\s*\(Invertida\)\s*/i, "").replace(/\s*\(Direta\)\s*/i, "").trim();
        // Busca case-insensitive
        const idx = deck.cartas.findIndex(c => c.toLowerCase() === nomeLimpo.toLowerCase());
        return { idx: idx >= 0 ? idx : 0, nome: idx >= 0 ? deck.cartas[idx] : nomeLimpo, invertida };
    });

    // Verifica se há cartas que realmente não foram encontradas
    const erros = cartasSorteadas.filter((c, i) => {
        const nomeLimpo = cartasNomes[i].replace(/\s*\(Invertida\)\s*/i,"").replace(/\s*\(Direta\)\s*/i,"").trim();
        return deck.cartas.findIndex(d => d.toLowerCase() === nomeLimpo.toLowerCase()) === -1;
    });
    if (erros.length > 0) {
        const nomes = erros.map(c => c.nome).join(", ");
        if (!confirm(`As cartas a seguir não foram encontradas no baralho "${deck.nome}" e serão exibidas sem imagem:\n\n${nomes}\n\nDeseja continuar mesmo assim?`)) return;
    }

    // Renderiza imediatamente na área de resultados
    const perg       = { texto: perguntaTxt, numCartas: cartasSorteadas.length };
    const incluirInv = cartasSorteadas.some(c => c.invertida);

    const resultadosDiv = document.getElementById("resultados-sessao");
    resultadosDiv.innerHTML = "";

    const secao  = document.createElement("div");
    secao.className = "tiragem-secao";
    const titulo = document.createElement("h2");
    titulo.textContent = `❓ ${perg.texto}`;
    secao.appendChild(titulo);
    secao.appendChild(renderizarCartas(cartasSorteadas, deck, spread, incluirInv));
    resultadosDiv.appendChild(secao);

    // Também adiciona ao registro
    contadorRegistro++;
    const rid       = contadorRegistro;
    const timestamp = new Date().toLocaleString("pt-BR");
    const ctx       = { rid, perg, cartasSorteadas, deck, spread, incluirInv, timestamp };

    const htmlEntrada  = formatarEntradaHTML(ctx);
    const plainEntrada = formatarEntradaTexto(ctx);

    registroEntradas.unshift({ id: rid, texto: perg.texto, html: htmlEntrada, plain: plainEntrada,
        cartas: cartasSorteadas, deckId: deck.id, spreadId: spread ? spread.id : null, incluirInv });

    const registroDiv = document.getElementById("registro");
    const tituloReg   = registroDiv.querySelector("h3");
    tituloReg
        ? tituloReg.insertAdjacentHTML("afterend", htmlEntrada)
        : registroDiv.insertAdjacentHTML("afterbegin", "<h3>Registro de Perguntas e Tiragens</h3>" + htmlEntrada);

    document.querySelector(".botoes-acao").style.display = "flex";

    // Limpa e fecha painel
    document.getElementById("input-registro-manual").value = "";
    abrirPainelPreencherRegistro();

    resultadosDiv.scrollIntoView({ behavior: "smooth", block: "start" });
}
window.processarTextoRegistro = processarTextoRegistro;



function copiarTexto(str) {
    return navigator.clipboard.writeText(str).catch(() => {
        const ta = document.createElement("textarea");
        ta.value = str;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
    });
}

function copiarUltima() {
    if (registroEntradas.length === 0) { alert("Nenhuma tiragem registrada."); return; }
    copiarTexto(registroEntradas[0].plain)
        .then(() => alert("Última tiragem copiada!"));
}

function abrirModalCopiar() {
    if (registroEntradas.length === 0) { alert("Nenhuma tiragem registrada."); return; }

    const lista = document.getElementById("listaCopiar");
    lista.innerHTML = "";

    registroEntradas.forEach(e => {
        const item = document.createElement("label");
        item.className = "copia-item";
        item.innerHTML = `
            <input type="checkbox" value="${e.id}" checked>
            <span>${escapeHtml(e.texto)}</span>`;
        lista.appendChild(item);
    });

    document.getElementById("modalCopiar").style.display = "flex";
}

// ── Ordem de cópia (múltiplas perguntas) ───────────────────────
const ORDEM_COPIA_KEY = "cartarium_ordem_copia";
let ordemCopia = localStorage.getItem(ORDEM_COPIA_KEY) || "recente"; // "recente" | "antiga"

function definirOrdemCopia(ordem) {
    ordemCopia = ordem;
    localStorage.setItem(ORDEM_COPIA_KEY, ordem);
    document.getElementById("btn-ordem-recente")?.classList.toggle("ativo", ordem === "recente");
    document.getElementById("btn-ordem-antiga")?.classList.toggle("ativo", ordem === "antiga");
}
window.definirOrdemCopia = definirOrdemCopia;

function fecharModalCopiar() {
    document.getElementById("modalCopiar").style.display = "none";
}

function confirmarCopia() {
    const checks = document.querySelectorAll("#listaCopiar input[type=checkbox]:checked");
    const ids    = Array.from(checks).map(c => parseInt(c.value));
    // registroEntradas está em ordem mais recente → mais antiga (unshift no registro)
    let selecionadas = registroEntradas.filter(e => ids.includes(e.id));

    if (selecionadas.length === 0) { alert("Selecione ao menos uma pergunta."); return; }

    if (ordemCopia === "antiga") {
        selecionadas = [...selecionadas].reverse();
    }

    const texto = selecionadas.map(e => e.plain).join("\n---\n\n");
    copiarTexto(texto)
        .then(() => { alert("Copiado!"); fecharModalCopiar(); });
}


// ══════════════════════════════════════════════════════════════
//  EXIBIR BARALHO COMPLETO
// ══════════════════════════════════════════════════════════════
function exibirBaralho() {
    const deckId = document.getElementById("deck").value;
    const deck   = DECKS.get(deckId);

    const resultadosDiv = document.getElementById("resultados-sessao");
    resultadosDiv.innerHTML = "";

    const copias = obterCopias();
    if (copias > 1) {
        const aviso = document.createElement("p");
        aviso.className = "ajuda-texto";
        aviso.textContent = `Baralho ${_nomeCopias(copias)}: o monte tem ${copias} cópias de cada carta abaixo.`;
        resultadosDiv.appendChild(aviso);
    }

    const linha = document.createElement("div");
    linha.className = "results";

    deck.cartas.forEach((nome, idx) => {
        const div = document.createElement("div");
        div.className = "card";
        div.innerHTML = `
            <img src="${imagemCarta(deck, idx + 1)}" alt="${escapeHtml(nome)}">
            <span class="card-nome">${escapeHtml(nome)}</span>`;
        linha.appendChild(div);
    });

    resultadosDiv.appendChild(linha);
    document.querySelector(".botoes-acao").style.display = "none";
}


// ══════════════════════════════════════════════════════════════
//  LIMPAR REGISTRO
// ══════════════════════════════════════════════════════════════
function limparTiragens() {
    if (!confirm("Limpar todo o registro de tiragens?")) return;
    document.getElementById("registro").innerHTML = "<h3>Registro de Perguntas e Tiragens</h3>";
    document.getElementById("resultados-sessao").innerHTML = "";
    document.querySelector(".botoes-acao").style.display = "none";
    registroEntradas = [];
    contadorRegistro = 0;
}


// ══════════════════════════════════════════════════════════════
//  REINICIAR PERGUNTAS APÓS SORTEIO
// ══════════════════════════════════════════════════════════════
function reiniciarPerguntas() {
    // Preserva estrutura (numCartas + posicoesCustom) — apenas o texto é limpo.
    const estadoAnterior = perguntasAtivas.map(p => ({
        numCartas:      p.numCartas,
        posicoesCustom: p.posicoesCustom ? [...p.posicoesCustom] : null
    }));

    perguntasAtivas = [];
    contadorPerg    = 0;
    document.getElementById("perguntas-lista").innerHTML = "";

    if (estadoAnterior.length === 0) {
        adicionarPergunta("", null, false);
        return;
    }

    estadoAnterior.forEach(estado => {
        // Passa as posições preservadas direto para adicionarPergunta
        adicionarPergunta("", estado.numCartas, false, estado.posicoesCustom);
    });
}


// ══════════════════════════════════════════════════════════════
//  SUGESTÕES DE PERGUNTAS
// ══════════════════════════════════════════════════════════════
let areaSelecionada = "geral";

function selecionarArea(area) {
    areaSelecionada = area;

    document.querySelectorAll(".area-tab").forEach(btn => {
        btn.classList.toggle("ativa", btn.dataset.area === area);
    });

    document.querySelectorAll(".pergunta-bloco").forEach(bloco => {
        renderizarSugestoes(bloco, parseInt(bloco.dataset.id));
    });
}

function obterSugestoes(spreadId, area) {
    // ── Banco específico por sistema (ex: runas) tem prioridade ──
    const sistemaId    = sistemaBase(document.getElementById("sistema")?.value);
    const bancoSistema = window.PERGUNTAS_SUGERIDAS_SISTEMA;
    if (sistemaId && bancoSistema && bancoSistema[sistemaId]) {
        const porSistema = bancoSistema[sistemaId];
        const lista = porSistema[area] || porSistema["geral"];
        if (lista && lista.length) return lista;
    }

    // ── Fallback: banco padrão por tiragem (comportamento original) ──
    const banco = window.PERGUNTAS_SUGERIDAS || (typeof PERGUNTAS_SUGERIDAS !== "undefined" ? PERGUNTAS_SUGERIDAS : null);
    if (!banco) return [];

    const porSpread = banco[spreadId] || banco["livre"] || {};

    return porSpread[area]
        || porSpread["geral"]
        || (banco["livre"] && banco["livre"][area])
        || (banco["livre"] && banco["livre"]["geral"])
        || [];
}

const SUGESTOES_KEY = "cartarium_sugestoes_abertas";

function _sugestoesAbertas() {
    const val = localStorage.getItem(SUGESTOES_KEY);
    return val === null ? true : val === "1";
}

function _toggleSugestoes() {
    const abertas = !_sugestoesAbertas();
    localStorage.setItem(SUGESTOES_KEY, abertas ? "1" : "0");

    document.querySelectorAll(".sugestoes-wrap").forEach(wrap => {
        const lista = wrap.querySelector(".sugestoes-lista");
        const seta  = wrap.querySelector(".sugestoes-seta");
        if (lista) lista.style.display = abertas ? "flex" : "none";
        if (seta)  seta.textContent    = abertas ? "▾" : "▸";
    });
}

function renderizarSugestoes(bloco, pergId) {
    bloco.querySelector(".sugestoes-wrap")?.remove();

    const spreadId  = document.getElementById("spread")?.value || "livre";
    const sugestoes = obterSugestoes(spreadId, areaSelecionada);
    if (!sugestoes.length) return;

    const abertas = _sugestoesAbertas();

    const wrap = document.createElement("div");
    wrap.className = "sugestoes-wrap";

    const header = document.createElement("button");
    header.type      = "button";
    header.className = "sugestoes-toggle";
    header.onclick   = _toggleSugestoes;
    header.innerHTML = `<span class="sugestoes-seta">${abertas ? "▾" : "▸"}</span> Sugestões`;
    wrap.appendChild(header);

    const lista = document.createElement("div");
    lista.className     = "sugestoes-lista";
    lista.style.display = abertas ? "flex" : "none";

    sugestoes.forEach(texto => {
        const btn = document.createElement("button");
        btn.className   = "sugestao-item";
        btn.textContent = texto;
        btn.type        = "button";
        btn.onclick = () => {
            const input = bloco.querySelector("input[type=text]");
            if (input) {
                input.value = texto;
                atualizarPergunta(pergId, "texto", texto);
                input.focus();
            }
        };
        lista.appendChild(btn);
    });

    wrap.appendChild(lista);
    bloco.appendChild(wrap);
}


// ══════════════════════════════════════════════════════════════
//  UTILITÁRIOS
// ══════════════════════════════════════════════════════════════
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
