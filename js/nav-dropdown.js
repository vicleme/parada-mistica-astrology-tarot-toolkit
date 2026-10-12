// =============================================================
//  NAV DROPDOWN — "Serviços"
//  Hover já funciona via CSS (desktop). Este script cobre
//  toque/teclado: clique no gatilho abre/fecha o menu, e
//  clicar fora fecha.
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.pm-nav-dropdown').forEach((dropdown) => {
        const trigger = dropdown.querySelector('.pm-nav-dropdown-trigger');
        if (!trigger) return;

        trigger.addEventListener('click', (ev) => {
            ev.preventDefault();
            const aberto = dropdown.classList.contains('aberto');
            document.querySelectorAll('.pm-nav-dropdown.aberto').forEach((d) => d.classList.remove('aberto'));
            if (!aberto) dropdown.classList.add('aberto');
        });
    });

    document.addEventListener('click', (ev) => {
        if (!ev.target.closest('.pm-nav-dropdown')) {
            document.querySelectorAll('.pm-nav-dropdown.aberto').forEach((d) => d.classList.remove('aberto'));
        }
    });
});
