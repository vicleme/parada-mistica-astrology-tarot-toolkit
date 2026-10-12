// =============================================================
//  SISTEMAS DE BARALHO
//
//  Define os sistemas disponíveis e quais baralhos pertencem a cada um.
//  Um "sistema" agrupa baralhos que compartilham a mesma estrutura
//  (mesmas cartas, mesmas posições em tiragens).
//
//  Campos:
//    id       — identificador interno (string sem espaços)
//    nome     — nome exibido no primeiro <select>
//    descricao — texto curto exibido como hint opcional
//    baralhos — lista de ids de deck que pertencem a este sistema
//               (devem estar registrados via DECKS.registrar)
// =============================================================

const SISTEMAS = [
    {
        id: "tarot",
        nome: "Tarot",
        descricao: "78 cartas: Arcanos Maiores e Menores",
        baralhos: ["tarot"]
    },
    {
        id: "lenormand",
        nome: "Lenormand / Petit Lenormand",
        descricao: "36 cartas — leitura por combinação",
        baralhos: []
    },
    {
        id: "sibilla",
        nome: "Sibilla Italiana",
        descricao: "52 cartas — figuras e situações",
        baralhos: []
    },
    {
        id: "kipper",
        nome: "Kipper",
        descricao: "36 cartas — sistema alemão do séc. XIX",
        baralhos: []
    },
    {
        id: "oraculo",
        nome: "Oráculo",
        descricao: "Cartas temáticas — número variável",
        baralhos: []   // sistema sem baralho de fábrica: importe ou crie um pelo gerenciador (⚙️)
    },
    {
        id: "runas",
        nome: "Runas",
        descricao: "24 ou 33 runas — Futark Antigo (com expansão Anglo-Saxônica opcional)",
        baralhos: []
    }
];

// Sistemas criados pelo usuário (ver js/custom-decks.js) herdam as tiragens e as
// perguntas sugeridas de um sistema do site, indicado em `herdaDe`.
function sistemaBase(sistemaId) {
    const s = SISTEMAS.find(x => x.id === sistemaId);
    return (s && s.herdaDe) || sistemaId;
}
