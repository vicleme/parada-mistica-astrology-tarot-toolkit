// =============================================================
//  MODAL DE IMAGEM
//
//  Abre imagem ampliada ao clicar em qualquer carta (.card img).
//  Suporta navegação por setas (teclado e clique) e fechamento
//  por Escape ou clique fora da imagem.
//
//  Acessibilidade:
//    - role="dialog" + aria-modal + aria-label no container
//    - aria-label descritivos nos botões de ação
//    - foco movido para o botão Fechar ao abrir o modal
//    - foco devolvido à carta de origem ao fechar
// =============================================================

let currentImageIndex = 0;
let modalImages       = [];
let _origemFoco       = null; // elemento que recebeu o clique — foco volta aqui ao fechar

function _abrirModal(imgClicada) {
    modalImages        = Array.from(document.querySelectorAll(".card img"));
    currentImageIndex  = modalImages.indexOf(imgClicada);
    _origemFoco        = imgClicada;

    const modal   = document.getElementById("imageModal");
    const imgExp  = document.getElementById("imgExpanded");
    const btnFechar = modal.querySelector(".close");

    imgExp.src = imgClicada.src;
    imgExp.alt = imgClicada.alt;

    modal.style.display = "block";
    btnFechar.focus();
}

function _fecharModal() {
    const modal = document.getElementById("imageModal");
    modal.style.display = "none";
    if (_origemFoco) { _origemFoco.focus(); _origemFoco = null; }
}

function _avancar() {
    currentImageIndex = (currentImageIndex + 1) % modalImages.length;
    const img = modalImages[currentImageIndex];
    document.getElementById("imgExpanded").src = img.src;
    document.getElementById("imgExpanded").alt = img.alt;
}

function _retroceder() {
    currentImageIndex = (currentImageIndex - 1 + modalImages.length) % modalImages.length;
    const img = modalImages[currentImageIndex];
    document.getElementById("imgExpanded").src = img.src;
    document.getElementById("imgExpanded").alt = img.alt;
}

document.addEventListener("click", function(e) {
    if (e.target.tagName === "IMG" && e.target.closest(".card")) {
        _abrirModal(e.target);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const modal   = document.getElementById("imageModal");
    const btnFechar = modal.querySelector(".close");
    const btnNext   = modal.querySelector(".next");
    const btnPrev   = modal.querySelector(".prev");

    // Atributos de acessibilidade no container do modal
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Carta ampliada");

    // aria-label nos botões de controle
    btnFechar.setAttribute("aria-label", "Fechar imagem ampliada");
    btnNext.setAttribute("aria-label", "Próxima carta");
    btnPrev.setAttribute("aria-label", "Carta anterior");

    btnFechar.onclick = _fecharModal;
    btnNext.onclick   = _avancar;
    btnPrev.onclick   = _retroceder;

    window.addEventListener("click", e => {
        if (e.target === modal) _fecharModal();
    });
});

document.addEventListener("keydown", e => {
    if (document.getElementById("imageModal").style.display === "block") {
        if (e.key === "ArrowRight") _avancar();
        else if (e.key === "ArrowLeft") _retroceder();
        else if (e.key === "Escape") _fecharModal();
    }
});
