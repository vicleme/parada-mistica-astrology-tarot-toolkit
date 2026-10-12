// =============================================================
//  CAPTURA DE TIRAGEM
//
//  Converte a área de resultados em imagem PNG via html2canvas.
//  Usa blob URLs para evitar taint de canvas com imagens locais.
// =============================================================

// Lê uma imagem local via fetch e retorna object URL (mesmo origem, sem taint)
async function srcParaBlob(src) {
    try {
        const resp = await fetch(src);
        const blob = await resp.blob();
        return URL.createObjectURL(blob);
    } catch (_) {
        return src; // fallback: usa src original
    }
}

// Retorna a cor de fundo correta para a captura conforme o tema ativo
function _bgCaptura() {
    const tema = localStorage.getItem("cartarium_tema") || "sistema";
    const escuro =
        tema === "escuro" ||
        (tema === "sistema" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    return escuro ? "#1a0f2e" : "#f5f0fb";
}

async function capturarTiragem() {
    const alvo = document.getElementById("resultados-sessao");
    if (!alvo || !alvo.firstChild) return;

    const btn = document.querySelector("[onclick='capturarTiragem()']");
    if (btn) { btn.textContent = "⏳ Aguarde..."; btn.disabled = true; }

    const imgs = [...alvo.querySelectorAll("img")];
    const srcsOriginais = imgs.map(i => i.src);
    const blobUrls = [];

    try {
        // Espera carregar
        await Promise.all(imgs.map(img =>
            img.complete ? Promise.resolve()
                         : new Promise(r => { img.onload = r; img.onerror = r; })
        ));

        // Substitui src por blob URL (mesmo origem = sem taint)
        await Promise.all(imgs.map(async (img, i) => {
            const blobUrl = await srcParaBlob(srcsOriginais[i]);
            blobUrls.push(blobUrl);
            img.src = blobUrl;
            // Espera recarregar com novo src
            if (!img.complete) await new Promise(r => { img.onload = r; img.onerror = r; });
        }));

        const canvas = await html2canvas(alvo, {
            backgroundColor: _bgCaptura(),
            scale: 2,
            useCORS: false,
            allowTaint: false,
            scrollX: 0,
            scrollY: -window.scrollY,
        });

        const link = document.createElement("a");
        link.download = `cartarium-${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    } catch (e) {
        console.error("Captura falhou:", e);
        alert("Não foi possível capturar a tiragem.");
    } finally {
        imgs.forEach((img, i) => { img.src = srcsOriginais[i]; });
        blobUrls.forEach(u => { try { URL.revokeObjectURL(u); } catch(_){} });
        if (btn) { btn.textContent = "📷 Capturar"; btn.disabled = false; }
    }
}
