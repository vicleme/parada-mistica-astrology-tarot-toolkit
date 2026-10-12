// =============================================================
//  BARALHOS PERSONALIZADOS: importar, exportar, criar e excluir
//
//  Permite que cada pessoa use o próprio baralho sem mexer no código:
//    - Importar: lê um arquivo .json no formato "cartarium-deck"
//    - Criar: monta um baralho a partir de imagens do computador, com nomes,
//      significados, créditos e (opcional) um sistema novo
//    - Exportar: baixa qualquer baralho (do site ou seu) nesse formato
//    - Excluir: apaga um baralho seu; baralhos do site só podem ser
//      ocultados (o arquivo continua no site, a escolha vale só aqui)
//
//  Onde ficam os dados: no IndexedDB do navegador (imagens como Blob).
//  Nada é enviado a servidor. Formato do arquivo: docs/custom-decks.md
//
//  Segurança: o arquivo importado é tratado como não confiável. Tudo
//  passa por validar() (tipos, tamanhos, só imagens PNG/JPEG/WebP) e a
//  interface é montada com textContent, nunca com innerHTML.
// =============================================================
(function () {
    "use strict";

    const DB_NOME     = "cartarium";
    const DB_STORE    = "baralhos";
    const FORMATO     = "cartarium-deck";
    const VERSAO      = 1;
    const OCULTOS_KEY = "cartarium_baralhos_ocultos";

    const LIM = {
        arquivoMB:   80,        // tamanho máximo do .json importado
        nome:        80,
        carta:       80,
        significado: 1200,
        credito:     200,
        cartas:      200,
        imagemChars: 2800000,   // ~2 MB por imagem em base64
        altura:      720        // imagens novas são reduzidas para esta altura (px)
    };

    let dbPromise = null;
    let armazenamentoOk = true;
    let ocupado = false;

    // ── IndexedDB ─────────────────────────────────────────────
    function abrirDB() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) { reject(new Error("IndexedDB indisponível")); return; }
            const req = indexedDB.open(DB_NOME, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE, { keyPath: "id" });
            req.onsuccess = () => resolve(req.result);
            req.onerror   = () => reject(req.error || new Error("Falha ao abrir o armazenamento"));
        });
        return dbPromise;
    }

    function tx(modo, operacao) {
        return abrirDB().then(db => new Promise((resolve, reject) => {
            const t   = db.transaction(DB_STORE, modo);
            const req = operacao(t.objectStore(DB_STORE));
            t.oncomplete = () => resolve(req ? req.result : undefined);
            t.onerror    = () => reject(t.error);
            t.onabort    = () => reject(t.error || new Error("Operação cancelada"));
        }));
    }

    const dbTodos   = ()  => tx("readonly",  st => st.getAll());
    const dbSalvar  = rec => tx("readwrite", st => st.put(rec));
    const dbExcluir = id  => tx("readwrite", st => st.delete(id));

    // ── Baralhos ocultos (só baralhos do site) ────────────────
    function lerOcultos() {
        try {
            const v = JSON.parse(localStorage.getItem(OCULTOS_KEY) || "[]");
            return Array.isArray(v) ? v.filter(x => typeof x === "string") : [];
        } catch (e) { return []; }
    }
    function gravarOcultos(lista) {
        try { localStorage.setItem(OCULTOS_KEY, JSON.stringify(lista)); } catch (e) { /* sem storage */ }
    }
    function estaOculto(id) { return lerOcultos().includes(id); }

    // ── Utilitários ───────────────────────────────────────────
    function slug(texto) {
        return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "baralho";
    }

    function novoId(nome) {
        return `custom-${slug(nome)}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    }

    function textoValido(valor, max, rotulo, obrigatorio) {
        if (valor === undefined || valor === null || valor === "") {
            if (obrigatorio) throw new Error(`${rotulo} é obrigatório.`);
            return "";
        }
        if (typeof valor !== "string") throw new Error(`${rotulo} precisa ser texto.`);
        const t = valor.trim();
        if (obrigatorio && !t) throw new Error(`${rotulo} é obrigatório.`);
        if (t.length > max) throw new Error(`${rotulo} passa de ${max} caracteres.`);
        return t;
    }

    function dataUrlParaBlob(dataUrl) {
        const virgula = dataUrl.indexOf(",");
        const mime    = dataUrl.slice(5, dataUrl.indexOf(";"));
        const binario = atob(dataUrl.slice(virgula + 1));
        const bytes   = new Uint8Array(binario.length);
        for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
        return new Blob([bytes], { type: mime });
    }

    function blobParaDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const leitor = new FileReader();
            leitor.onload  = () => resolve(leitor.result);
            leitor.onerror = () => reject(new Error("Não consegui ler uma imagem."));
            leitor.readAsDataURL(blob);
        });
    }

    // Reduz a imagem (altura máxima LIM.altura) e converte para WebP quando o navegador deixa
    async function redimensionar(blob) {
        let bitmap;
        try {
            bitmap = await createImageBitmap(blob);
        } catch (e) {
            throw new Error("Um dos arquivos não é uma imagem que o navegador consiga abrir.");
        }
        const escala = Math.min(1, LIM.altura / bitmap.height);
        const w = Math.max(1, Math.round(bitmap.width * escala));
        const h = Math.max(1, Math.round(bitmap.height * escala));
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
        if (bitmap.close) bitmap.close();
        const comoBlob = (tipo, q) => new Promise(r => canvas.toBlob(r, tipo, q));
        const webp = await comoBlob("image/webp", 0.85);
        if (webp && webp.type === "image/webp") return webp;
        return (await comoBlob("image/jpeg", 0.88)) || blob;
    }

    function sistemaDoBaralho(deckId) {
        const s = SISTEMAS.find(x => x.baralhos.includes(deckId));
        return s ? s.id : null;
    }

    const sistemasDoSite = () => SISTEMAS.filter(x => !x.personalizado);

    // Valida os campos de crédito; devolve null se não houver texto. Link só com https://
    function normalizarCreditos(c) {
        if (!c || typeof c !== "object") return null;
        const texto = textoValido(c.texto, LIM.credito, "O texto do crédito", false);
        if (!texto) return null;
        const creditos = { texto };
        const nota = textoValido(c.nota, LIM.credito, "A nota do crédito", false);
        const url  = textoValido(c.url,  500,         "O link do crédito", false);
        let   link = textoValido(c.link, LIM.credito, "O rótulo do link do crédito", false);
        if (url) {
            if (!/^https:\/\//.test(url)) throw new Error("O link do crédito precisa começar com https://");
            creditos.url = url;
            if (!link) { try { link = new URL(url).hostname.replace(/^www\./, ""); } catch (e) { link = url; } }
            creditos.link = link;
        }
        if (nota) creditos.nota = nota;
        // `fontes` (lista de links com data de acesso) só vem de arquivo ou dos baralhos do site
        if (Array.isArray(c.fontes)) {
            const fontes = c.fontes.slice(0, 6).map(f => {
                if (!f || typeof f !== "object") return null;
                const u = textoValido(f.url, 500, "O link da fonte", false);
                if (u && !/^https:\/\//.test(u)) return null;
                const l = textoValido(f.link, LIM.credito, "O rótulo da fonte", false);
                const a = textoValido(f.acesso, 20, "A data de acesso", false);
                return (u || l) ? { ...(l && { link: l }), ...(u && { url: u }), ...(a && { acesso: a }) } : null;
            }).filter(Boolean);
            if (fontes.length) creditos.fontes = fontes;
        }
        return creditos;
    }

    // Descobre (ou prepara) o sistema para um nome novo: reaproveita o de mesmo nome
    function resolverSistemaNovo(nome, herdaDe) {
        if (!sistemasDoSite().some(x => x.id === herdaDe)) {
            throw new Error("O sistema novo precisa herdar as tiragens de um sistema existente do site.");
        }
        const mesmoNome = SISTEMAS.find(x => x.nome.toLowerCase() === nome.toLowerCase());
        if (mesmoNome) return { sistemaId: mesmoNome.id, sistemaNovo: mesmoNome.personalizado ? { id: mesmoNome.id, nome: mesmoNome.nome, herdaDe: mesmoNome.herdaDe } : null };
        return { sistemaId: `sis-${slug(nome)}`, sistemaNovo: { id: `sis-${slug(nome)}`, nome, herdaDe } };
    }

    function garantirSistema(novo) {
        if (!novo || SISTEMAS.some(x => x.id === novo.id)) return;
        SISTEMAS.push({ id: novo.id, nome: novo.nome, descricao: "Sistema personalizado", baralhos: [], herdaDe: novo.herdaDe, personalizado: true });
    }

    // "Nome | significado | significado invertido" por linha (só o nome é obrigatório)
    function lerLinhas(texto) {
        return String(texto || "").split("\n").map(l => l.trim()).filter(Boolean).map((l, i) => {
            const p = l.split("|").map(x => x.trim());
            if (p.length > 3) throw new Error(`Linha ${i + 1}: use no máximo dois "|" (nome | significado | significado invertido).`);
            return { nome: p[0], direta: p[1] || "", invertida: p[2] || "" };
        });
    }

    function linhaDoBaralho(base, nome) {
        const s = (base.significados && base.significados[nome]) || {};
        const limpo = t => String(t || "").replace(/[\r\n]+/g, " ").replace(/\|/g, "/").trim();
        const partes = [nome, limpo(s.direta || s.significado), limpo(s.invertida)];
        while (partes.length > 1 && !partes[partes.length - 1]) partes.pop();
        return partes.join(" | ");
    }

    // ── Validação do arquivo (entrada não confiável) ──────────
    function validar(obj) {
        if (!obj || typeof obj !== "object" || Array.isArray(obj) || obj.formato !== FORMATO) {
            throw new Error("Este arquivo não é um baralho do Cartarium (formato desconhecido).");
        }
        if (typeof obj.versao !== "number" || obj.versao > VERSAO) {
            throw new Error("Este baralho foi criado numa versão mais nova do formato.");
        }
        const nome = textoValido(obj.nome, LIM.nome, "O nome do baralho", true);

        let sistemaId = obj.sistema;
        let sistemaNovo = null;
        if (obj.sistemaPersonalizado && typeof obj.sistemaPersonalizado === "object") {
            const nomeSis = textoValido(obj.sistemaPersonalizado.nome, LIM.nome, "O nome do sistema", true);
            ({ sistemaId, sistemaNovo } = resolverSistemaNovo(nomeSis, obj.sistemaPersonalizado.herdaDe));
        } else if (!sistemasDoSite().some(s => s.id === sistemaId)) {
            throw new Error("O sistema do baralho não existe (use tarot, lenormand, sibilla, kipper, oraculo ou runas).");
        }

        if (!Array.isArray(obj.cartas) || obj.cartas.length < 1 || obj.cartas.length > LIM.cartas) {
            throw new Error(`O baralho precisa ter de 1 a ${LIM.cartas} cartas.`);
        }
        const vistos = new Set();
        const cartas = obj.cartas.map((c, i) => {
            const n = textoValido(c, LIM.carta, `O nome da carta ${i + 1}`, true);
            if (n === "__proto__") throw new Error(`Nome de carta inválido: ${n}`);
            if (vistos.has(n)) throw new Error(`Nome de carta repetido: "${n}". Cada carta precisa de um nome único.`);
            vistos.add(n);
            return n;
        });

        if (!Array.isArray(obj.imagens) || obj.imagens.length !== cartas.length) {
            throw new Error("A lista de imagens precisa ter uma imagem para cada carta.");
        }
        obj.imagens.forEach((img, i) => {
            const ok = typeof img === "string"
                && img.length <= LIM.imagemChars
                && /^data:image\/(png|jpeg|webp);base64,/.test(img)
                && /^[A-Za-z0-9+/]+={0,2}$/.test(img.slice(img.indexOf(",") + 1));
            if (!ok) throw new Error(`A imagem da carta ${i + 1} é inválida ou grande demais (aceito: PNG, JPEG ou WebP em base64, até ~2 MB).`);
        });

        const significados = Object.create(null);
        const bruto = (obj.significados && typeof obj.significados === "object") ? obj.significados : {};
        cartas.forEach(n => {
            const s = Object.prototype.hasOwnProperty.call(bruto, n) ? bruto[n] : null;
            if (!s || typeof s !== "object") return;
            const item = {};
            ["direta", "invertida", "significado"].forEach(k => {
                if (typeof s[k] === "string" && s[k].trim()) {
                    if (s[k].length > LIM.significado) throw new Error(`O significado de "${n}" passa de ${LIM.significado} caracteres.`);
                    item[k] = s[k].trim();
                }
            });
            if (Object.keys(item).length) significados[n] = item;
        });

        // Link de crédito que não seja https:// é descartado em vez de recusar o arquivo todo
        let creditos = null;
        if (obj.creditos && typeof obj.creditos === "object") {
            const c = { ...obj.creditos };
            if (typeof c.url === "string" && !/^https:\/\//.test(c.url.trim())) { delete c.url; delete c.link; }
            creditos = normalizarCreditos(c);
        }

        return {
            nome, sistemaId, sistemaNovo, cartas, significados, creditos,
            aceitaInversao: obj.aceitaInversao === true,
            imagens: obj.imagens
        };
    }

    // ── Registro no app ───────────────────────────────────────
    function registrarNoApp(rec) {
        garantirSistema(rec.sistemaNovo);
        const deck = {
            id: rec.id,
            nome: rec.nome,
            aceitaInversao: rec.aceitaInversao,
            cartas: rec.cartas.slice(),
            significados: rec.significados,
            creditos: rec.creditos || null,
            imagens: rec.imagens.map(b => URL.createObjectURL(b)),
            personalizado: true,
            sistemaId: rec.sistemaId
        };
        DECKS.registrar(deck);
        const sistema = SISTEMAS.find(s => s.id === rec.sistemaId);
        if (sistema && !sistema.baralhos.includes(rec.id)) sistema.baralhos.push(rec.id);
        return deck;
    }

    function nomeDisponivel(nome, sistemaId) {
        const usados = Object.values(DECKS._lista)
            .filter(d => d.personalizado && d.sistemaId === sistemaId).map(d => d.nome);
        if (!usados.includes(nome)) return nome;
        let n = 2;
        while (usados.includes(`${nome} (${n})`)) n++;
        return `${nome} (${n})`;
    }

    async function guardar(dados, blobs) {
        const rec = {
            id: novoId(dados.nome),
            nome: nomeDisponivel(dados.nome, dados.sistemaId),
            sistemaId: dados.sistemaId,
            sistemaNovo: dados.sistemaNovo || null,
            aceitaInversao: dados.aceitaInversao,
            cartas: dados.cartas,
            significados: dados.significados,
            creditos: dados.creditos,
            imagens: blobs,
            criadoEm: Date.now(),
            versao: VERSAO
        };
        let salvo = true;
        try { await dbSalvar(rec); } catch (e) { salvo = false; armazenamentoOk = false; console.warn("[custom-decks] não salvou:", e); }
        registrarNoApp(rec);
        return { id: rec.id, nome: rec.nome, salvo };
    }

    // Atualiza os créditos de um baralho do usuário (usado pelo botão "Créditos")
    async function atualizarCreditos(deckId, campos) {
        const deck = DECKS.get(deckId);
        if (!deck || !deck.personalizado) throw new Error("Só dá para editar créditos de baralhos seus.");
        const creditos = normalizarCreditos(campos);
        let salvo = true;
        try {
            const rec = await tx("readonly", st => st.get(deckId));
            if (rec) { rec.creditos = creditos; await dbSalvar(rec); }
        } catch (e) { salvo = false; console.warn("[custom-decks] créditos não salvos:", e); }
        deck.creditos = creditos;
        return { salvo };
    }

    // Carrega os baralhos salvos (chamado por loader.js antes de montar os selects)
    async function carregar() {
        try {
            const lista = await dbTodos();
            lista.sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0));
            lista.forEach(rec => {
                try { registrarNoApp(rec); } catch (e) { console.warn("[custom-decks] baralho ignorado:", rec && rec.id, e); }
            });
        } catch (e) {
            armazenamentoOk = false;
            console.warn("[custom-decks] armazenamento indisponível:", e);
        }
    }

    // ── Operações ─────────────────────────────────────────────
    async function importarArquivo(arquivo) {
        if (!arquivo) throw new Error("Nenhum arquivo escolhido.");
        if (arquivo.size > LIM.arquivoMB * 1024 * 1024) throw new Error(`O arquivo passa de ${LIM.arquivoMB} MB.`);
        let obj;
        try { obj = JSON.parse(await arquivo.text()); }
        catch (e) { throw new Error("O arquivo não é um JSON válido."); }
        const dados = validar(obj);
        let blobs;
        try { blobs = dados.imagens.map(dataUrlParaBlob); }
        catch (e) { throw new Error("Alguma imagem do arquivo está corrompida."); }
        return guardar(dados, blobs);
    }

    async function criarDeImagens({ nome, sistemaId, novoSistema, aceitaInversao, arquivos, linhas, creditos }) {
        const nomeOk = textoValido(nome, LIM.nome, "O nome do baralho", true);
        let sistemaNovo = null;
        if (sistemaId === "__novo__") {
            const nomeSis = textoValido(novoSistema && novoSistema.nome, LIM.nome, "O nome do sistema novo", true);
            ({ sistemaId, sistemaNovo } = resolverSistemaNovo(nomeSis, novoSistema.herdaDe));
        } else if (!sistemasDoSite().some(s => s.id === sistemaId) && !SISTEMAS.some(s => s.id === sistemaId)) {
            throw new Error("Escolha um sistema.");
        }
        if (!arquivos || !arquivos.length) throw new Error("Escolha as imagens das cartas.");
        if (arquivos.length > LIM.cartas) throw new Error(`No máximo ${LIM.cartas} cartas.`);
        if (linhas.length !== arquivos.length) {
            throw new Error(`Você escolheu ${arquivos.length} imagens, mas há ${linhas.length} cartas na lista de nomes. Os números precisam bater.`);
        }
        const cartas = linhas.map((l, i) => textoValido(l.nome, LIM.carta, `O nome da carta ${i + 1}`, true));
        if (new Set(cartas).size !== cartas.length) throw new Error("Há nomes de carta repetidos. Cada carta precisa de um nome único.");
        if (cartas.includes("__proto__")) throw new Error("Nome de carta inválido: __proto__");

        const significados = Object.create(null);
        linhas.forEach((l, i) => {
            const item = {};
            if (l.direta)    item.direta    = textoValido(l.direta,    LIM.significado, `O significado de "${cartas[i]}"`, false);
            if (l.invertida) item.invertida = textoValido(l.invertida, LIM.significado, `O significado invertido de "${cartas[i]}"`, false);
            if (Object.keys(item).length) significados[cartas[i]] = item;
        });
        const creditosOk = normalizarCreditos(creditos);

        const blobs = [];
        for (const arq of arquivos) blobs.push(await redimensionar(arq));
        return guardar({ nome: nomeOk, sistemaId, sistemaNovo, aceitaInversao: !!aceitaInversao, cartas, significados, creditos: creditosOk }, blobs);
    }

    async function exportar(deckId, aoProgredir) {
        const deck = DECKS.get(deckId);
        if (!deck) throw new Error("Baralho não encontrado.");
        if (deck.permiteExportar === false) throw new Error("O autor do site não liberou a exportação deste baralho.");
        const sistemaId = deck.sistemaId || sistemaDoBaralho(deckId);
        if (!sistemaId) throw new Error("Não encontrei o sistema deste baralho.");

        const imagens = [];
        for (let i = 0; i < deck.cartas.length; i++) {
            if (aoProgredir) aoProgredir(i + 1, deck.cartas.length);
            let resp;
            try { resp = await fetch(imagemCarta(deck, i + 1)); } catch (e) { resp = null; }
            if (!resp || !resp.ok) {
                throw new Error(`Não consegui carregar a imagem da carta ${i + 1} (${deck.cartas[i]}). Se as imagens do site não estão neste ambiente, não há o que exportar.`);
            }
            const pequena = await redimensionar(await resp.blob());
            imagens.push(await blobParaDataUrl(pequena));
        }

        const significados = {};
        deck.cartas.forEach(n => {
            const s = deck.significados && deck.significados[n];
            if (s) significados[n] = { ...s };
        });

        const sistema = SISTEMAS.find(x => x.id === sistemaId);
        const arquivo = {
            formato: FORMATO,
            versao: VERSAO,
            nome: deck.nome,
            // Sistema novo: `sistema` guarda o sistema herdado (o app antigo ainda abre o arquivo)
            sistema: (sistema && sistema.herdaDe) || sistemaId,
            aceitaInversao: !!deck.aceitaInversao,
            cartas: deck.cartas.slice(),
            significados,
            imagens
        };
        if (sistema && sistema.personalizado) arquivo.sistemaPersonalizado = { nome: sistema.nome, herdaDe: sistema.herdaDe };
        if (deck.creditos) arquivo.creditos = { ...deck.creditos };

        const blob = new Blob([JSON.stringify(arquivo)], { type: "application/json" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url;
        a.download = `${slug(deck.nome)}.cartarium-deck.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    async function excluir(deckId) {
        const deck = DECKS.get(deckId);
        if (!deck || !deck.personalizado) throw new Error("Só dá para excluir baralhos criados ou importados por você.");
        try { await dbExcluir(deckId); } catch (e) { /* se nunca foi salvo, segue */ }
        if (deck.imagens) deck.imagens.forEach(u => URL.revokeObjectURL(u));
        DECKS.remover(deckId);
        SISTEMAS.forEach(s => { s.baralhos = s.baralhos.filter(id => id !== deckId); });
        for (let k = SISTEMAS.length - 1; k >= 0; k--) {
            if (SISTEMAS[k].personalizado && SISTEMAS[k].baralhos.length === 0) SISTEMAS.splice(k, 1);
        }
        if (window.SESSAO && SESSAO.deckId === deckId) SESSAO.encerrar();
        if (localStorage.getItem("cartarium_favorito") === deckId) {
            localStorage.removeItem("cartarium_favorito");
            localStorage.removeItem("cartarium_favorito_sistema");
        }
    }

    function definirOculto(deckId, ocultar) {
        const lista = lerOcultos().filter(id => id !== deckId);
        if (ocultar) {
            const restantes = Object.keys(DECKS._lista).filter(id => id !== deckId && !lista.includes(id));
            if (!restantes.length) throw new Error("Mantenha pelo menos um baralho visível.");
            lista.push(deckId);
        }
        gravarOcultos(lista);
    }

    // ── Interface ─────────────────────────────────────────────
    let modal = null;
    let refs  = {};

    function el(tag, atributos, filhos) {
        const e = document.createElement(tag);
        Object.entries(atributos || {}).forEach(([k, v]) => {
            if (k === "class") e.className = v;
            else if (k === "text") e.textContent = v;
            else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
            else e.setAttribute(k, v);
        });
        (filhos || []).forEach(f => e.appendChild(f));
        return e;
    }

    function mensagem(texto, tipo) {
        refs.status.textContent = texto || "";
        refs.status.className = "dm-status" + (tipo ? ` dm-${tipo}` : "");
    }

    function travar(sim) {
        ocupado = sim;
        modal.querySelectorAll("button, input, select, textarea").forEach(c => { c.disabled = sim; });
    }

    async function executar(tarefa, textoOcupado) {
        if (ocupado) return;
        travar(true);
        mensagem(textoOcupado || "Trabalhando…", "info");
        try {
            const r = await tarefa();
            return r;
        } catch (e) {
            mensagem(e && e.message ? e.message : "Algo deu errado.", "erro");
        } finally {
            travar(false);
        }
    }

    function atualizarLista() {
        const lista = refs.lista;
        lista.textContent = "";
        const vistos = new Set();
        const adicionar = id => {
            if (vistos.has(id)) return;
            vistos.add(id);
            const deck = DECKS.get(id);
            if (!deck) return;
            const oculto = !deck.personalizado && estaOculto(id);

            const info = el("div", { class: "dm-info" }, [
                el("strong", { text: deck.nome }),
                el("span", { class: "dm-meta", text: `${deck.cartas.length} cartas · ${deck.personalizado ? "seu baralho" : "do site"}${oculto ? " · oculto" : ""}` })
            ]);
            const acoes = el("div", { class: "dm-acoes" });
            // Um baralho do site pode declarar `permiteExportar: false` (ver decks/_template.js)
            if (deck.permiteExportar !== false) {
                acoes.appendChild(el("button", {
                    type: "button", class: "btn-secundario", text: "Exportar",
                    title: "Baixar este baralho como arquivo .json",
                    onclick: () => executar(async () => {
                        await exportar(id, (i, n) => mensagem(`Exportando ${i} de ${n} cartas…`, "info"));
                        mensagem(`"${deck.nome}" exportado.`, "ok");
                    }, "Exportando…")
                }));
            }
            let editor = null;
            if (deck.personalizado) {
                acoes.appendChild(el("button", {
                    type: "button", class: "btn-secundario", text: "Créditos",
                    title: "Editar autoria, link da fonte e nota deste baralho",
                    onclick: () => { editor.hidden = !editor.hidden; }
                }));
                acoes.appendChild(el("button", {
                    type: "button", class: "btn-secundario dm-perigo", text: "Excluir",
                    onclick: () => {
                        if (!confirm(`Excluir o baralho "${deck.nome}" deste navegador? Exporte antes se quiser guardar uma cópia.`)) return;
                        executar(async () => {
                            await excluir(id);
                            window.recarregarSeletores();
                            atualizarLista();
                            mensagem(`"${deck.nome}" excluído.`, "ok");
                        }, "Excluindo…");
                    }
                }));
            } else {
                acoes.appendChild(el("button", {
                    type: "button", class: "btn-secundario", text: oculto ? "Mostrar" : "Ocultar",
                    title: oculto ? "Voltar a mostrar este baralho no seletor" : "Esconder este baralho do seletor (só neste navegador)",
                    onclick: () => executar(async () => {
                        definirOculto(id, !oculto);
                        window.recarregarSeletores();
                        atualizarLista();
                        mensagem(oculto ? `"${deck.nome}" voltou ao seletor.` : `"${deck.nome}" ocultado.`, "ok");
                    })
                }));
            }
            const filhos = [el("div", { class: "dm-linha" }, [info, acoes])];
            if (deck.personalizado) {
                const c = deck.creditos || {};
                const fTexto = el("input", { type: "text", maxlength: String(LIM.credito), placeholder: "Autoria ou crédito (ex.: Arte: Fulana)" });
                const fUrl   = el("input", { type: "text", maxlength: "500", placeholder: "Link da fonte (https://...)" });
                const fNota  = el("input", { type: "text", maxlength: String(LIM.credito), placeholder: "Nota ou licença (ex.: CC BY 4.0)" });
                fTexto.value = c.texto || ""; fUrl.value = c.url || ""; fNota.value = c.nota || "";
                editor = el("div", { class: "dm-cred", hidden: "" }, [
                    fTexto, fUrl, fNota,
                    el("button", {
                        type: "button", text: "Salvar créditos",
                        onclick: () => executar(async () => {
                            const r = await atualizarCreditos(id, { texto: fTexto.value, url: fUrl.value, nota: fNota.value });
                            window.recarregarSeletores();
                            atualizarLista();
                            mensagem(r.salvo ? "Créditos atualizados." : "Créditos atualizados, mas este navegador não permitiu salvar.", r.salvo ? "ok" : "erro");
                        }, "Salvando…")
                    })
                ]);
                filhos.push(editor);
            }
            lista.appendChild(el("li", { class: "dm-item" + (oculto ? " dm-oculto" : "") }, filhos));
        };
        SISTEMAS.forEach(s => s.baralhos.forEach(adicionar));
        Object.keys(DECKS._lista).forEach(adicionar);
    }

    // Preenche a lista de cartas (nome | significado | invertido) a partir de um baralho base
    function atualizarSugestaoNomes() {
        const base = DECKS.get(refs.base.value);
        if (base) refs.nomes.value = base.cartas.map(n => linhaDoBaralho(base, n)).join("\n");
    }

    function sistemaBaseDoForm() {
        return refs.sistema.value === "__novo__" ? refs.sisHerda.value : refs.sistema.value;
    }

    function atualizarSistemasDoForm() {
        const atual = refs.sistema.value;
        refs.sistema.textContent = "";
        SISTEMAS.forEach(s => refs.sistema.appendChild(el("option", { value: s.id, text: s.nome })));
        refs.sistema.appendChild(el("option", { value: "__novo__", text: "＋ Novo sistema…" }));
        if (Array.from(refs.sistema.options).some(o => o.value === atual)) refs.sistema.value = atual;
        refs.novoSistema.hidden = refs.sistema.value !== "__novo__";
    }

    function atualizarBases() {
        refs.novoSistema.hidden = refs.sistema.value !== "__novo__";
        const ids = [];
        const sis = SISTEMAS.find(s => s.id === sistemaBaseDoForm());
        if (sis) { ids.push(...sis.baralhos); if (sis.herdaDe) { const pai = SISTEMAS.find(s => s.id === sis.herdaDe); if (pai) ids.push(...pai.baralhos); } }
        refs.base.textContent = "";
        refs.base.appendChild(el("option", { value: "", text: "Nenhum (digitar tudo)" }));
        ids.forEach(id => {
            const d = DECKS.get(id);
            if (d) refs.base.appendChild(el("option", { value: id, text: `${d.nome} (${d.cartas.length} cartas)` }));
        });
        const n = refs.imagens.files.length;
        const combina = Array.from(refs.base.options).find(o => o.value && DECKS.get(o.value).cartas.length === n);
        refs.base.value = combina ? combina.value : "";
        atualizarSugestaoNomes();
    }

    function ordenarArquivos(lista) {
        return Array.from(lista).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    }

    function construirModal() {
        refs.status = el("p", { class: "dm-status", role: "status", "aria-live": "polite" });
        refs.lista  = el("ul", { class: "dm-lista" });

        refs.arquivoJson = el("input", {
            type: "file", accept: ".json,application/json", id: "dm-arquivo",
            onchange: () => {
                const arq = refs.arquivoJson.files[0];
                if (!arq) return;
                executar(async () => {
                    const r = await importarArquivo(arq);
                    window.recarregarSeletores(r.id);
                    atualizarLista();
                    mensagem(r.salvo ? `"${r.nome}" importado.` : `"${r.nome}" importado, mas este navegador não permitiu salvar: ele some ao fechar a página.`, r.salvo ? "ok" : "erro");
                }, "Importando…").finally(() => { refs.arquivoJson.value = ""; });
            }
        });

        refs.nome = el("input", { type: "text", id: "dm-nome", maxlength: String(LIM.nome), placeholder: "Ex.: Meu tarot" });
        refs.sistema = el("select", { id: "dm-sistema", onchange: atualizarBases });
        refs.sisNome = el("input", { type: "text", id: "dm-sis-nome", maxlength: String(LIM.nome), placeholder: "Ex.: Oráculo dos Animais" });
        refs.sisHerda = el("select", { id: "dm-sis-herda", onchange: atualizarBases });
        sistemasDoSite().forEach(s => refs.sisHerda.appendChild(el("option", { value: s.id, text: s.nome })));
        refs.novoSistema = el("div", { class: "dm-novo-sistema", hidden: "" }, [
            el("label", { for: "dm-sis-nome", text: "Nome do sistema novo" }), refs.sisNome,
            el("label", { for: "dm-sis-herda", text: "Usar as tiragens e as perguntas sugeridas de" }), refs.sisHerda
        ]);
        refs.credTexto = el("input", { type: "text", id: "dm-cred-texto", maxlength: String(LIM.credito), placeholder: "Ex.: Arte: Fulana" });
        refs.credUrl   = el("input", { type: "text", id: "dm-cred-url", maxlength: "500", placeholder: "https://..." });
        refs.credNota  = el("input", { type: "text", id: "dm-cred-nota", maxlength: String(LIM.credito), placeholder: "Ex.: CC BY 4.0, uso pessoal" });
        refs.inversao = el("input", { type: "checkbox", id: "dm-inversao" });
        refs.imagens  = el("input", {
            type: "file", id: "dm-imagens", accept: "image/png,image/jpeg,image/webp", multiple: "",
            onchange: atualizarBases
        });
        refs.base  = el("select", { id: "dm-base", onchange: atualizarSugestaoNomes });
        refs.nomes = el("textarea", { id: "dm-nomes", rows: "8", placeholder: "O Sol | Calor, clareza | Excesso, desgaste\nA Lua | Intuição | Confusão" });

        const formulario = el("form", {
            class: "dm-form",
            onsubmit: ev => {
                ev.preventDefault();
                const arquivos = ordenarArquivos(refs.imagens.files);
                executar(async () => {
                    const r = await criarDeImagens({
                        nome: refs.nome.value,
                        sistemaId: refs.sistema.value,
                        novoSistema: { nome: refs.sisNome.value, herdaDe: refs.sisHerda.value },
                        aceitaInversao: refs.inversao.checked,
                        arquivos,
                        linhas: lerLinhas(refs.nomes.value),
                        creditos: { texto: refs.credTexto.value, url: refs.credUrl.value, nota: refs.credNota.value }
                    });
                    window.recarregarSeletores(r.id);
                    atualizarLista();
                    formulario.reset();
                    atualizarSistemasDoForm();
                    atualizarBases();
                    mensagem(r.salvo ? `"${r.nome}" criado.` : `"${r.nome}" criado, mas este navegador não permitiu salvar: ele some ao fechar a página.`, r.salvo ? "ok" : "erro");
                }, "Processando as imagens…");
            }
        }, [
            el("label", { for: "dm-nome", text: "Nome do baralho" }), refs.nome,
            el("label", { for: "dm-sistema", text: "Sistema (define as tiragens e as perguntas sugeridas)" }), refs.sistema,
            refs.novoSistema,
            el("label", { class: "checkbox-label" }, [refs.inversao, document.createTextNode(" Este baralho usa cartas invertidas")]),
            el("label", { for: "dm-imagens", text: "Imagens das cartas (ordem alfabética/numérica do nome do arquivo)" }), refs.imagens,
            el("label", { for: "dm-base", text: "Copiar nomes e significados de (opcional)" }), refs.base,
            el("label", { for: "dm-nomes", text: "Cartas, uma por linha, na mesma ordem das imagens" }), refs.nomes,
            el("p", { class: "ajuda-texto", text: "Formato: Nome | significado | significado invertido. Só o nome é obrigatório. O significado aparece no registro da tiragem; o invertido só é usado se o baralho aceitar cartas invertidas. Escolhendo um baralho acima, a lista já vem preenchida e você edita à vontade." }),
            el("h4", { text: "Créditos (opcional)" }),
            el("label", { for: "dm-cred-texto", text: "Autoria ou crédito" }), refs.credTexto,
            el("label", { for: "dm-cred-url", text: "Link da fonte" }), refs.credUrl,
            el("label", { for: "dm-cred-nota", text: "Nota ou licença" }), refs.credNota,
            el("button", { type: "submit", text: "Criar baralho" })
        ]);

        const caixa = el("div", { class: "modal-box dm-box", role: "dialog", "aria-modal": "true", "aria-labelledby": "dm-titulo" }, [
            el("h3", { id: "dm-titulo", text: "Gerenciar baralhos" }),
            el("p", { class: "dm-aviso", text: armazenamentoOk
                ? "Os baralhos que você adicionar ficam salvos só neste navegador. Nada é enviado a servidor."
                : "Este navegador não permite salvar dados do site. Os baralhos que você adicionar valem só até fechar a página." }),
            refs.lista,
            el("h4", { text: "Importar arquivo" }),
            el("p", { class: "ajuda-texto", text: "Arquivo .cartarium-deck.json, exportado daqui ou montado seguindo o formato do projeto." }),
            refs.arquivoJson,
            el("details", { class: "dm-criar" }, [
                el("summary", { text: "Criar a partir de imagens" }),
                formulario
            ]),
            refs.status,
            el("div", { class: "modal-acoes" }, [
                el("button", { type: "button", class: "btn-secundario", text: "Fechar", onclick: fechar })
            ])
        ]);

        modal = el("div", { id: "modalBaralhos", class: "modal-overlay dm-overlay", style: "display:none" }, [caixa]);
        modal.addEventListener("mousedown", ev => { if (ev.target === modal && !ocupado) fechar(); });
        document.addEventListener("keydown", ev => { if (ev.key === "Escape" && modal.style.display !== "none" && !ocupado) fechar(); });
        document.body.appendChild(modal);
    }

    function abrir() {
        if (!modal) construirModal();
        mensagem("");
        atualizarLista();
        atualizarSistemasDoForm();
        atualizarBases();
        modal.style.display = "flex";
        const primeiro = modal.querySelector("button");
        if (primeiro) primeiro.focus();
    }

    function fechar() {
        if (modal) modal.style.display = "none";
    }

    window.CUSTOM_DECKS = {
        carregar, abrir, fechar, estaOculto,
        importarArquivo, criarDeImagens, exportar, excluir, definirOculto, atualizarCreditos,
        _validar: validar
    };
})();
