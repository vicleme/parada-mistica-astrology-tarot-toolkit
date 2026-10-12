// =============================================================
//  Baralho: Tarot
//  Para editar as cartas ou significados, mexa apenas neste arquivo.
// =============================================================

const tarot = {
    id: "tarot",
    nome: "Rider–Waite–Smith (1909)",
    imagemPasta: "riderwaite",       // pasta dentro de images/  →  images/riderwaite/
    imagemExtensao: ".jpg",     // extensão dos arquivos de imagem
    aceitaInversao: true,
    creditos: {
        texto: "Rider–Waite–Smith (1909): arte de Pamela Colman Smith. Domínio público. Imagens hospedadas no Wikimedia Commons.",
        fontes: [
            { link: "Wikipedia · Rider–Waite Tarot", url: "https://en.wikipedia.org/wiki/Rider%E2%80%93Waite_Tarot", acesso: "08/10/2026" }
        ]
    },

    cartas: [
        // Arcanos Maiores
        "O Louco", "O Mago", "A Sacerdotisa", "A Imperatriz", "O Imperador", "O Hierofante",
        "Os Amantes", "O Carro", "A Força", "O Eremita", "Roda da Fortuna",
        "A Justiça", "O Enforcado", "A Morte", "Temperança", "O Diabo",
        "A Torre", "A Estrela", "A Lua", "O Sol", "O Julgamento", "O Mundo",
        // Copas
        "Ás de Copas", "2 de Copas", "3 de Copas", "4 de Copas", "5 de Copas",
        "6 de Copas", "7 de Copas", "8 de Copas", "9 de Copas", "10 de Copas",
        "Pajem de Copas", "Cavaleiro de Copas", "Rainha de Copas", "Rei de Copas",
        // Ouros
        "Ás de Ouros", "2 de Ouros", "3 de Ouros", "4 de Ouros", "5 de Ouros",
        "6 de Ouros", "7 de Ouros", "8 de Ouros", "9 de Ouros", "10 de Ouros",
        "Pajem de Ouros", "Cavaleiro de Ouros", "Rainha de Ouros", "Rei de Ouros",
        // Paus
        "Ás de Paus", "2 de Paus", "3 de Paus", "4 de Paus", "5 de Paus",
        "6 de Paus", "7 de Paus", "8 de Paus", "9 de Paus", "10 de Paus",
        "Pajem de Paus", "Cavaleiro de Paus", "Rainha de Paus", "Rei de Paus",
        // Espadas
        "Ás de Espadas", "2 de Espadas", "3 de Espadas", "4 de Espadas", "5 de Espadas",
        "6 de Espadas", "7 de Espadas", "8 de Espadas", "9 de Espadas", "10 de Espadas",
        "Pajem de Espadas", "Cavaleiro de Espadas", "Rainha de Espadas", "Rei de Espadas"
    ],

    significados: {
        "O Mago":          { direta: "Habilidade, poder, iniciativa",                     invertida: "Manipulação, falta de foco, bloqueio de potencial" },
        "A Sacerdotisa":   { direta: "Intuição, mistério, sabedoria",                     invertida: "Segredos revelados, desconfiança, desconexão interna" },
        "A Imperatriz":    { direta: "Criatividade, fertilidade, abundância",             invertida: "Dependência, bloqueio criativo, estagnação" },
        "O Imperador":     { direta: "Estrutura, autoridade, liderança",                  invertida: "Rigidez, tirania, abuso de poder" },
        "O Hierofante":    { direta: "Tradição, espiritualidade, aprendizado",            invertida: "Dogmatismo, rebeldia, falta de orientação" },
        "Os Amantes":      { direta: "Relacionamentos, escolhas, amor",                   invertida: "Conflitos, indecisão, desarmonia" },
        "O Carro":         { direta: "Vitória, movimento, ação",                          invertida: "Fracasso, perda de controle, atrasos" },
        "A Força":         { direta: "Coragem, paciência, controle",                      invertida: "Fraqueza, impulsividade, medo" },
        "O Eremita":       { direta: "Reflexão, introspecção, sabedoria",                 invertida: "Isolamento, solidão, falta de direção" },
        "Roda da Fortuna": { direta: "Mudança, destino, ciclos",                          invertida: "Resistência à mudança, azar, estagnação" },
        "A Justiça":       { direta: "Equilíbrio, verdade, decisões",                     invertida: "Injustiça, desequilíbrio, parcialidade" },
        "O Enforcado":     { direta: "Sacrifício, espera, perspectiva",                   invertida: "Estagnação, teimosia, falta de progresso" },
        "A Morte":         { direta: "Transformação, fim de ciclo, renovação",            invertida: "Resistência à mudança, estagnação, medo de perder" },
        "Temperança":      { direta: "Equilíbrio, moderação, harmonia",                   invertida: "Excesso, desequilíbrio, conflitos" },
        "O Diabo":         { direta: "Vícios, materialismo, armadilhas",                  invertida: "Libertação, superação, clareza" },
        "A Torre":         { direta: "Ruína, revelações, choque",                         invertida: "Evitar desastre, resistência, mudança lenta" },
        "A Estrela":       { direta: "Esperança, inspiração, fé",                         invertida: "Desânimo, ilusão, falta de visão" },
        "A Lua":           { direta: "Ilusões, intuição, mistério",                       invertida: "Confusão, engano, revelação da verdade" },
        "O Sol":           { direta: "Sucesso, alegria, vitalidade",                      invertida: "Fracasso, pessimismo, falta de clareza" },
        "O Julgamento":    { direta: "Avaliação, renascimento, escolhas",                 invertida: "Autocrítica, culpa, estagnação" },
        "O Mundo":         { direta: "Conclusão, realização, plenitude",                  invertida: "Falta de encerramento, atrasos, frustração" },
        "O Louco":         { direta: "Espontaneidade, novos começos, liberdade",          invertida: "Imprudência, falta de direção, ingenuidade" },

        "Ás de Copas":       { direta: "Novo amor, emoções puras",                        invertida: "Bloqueio emocional, desânimo" },
        "2 de Copas":        { direta: "Parceria, harmonia",                              invertida: "Desentendimento, separação" },
        "3 de Copas":        { direta: "Celebração, amizade, união",                      invertida: "Fofocas, brigas, isolamento" },
        "4 de Copas":        { direta: "Reflexão, contemplação",                          invertida: "Descontentamento, insatisfação" },
        "5 de Copas":        { direta: "Perda, arrependimento",                           invertida: "Superação, aceitação" },
        "6 de Copas":        { direta: "Nostalgia, lembranças",                           invertida: "Apego ao passado, estagnação" },
        "7 de Copas":        { direta: "Escolhas, oportunidades",                         invertida: "Ilusões, confusão" },
        "8 de Copas":        { direta: "Partida, busca interior",                         invertida: "Medo de mudar, estagnação" },
        "9 de Copas":        { direta: "Realização, satisfação",                          invertida: "Frustração, desejos não alcançados" },
        "10 de Copas":       { direta: "Felicidade familiar, harmonia",                   invertida: "Conflitos, desarmonia" },
        "Pajem de Copas":    { direta: "Mensagem emocional, intuição",                    invertida: "Imaturidade, fofocas" },
        "Cavaleiro de Copas":{ direta: "Romance, aventura emocional",                     invertida: "Ilusões, decepções" },
        "Rainha de Copas":   { direta: "Sensibilidade, empatia",                          invertida: "Dependência emocional, manipulação" },
        "Rei de Copas":      { direta: "Controle emocional, maturidade",                  invertida: "Frieza, manipulação" },

        "Ás de Ouros":        { direta: "Novos começos materiais",                        invertida: "Perda de oportunidade, instabilidade" },
        "2 de Ouros":         { direta: "Equilíbrio financeiro, adaptabilidade",          invertida: "Desorganização, instabilidade" },
        "3 de Ouros":         { direta: "Trabalho em equipe, progresso",                  invertida: "Falta de colaboração, atrasos" },
        "4 de Ouros":         { direta: "Segurança financeira, estabilidade",             invertida: "Ganância, medo de perder" },
        "5 de Ouros":         { direta: "Dificuldades financeiras, perdas",               invertida: "Recuperação, superação" },
        "6 de Ouros":         { direta: "Generosidade, ajuda",                            invertida: "Desequilíbrio, exploração" },
        "7 de Ouros":         { direta: "Avaliação, paciência",                           invertida: "Impaciência, falta de resultados" },
        "8 de Ouros":         { direta: "Aperfeiçoamento, dedicação",                     invertida: "Falta de foco, preguiça" },
        "9 de Ouros":         { direta: "Independência, sucesso",                         invertida: "Desapego financeiro, arrogância" },
        "10 de Ouros":        { direta: "Estabilidade familiar, prosperidade",            invertida: "Conflitos, instabilidade" },
        "Pajem de Ouros":     { direta: "Aprendizado, novas oportunidades",               invertida: "Imaturidade, distração" },
        "Cavaleiro de Ouros": { direta: "Trabalho constante, perseverança",               invertida: "Lentidão, teimosia" },
        "Rainha de Ouros":    { direta: "Segurança, praticidade",                         invertida: "Materialismo, descuido" },
        "Rei de Ouros":       { direta: "Sucesso, liderança financeira",                  invertida: "Ganância, imprudência" },

        "Ás de Paus":        { direta: "Novo começo, energia",                            invertida: "Bloqueio, falta de motivação" },
        "2 de Paus":         { direta: "Planejamento, decisões",                          invertida: "Indecisão, falta de visão" },
        "3 de Paus":         { direta: "Progresso, expansão",                             invertida: "Atrasos, obstáculos" },
        "4 de Paus":         { direta: "Celebração, harmonia",                            invertida: "Conflitos domésticos, instabilidade" },
        "5 de Paus":         { direta: "Competição, desafios",                            invertida: "Conflitos internos, desistência" },
        "6 de Paus":         { direta: "Vitória, reconhecimento",                         invertida: "Falta de reconhecimento, fracasso" },
        "7 de Paus":         { direta: "Defesa, coragem",                                 invertida: "Insegurança, rendição" },
        "8 de Paus":         { direta: "Movimento rápido, ação",                          invertida: "Atrasos, obstáculos" },
        "9 de Paus":         { direta: "Resiliência, perseverança",                       invertida: "Exaustão, desânimo" },
        "10 de Paus":        { direta: "Responsabilidade, esforço",                       invertida: "Sobrecarga, fadiga" },
        "Pajem de Paus":     { direta: "Curiosidade, entusiasmo",                         invertida: "Impulsividade, falta de foco" },
        "Cavaleiro de Paus": { direta: "Aventura, ação",                                  invertida: "Impulsividade, imprudência" },
        "Rainha de Paus":    { direta: "Confiança, energia",                              invertida: "Ciúmes, egoísmo" },
        "Rei de Paus":       { direta: "Liderança, visão",                                invertida: "Autoritarismo, arrogância" },

        "Ás de Espadas":        { direta: "Clareza, verdade",                             invertida: "Confusão, engano" },
        "2 de Espadas":         { direta: "Decisão, equilíbrio",                          invertida: "Indecisão, bloqueio" },
        "3 de Espadas":         { direta: "Coração partido, dor",                         invertida: "Superação, perdão" },
        "4 de Espadas":         { direta: "Descanso, recuperação",                        invertida: "Agitação, incapacidade de descansar" },
        "5 de Espadas":         { direta: "Conflito, derrota",                            invertida: "Reconciliação, rendição" },
        "6 de Espadas":         { direta: "Mudança, viagem",                              invertida: "Estagnação, atrasos" },
        "7 de Espadas":         { direta: "Estratégia, discrição",                        invertida: "Engano, traição descoberta" },
        "8 de Espadas":         { direta: "Limitações, prisão",                           invertida: "Liberdade, soluções" },
        "9 de Espadas":         { direta: "Ansiedade, preocupações",                      invertida: "Alívio, superação" },
        "10 de Espadas":        { direta: "Fim doloroso, perda",                          invertida: "Recuperação, esperança" },
        "Pajem de Espadas":     { direta: "Curiosidade, vigilância",                      invertida: "Fofocas, confusão" },
        "Cavaleiro de Espadas": { direta: "Ação rápida, decisão",                         invertida: "Impulsividade, conflito" },
        "Rainha de Espadas":    { direta: "Inteligência, percepção",                      invertida: "Frieza, manipulação" },
        "Rei de Espadas":       { direta: "Justiça, lógica",                              invertida: "Tirania, abuso de poder" },
    }
};
DECKS.registrar(tarot);
