// =============================================================
//  TEMPLATE: Novo Baralho
//
//  Instruções:
//    1. Copie este arquivo para  decks/nomedoBaralho.js
//    2. Preencha os campos abaixo
//    3. No index.html, adicione antes de decks/index.js:
//         <script src="decks/nomedoBaralho.js"></script>
//    4. Em decks/index.js, adicione a variável em BARALHOS_REGISTRADOS
//    5. Coloque as imagens em  images/nomedapasta/1.jpg, 2.jpg...
//
//  Sem mexer no código: o botão ⚙️ ao lado do seletor de baralho (página
//  de tiragem) importa, cria, exporta e exclui baralhos direto no navegador.
//  Formato do arquivo: docs/custom-decks.md
// =============================================================

const meuBaralho = {                    // ← renomeie para o id do baralho (sem espaços)
    id:              "meuBaralho",      // ← mesmo nome da variável acima
    nome:            "Meu Baralho",     // ← nome que aparece no <select>
    imagemPasta:     "meubaralho",      // ← subpasta dentro de images/
    imagemExtensao:  ".jpg",            // ← extensão das imagens (.jpg, .png, .webp…)
    aceitaInversao: false,   // ← true para Tarot; false para Cigano, Sibilla, oráculos

    // Opcional: false esconde o botão "Exportar" deste baralho no gerenciador
    // (use quando a arte não puder ser redistribuída). Padrão: permitido.
    // permiteExportar: false,

    // Lista de nomes na MESMA ORDEM das imagens (imagem 1 = cartas[0], etc.)
    cartas: [
        "Nome da Carta 1",
        "Nome da Carta 2",
        "Nome da Carta 3",
        // ... continue
    ],

    // Significados: chave = nome exato da carta (igual ao array acima)
    significados: {
        "Nome da Carta 1": {
            direta:   "Significado quando está na posição normal",
            invertida: "Significado quando está invertida"
        },
        "Nome da Carta 2": {
            direta:   "...",
            invertida: "..."
        },
        // ... continue para todas as cartas
    }
};

// Registra o baralho no sistema — não remova esta linha
DECKS.registrar(meuBaralho);
