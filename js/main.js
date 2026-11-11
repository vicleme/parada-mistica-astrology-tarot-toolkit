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

// Copiar "Consulta" = o que está na tela; "Sessão" = tudo desde o início da sessão atual
let _naTelaIds     = [];   // ids das entradas do registro que aparecem na tela
let _sessaoSeq     = 0;    // número da sessão em andamento (sobe a cada sessão iniciada)


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
    _atualizarOpcoesCopiar();
    _atualizarMonteUI();
}

// "Sessão" só existe no modo Sessão; fora dele a opção some
function _atualizarOpcoesCopiar() {
    const o   = document.getElementById("opt-copiar-sessao");
    const sel = document.getElementById("sel-copiar");
    if (!o) return;
    const visivel = modoAtual === "sessao";
    o.hidden   = !visivel;
    o.disabled = !visivel;
    if (!visivel && sel && sel.value === "sessao") sel.value = "consulta";
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

// Rodapé do bloco: spread fixo mostra só a contagem; livre mostra "Cartas" e o botão de área de texto
function _rodapeBloco(p, fixo) {
    if (fixo) {
        const n = p.numCartas;
        return { classe: "bloco-footer",
                 html: `<span style="font-size:0.82rem;color:var(--accent-hover)">🃏 ${n} carta${n !== 1 ? 's' : ''} — seguindo o spread selecionado</span>` };
    }
    const labelBtn = p.modoTexto ? "Campos" : "Área de texto";
    return { classe: "bloco-footer bloco-footer-custom",
             html: `
        <label>Cartas:</label>
        <input type="number" min="1" max="${maxCartasAtual()}" value="${p.numCartas}" class="input-num-custom"
               oninput="atualizarNumCustom(${p.id}, parseInt(this.value)||1)">
        <button type="button" class="btn-modo-texto" onclick="toggleModoTexto(${p.id})">${labelBtn}</button>` };
}

function adicionarPergunta(texto = "", numCartas = null, focar = true, posicoesCustomInicial = null, iniciaTiragem = false, monteTiragem = null) {
    contadorPerg++;
    const id      = contadorPerg;
    const spread  = SPREADS.find(s => s.id === document.getElementById("spread").value);
    const fixo    = !!(spread && spread.posicoes.length > 0);
    const nPadrao = fixo ? spread.posicoes.length : (numCartas || 3);
    const modoTexto = fixo ? false : _getModoTexto();

    const p = { id, texto, numCartas: nPadrao, posicoesCustom: posicoesCustomInicial ? [...posicoesCustomInicial] : [],
                modoTexto, iniciaTiragem: !!iniciaTiragem, monteTiragem };
    perguntasAtivas.push(p);

    const lista = document.getElementById("perguntas-lista");
    const bloco = document.createElement("div");
    bloco.className  = "pergunta-bloco";
    bloco.dataset.id = id;

    const rodape = _rodapeBloco(p, fixo);

    bloco.innerHTML = `
        <div class="bloco-header">
            <span class="bloco-num">${id}</span>
            <input type="text" class="input-pergunta" placeholder="${ROTULO_TXT[rotuloAtual].placeholder}" value="${escapeHtml(texto)}"
                   oninput="atualizarPergunta(${id}, 'texto', this.value)"
                   onkeydown="if(event.key==='Enter'){event.preventDefault();sortearTudo();}">
            <button class="btn-remover-pergunta" onclick="removerPergunta(${id})" title="Remover esta pergunta">✕</button>
        </div>
        <div class="${rodape.classe}">${rodape.html}</div>
    `;

    lista.appendChild(bloco);

    _montarPainelPosicoes(bloco, p);
    if (!fixo && modoTexto) _aplicarModoTexto(id);
    else                    _renderizarPosicoesCustom(id, nPadrao);

    if (focar) bloco.querySelector("input[type=text]").focus();
    renderizarSugestoes(bloco, id);
    _atualizarDivisorias();
}

// ── Tiragens dentro de um mesmo Tirar ─────────────────────────
//  Cada pergunta com iniciaTiragem=true abre uma nova tiragem (a primeira pergunta
//  sempre abre a primeira). Cada tiragem tem o próprio monte e vira uma entrada
//  separada no registro.
function _agruparPerguntas(lista) {
    const grupos = [];
    lista.forEach((p, i) => {
        if (i === 0 || p.iniciaTiragem) grupos.push([]);
        grupos[grupos.length - 1].push(p);
    });
    return grupos;
}

// Monte da tiragem: override guardado na 1ª pergunta do grupo ("separado" | "unico" | null = segue o seletor geral)
function _monteDoGrupo(grupo) {
    if (modoAtual === "sessao") return false;          // sessão: o monte é único para tudo
    const o = grupo[0] && grupo[0].monteTiragem;
    if (o === "separado") return true;
    if (o === "unico")    return false;
    return monteModo === "pergunta";
}

function _atualizarDivisorias() {
    const lista = document.getElementById("perguntas-lista");
    if (!lista) return;
    lista.querySelectorAll(".grupo-divisor").forEach(d => d.remove());

    const grupos = _agruparPerguntas(perguntasAtivas);
    // Com uma tiragem só, a faixa aparece apenas se ela tiver monte definido à parte
    if (grupos.length < 2 && !(grupos[0] && grupos[0][0].monteTiragem)) return;

    grupos.forEach((g, i) => {
        const bloco = lista.querySelector(`.pergunta-bloco[data-id="${g[0].id}"]`);
        if (!bloco) return;
        const atual = g[0].monteTiragem || "";
        const div = document.createElement("div");
        div.className = "grupo-divisor";
        div.innerHTML = `<span class="grupo-divisor-titulo">Tiragem ${i + 1}</span>
            <span class="grupo-divisor-acoes">
                <select class="divisor-monte" title="Como as cartas se repartem entre as perguntas desta tiragem" onchange="definirMonteTiragem(${g[0].id}, this.value)">
                    <option value=""${atual === "" ? " selected" : ""}>Monte: seguir o geral</option>
                    <option value="unico"${atual === "unico" ? " selected" : ""}>Monte: único (sem repetir)</option>
                    <option value="separado"${atual === "separado" ? " selected" : ""}>Monte: por pergunta (repete)</option>
                </select>` +
            (i > 0 ? `<button type="button" class="btn-secundario btn-pequeno" onclick="unirTiragem(${g[0].id})" title="Juntar esta tiragem à anterior">⤴ unir à anterior</button>` : "") +
            `</span>`;
        lista.insertBefore(div, bloco);
    });
}

function definirMonteTiragem(id, valor) {
    const p = perguntasAtivas.find(p => p.id === id);
    if (p) p.monteTiragem = valor || null;
    _atualizarDivisorias();
}
window.definirMonteTiragem = definirMonteTiragem;

function unirTiragem(id) {
    const p = perguntasAtivas.find(p => p.id === id);
    if (p) { p.iniciaTiragem = false; p.monteTiragem = null; }
    _atualizarDivisorias();
}
window.unirTiragem = unirTiragem;

function adicionarTiragem() {
    adicionarPergunta("", null, true, null, true);
}
window.adicionarTiragem = adicionarTiragem;

// ── Monte: compartilhado na tiragem ou novo a cada pergunta ───
const MONTE_KEY = "cartarium_monte_perguntas";
let monteModo = localStorage.getItem(MONTE_KEY) === "pergunta" ? "pergunta" : "unico";

function definirMonte(modo) {
    monteModo = modo === "pergunta" ? "pergunta" : "unico";
    localStorage.setItem(MONTE_KEY, monteModo);
    _atualizarMonteUI();
}
window.definirMonte = definirMonte;

function _atualizarMonteUI() {
    const sel   = document.getElementById("sel-monte");
    const ajuda = document.getElementById("monte-ajuda");
    if (!sel) return;
    sel.value    = monteModo;
    sel.disabled = modoAtual === "sessao";
    if (ajuda) ajuda.textContent = modoAtual === "sessao"
        ? "Em Sessão, as cartas que saem não voltam até o fim da sessão, em todas as perguntas e tiragens."
        : monteModo === "pergunta"
            ? "Cada pergunta recebe um baralho embaralhado do zero: a mesma carta pode sair em perguntas diferentes."
            : "Perguntas da mesma tiragem dividem um monte (sem repetir carta). Tiragens diferentes têm montes separados.";
}

function removerPergunta(id) {
    if (perguntasAtivas.length <= 1) {
        alert("É preciso ter ao menos uma pergunta.");
        return;
    }
    const i = perguntasAtivas.findIndex(p => p.id === id);
    const removida = perguntasAtivas[i];
    const seguinte = perguntasAtivas[i + 1];
    // Se a pergunta removida abria uma tiragem, a seguinte (do mesmo grupo) passa a abri-la
    if (removida && (removida.iniciaTiragem || i === 0) && seguinte && !seguinte.iniciaTiragem) {
        if (removida.iniciaTiragem) seguinte.iniciaTiragem = true;
        seguinte.monteTiragem = removida.monteTiragem;
    }
    perguntasAtivas = perguntasAtivas.filter(p => p.id !== id);
    document.querySelector(`.pergunta-bloco[data-id="${id}"]`)?.remove();
    renumerarBlocos();
    _atualizarDivisorias();
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

        // Coleta os nomes de posição digitados (campos ou área de texto)
        if (!p.posicoesCustom) p.posicoesCustom = [];
        const textarea = bloco.querySelector(".posicoes-textarea");
        if (textarea) {
            p.posicoesCustom = textarea.value.split("\n").map(l => l.trim());
            p.numCartas = p.posicoesCustom.filter(Boolean).length || p.numCartas;
        } else {
            bloco.querySelectorAll(".posicao-custom-input").forEach((input, i) => {
                p.posicoesCustom[i] = input.value.trim();
            });
        }
    });
}

// ══════════════════════════════════════════════════════════════
//  RÓTULO (PERGUNTA / TEMA), LIMPAR E DIGITAR VÁRIAS
// ══════════════════════════════════════════════════════════════
// "pergunta": o campo é esvaziado depois de cada Tirar.
// "tema":     o campo é mantido, para tirar de novo sobre o mesmo assunto.
const ROTULO_KEY = "cartarium_rotulo_pergunta";
let rotuloAtual  = localStorage.getItem(ROTULO_KEY) === "tema" ? "tema" : "pergunta";

const ROTULO_TXT = {
    pergunta: {
        Sing: "Pergunta", Plur: "Perguntas", sing: "pergunta", plur: "perguntas",
        art: "a", todos: "todas as perguntas",
        placeholder: "Digite a pergunta…",
        adicionar: "+ Adicionar pergunta",
        limpar: "🧹 Limpar perguntas",
        ajuda: "O campo é esvaziado depois de cada Tirar.",
        exemplos: ["Como será minha semana?", "Devo aceitar a proposta?"]
    },
    tema: {
        Sing: "Tema", Plur: "Temas", sing: "tema", plur: "temas",
        art: "o", todos: "todos os temas",
        placeholder: "Digite o tema…",
        adicionar: "+ Adicionar tema",
        limpar: "🧹 Limpar temas",
        ajuda: "O campo é mantido depois de cada Tirar, para você tirar de novo sobre o mesmo tema.",
        exemplos: ["Amor", "Trabalho"]
    }
};

function _aplicarRotuloUI() {
    const t   = ROTULO_TXT[rotuloAtual];
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("label-perguntas",     `${t.Plur}:`);
    set("btn-add-pergunta",    t.adicionar);
    set("btn-limpar-perguntas", t.limpar);
    set("rotulo-ajuda",        t.ajuda);
    document.getElementById("btn-rotulo-pergunta")?.classList.toggle("ativo", rotuloAtual === "pergunta");
    document.getElementById("btn-rotulo-tema")?.classList.toggle("ativo", rotuloAtual === "tema");
    document.querySelectorAll(".pergunta-bloco .input-pergunta").forEach(i => { i.placeholder = t.placeholder; });
    _atualizarDicaTexto();
}

function definirRotulo(rotulo) {
    rotuloAtual = rotulo === "tema" ? "tema" : "pergunta";
    localStorage.setItem(ROTULO_KEY, rotuloAtual);
    _aplicarRotuloUI();
}
window.definirRotulo = definirRotulo;

// Spread livre: basta a pergunta/tema OU ao menos uma posição preenchida.
// Spread com posições fixas: a pergunta/tema continua sendo obrigatória.
function _temConteudo(p) {
    if (p.texto) return true;
    return _modoSpread() === "livre" && !!(p.posicoesCustom && p.posicoesCustom.some(Boolean));
}

// "livre" (sem posições fixas) | "fixo" (spread com posições)
function _modoSpread() {
    const spread = SPREADS.find(s => s.id === document.getElementById("spread")?.value);
    return (!spread || spread.posicoes.length === 0) ? "livre" : "fixo";
}

function _mensagemPreencher() {
    const t = ROTULO_TXT[rotuloAtual];
    return _modoSpread() === "livre"
        ? `Preencha ${t.art} ${t.sing} ou ao menos uma posição de cada bloco antes de sortear.`
        : `Preencha ${t.todos} antes de sortear.`;
}

// Recria os blocos a partir de [{ texto, numCartas, posicoesCustom }]
function _reconstruirBlocos(itens) {
    perguntasAtivas = [];
    contadorPerg    = 0;
    document.getElementById("perguntas-lista").innerHTML = "";

    if (!itens.length) {
        adicionarPergunta("", null, false);
        return;
    }
    itens.forEach((it, i) => adicionarPergunta(it.texto, it.numCartas, false, it.posicoesCustom, i > 0 && !!it.iniciaTiragem,
        (i === 0 || it.iniciaTiragem) ? (it.monteTiragem || null) : null));
}

// ── Limpar: apaga textos e posições e deixa um único bloco vazio ──
function limparPerguntas() {
    if (modoTextoPerguntas) _aplicarTextoNosBlocos();
    sincronizarPerguntas();

    const preenchido = perguntasAtivas.some(_temConteudo);
    if (preenchido && !confirm(`Limpar ${ROTULO_TXT[rotuloAtual].plur} e posições preenchidas?`)) return;

    _reconstruirBlocos([]);
    if (modoTextoPerguntas) _textoParaTextarea();
}
window.limparPerguntas = limparPerguntas;

// ── Digitar várias num campo só ───────────────────────────────
//  Linha sem "-" é uma pergunta; linha com "-" é uma posição da pergunta logo
//  acima (em qualquer spread). Um "-" sozinho pula a posição (no spread fixo, mantém
//  o nome do modelo; no livre, fica sem nome). No spread livre, "| 5" no fim da
//  pergunta define o número de cartas. Linha em branco encerra o bloco, e um bloco
//  só com posições (sem pergunta) também vale.
const TEXTO_PERG_KEY = "cartarium_perguntas_texto";
let modoTextoPerguntas = false;

function _parsearPerguntasTexto(texto) {
    const itens  = [];
    let atual    = null;

    let novaPendente = false;
    let idxGrupo = 0;
    const montes = [];

    texto.replace(/\r/g, "").split("\n").forEach(bruta => {
        const linha = bruta.trim();
        if (!linha) { atual = null; return; }

        // "---" (ou "===") sozinho na linha: a próxima pergunta abre uma nova tiragem
        if (/^(-{3,}|={3,})$/.test(linha)) { atual = null; novaPendente = true; idxGrupo++; return; }

        // "Monte: separado" / "Monte: único": vale para a tiragem inteira
        const mMonte = linha.match(/^Monte:\s*(.+)$/i);
        if (mMonte) {
            if (/separad|repet|pergunta/i.test(mMonte[1]))                    montes[idxGrupo] = "separado";
            else if (/[uú]nico|compartilh|junto|sem repet/i.test(mMonte[1])) montes[idxGrupo] = "unico";
            return;
        }

        // "-" sempre é posição
        const mPos = linha.match(/^[-–—•*]\s*(.*)$/);
        if (mPos) {
            if (!atual) { atual = { texto: "", posicoes: [], n: null, nova: novaPendente, grupo: idxGrupo }; novaPendente = false; itens.push(atual); }
            atual.posicoes.push(mPos[1].trim());
            return;
        }

        let t = linha;
        let n = null;
        const mN = t.match(/^(.*?)\s*\|\s*(\d{1,3})\s*$/);
        if (mN) { t = mN[1].trim(); n = Math.max(1, parseInt(mN[2], 10)); }

        atual = { texto: t, posicoes: [], n, nova: novaPendente, grupo: idxGrupo };
        novaPendente = false;
        itens.push(atual);
    });

    // Posições em branco no fim não contam
    itens.forEach(it => { while (it.posicoes.length && !it.posicoes[it.posicoes.length - 1]) it.posicoes.pop(); });

    // Item vazio descartado não perde a quebra de tiragem: ela passa ao próximo
    let carrega = false;
    const vistos = new Set();
    const validos = [];
    itens.forEach(it => {
        if (!(it.texto || it.posicoes.some(Boolean))) { carrega = carrega || it.nova; return; }
        if (carrega) { it.nova = true; carrega = false; }
        if (!vistos.has(it.grupo)) { vistos.add(it.grupo); it.monte = montes[it.grupo] || null; }
        validos.push(it);
    });
    return validos;
}

function _serializarPerguntasTexto(modo) {
    const partes = [];
    let pendente = false;
    let pendMonte = null;
    let algumaPosicao = false;

    perguntasAtivas.forEach((p, i) => {
        if (p.iniciaTiragem) pendente = true;
        if (i === 0 || p.iniciaTiragem) pendMonte = p.monteTiragem || null;

        const t   = (p.texto || "").trim();
        // No spread fixo só as posições do modelo contam; no livre, todas as digitadas
        let pos = (p.posicoesCustom || []).slice(0, modo === "fixo" ? p.numCartas : undefined).map(n => n || "");
        while (pos.length && !pos[pos.length - 1]) pos.pop();
        if (!t && !pos.some(Boolean)) return;
        if (pos.length) algumaPosicao = true;

        let linhaPerg = t;
        if (t && modo === "livre" && !pos.length && p.numCartas && p.numCartas !== 3) linhaPerg += ` | ${p.numCartas}`;

        if (pendente && partes.length) partes.push("---");
        pendente = false;
        if (pendMonte) { partes.push(`Monte: ${pendMonte === "separado" ? "separado" : "único"}`); pendMonte = null; }
        partes.push([linhaPerg, ...pos.map(n => n ? `- ${n}` : "-")].filter(Boolean).join("\n"));
    });

    return partes.join(algumaPosicao ? "\n\n" : "\n");
}

// blocos → textarea
function _textoParaTextarea() {
    const ta = document.getElementById("perguntas-texto");
    if (!ta) return;
    sincronizarPerguntas();
    ta.value   = _serializarPerguntasTexto(_modoSpread());
    _atualizarDicaTexto();
    _renderizarSugestoesTexto();
}

// textarea → blocos
function _aplicarTextoNosBlocos() {
    const ta = document.getElementById("perguntas-texto");
    if (!ta) return;
    const itens = _parsearPerguntasTexto(ta.value).map(it => ({
        texto:          it.texto,
        numCartas:      it.posicoes.length || it.n || null,
        posicoesCustom: it.posicoes,
        iniciaTiragem:  it.nova,
        monteTiragem:   it.monte || null
    }));
    _reconstruirBlocos(itens);
}

function _atualizarDicaTexto() {
    const hint = document.getElementById("perguntas-texto-hint");
    const ta   = document.getElementById("perguntas-texto");
    if (!hint || !ta) return;

    const t    = ROTULO_TXT[rotuloAtual];
    const resumo = document.getElementById("perguntas-texto-resumo");
    if (resumo) resumo.textContent = `Como digitar várias ${t.plur}`;
    const modo = _modoSpread();
    const comum = `Uma linha com "---" começa outra tiragem (cada tiragem tem o próprio monte). "Monte: separado" numa linha da tiragem faz as cartas poderem se repetir entre as perguntas dela ("Monte: único" força o contrário). Ctrl+Enter tira.`;
    if (modo === "livre") {
        hint.textContent = `Uma linha por ${t.sing}. Para escolher o número de cartas, termine a linha com "| 5". Linhas começando com "-" logo abaixo dão nome às posições dessa ${t.sing}; um "-" sozinho deixa a posição sem nome. Um bloco só com posições (sem ${t.sing}) também vale. ${comum}`;
        ta.placeholder   = `${t.exemplos[0]}\n- Passado\n- Presente\n- Futuro\n\n${t.exemplos[1]} | 5\nMonte: separado\n---\n${t.exemplos[0]}`;
    } else {
        hint.textContent = `Uma linha por ${t.sing}. O número de cartas segue a tiragem escolhida. Linhas começando com "-" logo abaixo trocam o nome das posições do modelo, na ordem; um "-" sozinho mantém o nome do modelo. ${comum}`;
        ta.placeholder   = `${t.exemplos[0]}\n- Meu nome para a 1ª posição\n\n${t.exemplos[1]}\nMonte: separado\n---\n${t.exemplos[0]}`;
    }
}

function toggleModoTextoPerguntas() {
    definirModoTextoPerguntas(!modoTextoPerguntas);
}
window.toggleModoTextoPerguntas = toggleModoTextoPerguntas;

function definirModoTextoPerguntas(ativo) {
    if (ativo) {
        _textoParaTextarea();                       // blocos → texto, antes de esconder
    } else if (modoTextoPerguntas) {
        _aplicarTextoNosBlocos();                   // texto → blocos
    }
    modoTextoPerguntas = ativo;
    localStorage.setItem(TEXTO_PERG_KEY, ativo ? "1" : "0");

    document.getElementById("perguntas-lista").style.display      = ativo ? "none" : "";
    document.getElementById("perguntas-texto-wrap").style.display = ativo ? "block" : "none";
    document.getElementById("btn-add-pergunta").style.display     = ativo ? "none" : "";
    const bAddT = document.getElementById("btn-add-tiragem");
    if (bAddT) bAddT.style.display = ativo ? "none" : "";

    const btn = document.getElementById("btn-modo-texto-perguntas");
    if (btn) btn.textContent = ativo ? "☰ Voltar aos campos" : "📝 Digitar várias";
}

// Trocar o spread muda a regra do texto: lê com a regra antiga, reescreve com a nova
function aoMudarSpread() {
    if (modoTextoPerguntas) _aplicarTextoNosBlocos();
    atualizarBlocosSpread();
    if (modoTextoPerguntas) _textoParaTextarea();
}

function _iniciarTextoPerguntas() {
    document.getElementById("perguntas-texto")?.addEventListener("keydown", e => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            sortearTudo();
        }
    });
}

// Inicializa com uma pergunta
document.addEventListener("DOMContentLoaded", () => {
    _aplicarRotuloUI();
    adicionarPergunta();
    document.getElementById("spread")?.addEventListener("change", aoMudarSpread);
    definirOrdemCopia(ordemCopia);
    _iniciarModalCopiar();
    _atualizarOpcoesCopiar();
    _atualizarMonteUI();
    document.getElementById("sel-monte")?.addEventListener("change", e => definirMonte(e.target.value));
    _iniciarTextoPerguntas();
    if (localStorage.getItem(TEXTO_PERG_KEY) === "1") definirModoTextoPerguntas(true);
});

// ── Painel "Posições" (recolhível, como o de Sugestões) ───────
//  Em qualquer spread cada pergunta tem um painel para dar nome às posições:
//  no livre, nomeia as posições da tiragem; num spread com posições, troca o
//  nome do modelo (o nome do modelo aparece como dica cinza em cada campo).
//  Em branco = sem nome (livre) ou nome do modelo (fixo). A edição vale para os
//  próximos Tirars e só some ao trocar de spread, limpar ou recarregar a página.
const POSICOES_KEY = "cartarium_posicoes_abertas";
let _posicoesAbertas = localStorage.getItem(POSICOES_KEY) === "1";

function _montarPainelPosicoes(bloco, p) {
    bloco.querySelector(".posicoes-painel")?.remove();
    const painel = document.createElement("div");
    painel.className = "posicoes-painel";
    painel.innerHTML = `
        <button type="button" class="sugestoes-toggle posicoes-toggle" onclick="togglePosicoes()">
            <span class="sugestoes-seta">${_posicoesAbertas ? "▾" : "▸"}</span> <span class="posicoes-titulo"></span>
        </button>
        <div class="posicoes-custom-wrap" id="posicoes-custom-${p.id}" style="display:${_posicoesAbertas ? "flex" : "none"}"></div>`;
    bloco.querySelector(".bloco-footer").after(painel);
    _atualizarTituloPosicoes(p.id);
}

function _atualizarTituloPosicoes(pergId) {
    const p   = perguntasAtivas.find(x => x.id === pergId);
    const el  = document.querySelector(`.pergunta-bloco[data-id="${pergId}"] .posicoes-titulo`);
    if (!p || !el) return;
    const n    = (p.posicoesCustom || []).filter(Boolean).length;
    const base = _modoSpread() === "fixo" ? "Editar nomes das posições" : "Nomear posições";
    el.textContent = n ? `${base} (${n})` : base;
}

function _definirPosicoesAbertas(abertas) {
    _posicoesAbertas = abertas;
    localStorage.setItem(POSICOES_KEY, abertas ? "1" : "0");
    document.querySelectorAll(".posicoes-painel").forEach(painel => {
        const wrap = painel.querySelector(".posicoes-custom-wrap");
        const seta = painel.querySelector(".sugestoes-seta");
        if (wrap) wrap.style.display = abertas ? "flex" : "none";
        if (seta) seta.textContent   = abertas ? "▾" : "▸";
    });
}

function togglePosicoes() { _definirPosicoesAbertas(!_posicoesAbertas); }
window.togglePosicoes = togglePosicoes;

// Trocar de spread: as edições do spread anterior não valem no novo; a lista do livre é guardada
let _spreadAnteriorId  = null;
let _posLivreGuardadas = [];

function atualizarBlocosSpread() {
    const spread    = SPREADS.find(s => s.id === document.getElementById("spread").value);
    const nPosicoes = spread && spread.posicoes.length > 0 ? spread.posicoes.length : null;
    const anterior  = SPREADS.find(s => s.id === _spreadAnteriorId);
    const eraFixo   = !!(anterior && anterior.posicoes.length > 0);

    if (nPosicoes && !eraFixo) _posLivreGuardadas = perguntasAtivas.map(p => [...(p.posicoesCustom || [])]);

    perguntasAtivas.forEach((p, i) => {
        if (nPosicoes) {
            p.numCartas      = nPosicoes;
            p.posicoesCustom = [];
            p.modoTexto      = false;
        } else {
            if (eraFixo) p.posicoesCustom = _posLivreGuardadas[i] ? [..._posLivreGuardadas[i]] : [];
            p.modoTexto = _getModoTexto();
        }
        if (!p.posicoesCustom) p.posicoesCustom = [];

        const bloco  = document.querySelector(`.pergunta-bloco[data-id="${p.id}"]`);
        const footer = bloco && bloco.querySelector(".bloco-footer");
        if (!footer) return;

        const rodape = _rodapeBloco(p, !!nPosicoes);
        footer.className = rodape.classe;
        footer.innerHTML = rodape.html;

        _montarPainelPosicoes(bloco, p);
        if (!nPosicoes && p.modoTexto) _aplicarModoTexto(p.id);
        else                           _renderizarPosicoesCustom(p.id, p.numCartas);
        renderizarSugestoes(bloco, p.id);
    });
    _spreadAnteriorId = spread ? spread.id : null;
}

// ── Campos de nome de posição ─────────────────────────────────
let _debounceCustom = {};

function atualizarNumCustom(pergId, n) {
    const p = perguntasAtivas.find(p => p.id === pergId);
    if (!p) return;
    p.numCartas = n;

    clearTimeout(_debounceCustom[pergId]);
    _debounceCustom[pergId] = setTimeout(() => _renderizarPosicoesCustom(pergId, n), 300);
}
window.atualizarNumCustom = atualizarNumCustom;

// Enter num campo de posição: vai para o próximo; no último do spread livre, cria outro
// (e sobe "Cartas" junto). Campo vazio não gera outro, e no spread fixo o último fica onde está.
function _teclaPosicao(ev, pergId, i) {
    if (ev.key !== "Enter") return;
    ev.preventDefault();

    const wrap   = document.getElementById(`posicoes-custom-${pergId}`);
    const campos = wrap ? [...wrap.querySelectorAll(".posicao-custom-input")] : [];
    if (i < campos.length - 1) { campos[i + 1].focus(); return; }

    if (_modoSpread() === "fixo") return;
    if (!campos[i] || !campos[i].value.trim()) return;

    const p = perguntasAtivas.find(x => x.id === pergId);
    if (!p) return;
    const novo = Math.max(p.numCartas, campos.length) + 1;
    if (novo > maxCartasAtual()) return;

    clearTimeout(_debounceCustom[pergId]);
    p.numCartas = novo;
    const numInput = document.querySelector(`.pergunta-bloco[data-id="${pergId}"] .input-num-custom`);
    if (numInput) numInput.value = novo;
    _renderizarPosicoesCustom(pergId, novo);
    wrap.querySelectorAll(".posicao-custom-input")[i + 1]?.focus();
}

function _renderizarPosicoesCustom(pergId, n) {
    const p    = perguntasAtivas.find(p => p.id === pergId);
    const wrap = document.getElementById(`posicoes-custom-${pergId}`);
    if (!p || !wrap) return;

    if (!p.posicoesCustom) p.posicoesCustom = [];

    const spread = SPREADS.find(s => s.id === document.getElementById("spread")?.value);
    const modelo = spread && spread.posicoes.length > 0 ? spread.posicoes : null;

    // Preserva nomes existentes; só adiciona/remove campos necessários
    const qtdAtual = wrap.querySelectorAll(".posicao-custom-input").length;

    if (n > qtdAtual) {
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
            input.placeholder = modelo && modelo[i] ? modelo[i].nome : `Nome da posição ${i + 1}`;
            input.value = p.posicoesCustom[i] || "";
            input.dataset.idx = i;
            input.oninput = () => {
                p.posicoesCustom[i] = input.value.trim();
                _atualizarTituloPosicoes(p.id);
            };
            input.onkeydown = ev => _teclaPosicao(ev, pergId, i);

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
    }

    // Marca como "ignorados" os que têm conteúdo mas estão além do número de cartas
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
    _atualizarTituloPosicoes(pergId);
}
window._renderizarPosicoesCustom = _renderizarPosicoesCustom;

// ── Alterna entre campos individuais e área de texto (spread livre) ──
function toggleModoTexto(pergId) {
    const p = perguntasAtivas.find(p => p.id === pergId);
    if (!p) return;
    p.modoTexto = !p.modoTexto;
    // Persiste preferência global
    localStorage.setItem(MODO_TEXTO_KEY, p.modoTexto ? "1" : "0");
    // Propaga para os outros blocos
    perguntasAtivas.forEach(outra => { if (outra.id !== pergId) outra.modoTexto = p.modoTexto; });

    if (p.modoTexto) {
        _aplicarModoTexto(pergId);
        perguntasAtivas.forEach(outra => { if (outra.id !== pergId) _aplicarModoTexto(outra.id); });
    } else {
        _aplicarModoInputs(pergId);
        perguntasAtivas.forEach(outra => { if (outra.id !== pergId) _aplicarModoInputs(outra.id); });
    }
    if (!_posicoesAbertas) _definirPosicoesAbertas(true);   // quem troca de modo quer ver o resultado
}
window.toggleModoTexto = toggleModoTexto;

// Modo textarea: uma linha = uma posição
function _aplicarModoTexto(pergId) {
    const p    = perguntasAtivas.find(p => p.id === pergId);
    const wrap = document.getElementById(`posicoes-custom-${pergId}`);
    const btn  = document.querySelector(`.pergunta-bloco[data-id="${pergId}"] .btn-modo-texto`);
    if (!p || !wrap) return;
    if (!p.posicoesCustom) p.posicoesCustom = [];

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
        _atualizarTituloPosicoes(pergId);
    });
    _atualizarTituloPosicoes(pergId);

    if (btn) { btn.textContent = "Campos"; btn.title = "Voltar para campos individuais"; }
}
window._aplicarModoTexto = _aplicarModoTexto;

// Modo campos: um campo por posição (padrão)
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


// ══════════════════════════════════════════════════════════════
//  SORTEIO PRINCIPAL
// ══════════════════════════════════════════════════════════════
function sortearTudo() {
    if (modoTextoPerguntas) _aplicarTextoNosBlocos();
    sincronizarPerguntas();

    // Sessão ativa: vale o baralho e a quantidade de cópias da sessão
    const sessaoAtiva  = modoAtual === "sessao" && SESSAO.ativa;
    const deckId       = sessaoAtiva ? SESSAO.deckId : document.getElementById("deck").value;
    const deck         = DECKS.get(deckId);
    const copias       = sessaoAtiva ? SESSAO.copias : obterCopias();
    const spreadId     = document.getElementById("spread").value;
    const spread       = SPREADS.find(s => s.id === spreadId);
    const incluirInv   = document.getElementById("invertida").checked && deck.aceitaInversao;

    const vazias = perguntasAtivas.filter(p => !_temConteudo(p));
    if (vazias.length > 0) {
        alert(_mensagemPreencher());
        return;
    }

    const somar = lista => lista.reduce((s, p) => s + p.numCartas, 0);
    const totalNecessario = somar(perguntasAtivas);

    // Cada "unidade" divide um monte: a sessão inteira, uma pergunta (monte por pergunta) ou uma tiragem
    const tamanhoMonte = deck.cartas.length * copias;
    const grupos       = _agruparPerguntas(perguntasAtivas);
    const unidades     = [];
    if (modoAtual === "sessao") {
        unidades.push({ lista: perguntasAtivas, quem: "você" });
    } else {
        grupos.forEach((g, iG) => {
            if (_monteDoGrupo(g)) {
                g.forEach((p, iP) => unidades.push({ lista: [p],
                    quem: `${grupos.length > 1 ? `na Tiragem ${iG + 1}, ` : ""}a ${ROTULO_TXT[rotuloAtual].sing} ${iP + 1}` }));
            } else {
                unidades.push({ lista: g, quem: grupos.length > 1 ? `a Tiragem ${iG + 1}` : "você" });
            }
        });
    }
    const excede = unidades.find(u => somar(u.lista) > tamanhoMonte);
    if (excede) {
        alert(`O baralho "${deck.nome}" tem ${tamanhoMonte} carta${tamanhoMonte !== 1 ? 's' : ''}, mas ${excede.quem} pediu ${somar(excede.lista)}. Reduza a quantidade de cartas${copias < 3 ? " ou aumente a quantidade de baralhos" : ""}.`);
        return;
    }

    if (modoAtual === "sessao") {
        if (!SESSAO.ativa) {
            SESSAO.iniciar(deckId, copias);
            _sessaoSeq++;
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
    const rotulo = ROTULO_TXT[rotuloAtual].Sing;
    perguntasAtivas.forEach(p => { p.rotulo = rotulo; });

    _baralhoSaiuDaTela();
    const resultadosDiv = document.getElementById("resultados-sessao");
    resultadosDiv.innerHTML = "";

    const sessao   = modoAtual === "sessao" && SESSAO.ativa;
    const grupos   = _agruparPerguntas(perguntasAtivas);
    const baseLote = loteContador;   // cada tiragem vira o próximo lote do registro

    const poolSessao = sessao ? [...SESSAO.cartasRestantes] : null;
    let posSessao    = 0;
    const todasTiragens = [];

    grupos.forEach((grupo, iGrupo) => {
        if (grupos.length > 1) {
            const h = document.createElement("h3");
            h.className   = "tiragem-grupo-titulo";
            h.textContent = `Tiragem ${baseLote + iGrupo + 1}`;
            resultadosDiv.appendChild(h);
        }

        // Monte da tiragem (ou um novo a cada pergunta, se esta tiragem estiver em "monte separado")
        const separado = _monteDoGrupo(grupo);
        let pool = (sessao || separado) ? null : criarPool(deck, copias);
        let pos  = 0;

        grupo.forEach((perg, iPerg) => {
            const n = perg.numCartas;
            let indices;
            if (sessao) {
                indices = poolSessao.slice(posSessao, posSessao + n);
                posSessao += n;
            } else {
                if (separado) { pool = criarPool(deck, copias); pos = 0; }
                indices = pool.slice(pos, pos + n);
                pos += n;
            }

            const cartasSorteadas = indices.map(idx => {
                const isInvert = incluirInv && Math.random() < 0.5;
                return { idx, nome: deck.cartas[idx], invertida: isInvert };
            });

            todasTiragens.push({ perg, cartasSorteadas, grupo: iGrupo, monteSeparado: separado && grupo.length > 1 });

            const secao = document.createElement("div");
            secao.className = "tiragem-secao";

            const titulo = document.createElement("h2");
            titulo.textContent = perg.texto
                ? `${rotulo} ${iPerg + 1}: ${perg.texto}`
                : (grupos.length > 1 ? `Sem ${rotulo.toLowerCase()} ${iPerg + 1}` : `Tiragem ${iPerg + 1}`);
            secao.appendChild(titulo);

            secao.appendChild(renderizarCartas(cartasSorteadas, deck, spread, incluirInv, perg.posicoesCustom));
            resultadosDiv.appendChild(secao);
        });
    });

    if (modoAtual === "sessao" && SESSAO.ativa) {
        const totalUsado = perguntasAtivas.reduce((s, p) => s + p.numCartas, 0);
        SESSAO.retirar(totalUsado);
    }

    registrarTiragens(todasTiragens, deck, spread, incluirInv, copias);
    _naTelaIds = registroEntradas.filter(e => e.lote > baseLote).map(e => e.id);

    document.querySelector(".botoes-acao").style.display = "flex";
    document.getElementById("resultados-sessao").scrollIntoView({ behavior: "smooth", block: "start" });

    setTimeout(reiniciarPerguntas, 400);
}


// ══════════════════════════════════════════════════════════════
//  RENDERIZAÇÃO DE CARTAS
// ══════════════════════════════════════════════════════════════
// Spread com os nomes editados no lugar dos do modelo (a descrição do modelo some nas posições renomeadas).
// Todos os layouts leem os nomes daqui, então a edição chega a roda, ferradura, cruzamento etc.
function _spreadEfetivo(spread, posicoesCustom) {
    if (!spread || !spread.posicoes.length || !posicoesCustom || !posicoesCustom.some(Boolean)) return spread;
    return { ...spread, posicoes: spread.posicoes.map((pos, i) => {
        const nome = posicoesCustom[i];
        return (!nome || nome === pos.nome) ? pos : { ...pos, nome, descricao: "" };
    }) };
}

function renderizarCartas(cartas, deck, spreadModelo, incluirInv, posicoesCustom) {
    const spread     = _spreadEfetivo(spreadModelo, posicoesCustom);
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
let registroEntradas = []; // { id, texto, rotulo, lote, ordemNoLote, hora, html, plain, cartas, deckId, spreadId, incluirInv }
let contadorRegistro = 0;
let loteContador     = 0;  // "tiragem" = um clique em Tirar (pode ter várias perguntas)

// Texto que identifica uma entrada: a pergunta/tema ou, se vazio, as posições
function _textoEntrada(e) {
    if (e.texto) return e.texto;
    const rotulo = (e.rotulo || "Pergunta").toLowerCase();
    const pos    = (e.posicoesCustom || []).filter(Boolean);
    return `Sem ${rotulo}` + (pos.length ? ` (${pos.join(", ")})` : "");
}

function _tituloEntrada(e) {
    const icone = e.texto ? (e.rotulo === "Tema" ? "🏷️" : "❓") : "🃏";
    return `${icone} ${_textoEntrada(e)}`;
}

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

        // Posição: nome editado → nome do modelo (spread fixo) → nada (livre sem nome)
        const nomePosicao = (posicoesCustom && posicoesCustom[i])
            ? posicoesCustom[i]
            : (spread && spread.posicoes[i]) ? spread.posicoes[i].nome : null;
        const posLabel = nomePosicao ? ` [${nomePosicao}]` : "";

        html  += `<p><strong>${escapeHtml(c.nome)}${sufixo}${escapeHtml(posLabel)}:</strong> ${escapeHtml(txt)}</p>`;
        plain += `${c.nome}${sufixo}${posLabel}: ${txt}\n`;
    });

    return { html, plain };
}

// Nomes de posição a gravar na cópia, ou null se nada foi editado.
// Spread fixo: lista completa (em branco = nome do modelo). Livre: em branco = sem nome.
function _nomesPosicoesCopia(spread, posicoesCustom, nCartas) {
    if (!posicoesCustom) return null;
    const edit = posicoesCustom.slice(0, nCartas);
    let nomes;
    if (spread && spread.posicoes.length > 0) {
        nomes = spread.posicoes.map((pos, i) => edit[i] || pos.nome);
        if (!nomes.some((n, i) => n !== spread.posicoes[i].nome)) return null;
    } else {
        if (!edit.some(Boolean)) return null;
        nomes = Array.from({ length: nCartas }, (_, i) => edit[i] || "");
        while (nomes.length && !nomes[nomes.length - 1]) nomes.pop();
    }
    return nomes.map(n => n.replace(/;/g, ","));   // ";" separa os nomes
}

// ── Formata uma entrada como texto simples (para cópia) ───────
function _nomeCopias(copias) {
    return copias === 2 ? "duplo" : copias === 3 ? "triplo" : "";
}

function formatarEntradaTexto({ perg, cartasSorteadas, deck, spread, incluirInv, timestamp, copias = 1, monteSeparado = false }) {
    const temSpread    = spread && spread.posicoes.length > 0;
    const tiragemTexto = cartasSorteadas.map(c => {
        const sufixo = incluirInv ? (c.invertida ? " (Invertida)" : " (Direta)") : "";
        return c.nome + sufixo;
    }).join(", ");

    const { plain: descPlain } = _resumoCartas(cartasSorteadas, deck, spread, incluirInv, perg.posicoesCustom);

    const linhaPerg = perg.texto ? `${perg.rotulo || "Pergunta"}: ${perg.texto}\n` : "";
    const nomesPos  = _nomesPosicoesCopia(spread, perg.posicoesCustom, cartasSorteadas.length);
    const linhaPos  = nomesPos ? `Posições: ${nomesPos.join("; ")}\n` : "";

    return `${linhaPerg}Baralho: ${deck.nome}\n${copias > 1 ? `Quantidade de baralhos: ${copias} (${_nomeCopias(copias)})\n` : ""}${temSpread ? `Spread: ${spread.nome}\n` : ""}${monteSeparado ? "Monte: separado\n" : ""}${linhaPos}Tiragem: ${tiragemTexto}\n${descPlain}`;
}

// ── Formata uma entrada como HTML (para o registro visual) ────
function formatarEntradaHTML({ rid, perg, cartasSorteadas, deck, spread, incluirInv, timestamp, copias = 1, monteSeparado = false }) {
    const temSpread    = spread && spread.posicoes.length > 0;
    const tiragemTexto = cartasSorteadas.map(c => {
        const sufixo = incluirInv ? (c.invertida ? " (Invertida)" : " (Direta)") : "";
        return escapeHtml(c.nome) + sufixo;
    }).join(", ");

    const { html: descHTML } = _resumoCartas(cartasSorteadas, deck, spread, incluirInv, perg.posicoesCustom);
    const nomesPos = _nomesPosicoesCopia(spread, perg.posicoesCustom, cartasSorteadas.length);

    return `
        <div class="registro-item" data-rid="${rid}">
            <div class="reg-header">
                <span class="reg-pergunta">${escapeHtml(_tituloEntrada(perg))}</span>
                <button class="btn-apagar-reg" onclick="apagarEntrada(${rid})" title="Apagar do registro" aria-label="Apagar do registro">✕</button>
            </div>
            <p><strong>Tiragem:</strong> ${tiragemTexto}</p>
            ${temSpread ? `<p><strong>Spread:</strong> ${spread.nome}</p>` : ""}
            ${nomesPos ? `<p><strong>Posições:</strong> ${escapeHtml(nomesPos.join("; "))}</p>` : ""}
            ${descHTML}
            <div class="reg-rodape">
                <span class="reg-meta">${escapeHtml(deck.nome)}${copias > 1 ? ` · baralho ${_nomeCopias(copias)}` : ""}${monteSeparado ? " · monte por pergunta" : ""} · ${timestamp}</span>
                <span class="reg-botoes">
                    <button class="btn-visualizar-reg" onclick="copiarEntrada(${rid}, this)" title="Copiar esta pergunta">📋 Copiar</button>
                    <button class="btn-visualizar-reg" onclick="visualizarRegistro(${rid})" title="Ver as cartas desta pergunta">🖼 Visualizar</button>
                </span>
            </div>
        </div>`;
}

// ── Gerencia estado e DOM do registro ─────────────────────────
function registrarTiragens(todasTiragens, deck, spread, incluirInv, copias = 1) {
    const timestamp = new Date().toLocaleString("pt-BR");
    const hora      = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    // Cada tiragem (grupo de perguntas) vira um lote próprio no registro
    const porGrupo = [];
    todasTiragens.forEach(t => { (porGrupo[t.grupo || 0] = porGrupo[t.grupo || 0] || []).push(t); });

    porGrupo.filter(Boolean).forEach(itens => {
        loteContador++;
        const lote = loteContador;

        itens.forEach(({ perg, cartasSorteadas, monteSeparado }, iLote) => {
            contadorRegistro++;
            const rid = contadorRegistro;
            const ctx = { rid, perg, cartasSorteadas, deck, spread, incluirInv, timestamp, copias, monteSeparado: !!monteSeparado };

            registroEntradas.unshift({ id: rid, texto: perg.texto, rotulo: perg.rotulo || "Pergunta",
                lote, ordemNoLote: iLote + 1, hora, html: formatarEntradaHTML(ctx), plain: formatarEntradaTexto(ctx),
                cartas: cartasSorteadas, deckId: deck.id, spreadId: spread ? spread.id : null, incluirInv,
                monteSeparado: !!monteSeparado,
                sessao: (modoAtual === "sessao" && SESSAO.ativa) ? _sessaoSeq : 0,
                posicoesCustom: perg.posicoesCustom ? [...perg.posicoesCustom] : null });
        });
    });

    renderizarRegistro();
}

// Resumo de uma tiragem: baralho · spread · hora (· quantidade de perguntas)
function _metaLote(entradas, comContagem = false) {
    const primeira = entradas[0];
    const deck     = DECKS.get(primeira.deckId);
    const spread   = primeira.spreadId ? SPREADS.find(s => s.id === primeira.spreadId) : null;
    const partes   = [deck ? deck.nome : null, spread ? spread.nome : null, primeira.hora];
    if (comContagem && entradas.length > 1) {
        partes.push(`${entradas.length} ${primeira.rotulo === "Tema" ? "temas" : "perguntas"}`);
        if (primeira.monteSeparado) partes.push("monte por pergunta (cartas podem repetir)");
    }
    return partes.filter(Boolean).join(" · ");
}

// Redesenha o registro agrupado por tiragem (mais recente primeiro; dentro de cada uma, na ordem das perguntas)
function renderizarRegistro() {
    const registroDiv = document.getElementById("registro");
    if (!registroDiv) return;

    const ultimo = registroEntradas.length ? Math.max(...registroEntradas.map(e => e.lote)) : 0;
    const lotes  = [...new Set(registroEntradas.map(e => e.lote))];

    const grupos = lotes.map(lote => {
        const entradas = _entradasDoLote(lote);
        const varias   = entradas.length > 1;
        const acoes    = varias ? `
                <span class="reg-grupo-acoes">
                    <button class="btn-visualizar-reg" onclick="copiarTiragem(${lote}, this)" title="Copiar todas as perguntas desta tiragem">📋 Copiar tiragem</button>
                    <button class="btn-visualizar-reg" onclick="visualizarTiragem(${lote})" title="Ver as cartas de todas as perguntas desta tiragem">🖼 Visualizar tiragem</button>
                    <button class="btn-apagar-reg" onclick="apagarTiragem(${lote})" title="Apagar esta tiragem do registro" aria-label="Apagar tiragem do registro">✕</button>
                </span>` : "";

        return `
        <div class="registro-grupo" data-lote="${lote}">
            <div class="reg-grupo-header">
                <span class="reg-grupo-info">
                    <span class="reg-grupo-titulo">Tiragem ${lote}${lote === ultimo ? ' <span class="copia-badge">mais recente</span>' : ""}</span>
                    <span class="reg-grupo-meta">${escapeHtml(_metaLote(entradas, true))}</span>
                </span>${acoes}
            </div>
            ${entradas.map(e => e.html).join("")}
        </div>`;
    });

    registroDiv.innerHTML = "<h3>Registro de Perguntas e Tiragens</h3>" + grupos.join("");
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
function _secaoEntrada(entrada) {
    const deck   = DECKS.get(entrada.deckId);
    const spread = entrada.spreadId ? SPREADS.find(s => s.id === entrada.spreadId) : null;
    if (!deck) return null;

    const secao = document.createElement("div");
    secao.className = "tiragem-secao";

    const titulo = document.createElement("h2");
    titulo.textContent = _tituloEntrada(entrada);
    secao.appendChild(titulo);

    secao.appendChild(renderizarCartas(entrada.cartas, deck, spread, entrada.incluirInv, entrada.posicoesCustom));
    return secao;
}

function _mostrarSecoes(secoes, ids = null) {
    if (!secoes.length) { alert("Baralho desta tiragem não está mais disponível."); return; }
    if (ids) _naTelaIds = ids;

    _baralhoSaiuDaTela();
    const resultadosDiv = document.getElementById("resultados-sessao");
    resultadosDiv.innerHTML = "";
    secoes.forEach(s => resultadosDiv.appendChild(s));
    document.querySelector(".botoes-acao").style.display = "flex";
    resultadosDiv.scrollIntoView({ behavior: "smooth", block: "start" });
}

function visualizarRegistro(rid) {
    const entrada = registroEntradas.find(e => e.id === rid);
    if (!entrada) return;
    const secao = _secaoEntrada(entrada);
    _mostrarSecoes(secao ? [secao] : [], [rid]);
}
window.visualizarRegistro = visualizarRegistro;

// Mostra as cartas de todas as perguntas de uma tiragem, na ordem em que foram feitas
function visualizarTiragem(lote) {
    _mostrarSecoes(_entradasDoLote(lote).map(_secaoEntrada).filter(Boolean), _entradasDoLote(lote).map(e => e.id));
}
window.visualizarTiragem = visualizarTiragem;


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

// Lê um bloco de texto no formato copiado pelo Cartarium (uma pergunta/tema).
// Devolve { ok:false, motivo } ou { ok:true, perg, deck, spread, cartasSorteadas, incluirInv, copias, naoEncontradas }
function _parsearBlocoRegistro(bloco) {
    const linhas = bloco.split("\n").map(l => l.trim()).filter(Boolean);

    let perguntaTxt = null, rotuloTxt = "Pergunta";
    let deckNome = null, spreadNome = null, copias = 1, monteSeparado = false;
    let cartasNomes = null, posicoesTxt = null;

    linhas.forEach(linha => {
        if (perguntaTxt === null && /^(Pergunta|Tema):/i.test(linha)) {
            rotuloTxt   = /^Tema:/i.test(linha) ? "Tema" : "Pergunta";
            perguntaTxt = linha.replace(/^(Pergunta|Tema):\s*/i, "");
        } else if (deckNome === null && /^Baralho:/i.test(linha)) {
            deckNome = linha.replace(/^Baralho:\s*/i, "").trim();
        } else if (spreadNome === null && /^Spread:/i.test(linha)) {
            spreadNome = linha.replace(/^Spread:\s*/i, "").trim();
        } else if (posicoesTxt === null && /^Posi[çc][õo]es:/i.test(linha)) {
            // Nomes editados: têm prioridade sobre os do modelo do spread
            posicoesTxt = linha.replace(/^Posi[çc][õo]es:\s*/i, "").split(";").map(n => n.trim());
        } else if (/^Monte:/i.test(linha)) {
            monteSeparado = /separad|repet|pergunta/i.test(linha);
        } else if (/^Quantidade de baralhos:/i.test(linha)) {
            const n = parseInt(linha.replace(/^Quantidade de baralhos:\s*/i, ""), 10);
            if (n >= 1 && n <= 3) copias = n;
        } else if (cartasNomes === null && /^Tiragem:/i.test(linha)) {
            cartasNomes = linha.replace(/^Tiragem:\s*/i, "").split(",").map(c => c.trim()).filter(Boolean);
        }
    });

    if (!cartasNomes || cartasNomes.length === 0) {
        return { ok: false, motivo: "sem a linha 'Tiragem:'" };
    }

    // Baralho: pelo nome; se não vier (ou não existir), usa o selecionado agora
    let deck = deckNome
        ? Object.values(DECKS._lista).find(d => d.nome.toLowerCase() === deckNome.toLowerCase())
        : null;
    if (!deck) deck = DECKS.get(document.getElementById("deck").value);
    if (!deck) return { ok: false, motivo: "baralho não identificado" };

    // Spread: pelo nome; senão, o selecionado se o número de cartas bater
    let spread = spreadNome ? SPREADS.find(s => s.nome.toLowerCase() === spreadNome.toLowerCase()) : null;
    if (!spread) {
        const sel = SPREADS.find(s => s.id === document.getElementById("spread").value);
        if (sel && sel.posicoes.length > 0 && sel.posicoes.length === cartasNomes.length) spread = sel;
    }

    const naoEncontradas = [];
    const cartasSorteadas = cartasNomes.map(nomeRaw => {
        const invertida = /\(Invertida\)/i.test(nomeRaw);
        const nomeLimpo = nomeRaw.replace(/\s*\((Invertida|Direta)\)\s*/ig, "").trim();
        const idx = deck.cartas.findIndex(c => c.toLowerCase() === nomeLimpo.toLowerCase());
        if (idx < 0) naoEncontradas.push(nomeLimpo);
        return { idx: idx >= 0 ? idx : 0, nome: idx >= 0 ? deck.cartas[idx] : nomeLimpo, invertida };
    });

    const perg = {
        texto: perguntaTxt || "", rotulo: rotuloTxt, numCartas: cartasSorteadas.length,
        posicoesCustom: posicoesTxt && posicoesTxt.some(Boolean) ? posicoesTxt : null
    };
    // Sem linha de pergunta/tema: mantém o comportamento anterior (rótulo "Tiragem manual")
    if (perguntaTxt === null) perg.texto = "Tiragem manual";

    return {
        ok: true, perg, deck, spread, cartasSorteadas, copias, naoEncontradas, monteSeparado,
        incluirInv: cartasSorteadas.some(c => c.invertida)
    };
}

// Divide o texto de UMA tiragem em perguntas: uma nova pergunta começa numa linha
// "Pergunta:", "Tema:" ou "Baralho:" que venha depois de uma linha "Tiragem:".
function _dividirEmPerguntas(textoTiragem) {
    const out = [];
    let atual = null, viuTiragem = false;
    textoTiragem.replace(/\r/g, "").split("\n").forEach(linha => {
        const t = linha.trim();
        if (!atual || (/^(Pergunta|Tema|Baralho):/i.test(t) && viuTiragem)) {
            atual = []; out.push(atual); viuTiragem = false;
        }
        if (/^Tiragem:/i.test(t)) viuTiragem = true;
        atual.push(linha);
    });
    return out.map(a => a.join("\n").trim()).filter(Boolean);
}

function processarTextoRegistro() {
    const texto = (document.getElementById("input-registro-manual").value || "").trim();
    if (!texto) { alert("Cole o texto da tiragem antes de processar."); return; }

    // "---" separa tiragens; dentro de cada uma, as perguntas se separam sozinhas (ver _dividirEmPerguntas)
    const tiragensTxt = texto.replace(/\r/g, "").split(/^\s*-{3,}\s*$/m).map(b => b.trim()).filter(Boolean);

    const lidas = tiragensTxt.map((tt, iT) => ({
        iT: iT + 1,
        perguntas: _dividirEmPerguntas(tt).map((b, iP) => ({ iP: iP + 1, r: _parsearBlocoRegistro(b) }))
    }));

    const todas     = lidas.flatMap(t => t.perguntas.map(q => ({ ...q, iT: t.iT })));
    const invalidos = todas.filter(x => !x.r.ok);
    const nValidos  = todas.length - invalidos.length;

    if (nValidos === 0) {
        alert(todas.length > 1
            ? "Não encontrei nenhuma linha 'Tiragem:' com os nomes das cartas."
            : `Não foi possível ler a tiragem: ${invalidos[0]?.r.motivo || "texto vazio"}.`);
        return;
    }

    if (invalidos.length > 0) {
        const lista = invalidos.map(x => `• Tiragem ${x.iT}, pergunta ${x.iP}: ${x.r.motivo}`).join("\n");
        if (!confirm(`${invalidos.length} bloco(s) não puderam ser lidos e serão ignorados:\n\n${lista}\n\nContinuar com os ${nValidos} restantes?`)) return;
    }

    const faltando = todas.filter(x => x.r.ok).flatMap(x => x.r.naoEncontradas.map(n => `${n} (${x.r.deck.nome})`));
    if (faltando.length > 0) {
        if (!confirm(`As cartas a seguir não foram encontradas no baralho e serão exibidas sem imagem:\n\n${[...new Set(faltando)].join(", ")}\n\nDeseja continuar mesmo assim?`)) return;
    }

    // Cada tiragem colada vira um lote próprio no registro
    const timestamp = new Date().toLocaleString("pt-BR");
    const hora      = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const secoes    = [];
    const idsNovos  = [];

    lidas.forEach(t => {
        const validas = t.perguntas.filter(q => q.r.ok).map(q => q.r);
        if (!validas.length) return;

        loteContador++;
        const lote = loteContador;
        const novas = [];
        const monteSep = validas.length > 1 && validas.some(v => v.monteSeparado);

        validas.forEach((v, i) => {
            contadorRegistro++;
            const rid = contadorRegistro;
            const ctx = { rid, perg: v.perg, cartasSorteadas: v.cartasSorteadas, deck: v.deck, spread: v.spread,
                          incluirInv: v.incluirInv, timestamp, copias: v.copias, monteSeparado: monteSep };
            const entrada = {
                id: rid, texto: v.perg.texto, rotulo: v.perg.rotulo,
                lote, ordemNoLote: i + 1, hora,
                html: formatarEntradaHTML(ctx), plain: formatarEntradaTexto(ctx),
                cartas: v.cartasSorteadas, deckId: v.deck.id, spreadId: v.spread ? v.spread.id : null,
                incluirInv: v.incluirInv, monteSeparado: monteSep,
                posicoesCustom: v.perg.posicoesCustom ? [...v.perg.posicoesCustom] : null
            };
            registroEntradas.unshift(entrada);
            novas.push(entrada);
            idsNovos.push(rid);
        });

        if (lidas.length > 1) {
            const h = document.createElement("h3");
            h.className   = "tiragem-grupo-titulo";
            h.textContent = `Tiragem ${lote}`;
            secoes.push(h);
        }
        novas.map(_secaoEntrada).filter(Boolean).forEach(x => secoes.push(x));
    });

    renderizarRegistro();
    _mostrarSecoes(secoes, idsNovos);

    document.getElementById("input-registro-manual").value = "";
    abrirPainelPreencherRegistro();
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

// Entradas de uma tiragem, na ordem em que as perguntas foram feitas
function _entradasDoLote(lote) {
    return registroEntradas
        .filter(e => e.lote === lote)
        .sort((a, b) => a.ordemNoLote - b.ordemNoLote);
}

// Troca o texto do botão por um aviso curto, sem alert
function _feedbackBotao(btn, texto = "✓ Copiado") {
    if (!btn) return;
    if (!btn.dataset.orig) btn.dataset.orig = btn.textContent;
    btn.textContent = texto;
    clearTimeout(btn._timer);
    btn._timer = setTimeout(() => { btn.textContent = btn.dataset.orig; }, 1500);
}

function copiarEntrada(rid, btn) {
    const e = registroEntradas.find(x => x.id === rid);
    if (!e) return;
    copiarTexto(e.plain).then(() => _feedbackBotao(btn));
}
window.copiarEntrada = copiarEntrada;

// Texto de uma tiragem: perguntas separadas por linha em branco
function _textoLote(lote, entradas = _entradasDoLote(lote)) {
    return entradas.map(e => e.plain).join("\n");
}

// Texto de várias tiragens: separadas por "---"
function _textoLotes(lotes, filtro = null) {
    return lotes
        .map(l => _textoLote(l, filtro ? filtro(_entradasDoLote(l)) : undefined))
        .join("\n---\n\n");
}

function copiarTiragem(lote, btn) {
    const entradas = _entradasDoLote(lote);
    if (!entradas.length) return;
    copiarTexto(_textoLote(lote)).then(() => _feedbackBotao(btn));
}
window.copiarTiragem = copiarTiragem;

// Copia as entradas dadas, respeitando a ordem escolhida entre tiragens
function _copiarEntradasDe(entradas, btn, msgVazio) {
    if (!entradas.length) { alert(msgVazio); return; }

    const ids   = new Set(entradas.map(e => e.id));
    const lotes = [...new Set(entradas.map(e => e.lote))]
        .sort((a, b) => ordemCopia === "antiga" ? a - b : b - a);
    const texto = _textoLotes(lotes, doLote => doLote.filter(e => ids.has(e.id)));

    copiarTexto(texto).then(() => _feedbackBotao(btn, "✓ Copiado"));
}

// Registro (tudo)
function copiarRegistro(btn) {
    _copiarEntradasDe(registroEntradas, btn, "Nenhuma tiragem registrada.");
}
window.copiarRegistro = copiarRegistro;

// Consulta: o que está na tela, com todas as tiragens dela
function copiarConsulta(btn) {
    const naTela = new Set(_naTelaIds);
    _copiarEntradasDe(registroEntradas.filter(e => naTela.has(e.id)), btn, "Não há nenhuma consulta na tela.");
}
window.copiarConsulta = copiarConsulta;

// Sessão: tudo o que saiu desde o início da sessão atual
function copiarSessao(btn) {
    const entradas = modoAtual === "sessao" ? registroEntradas.filter(e => e.sessao === _sessaoSeq) : [];
    _copiarEntradasDe(entradas, btn, "Nenhuma tiragem registrada nesta sessão.");
}
window.copiarSessao = copiarSessao;
window.copiarUltima = copiarUltima;

// ── Apagar do registro ────────────────────────────────────────
function _aposApagar() {
    if (registroEntradas.length === 0) {
        // Registro vazio: volta ao estado inicial
        _baralhoSaiuDaTela();
        document.getElementById("resultados-sessao").innerHTML = "";
        document.querySelector(".botoes-acao").style.display = "none";
        contadorRegistro = 0;
        loteContador     = 0;
    }
    renderizarRegistro();
}

function apagarEntrada(rid) {
    registroEntradas = registroEntradas.filter(e => e.id !== rid);
    _aposApagar();
}
window.apagarEntrada = apagarEntrada;

function apagarTiragem(lote) {
    const n = registroEntradas.filter(e => e.lote === lote).length;
    if (n > 1 && !confirm(`Apagar a Tiragem ${lote} do registro (${n} perguntas)?`)) return;
    registroEntradas = registroEntradas.filter(e => e.lote !== lote);
    _aposApagar();
}
window.apagarTiragem = apagarTiragem;

function copiarUltima(btn) {
    if (registroEntradas.length === 0) { alert("Nenhuma tiragem registrada."); return; }

    const ultimo   = Math.max(...registroEntradas.map(e => e.lote));
    const entradas = _entradasDoLote(ultimo);

    copiarTexto(_textoLote(ultimo, entradas))
        .then(() => _feedbackBotao(btn, "✓ Copiado"));
}

// Botão único "Copiar": age conforme a opção escolhida ao lado
function copiarSelecionado(btn) {
    const modo = document.getElementById("sel-copiar").value;
    if (modo === "ultima")         copiarUltima(btn);
    else if (modo === "consulta")  copiarConsulta(btn);
    else if (modo === "sessao")    copiarSessao(btn);
    else if (modo === "registro")  copiarRegistro(btn);
    else                           abrirModalCopiar();
}
window.copiarSelecionado = copiarSelecionado;

function abrirModalCopiar() {
    if (registroEntradas.length === 0) { alert("Nenhuma tiragem registrada."); return; }

    const lista = document.getElementById("listaCopiar");
    lista.innerHTML = "";

    const ultimo = Math.max(...registroEntradas.map(e => e.lote));
    // registroEntradas vai da mais recente para a mais antiga; o Set preserva essa ordem
    const lotes  = [...new Set(registroEntradas.map(e => e.lote))];

    lotes.forEach(lote => {
        const entradas = _entradasDoLote(lote);
        const primeira = entradas[0];
        const meta     = _metaLote(entradas);
        const unica    = entradas.length === 1;

        const grupo = document.createElement("div");
        grupo.className = "copia-grupo";
        grupo.innerHTML = `
            <label class="copia-grupo-header">
                <input type="checkbox" checked data-lote="${lote}"
                       ${unica ? `class="chk-perg" value="${primeira.id}"` : `class="chk-lote"`}>
                <span class="copia-grupo-info">
                    <span class="copia-grupo-titulo">Tiragem ${lote}${lote === ultimo ? ' <span class="copia-badge">mais recente</span>' : ""}</span>
                    ${unica ? `<span class="copia-grupo-texto">${escapeHtml(_textoEntrada(primeira))}</span>` : ""}
                    <span class="copia-grupo-meta">${escapeHtml(meta)}</span>
                </span>
            </label>
            ${unica ? "" : entradas.map(e => `
            <label class="copia-item copia-item-sub">
                <input type="checkbox" class="chk-perg" value="${e.id}" data-lote="${lote}" checked>
                <span>${escapeHtml(_textoEntrada(e))}</span>
            </label>`).join("")}`;
        lista.appendChild(grupo);
    });

    _atualizarEstadoCopia();
    document.getElementById("modalCopiar").style.display = "flex";
}

function selecionarTodasCopia(marcar) {
    document.querySelectorAll("#listaCopiar input[type=checkbox]").forEach(c => { c.checked = marcar; });
    _atualizarEstadoCopia();
}
window.selecionarTodasCopia = selecionarTodasCopia;

// Marca/desmarca/indetermina a caixa de cada tiragem e atualiza o contador do botão
function _atualizarEstadoCopia() {
    document.querySelectorAll("#listaCopiar .chk-lote").forEach(chkLote => {
        const filhos   = [...document.querySelectorAll(`#listaCopiar .chk-perg[data-lote="${chkLote.dataset.lote}"]`)];
        const marcados = filhos.filter(c => c.checked).length;
        chkLote.checked       = filhos.length > 0 && marcados === filhos.length;
        chkLote.indeterminate = marcados > 0 && marcados < filhos.length;
    });

    const total = document.querySelectorAll("#listaCopiar .chk-perg:checked").length;
    const btn   = document.getElementById("btn-confirmar-copia");
    if (btn) btn.textContent = total ? `Copiar selecionadas (${total})` : "Copiar selecionadas";
}

function _iniciarModalCopiar() {
    document.getElementById("listaCopiar")?.addEventListener("change", e => {
        const alvo = e.target;
        if (alvo.classList.contains("chk-lote")) {
            document.querySelectorAll(`#listaCopiar .chk-perg[data-lote="${alvo.dataset.lote}"]`)
                .forEach(c => { c.checked = alvo.checked; });
        }
        _atualizarEstadoCopia();
    });
}

// ── Ordem de cópia (múltiplas perguntas) ───────────────────────
const ORDEM_COPIA_KEY = "cartarium_ordem_copia";
let ordemCopia = localStorage.getItem(ORDEM_COPIA_KEY) || "antiga"; // "recente" | "antiga"

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
    const ids = Array.from(document.querySelectorAll("#listaCopiar .chk-perg:checked"))
        .map(c => parseInt(c.value));
    const selecionadas = registroEntradas.filter(e => ids.includes(e.id));

    if (selecionadas.length === 0) { alert("Selecione ao menos uma pergunta."); return; }

    // A ordem vale entre tiragens; dentro de cada uma, as perguntas seguem a ordem em que foram feitas
    const lotes = [...new Set(selecionadas.map(e => e.lote))]
        .sort((a, b) => ordemCopia === "antiga" ? a - b : b - a);

    const ids2  = new Set(selecionadas.map(e => e.id));
    const texto = _textoLotes(lotes, entradas => entradas.filter(e => ids2.has(e.id)));

    copiarTexto(texto)
        .then(() => { alert("Copiado!"); fecharModalCopiar(); });
}


// ══════════════════════════════════════════════════════════════
//  EXIBIR BARALHO COMPLETO
// ══════════════════════════════════════════════════════════════
// Estado do baralho exibido na tela (null = não está exibindo).
//   deckId/copias: o que está desenhado agora
//   guardado:      o que estava em #resultados-sessao antes (volta ao ocultar)
//   botoesDisplay: o display que .botoes-acao tinha antes
let _baralhoNaTela = null;

// O botão diz "Ocultar" só quando a tela mostra exatamente o baralho (e a
// quantidade de cópias) selecionado agora; em qualquer outro caso, "Exibir".
function atualizarBotaoBaralho() {
    const btn = document.getElementById("btn-exibir-baralho");
    if (!btn) return;
    btn.textContent = _baralhoExibidoEhOAtual() ? "🙈 Ocultar baralho" : "📖 Exibir baralho";
}
window.atualizarBotaoBaralho = atualizarBotaoBaralho;

// Outra ação (Tirar, abrir do registro, limpar...) já trocou o conteúdo da área:
// o baralho deixou de estar na tela e o que foi guardado não vale mais.
function _baralhoSaiuDaTela() {
    _baralhoNaTela = null;
    atualizarBotaoBaralho();
}

function _baralhoExibidoEhOAtual() {
    const sel = document.getElementById("deck");
    return !!_baralhoNaTela && !!sel
        && _baralhoNaTela.deckId === sel.value
        && _baralhoNaTela.copias === obterCopias();
}

function ocultarBaralho() {
    const resultadosDiv = document.getElementById("resultados-sessao");
    resultadosDiv.innerHTML = "";
    resultadosDiv.appendChild(_baralhoNaTela.guardado);
    document.querySelector(".botoes-acao").style.display = _baralhoNaTela.botoesDisplay;
    _baralhoNaTela = null;
    atualizarBotaoBaralho();
}

function exibirBaralho() {
    // Já está mostrando o baralho selecionado: o botão virou "Ocultar"
    if (_baralhoExibidoEhOAtual()) { ocultarBaralho(); return; }

    const deckId = document.getElementById("deck").value;
    const deck   = DECKS.get(deckId);

    const resultadosDiv = document.getElementById("resultados-sessao");
    const botoesAcao    = document.querySelector(".botoes-acao");

    // Se já havia um baralho (de antes da troca) na tela, o que vale guardar é
    // o conteúdo original, que continua guardado; senão guarda o que está aí agora.
    let guardado, botoesDisplay;
    if (_baralhoNaTela) {
        guardado      = _baralhoNaTela.guardado;
        botoesDisplay = _baralhoNaTela.botoesDisplay;
    } else {
        guardado = document.createDocumentFragment();
        while (resultadosDiv.firstChild) guardado.appendChild(resultadosDiv.firstChild);
        botoesDisplay = botoesAcao.style.display;
    }
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
    botoesAcao.style.display = "none";

    _baralhoNaTela = { deckId, copias, guardado, botoesDisplay };
    atualizarBotaoBaralho();
}
window.exibirBaralho = exibirBaralho;


// ══════════════════════════════════════════════════════════════
//  LIMPAR REGISTRO
// ══════════════════════════════════════════════════════════════
function limparTiragens() {
    if (!confirm("Limpar todo o registro de tiragens?")) return;
    document.getElementById("registro").innerHTML = "<h3>Registro de Perguntas e Tiragens</h3>";
    _baralhoSaiuDaTela();
    document.getElementById("resultados-sessao").innerHTML = "";
    document.querySelector(".botoes-acao").style.display = "none";
    registroEntradas = [];
    _naTelaIds       = [];
    contadorRegistro = 0;
    loteContador     = 0;
}


// ══════════════════════════════════════════════════════════════
//  REINICIAR PERGUNTAS APÓS SORTEIO
// ══════════════════════════════════════════════════════════════
function reiniciarPerguntas() {
    // Preserva estrutura (numCartas + posicoesCustom). O texto só é limpo no modo
    // "pergunta"; no modo "tema" ele permanece para a próxima tiragem.
    const manterTexto = rotuloAtual === "tema";
    const estadoAnterior = perguntasAtivas.map(p => ({
        texto:          manterTexto ? p.texto : "",
        numCartas:      p.numCartas,
        posicoesCustom: p.posicoesCustom ? [...p.posicoesCustom] : null,
        iniciaTiragem:  p.iniciaTiragem,
        monteTiragem:   p.monteTiragem
    }));

    _reconstruirBlocos(estadoAnterior);
    if (modoTextoPerguntas) _textoParaTextarea();
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
    if (modoTextoPerguntas) _renderizarSugestoesTexto();
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

// Monta o painel de sugestões dentro de `container`. `aoEscolher(texto)` define o que o clique faz.
function _montarSugestoes(container, aoEscolher) {
    container.querySelector(".sugestoes-wrap")?.remove();

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
        btn.onclick     = () => aoEscolher(texto);
        lista.appendChild(btn);
    });

    wrap.appendChild(lista);
    container.appendChild(wrap);
}

function renderizarSugestoes(bloco, pergId) {
    _montarSugestoes(bloco, texto => {
        const input = bloco.querySelector("input[type=text]");
        if (input) {
            input.value = texto;
            atualizarPergunta(pergId, "texto", texto);
            input.focus();
        }
    });
}

// No modo "digitar várias", a sugestão escolhida entra como nova linha no campo de texto
function _renderizarSugestoesTexto() {
    const wrap = document.getElementById("perguntas-texto-wrap");
    if (!wrap) return;
    _montarSugestoes(wrap, texto => {
        const ta    = document.getElementById("perguntas-texto");
        const atual = ta.value.replace(/\s+$/, "");
        ta.value    = atual ? atual + (/^\s*[-–—•*]/m.test(atual) ? "\n\n" : "\n") + texto : texto;
        ta.focus();
    });
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
