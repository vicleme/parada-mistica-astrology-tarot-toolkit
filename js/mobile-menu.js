// =============================================================
//  MENU MOBILE (hambúrguer)
//  Abaixo de 900px o .pm-nav vira um painel escondido; este
//  script abre/fecha o painel ao clicar no botão hambúrguer,
//  fecha ao clicar em um link, clicar fora, apertar Esc ou
//  redimensionar a janela de volta para desktop.
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    const botao = document.getElementById('btn-menu-mobile');
    const header = document.querySelector('.pm-header');
    const nav = document.getElementById('pm-nav-principal');
    if (!botao || !header || !nav) return;

    function fecharMenu() {
        header.classList.remove('menu-aberto');
        botao.setAttribute('aria-expanded', 'false');
    }

    function abrirMenu() {
        header.classList.add('menu-aberto');
        botao.setAttribute('aria-expanded', 'true');
    }

    function alternarMenu() {
        if (header.classList.contains('menu-aberto')) {
            fecharMenu();
        } else {
            abrirMenu();
        }
    }

    botao.addEventListener('click', (ev) => {
        ev.stopPropagation();
        alternarMenu();
    });

    // Fecha ao clicar em um link de destino real (não no gatilho do dropdown "Serviços")
    nav.querySelectorAll('a:not(.pm-nav-dropdown-trigger)').forEach((link) => {
        link.addEventListener('click', fecharMenu);
    });

    // Fecha ao clicar fora do header
    document.addEventListener('click', (ev) => {
        if (header.classList.contains('menu-aberto') && !ev.target.closest('.pm-header')) {
            fecharMenu();
        }
    });

    // Fecha com Esc
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') fecharMenu();
    });

    // Fecha automaticamente se a janela voltar para tamanho desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 900) fecharMenu();
    });
});
