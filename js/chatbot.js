// =============================================================
//  CHATBOT
//
//  Controla a visibilidade do iframe do chatbot externo.
// =============================================================

document.addEventListener("DOMContentLoaded", () => {
    const btnChat = document.getElementById("toggleChatbot");
    const ctnChat = document.getElementById("chatbotContainer");

    btnChat.addEventListener("click", () => {
        const aberto = ctnChat.style.display !== "none";
        ctnChat.style.display = aberto ? "none" : "block";
        btnChat.textContent   = aberto ? "Abrir Chatbot" : "Fechar Chatbot";
    });
});
