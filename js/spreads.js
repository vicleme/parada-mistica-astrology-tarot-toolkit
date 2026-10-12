const SPREADS = [

    // ── LIVRE ──────────────────────────────────────────────
    {
        id: "livre",
        nome: "Livre (sem posições fixas)",
        grupo: "Livre",
        sistemas: [],   // compatível com todos
        posicoes: [],   // sem posições — usuário escolhe o número
        layout: null
    },

    // ── PERSONALIZADO ─────────────────────────────────────
    {
        id: "personalizado",
        nome: "Personalizado (informar posições)",
        grupo: "Livre",
        sistemas: [],   // compatível com todos
        posicoes: [],   // posições definidas pelo usuário na hora
        layout: null
    },

    // ── GERAIS (TAROT / ORÁCULOS) ──────────────────────────
    {
        id: "passado-presente-futuro",
        nome: "Passado · Presente · Futuro",
        grupo: "Gerais",
        sistemas: ["tarot", "oraculo", "runas"],
        posicoes: [
            { nome: "Passado",   descricao: "O que ficou para trás e ainda influencia" },
            { nome: "Presente",  descricao: "A situação atual, o que está em jogo agora" },
            { nome: "Futuro",    descricao: "A tendência — o que se desenha à frente" }
        ],
        layout: {
            areas: `"p1 p2 p3"`,
            cols: "1fr 1fr 1fr",
            mapa: { "1": "p1", "2": "p2", "3": "p3" }
        }
    },
    {
        id: "peladan",
        nome: "Cruz de Péladan (5 cartas)",
        grupo: "Gerais",
        sistemas: ["tarot", "oraculo", "runas"],
        posicoes: [
            { nome: "Panorama positivo",    descricao: "As forças favoráveis — o que apoia, o que há de bom na situação" },
            { nome: "Panorama negativo",    descricao: "As forças desfavoráveis — o que se opõe, o que pesa ou dificulta" },
            { nome: "Perspectiva futura",   descricao: "Para onde a situação caminha — a tendência que se desenha à frente" },
            { nome: "Consequência / Solução", descricao: "O desdobramento ou o caminho de resolução — o que emerge como saída" },
            { nome: "Resposta final",       descricao: "A síntese — a mensagem central da tiragem sobre a questão" }
        ],
        layout: {
            //  col:  1    2    3
            //  L1:   .   p3    .
            //  L2:  p1   p5   p2
            //  L3:   .   p4    .
            areas: `
                ".  p3  ."
                "p1 p5 p2"
                ".  p4  ."
            `,
            cols: "1fr 1fr 1fr",
            rows: "auto auto auto",
            mapa: {
                "1": "p1",
                "2": "p2",
                "3": "p3",
                "4": "p4",
                "5": "p5"
            }
        }
    },
    {
        id: "cruz-celta",
        nome: "Cruz Celta (10 cartas)",
        grupo: "Gerais",
        sistemas: ["tarot"],
        posicoes: [
            { nome: "Situação Central",   descricao: "O núcleo da questão — o que está acontecendo" },
            { nome: "Cruzamento",         descricao: "O que se opõe ou complica a situação" },
            { nome: "Base / Raiz",        descricao: "A origem inconsciente, o que sustenta a questão" },
            { nome: "Passado Recente",    descricao: "O que está se afastando, o que ficou" },
            { nome: "Coroa / Potencial",  descricao: "O melhor resultado possível, o ideal consciente" },
            { nome: "Futuro Próximo",     descricao: "O que se aproxima nos próximos dias ou semanas" },
            { nome: "O Consultante",      descricao: "Como você está se posicionando na situação" },
            { nome: "Ambiente / Outros",  descricao: "Influências externas, o que os outros trazem" },
            { nome: "Esperanças e Medos", descricao: "O que você deseja — ou teme — que aconteça" },
            { nome: "Desfecho",           descricao: "A tendência final se o caminho atual continuar" }
        ],
        layout: {
            // Grade 4×4 representando o layout clássico da Cruz Celta
            //
            //  col:   1    2    3    4
            //  L1:    .   p5    .   p10
            //  L2:   p3  p1/p2 p6   p9
            //  L3:    .    .    .    p8
            //  L4:    .   p4    .    p7
            //
            // Carta 2 (Cruzamento) sobrepõe a carta 1 na mesma célula via CSS especial.
            // Carta 4 (Passado Recente) fica abaixo da cruz central, coluna 2.
            areas: `
                ".  p5  .   p10"
                "p3 p1  p6  p9"
                ".  p2  .   p8"
                ".  p4  .   p7"
            `,
            cols: "1fr 1fr 1fr 1fr",
            rows: "auto auto auto auto",
            mapa: {
                "1":  "p1",
                "2":  "p2",
                "3":  "p3",
                "4":  "p4",
                "5":  "p5",
                "6":  "p6",
                "7":  "p7",
                "8":  "p8",
                "9":  "p9",
                "10": "p10"
            },
            especial: {
                // Carta 2 é sobreposta sobre carta 1, rotacionada 90°
                cruzamento: "2"
            }
        }
    },
    {
        id: "ferradura",
        nome: "Ferradura (7 cartas)",
        grupo: "Gerais",
        sistemas: ["tarot", "oraculo", "runas"],
        posicoes: [
            { nome: "Passado Distante",  descricao: "Raízes — o que moldou a questão no início" },
            { nome: "Passado Recente",   descricao: "O que aconteceu logo antes — a situação de partida" },
            { nome: "Presente",          descricao: "Onde você está agora" },
            { nome: "Obstáculos",        descricao: "O que bloqueia ou dificulta" },
            { nome: "Pessoas ao Redor",  descricao: "A influência dos outros na situação" },
            { nome: "Conselho",          descricao: "O que fazer — a ação recomendada" },
            { nome: "Desfecho",          descricao: "O resultado provável se o caminho atual continuar" }
        ],
        layout: { tipo: "ferradura" }
    },
    {
        id: "sim-nao",
        nome: "Sim ou Não (3 cartas)",
        grupo: "Gerais",
        sistemas: ["tarot", "oraculo", "runas", "sibilla", "kipper"],
        posicoes: [
            { nome: "Energia Favorável",     descricao: "O que apoia um resultado positivo" },
            { nome: "Energia Desfavorável",  descricao: "O que se opõe ou dificulta" },
            { nome: "Resposta",              descricao: "A tendência geral — a resposta da tiragem" }
        ],
        layout: {
            areas: `"p1 p2 p3"`,
            cols: "1fr 1fr 1fr",
            mapa: { "1":"p1","2":"p2","3":"p3" }
        }
    },
    {
        id: "passagem-segura",
        nome: "Passagem Segura (7 cartas)",
        grupo: "Gerais",
        sistemas: ["tarot", "oraculo", "runas"],
        posicoes: [
            { nome: "Você",                descricao: "Quem você é neste momento — sua energia e posição atual" },
            { nome: "O que está faltando", descricao: "O que ainda não chegou ou ainda não foi reconhecido" },
            { nome: "Lições aprendidas",   descricao: "O que este ciclo já ensinou — o que você carrega de sabedoria" },
            { nome: "Onde há crescimento", descricao: "A área ou movimento onde há expansão disponível" },
            { nome: "Obstáculos",          descricao: "O que bloqueia ou desafia a passagem" },
            { nome: "Potenciais ganhos",   descricao: "O que pode ser conquistado ou colhido ao atravessar" },
            { nome: "Destino",             descricao: "Para onde esta passagem conduz — o horizonte do ciclo" }
        ],
        layout: {
            // Grade de 3 colunas × 4 linhas
            // Colunas laterais ocupam as linhas 2 e 3 (centralizadas em relação à coluna do meio)
            // Coluna central: p3(L1) · p1(L2) · p7(L3) · p2(L4)
            // Flanco esq:  p3 na L1 e p5 na L2 → span da L2-L3 = centraliza entre p1 e p7
            // Flanco dir:  p4 na L1 e p6 na L2 → idem
            //
            //  col:   1    2    3
            //  L1:   p3a   .   p4a   ← linha fantasma para empurrar flancos
            //  L2:   p5   p1  p6
            //  L3:   p3   p7  p4
            //  L4:    .   p2   .
            //
            // Na prática: p3/p4 ficam na linha 3 e p5/p6 na linha 2,
            // ficando simétricas em torno do par p1+p7
            areas: `
                ".  p1  ."
                "p3 p7 p4"
                "p5 p2 p6"
            `,
            cols: "1fr 1fr 1fr",
            rows: "auto auto auto",
            mapa: {
                "1": "p1",
                "2": "p2",
                "3": "p3",
                "4": "p4",
                "5": "p5",
                "6": "p6",
                "7": "p7"
            },
            especial: {
                cruzamento: "7"
            }
        }
    },

    // ── AMOR E RELACIONAMENTOS ─────────────────────────────
    {
        id: "amorosa-5",
        nome: "Amorosa de 5",
        grupo: "Amor e Relacionamentos",
        sistemas: ["tarot", "oraculo", "runas"],
        posicoes: [
            { nome: "Você",              descricao: "Sua energia, estado e posição neste relacionamento" },
            { nome: "A outra pessoa",    descricao: "A energia, estado e posição da outra pessoa" },
            { nome: "O Relacionamento",  descricao: "A dinâmica que existe entre vocês — o que une ou separa" },
            { nome: "Forças",            descricao: "O que sustenta e fortalece esta relação" },
            { nome: "Fraquezas",         descricao: "O que fragiliza ou desafia esta relação" }
        ],
        layout: {
            // Layout baseado na imagem: 3 no centro, 1 à esquerda, 2 à direita, 4 acima, 5 abaixo
            //
            //  col:  1    2    3
            //  L1:   .   p4    .
            //  L2:  p1   p3   p2
            //  L3:   .   p5    .
            areas: `
                ".  p4  ."
                "p1 p3 p2"
                ".  p5  ."
            `,
            cols: "1fr 1fr 1fr",
            rows: "auto auto auto",
            mapa: {
                "1": "p1",
                "2": "p2",
                "3": "p3",
                "4": "p4",
                "5": "p5"
            }
        }
    },

    {
        id: "amor-futuro",
        nome: "Amor Futuro (10 cartas)",
        grupo: "Amor e Relacionamentos",
        sistemas: ["tarot", "oraculo", "runas"],
        posicoes: [
            { nome: "Por que ainda não o encontrei?",   descricao: "O que está bloqueando ou atrasando esse encontro" },
            { nome: "Como superar isso?",               descricao: "O caminho para vencer o obstáculo da carta 1" },
            { nome: "O que posso fazer para encontrá-lo?", descricao: "Ações concretas que aproximam esse encontro" },
            { nome: "Como vou reconhecê-lo?",           descricao: "Os sinais que identificam essa pessoa" },
            { nome: "Onde vou encontrá-lo?",            descricao: "O contexto ou ambiente desse encontro" },
            { nome: "Quando vou encontrá-lo?",          descricao: "A janela de tempo ou as circunstâncias do momento" },
            { nome: "Orientação e conselhos",           descricao: "Guia geral para este caminho amoroso" },
            { nome: "Minha primeira impressão dele",    descricao: "Como essa pessoa vai me parecer no primeiro encontro" },
            { nome: "O que nos une?",                   descricao: "O laço, o ponto em comum entre nós" },
            { nome: "Sabedoria para o futuro",          descricao: "A mensagem maior sobre este amor que está por vir" }
        ],
        layout: {
            // Layout em formato de coração — posicionamento absoluto
            // Coordenadas em % do container (cx, cy = centro do card)
            // textoAcima: true = rótulo e posição ficam acima da imagem
            //
            //        9    10          ← mamilos
            //      1    8    2        ← laterais (1 e 2 com texto acima)
            //      3         4        ← lados internos
            //        5    6           ← base
            //           7             ← ponta
            tipo: "coracao",
            coords: {
                "1":  { x: 12, y: 30, textoAcima: true },
                "2":  { x: 88, y: 30, textoAcima: true },
                "3":  { x: 12, y: 54 },
                "4":  { x: 88, y: 54 },
                "5":  { x: 34, y: 74 },
                "6":  { x: 66, y: 74 },
                "7":  { x: 50, y: 92 },
                "8":  { x: 50, y: 30 },
                "9":  { x: 30, y:  8 },
                "10": { x: 70, y:  8 }
            }
        }
    },

    {
        id: "espelho-eros",
        nome: "Espelho de Eros (5 cartas)",
        grupo: "Amor e Relacionamentos",
        sistemas: ["tarot", "oraculo", "runas"],
        posicoes: [
            { nome: "O que você sente pelo outro",     descricao: "Seus sentimentos — o que você carrega por dentro em relação a essa pessoa" },
            { nome: "Como você vê o outro",            descricao: "Sua percepção da outra pessoa — a imagem que você construiu dela" },
            { nome: "O que o outro sente por você",    descricao: "Os sentimentos que o outro carrega em relação a você" },
            { nome: "Como o outro vê você",            descricao: "A imagem que o outro construiu de você — como ele te percebe" },
            { nome: "Resultado final / Conselho",      descricao: "O desfecho desta dinâmica ou o conselho central da tiragem" }
        ],
        layout: {
            // Layout em cruz com resultado ao centro:
            // 3 acima, 1 à esquerda, 5 ao centro, 2 à direita, 4 abaixo
            //
            //  col:  1    2    3
            //  L1:   .   p3    .
            //  L2:  p1   p5   p2
            //  L3:   .   p4    .
            areas: `
                ".  p3  ."
                "p1 p5 p2"
                ".  p4  ."
            `,
            cols: "1fr 1fr 1fr",
            rows: "auto auto auto",
            mapa: {
                "1": "p1",
                "2": "p2",
                "3": "p3",
                "4": "p4",
                "5": "p5"
            }
        }
    },
    {
        id: "templo-afrodite",
        nome: "Templo de Afrodite (10 cartas)",
        grupo: "Amor e Relacionamentos",
        sistemas: ["tarot", "oraculo", "runas"],
        posicoes: [
            { nome: "Pensamentos de A",  descricao: "O que A pensa sobre a relação e sobre B" },
            { nome: "Pensamentos de B",  descricao: "O que B pensa sobre a relação e sobre A" },
            { nome: "Sentimentos de A",  descricao: "O que A sente — o campo emocional de A" },
            { nome: "Sentimentos de B",  descricao: "O que B sente — o campo emocional de B" },
            { nome: "Intenções de A",    descricao: "O que A quer — a vontade e o movimento de A" },
            { nome: "Intenções de B",    descricao: "O que B quer — a vontade e o movimento de B" },
            { nome: "Atitude de A",      descricao: "Como A age concretamente na relação" },
            { nome: "Atitude de B",      descricao: "Como B age concretamente na relação" },
            { nome: "A Relação",         descricao: "A dinâmica entre os dois — o que existe no espaço entre A e B" },
            { nome: "O Futuro",          descricao: "Para onde esta relação caminha" }
        ],
        layout: {
            // Formato H: coluna A (esquerda) | coluna Relação (centro) | coluna B (direita)
            // Pares comparativos linha a linha: A1/B1, A2/B2, A3/B3, A4/B4
            // Relação (p9) fica na linha 2, Futuro (p10) na linha 3 — centralizadas no H
            //
            //  col:   1    2    3
            //  L1:   p1    .   p2
            //  L2:   p3   p9   p4
            //  L3:   p5   p10  p6
            //  L4:   p7    .   p8
            areas: `
                "p1  .   p2"
                "p3  p9  p4"
                "p5  p10 p6"
                "p7  .   p8"
            `,
            cols: "1fr 1fr 1fr",
            rows: "auto auto auto auto",
            mapa: {
                "1": "p1",
                "2": "p2",
                "3": "p3",
                "4": "p4",
                "5": "p5",
                "6": "p6",
                "7": "p7",
                "8": "p8",
                "9": "p9",
                "10": "p10"
            }
        }
    },
    {
        id: "pos-ruptura",
        nome: "Pós-ruptura (13 cartas)",
        grupo: "Amor e Relacionamentos",
        sistemas: ["tarot", "oraculo", "runas"],
        posicoes: [
            { nome: "Sentimentos do(a) ex",                    descricao: "O campo emocional da outra pessoa — o que ela carrega por dentro agora" },
            { nome: "Pensamentos do(a) ex",                    descricao: "O que passa pela mente da outra pessoa — seus raciocínios e narrativas sobre o fim" },
            { nome: "Atitudes do(a) ex",                       descricao: "Como a outra pessoa está agindo concretamente — o que suas ações revelam" },
            { nome: "Momento afetivo do(a) ex",                descricao: "O estado afetivo atual da outra pessoa — onde ela está emocionalmente neste ciclo" },
            { nome: "Abertura para perdão (interno)",          descricao: "A capacidade de perdão como processo interior — soltar mágoas independentemente de reconciliação" },
            { nome: "Abertura para reconciliação (pacificação)", descricao: "A possibilidade de pacificação — coexistir sem hostilidade, mesmo sem reaproximação" },
            { nome: "Abertura para reaproximação (contato frequente)", descricao: "A possibilidade de retomar contato genuíno — presença mútua sem compromisso" },
            { nome: "Abertura para retomada de relação (compromisso)", descricao: "A possibilidade de recomeçar a relação com comprometimento real" },
            { nome: "O que dificulta ou bloqueia a relação",   descricao: "O obstáculo central — o que impede o fluxo entre os dois" },
            { nome: "O que favorece a relação",                descricao: "O que ancora a conexão — forças que ainda sustentam ou aproximam" },
            { nome: "Propósito evolutivo atual da conexão",    descricao: "O que esta ruptura veio ensinar — o sentido maior desta fase" },
            { nome: "Possível futuro",                         descricao: "A tendência desta história se o caminho atual continuar" },
            { nome: "Conselho",                                descricao: "A orientação central das cartas — o que é preciso ouvir agora" }
        ],
        layout: {
            // 3 linhas de 4 cartas + 1 carta sozinha centralizada
            //
            //  col:  1    2    3    4
            //  L1:  p1   p2   p3   p4    ← bloco do(a) ex
            //  L2:  p5   p6   p7   p8    ← aberturas
            //  L3:  p9  p10  p11  p12    ← dinâmica / futuro
            //  L4:   .  p13  p13   .     ← conselho centralizado
            areas: `
                "p1  p2  p3  p4"
                "p5  p6  p7  p8"
                "p9  p10 p11 p12"
                ".   p13 p13  ."
            `,
            cols: "1fr 1fr 1fr 1fr",
            rows: "auto auto auto auto",
            mapa: {
                "1":  "p1",
                "2":  "p2",
                "3":  "p3",
                "4":  "p4",
                "5":  "p5",
                "6":  "p6",
                "7":  "p7",
                "8":  "p8",
                "9":  "p9",
                "10": "p10",
                "11": "p11",
                "12": "p12",
                "13": "p13"
            }
        }
    },

    {
        id: "pos-conexao",
        nome: "Pós-conexão (13 cartas)",
        grupo: "Amor e Relacionamentos",
        sistemas: ["tarot", "oraculo", "runas"],
        posicoes: [
            { nome: "Sentimentos da outra pessoa",              descricao: "O campo emocional da outra pessoa — o que ela carrega por dentro agora" },
            { nome: "Pensamentos da outra pessoa",              descricao: "O que passa pela mente dela — como processa e narra esta conexão internamente" },
            { nome: "Atitudes da outra pessoa",                 descricao: "Como ela age concretamente — o que suas ações revelam sobre o que sente" },
            { nome: "Momento afetivo atual da outra pessoa",    descricao: "O estado afetivo de quem ela está sendo agora — onde se encontra emocionalmente" },
            { nome: "O que essa conexão significou para ela",   descricao: "O peso e o sentido que essa vivência teve para ela — o que ficou" },
            { nome: "O que ficou pendente ou não resolvido",    descricao: "O que não foi dito, fechado ou elaborado — o que ainda flutua entre vocês" },
            { nome: "O que aproxima vocês hoje",                descricao: "As forças que ainda criam atração, curiosidade ou proximidade entre os dois" },
            { nome: "O que afasta vocês hoje",                  descricao: "O que cria distância, bloqueio ou resistência entre vocês agora" },
            { nome: "Potencial de contato futuro",              descricao: "A probabilidade e a qualidade de um reencontro ou reaproximação" },
            { nome: "Potencial de aprofundamento da conexão",   descricao: "O que esta conexão pode se tornar se houver abertura dos dois lados" },
            { nome: "Propósito evolutivo da conexão",           descricao: "O que este vínculo veio despertar, ensinar ou transformar em cada um" },
            { nome: "Tendência futura",                         descricao: "Para onde esta história caminha se o rumo atual se mantiver" },
            { nome: "Conselho",                                 descricao: "A orientação central das cartas — o que é preciso ouvir agora" }
        ],
        layout: {
            // Mesma estrutura do pós-ruptura:
            // 3 linhas de 4 cartas + 1 carta sozinha centralizada
            //
            //  col:  1    2    3    4
            //  L1:  p1   p2   p3   p4    ← bloco da outra pessoa
            //  L2:  p5   p6   p7   p8    ← significado / pendências / aproximação / afastamento
            //  L3:  p9  p10  p11  p12    ← potenciais / propósito / tendência
            //  L4:   .  p13  p13   .     ← conselho centralizado
            areas: `
                "p1  p2  p3  p4"
                "p5  p6  p7  p8"
                "p9  p10 p11 p12"
                ".   p13 p13  ."
            `,
            cols: "1fr 1fr 1fr 1fr",
            rows: "auto auto auto auto",
            mapa: {
                "1":  "p1",
                "2":  "p2",
                "3":  "p3",
                "4":  "p4",
                "5":  "p5",
                "6":  "p6",
                "7":  "p7",
                "8":  "p8",
                "9":  "p9",
                "10": "p10",
                "11": "p11",
                "12": "p12",
                "13": "p13"
            }
        }
    },

    {
        id: "ponte-reconciliacao",
        nome: "Ponte de Reconciliação (7 cartas)",
        grupo: "Amor e Relacionamentos",
        sistemas: ["tarot", "oraculo", "runas"],
        posicoes: [
            { nome: "O que você leva",                descricao: "Sua energia, suas expectativas e o que você carrega para este reencontro" },
            { nome: "O que a outra pessoa leva",       descricao: "O que a outra pessoa traz — sua energia, suas expectativas, sua posição" },
            { nome: "O que você precisa compreender",  descricao: "O entendimento que falta em você para que a ponte seja possível" },
            { nome: "O que ela precisa compreender",   descricao: "O entendimento que falta na outra pessoa para que o encontro aconteça" },
            { nome: "O principal obstáculo",           descricao: "O que bloqueia a reconciliação — o nó central entre vocês" },
            { nome: "O potencial da relação",          descricao: "O que esta relação pode oferecer se o obstáculo for superado" },
            { nome: "A ponte",                         descricao: "O caminho, o gesto ou a atitude que pode aproximar os dois lados" }
        ],
        layout: {
            //  col:   1    2    3    4    5    6
            //  L1:    .   p1   p1   p2   p2    .   ← você / outra pessoa
            //  L2:    .   p3   p3   p4   p4    .   ← você compreende / ela compreende
            //  L3:   p5   p5   p6   p6   p7   p7   ← obstáculo / potencial / a ponte
            //
            // 6 colunas de 1fr: cada carta ocupa 2 cols → pares e linha de 3 ficam
            // perfeitamente centralizados sem célula sobrando de nenhum lado.
            areas: `
                ".  p1 p1 p2 p2  ."
                ".  p3 p3 p4 p4  ."
                "p5 p5 p6 p6 p7 p7"
            `,
            cols: "1fr 1fr 1fr 1fr 1fr 1fr",
            rows: "auto auto auto",
            mapa: {
                "1": "p1",
                "2": "p2",
                "3": "p3",
                "4": "p4",
                "5": "p5",
                "6": "p6",
                "7": "p7"
            }
        }
    },

    {
        id: "vinculo-e-reparo",
        nome: "Vínculo e Reparo (6 cartas)",
        grupo: "Amor e Relacionamentos",
        sistemas: ["tarot"],
        posicoes: [
            { nome: "O que ainda conecta vocês",        descricao: "O fio que permanece — o que ainda une, mesmo após o fim" },
            { nome: "O que terminou de fato",           descricao: "O que pertence ao passado e não volta — o que precisa ser aceito como encerrado" },
            { nome: "O que pode ser reconstruído",      descricao: "O que há de real e viável entre vocês — o que tem solo para crescer novamente" },
            { nome: "O que não deve ser repetido",      descricao: "O padrão, a dinâmica ou o erro que precisa ficar para trás" },
            { nome: "Conselho para você",               descricao: "A orientação das cartas sobre como você deve se posicionar neste momento" },
            { nome: "Tendência para os próximos meses", descricao: "Para onde esta história caminha — a direção que se desenha à frente" }
        ],
        layout: {
            areas: `
                "p1 p2"
                "p3 p4"
                "p5 p6"
            `,
            cols: "1fr 1fr",
            rows: "auto auto auto",
            mapa: {
                "1": "p1",
                "2": "p2",
                "3": "p3",
                "4": "p4",
                "5": "p5",
                "6": "p6"
            }
        }
    },

    // ── DECISÃO ─────────────────────────────────────────────
    {
        id: "decisao",
        nome: "Tiragem de Decisão (6 cartas)",
        grupo: "Gerais",
        sistemas: ["tarot", "oraculo", "runas"],
        posicoes: [
            { nome: "Energia geral",            descricao: "A energia que envolve a questão — o contexto maior em que a decisão se insere [Presente]" },
            { nome: "Opção A — Considerar",     descricao: "Algo importante a considerar sobre a Opção A [Presente]" },
            { nome: "Opção A — Resultado",      descricao: "O possível resultado de escolher a Opção A" },
            { nome: "Opção B — Considerar",     descricao: "Algo importante a considerar sobre a Opção B [Presente]" },
            { nome: "Opção B — Resultado",      descricao: "O possível resultado de escolher a Opção B" },
            { nome: "Conselho",                 descricao: "A orientação final — o que levar em conta independentemente da escolha" }
        ],
        layout: { tipo: "decisao" }
    },

    // ── LENORMAND ───────────────────────────────────────────
    {
        id: "linha-3",
        nome: "Linha de 3",
        grupo: "Lenormand / Sibilla / Kipper",
        sistemas: ["lenormand", "sibilla", "kipper", "oraculo", "runas"],
        posicoes: [
            { nome: "Tema",       descricao: "O assunto central, o contexto da leitura" },
            { nome: "Dinâmica",   descricao: "O que está em movimento — ação, pessoa ou força" },
            { nome: "Resultado",  descricao: "Para onde a energia aponta — o desfecho" }
        ],
        layout: {
            areas: `"p1 p2 p3"`,
            cols: "1fr 1fr 1fr",
            mapa: { "1":"p1","2":"p2","3":"p3" }
        }
    },
    {
        id: "linha-5",
        nome: "Linha de 5",
        grupo: "Lenormand / Sibilla / Kipper",
        sistemas: ["lenormand", "sibilla", "kipper", "oraculo", "runas", "tarot"],
        posicoes: [
            { nome: "Passado",   descricao: "O que ficou — a origem" },
            { nome: "Contexto",  descricao: "O ambiente atual da questão" },
            { nome: "Centro",    descricao: "O núcleo — a carta mais importante" },
            { nome: "Conselho",  descricao: "O que levar em conta — orientação" },
            { nome: "Futuro",    descricao: "A tendência — para onde vai" }
        ],
        layout: {
            areas: `"p1 p2 p3 p4 p5"`,
            cols: "1fr 1fr 1fr 1fr 1fr",
            mapa: { "1":"p1","2":"p2","3":"p3","4":"p4","5":"p5" }
        }
    },
    {
        id: "grande-tableau-mini",
        nome: "Mini Tableau (9 cartas)",
        grupo: "Lenormand / Sibilla / Kipper",
        sistemas: ["lenormand"],
        posicoes: [
            { nome: "Casa 1", descricao: "Passado distante — as origens" },
            { nome: "Casa 2", descricao: "Influência sobre o passado" },
            { nome: "Casa 3", descricao: "Passado recente" },
            { nome: "Casa 4", descricao: "Influência atual à esquerda" },
            { nome: "Casa 5", descricao: "Centro — o núcleo da questão" },
            { nome: "Casa 6", descricao: "Influência atual à direita" },
            { nome: "Casa 7", descricao: "Futuro próximo" },
            { nome: "Casa 8", descricao: "Influência sobre o futuro" },
            { nome: "Casa 9", descricao: "Desfecho final" }
        ],
        layout: {
            areas: `
                "p1 p2 p3"
                "p4 p5 p6"
                "p7 p8 p9"
            `,
            cols: "1fr 1fr 1fr",
            mapa: { "1":"p1","2":"p2","3":"p3","4":"p4","5":"p5","6":"p6","7":"p7","8":"p8","9":"p9" }
        }
    },

    // ── TEMÁTICOS ───────────────────────────────────────────
    {
        id: "ikigai",
        nome: "Ikigai (5 cartas)",
        grupo: "Temáticos",
        sistemas: ["tarot", "oraculo", "runas"],
        posicoes: [
            { nome: "O que você ama",             descricao: "Sua paixão — o que te move, o que acende sua alma, o que você faria de graça" },
            { nome: "Em que você é bom",           descricao: "Seu talento — o que vem com naturalidade, onde você se destaca sem esforço" },
            { nome: "O que o mundo precisa",       descricao: "Sua vocação — onde você pode contribuir, o que faz falta ao redor" },
            { nome: "Pelo que você pode ser pago", descricao: "Sua profissão — onde existe valor de troca, o que o mundo está disposto a reconhecer" },
            { nome: "Ikigai",                      descricao: "O ponto de convergência — o que emerge quando paixão, talento, vocação e sustento se encontram" }
        ],
        layout: {
            areas: `
                ".  p1  ."
                "p2 p5 p3"
                ".  p4  ."
            `,
            cols: "1fr 1fr 1fr",
            rows: "auto auto auto",
            mapa: {
                "1": "p1",
                "2": "p2",
                "3": "p3",
                "4": "p4",
                "5": "p5"
            }
        }
    },

    {
        id: "mapa-luto",
        nome: "Mapa do Luto (7 cartas)",
        grupo: "Temáticos",
        sistemas: ["tarot", "oraculo", "runas"],
        posicoes: [
            { nome: "O que foi perdido de fato",                  descricao: "A pessoa, a relação, a rotina, um projeto, uma identidade — o que realmente se foi" },
            { nome: "O que se acredita ter perdido",              descricao: "A percepção da perda — às vezes diferente do que foi de fato" },
            { nome: "O sentimento predominante consciente",       descricao: "O que a pessoa reconhece sentir — o que está na superfície" },
            { nome: "O sentimento predominante inconsciente",     descricao: "O que está sendo evitado, reprimido ou ainda não nomeado" },
            { nome: "Em que fase do processo se está",            descricao: "O momento atual do processo de luto — sem encaixar nas fases clássicas" },
            { nome: "Principal mecanismo de elaboração atual",    descricao: "Os recursos internos ou externos sendo usados para processar a perda" },
            { nome: "Próximo movimento natural",                  descricao: "A direção para a qual a energia tende — o que o processo pede como próximo passo" }
        ],
        layout: {
            //  Pirâmide invertida — 3 linhas centradas:
            //
            //  col:   1    2    3    4    5    6
            //  L1:    .   p1   p1   p2   p2    .    ← perda real / perda percebida
            //  L2:    .   p3   p3   p4   p4    .    ← consciente / inconsciente
            //  L3:   p5   p5   p6   p6   p7   p7   ← fase · elaboração · próximo passo
            //
            //  6 colunas de 1fr: cada carta ocupa 2 cols.
            //  Linhas 1 e 2: par centrado (cols 2-3 e 4-5, com . nas extremidades).
            //  Linha 3: trio ocupa todas as 6 colunas sem resto.
            areas: `
                ".  p1 p1 p2 p2  ."
                ".  p3 p3 p4 p4  ."
                "p5 p5 p6 p6 p7 p7"
            `,
            cols: "1fr 1fr 1fr 1fr 1fr 1fr",
            rows: "auto auto auto",
            mapa: {
                "1": "p1",
                "2": "p2",
                "3": "p3",
                "4": "p4",
                "5": "p5",
                "6": "p6",
                "7": "p7"
            }
        }
    },

    {
        id: "chakras",
        nome: "Mapa dos Chakras (7 cartas)",
        grupo: "Temáticos",
        sistemas: ["tarot", "oraculo", "runas"],
        posicoes: [
            { nome: "Chakra Raiz — Muladhara",       descricao: "Fundação, segurança, pertencimento, estabilidade material. Vermelho." },
            { nome: "Chakra Sacral — Svadhisthana",  descricao: "Criatividade, prazer, sexualidade, emoções, relações. Laranja." },
            { nome: "Chakra do Plexo Solar — Manipura", descricao: "Identidade, poder pessoal, autoestima, vontade. Amarelo." },
            { nome: "Chakra Cardíaco — Anahata",     descricao: "Amor, compaixão, cura, abertura, equilíbrio. Verde." },
            { nome: "Chakra da Garganta — Vishuddha", descricao: "Expressão autêntica, comunicação, verdade, criação pela palavra. Azul." },
            { nome: "Chakra do Terceiro Olho — Ajna", descricao: "Intuição, sabedoria, clareza mental, percepção expandida. Índigo." },
            { nome: "Chakra da Coroa — Sahasrara",   descricao: "Conexão espiritual, propósito divino, consciência expandida. Violeta." }
        ],
        layout: {
            // Coluna vertical: carta 1 embaixo, carta 7 no topo — de baixo para cima
            areas: `
                "p7"
                "p6"
                "p5"
                "p4"
                "p3"
                "p2"
                "p1"
            `,
            cols: "1fr",
            rows: "auto auto auto auto auto auto auto",
            mapa: {
                "1": "p1",
                "2": "p2",
                "3": "p3",
                "4": "p4",
                "5": "p5",
                "6": "p6",
                "7": "p7"
            }
        }
    },
    {
        id: "mandala-astrologica",
        nome: "Mandala Astrológica (12 casas)",
        grupo: "Temáticos",
        sistemas: ["tarot", "oraculo", "runas"],
        posicoes: [
            { nome: "Casa 1 — Ascendente",    descricao: "Identidade, aparência, como você se apresenta ao mundo. Áries." },
            { nome: "Casa 2 — Recursos",      descricao: "Finanças, posses, valores pessoais, autoestima material. Touro." },
            { nome: "Casa 3 — Comunicação",   descricao: "Mente, fala, escrita, irmãos, viagens curtas. Gêmeos." },
            { nome: "Casa 4 — Lar",           descricao: "Família, raízes, infância, base emocional, fim da vida. Câncer." },
            { nome: "Casa 5 — Criação",       descricao: "Amor, prazer, criatividade, filhos, jogos, autoexpressão. Leão." },
            { nome: "Casa 6 — Rotina",        descricao: "Saúde, trabalho cotidiano, serviço, hábitos, animais. Virgem." },
            { nome: "Casa 7 — Parcerias",     descricao: "Relacionamentos, casamento, contratos, inimigos declarados. Libra." },
            { nome: "Casa 8 — Transformação", descricao: "Morte, sexo, heranças, crises, poder compartilhado, ocultismo. Escorpião." },
            { nome: "Casa 9 — Expansão",      descricao: "Filosofia, viagens longas, espiritualidade, ensino superior. Sagitário." },
            { nome: "Casa 10 — Meio do Céu",  descricao: "Carreira, reputação, ambição, figura de autoridade, legado. Capricórnio." },
            { nome: "Casa 11 — Coletivo",     descricao: "Amizades, grupos, causas, esperanças, futuro social. Aquário." },
            { nome: "Casa 12 — Inconsciente", descricao: "Segredos, reclusão, karma, autossabotagem, espiritualidade oculta. Peixes." }
        ],
        layout: { tipo: "circular" }
    },
    {
        id: "ciclo-gestalt",
        nome: "Ciclo de Experiência Gestáltico (7 cartas)",
        grupo: "Temáticos",
        sistemas: ["tarot", "oraculo", "runas"],
        posicoes: [
            { nome: "Sensação",                    descricao: "O que o corpo e o campo estão sinalizando agora — antes de qualquer interpretação. O ponto de partida bruto da experiência." },
            { nome: "Awareness · Percepção",       descricao: "O que emerge para a consciência a partir dessa sensação. O momento em que algo se torna figura — o que você começa a notar e reconhecer." },
            { nome: "Necessidade",                 descricao: "O que está pedindo para ser atendido. O que está por baixo do que aparece — o que o organismo genuinamente precisa agora." },
            { nome: "Mobilização",                 descricao: "A energia disponível para o movimento. O que em você quer agir, o impulso que se acende quando a necessidade é reconhecida." },
            { nome: "Ação · Contato",              descricao: "Como você está de fato se movendo em direção ao mundo e ao outro. O encontro real entre você e o que está fora — o ponto de maior presença." },
            { nome: "Resistência · Interrupção",   descricao: "Onde o ciclo trava. O que bloqueia o contato pleno — pode ser retroflexão (virar para si o que seria para o outro), deflexão (desviar), projeção ou confluência." },
            { nome: "Integração · Retirada",       descricao: "O que pode ser assimilado, encerrado e deixado ir. O que completa este ciclo — e o que abre espaço para o próximo." }
        ],
        layout: {
            tipo: "ferradura",
            invertida: true
        }
    },
];
