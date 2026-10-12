/**
 * calibration.js — Todos os pesos, divisores e limiares ajustados "no olho"
 * (CALIBRATION, AXIS_BOOST, ORB_DECAY_DIVISOR...) centralizados aqui em vez de
 * espalhados pelo código como magic numbers soltos. É aqui que se mexe pra
 * recalibrar o app. Não depende de nenhum outro módulo do projeto.
 * Usado por: comparisons.js, compute.js, dictionary.js, main.js, parser.js,
 * scoring.js.
 */

// Todas as constantes "no olho" (não calibradas contra leituras profissionais reais)
// ficam centralizadas aqui, documentadas, em vez de espalhadas pelo código como magic
// numbers soltos. Isso não as torna mais "corretas" — só torna explícito que são
// heurísticas ajustáveis, e facilita revisar/recalibrar tudo de uma vez se um dia
// houver um conjunto de sinastrias com leitura profissional conhecida pra comparar.
export const CALIBRATION = {
  // amplifica o desvio da % de categoria em relação à média neutra (25%) antes de
  // renormalizar — evita que a soma de muitos aspectos regrida pra perto de 25% em
  // todas as categorias (ver computeScores)
  categoryStretch: 1.8,

  // amplifica o desvio da harmonia em relação ao ponto neutro (50%) — mesma lógica
  // do categoryStretch, mas pro eixo harmônico/tenso
  harmonyStretch: 1.6,

  // Nitidez (força/carga do mapa — % de aspectos de orbe apertado) como intensificador
  // do Veredito, não como componente somado. A base do Veredito (compatibilityScore +
  // harmonyPct + significância, ver potentialScore) já indica uma direção — harmônica
  // (>50) ou tensa (<50) — e a Nitidez decide o QUANTO essa direção é acentuada: mapa
  // pouco carregado (Nitidez baixa) amortece o desvio da base em relação ao ponto
  // neutro 50, porque há pouco "testemunho" pra confiar na leitura; mapa muito
  // carregado (Nitidez alta) acentua esse desvio, tornando o Veredito mais decisivo no
  // sentido que a base já apontava. Nunca inverte o sentido sozinha (o fator multiplica
  // o desvio, não o inverte). min = fator aplicado com Nitidez=0 (desvio amortecido,
  // mas não zerado — mesmo sem carga, a base ainda é o melhor palpite disponível);
  // max = fator aplicado com Nitidez=100 (desvio acentuado, sem deixar o resultado
  // estourar 0-100 — o clamp final em potentialScore cuida disso).
  vereditoIntensifier: { min: 0.7, max: 1.35 },

  // NOVO — nudge (empurrãozinho) de Afinidade (Júpiter) na Compatibilidade Geral
  // romântica. Decisão pós-discussão: Júpiter tocando pessoal (calor/facilidade) fica
  // de fora do núcleo Atração×Estrutura (média geométrica) porque a tradição não trata
  // "é fácil/gostoso estar perto" como um dos dois pilares que decidem se um vínculo
  // romântico tem chance real (isso é papel de Atração e Estrutura) — mas também não é
  // nenhum, já que Júpiter-Vênus/Júpiter-Sol tocando pessoal É lido como bênção clássica
  // em sinastria de casamento. Resolvido do mesmo jeito que Nitidez virou intensificador
  // do Veredito: Afinidade MODULA a nota central em vez de votar dentro dela. Fica FORA
  // da raiz geométrica (não altera se o Compat "pode" ser alto — só dois eixos decidem
  // isso, como o texto da UI já promete) e entra só depois, como ajuste aditivo com
  // teto. affinityNudgeWeight multiplica o desvio de afinidadeHarmonyPct em relação ao
  // ponto neutro (50, que já varia de 5 a 95 por causa do clamp de poolHarmonyPct) —
  // desvio máximo ±45 × 0.08 = nudge máximo de ±3,6 pontos. Suficiente pra fazer
  // diferença num empate, insuficiente pra sozinho decidir o resultado.
  affinityNudgeWeight: 0.08,

  // faixa em que a leitura harmônica/tensa é tratada como MISTA em vez de decisiva.
  // Abaixo de 'low' ou acima de 'high', o texto assume uma leitura plena; dentro da
  // faixa, o texto ainda escolhe um "lado" (o majoritário, >=50%) mas sinaliza
  // explicitamente que é uma leitura intermediária — evita o efeito degrau em que
  // 54.9% e 55.1% de harmonia geravam textos radicalmente diferentes.
  harmonyZone: { low: 45, high: 60 },

  // fora da harmonyZone, threshold extra pra "isso é MUITO tenso" / "isso é MUITO
  // harmônico" — controla o sufixo tipo "(bastante tensa)" no título
  strongTenseThreshold: 38,
  strongHarmonicThreshold: 72,

  // se a 2ª e a 3ª categoria (em % ) estiverem mais perto do que isso, o "tema"
  // escolhido pra sinastria é menos decisivo do que o texto sozinho sugeriria —
  // o classify() sinaliza isso em vez de tratar como resolvido
  nearTiePctGap: 3,

  // só conta um contato de Saturno/Nodo como marcador narrativo se o orbe for
  // apertado o suficiente (ver formatMarkerDetail / computeScores)
  significantMarkerOrbWeight: 0.3,

  // abaixo deste número de aspectos reconhecidos, a leitura é avisada como "baseada
  // em poucos dados" — com poucos aspectos, 1-2 contatos isolados dominam a leitura
  // de um jeito que parece mais decisivo do que realmente é. Esse é um aviso sobre o
  // VOLUME total do relatório colado (completo vs parcial) — continua sendo uma
  // contagem bruta de propósito, porque a pergunta aqui é "o relatório está completo?",
  // não "esse sinal específico é confiável?" (essa segunda pergunta é o que
  // minAxisSignalWeight, abaixo, resolve).
  minAspectsForConfidence: 10,

  // Piso de CONFIANÇA por sub-pool (categoria de conteúdo, ou eixo Imediato/Estrutura)
  // — abaixo dele, o sub-pool não tem sinal suficiente pra mostrar presence/harmonyPct,
  // e caem em "dado insuficiente" em vez de um número com falsa precisão.
  //
  // Antes esse piso era `eligibleCount < 3` (contagem bruta de aspectos, ignorando
  // orbe/peso) — o que não corresponde a como um astrólogo realmente pesa evidência:
  // um único aspecto MUITO exato num eixo consagrado (ex: Lua-Lua a 0.5° de orbe) é
  // lido como um sinal forte por si só, enquanto três aspectos largos e sem peso
  // (Marte-Vertex a 6°, etc.) continuam sendo ruído mesmo somados. Contagem bruta
  // tratava os dois casos ao contrário: bloqueava o primeiro (só 1 aspecto) e liberava
  // o segundo (3 aspectos). Confirmado nos dados reais do próprio histórico salvo: uma
  // categoria com só 2 aspectos mas peso 1.53 ficava zerada, enquanto outra com 3
  // aspectos e peso 0.50 (menos de um terço do sinal) passava normalmente.
  //
  // O piso agora é sobre PESO acumulado (harmoniousW+tenseW do sub-pool — a mesma soma
  // que já vira `presence`, ver poolPresence/poolHarmonyPct abaixo), não contagem.
  // Cada aspecto já entra nessa soma multiplicado por orbW (decaimento por orbe,
  // ORB_DECAY_DIVISOR) e por AXIS_BOOST (peso do eixo) — então o piso mede
  // exatamente "força de testemunho", que é o critério astrológico correto.
  //
  // Calibrado como o peso de UM aspecto a ~3° de orbe num eixo AXIS_BOOST tier 1
  // (peso 1.35 — ex: Lua-Lua, Mercúrio-Mercúrio, Vênus-Marte): orbW(3°, conjunção/
  // oposição) ≈ 0.37 × 1.35 ≈ 0.50. Ou seja: um aspecto desse porte, sozinho, já é
  // "sinal suficiente" — e várias combinações mais soltas que somem esse tanto também
  // passam, exatamente como um astrólogo somaria testemunhos parciais.
  minAxisSignalWeight: 0.5,

  // diferença mínima (em pontos percentuais) entre immediateHarmonyPct e
  // structureHarmonyPct pra classify() emitir o aviso de desequilíbrio no texto do
  // veredito (ex: "muita faísca, pouca estrutura" ou o inverso)
  imbalanceThreshold: 25,

  // NOVO — escala a soma de peso acumulado (harmoniousW+tenseW) de uma categoria pra
  // um "presence" de 0-100, usado nas barras. Cada categoria é independente (não é
  // fração de um bolo fixo — ver categoryPoolFor), então não há um "total do mapa" pra
  // comparar contra; em vez disso, a soma bruta de peso dos marcadores encontrados é
  // multiplicada por esse fator e limitada em 100. "No olho", como o resto de
  // CALIBRATION — recalibrar se, na prática, a maioria das leituras saturar perto de
  // 100 (fator alto demais) ou ficar sempre baixa (fator baixo demais).
  categoryPresenceScale: 22,

  // NOVO — peso de cada marcador de casa (HOUSE_CATEGORY_MARKERS) na presence de
  // categoria. Casa não tem orbe/precisão pra graduar (é dentro ou fora da casa, sem
  // "quão exato"), então usamos um peso fixo (houseMarkerWeight, 0.5) em vez do
  // decaimento exponencial dos aspectos — próximo do que uma conjunção/trígono já bem
  // aberta contribuiria, refletindo que presença de casa é evidência real mas mais
  // "macia"/genérica que um aspecto de orbe apertado.
  //
  // houseMarkerWeightAngular/houseMarkerWeightCadent foram adicionados numa tentativa
  // de graduar esse peso por angularidade da casa (1/4/7/10 mais "potente", 3/6/9/12
  // mais "difusa" — ver ANGULAR_HOUSES/CADENT_HOUSES/houseMarkerWeightFor) — antes
  // revertidos como aplicação a HOUSE_CATEGORY_MARKERS especificamente, mas essa
  // reversão foi corrigida (decisão pós-discussão, ver houseAngularityMult abaixo):
  // angularidade é um critério tradicional real e independente da curadoria temática —
  // "Vênus na 4ª" merece pesar mais que "Vênus na 8ª" só por a 4ª ser angular, MESMO
  // os dois já sendo pares curados por regência/tema. Os dois eixos (tema + angularidade)
  // não competem, se somam: tema decide SE o par entra e em qual categoria; angularidade
  // gradua QUANTO ele pesa uma vez dentro. Ver houseAngularityMult, aplicado agora em
  // houseValenceWeight/houseW dos pares curados.
  houseMarkerWeightAngular: 0.65,
  houseMarkerWeight: 0.5,
  houseMarkerWeightCadent: 0.35,

  // NOVO — multiplicador de angularidade aplicado a QUALQUER peso de casa curada
  // (presença E valência, ver houseAngularityMult/HOUSE_PLANET_VALENCE abaixo). Mesma
  // proporção de houseMarkerWeightAngular/Cadent acima (0.65/0.5/0.35 → razão
  // 1.3/1.0/0.7), só normalizada em torno de 1.0 pra funcionar como multiplicador em
  // vez de peso absoluto.
  houseAngularityMult: { angular: 1.3, succedent: 1.0, cadent: 0.7 },

  // NOVO — peso-base da valência (harmônico/tenso) de planeta-em-casa, pros planetas
  // com leitura tradicional de viés (ver HOUSE_PLANET_VALENCE) — decisão pós-discussão
  // com o usuário: casa não tem orbe pra graduar exatidão, mas ALGUNS planetas têm uma
  // leitura de "confortável" ou "pesado" já na origem, mesmo sem aspecto (Vênus/Júpiter
  // numa casa tende a ser lido como benéfico; Saturno/Marte tendem a vir com peso ou
  // fricção; Plutão/Netuno/Quíron/Lilith são genuinamente ambivalentes por natureza —
  // ver comentário em HOUSE_PLANET_VALENCE). Isso é MAIS FRACO que a leitura de um aspecto (que
  // tem geometria + orbe pra sustentar), mas não é ZERO leitura, como o sistema tratava
  // antes (todo planeta em casa, neutro). Valor propositalmente modesto — abaixo do
  // peso típico de um aspecto de orbe moderado — pra empurrar sem dominar sozinho.
  houseValenceWeight: 0.28,

  // Empurrão harmônico direto no eixo Estrutura por Sol/Lua nas casas 1ª/4ª/7ª/10ª
  // (MARRIAGE_HOUSES) — decisão tomada explicitamente após discussão: diferente do
  // houseMarkerWeight acima (que só soma presence, de propósito neutro), este marcador
  // É tratado como favorável por padrão, porque a leitura tradicional NÃO trata "estar
  // na casa 7/4/1/10 do parceiro" como neutro — trata como sinal de estrutura/compromisso
  // favorável já na origem (a única leitura tensa possível seria um aspecto tenso do
  // próprio planeta lá, que já é capturado à parte, via aspectos). Antes desse ajuste,
  // esse marcador (o mais clássico de compromisso que existe em sinastria) só alimentava
  // o chip dedicado e a frase de destaque — nunca movia structureHarmonyPct nem
  // compatibilityScore, o número que de fato decide o veredito. Valor próximo de um
  // aspecto maior (trígono/conjunção) de orbe moderadamente aberto (~3°-4°), refletindo
  // peso real sem dominar sozinho o eixo inteiro. Cada overlap conta uma vez — pares
  // recíprocos (Sol dos dois lados na 7ª um do outro) somam em dobro naturalmente, já
  // que cada direção já é contada como um contato próprio em commitmentHouseContacts.
  //
  // Decisão pós-discussão (caso real testado: Sol de A na 7ª de B E Sol de B na 7ª de
  // A, mutuamente) — esse mesmo empurrão agora TAMBÉM soma dentro do catPool da
  // categoria correspondente (Prático/Emocional, via categoryPoolForHouse), não só no
  // eixo Estrutura isolado. Antes, Sol-7ª empurrava structureHarmonyPct mas a barra de
  // Prático via aquele mesmo Sol-7ª como neutro (só presence) — inconsistente: a
  // leitura tradicional de "Sol do parceiro na sua 7ª" não muda de favorável pra neutra
  // dependendo de qual painel está olhando. Ver bloco correspondente no loop de casas.
  commitmentHouseStructureWeight: 0.6,

  // Mesmo raciocínio de commitmentHouseStructureWeight acima, aplicado ao eixo Destino:
  // Nodo/Nodo Sul/Vértice caindo na 1ª/4ª/7ª/10ª do parceiro (ver computeDestinyHouses)
  // soma direto em destinyHarmoniousW. Mesmo valor — é a mesma "força" de sinal
  // estrutural, só que no eixo de destino/significado em vez do eixo de compromisso
  // prático.
  destinyHouseWeight: 0.6,

  // chironKarmaWeight e fortuneKarmaWeight (pesos do antigo sistema de pontos do
  // vinculoProfile v1) foram removidos daqui na migração pra v2 — v2 não soma mais
  // marcadores num score próprio, usa direto structureHarmonyPct (eixo Estrutura, já
  // ponderado por orbe) e chemistryHarmonyPct (Atração+Afinidade), então esses dois
  // pesos pararam de ser lidos por qualquer código. O cuidado astrológico que eles
  // documentavam não se perdeu, só migrou de lugar: a cautela sobre Fortuna como ponto
  // derivado (evidência auxiliar, nunca decisiva sozinha) agora vive só no peso 0.6 dela
  // no AXIS_BOOST abaixo; o caso Quíron (ferida-que-ensina) virou só um sinal narrativo
  // no vinculoProfile v2 (não decide mais rótulo, só ilustra o "porquê" — ver
  // computeVinculoProfile).
};
// (a distinção harmônico/tenso agora é feita por harmonicFraction(), mais abaixo,
// que considera quais planetas estão envolvidos em vez de tratar toda conjunção como fácil)
// Quincunx (150°) e Semisextile (30°) foram incluídos porque relatórios de sinastria
// costumam listá-los, e antes eram descartados silenciosamente (linha com "Orb:" mas
// sem nenhuma ASPECT_WORD reconhecida = perdida sem aviso nenhum pro usuário).

// PLANET_PROFILE e HOUSE_PROFILE (tabelas planeta→[intelectual,emocional,sexual,
// prático] e casa→mesmo vetor) existiam pra alimentar o modelo "pizza" — cada aspecto
// e cada sobreposição de casa rateava peso fracionário entre as 4 categorias, sempre
// somando 100%. Esse modelo foi abandonado (ver categoryPoolFor acima): a literatura
// de sinastria não trata as 4 áreas como zero-sum, e o rateio fracionário é exatamente
// o que gerava a "competição" artificial identificada na conversa que motivou este
// refactor. As duas tabelas foram removidas — quando a lista de correspondências
// planeta+casa for definida (a segunda frente do redesign, ainda pendente), ela nasce
// do zero como marcadores discretos, não reaproveitando esses vetores fracionários.

// --- Nuances astrológicas aplicadas ao peso dos aspectos ---

// Viés harmônico/tenso de planeta-em-casa, pros planetas com leitura tradicional de
// caráter já na origem (sem precisar de aspecto) — decisão pós-discussão com o usuário
// (caso real: Sol de A na 7ª de B e vice-versa). Valor = fração que vai pro lado
// HARMÔNICO (o resto vai pro tenso) — mesmo formato de harmonicFraction, mas fixo por
// planeta em vez de calculado por aspecto+signo, já que casa não tem geometria pra
// variar. Só planetas com leitura tradicional clara e consensual entram aqui:
//   - Vênus/Júpiter: benéficos clássicos — presença tende a ser lida como confortável/
//     favorável mesmo sem aspecto (0.80: majoritariamente harmônico, não binário).
//   - Saturno/Marte/Plutão/Quíron: tendem a trazer peso, fricção ou ferida por
//     natureza — presença lida como majoritariamente tensa (0.20: não é "sempre ruim",
//     mas o viés por defeito pesa pro lado difícil).
// Deliberadamente NÃO inclui Sol/Lua/Mercúrio (mais neutros/contextuais — dependem
// muito de signo/regência pra ter viés confiável) nem Nodos/Vértice/Fortuna (pontos
// mais discutidos/ambivalentes, sem consenso tradicional forte o bastante pra um
// viés fixo, nem sequer o 0.50 ambivalente que a família transpessoal recebeu) —
// esses continuam neutros (só presence), como antes. Urano/Netuno/Plutão/Quíron/
// Lilith JÁ estão cobertos abaixo, todos em 0.50 (ambivalente-por-natureza, não
// "sem viés"). Não generalizar sem novo caso real discutido, mesmo espírito do
// resto do arquivo.
export const HOUSE_PLANET_VALENCE = new Map([
  ['Venus', 0.80],
  ['Jupiter', 0.80],
  ['Saturn', 0.20],
  ['Mars', 0.20],
  // Quíron: alinhado com o tratamento que ele JÁ tem nos aspectos (AMBIVALENT_
  // CONJUNCTION_POINTS, frac 0.5) — "ferida E cura no mesmo símbolo", mesma dualidade
  // em qualquer casa que ele caia (7ª/8ª, ver HOUSE_CATEGORY_MARKERS), não só em
  // conjunção. Antes ficava agrupado com Saturno/Marte em 0.20 (tenso), inconsistente
  // com a própria leitura que o sistema já dava a ele — corrigido pós-discussão
  // (mesmo raciocínio que levou a Lilith pra 0.5 antes dele).
  ['Chiron', 0.50],
  // Plutão/Netuno: mesma família TRANSPERSONAL_PLANETS dos aspectos, onde os três
  // (Urano/Netuno/Plutão) já recebem frac 0.5 ambivalente em conjunção ("intensos e
  // desestabilizadores por natureza... nem fácil, nem só tensa"). Plutão estava
  // isolado em 0.20 (tenso, junto de Saturno/Marte) — corrigido pra bater com o
  // resto da família transpessoal. Netuno entra pela primeira vez aqui (antes nem
  // tinha entrada, ficava neutro) — mesma leitura ambivalente, cobre Netuno-7/
  // Netuno-1 (ver HOUSE_CATEGORY_MARKERS). Urano fica de fora por ora: ele ainda não
  // tem NENHUM par casa-específico curado em HOUSE_CATEGORY_MARKERS (diferente de
  // Netuno/Plutão), então uma entrada aqui não teria efeito nenhum até esse par
  // existir — decisão pendente, não esquecimento.
  ['Pluto', 0.50],
  ['Neptune', 0.50],
  // Urano: fecha a família transpessoal (Netuno/Plutão acima) em 0.50 — decisão
  // pós-discussão (caso 1ª/5ª/7ª/11ª). Mesma leitura ambivalente-por-natureza da
  // dupla acima ("excitação/libertação" de um lado, "instabilidade/imprevisibilidade"
  // do outro, em qualquer uma das quatro casas onde ele agora tem par curado em
  // HOUSE_CATEGORY_MARKERS logo abaixo). Considerado e descartado um viés levemente
  // positivo específico pra 11ª (por "regência natural" — Urano rege Aquário, signo
  // natural da 11ª): regência no arquivo já tem um uso definido e é só pra categoria/
  // tema (ver Jupiter-9/Jupiter-11 logo abaixo), nunca pra valência — e o próprio
  // "mais natural" nas fontes pesquisadas vem emparelhado com "pode parecer detached/
  // impessoal", tensão real, não um adorno. Mantido 0.50 parelho nas quatro casas até
  // aparecer um caso real que force diferenciação (mesmo padrão que levou Quíron/
  // Plutão a mudar de valência só depois de caso testado, não por antecipação teórica).
  ['Uranus', 0.50],
  // Lilith entra em 0.5 (decisão pós-discussão) — não pra fingir que ela é "boa" numa
  // casa, mas pra parar de tratá-la como se não tivesse opinião nenhuma. Nos ASPECTOS
  // ela já cai em AMBIVALENT_CONJUNCTION_POINTS com frac 0.5 fixo, pela própria leitura
  // que a tradição de sinastria dá a ela: "desejo/sombra que magnetiza e desconforta ao
  // mesmo tempo" — mesma dualidade em qualquer casa que ela caia (5ª/prazer, 8ª/intimidade
  // etc.), não só em conjunção. 0.5 cai bem na faixa "genuinamente ambivalente" (ver
  // markerCategory, 0.41–0.59), então puxa harmoniousW/tenseW igualmente E aparece com
  // marcador 🟡 dedicado no hover (ver bloco de casas abaixo) — não fica mais neutra/muda,
  // mas também não vira "favorável" fingido. Mercúrio, por comparação, FICA de fora: nos
  // aspectos dele não existe nem viés harmônico nem ambivalente fixo (a leitura vem 100%
  // da geometria/do outro planeta) — não tem precedente equivalente pra copiar pra casa.
  ['Lilith', 0.50],
]);

// Eixos com peso extra por serem os indicadores clássicos mais citados em sinastria.
// Usamos pesos escalonados por "tier" em vez de um boost único: tier 1 são os eixos
// mais centrais da literatura de sinastria; os demais são reais, mas um degrau abaixo
// (ou mais ambivalentes, como Marte com Sol/Lua — vitalidade forte, mas mistura desejo
// com atrito mais facilmente do que Vênus-Marte).
//
// Tier 1 (1.35):
//  - Sol-Lua: identidade encontrando necessidade emocional, indicador nº1 de compatibilidade
//  - Vênus-Marte: o eixo clássico de atração/desejo
//  - Lua-Lua: ressonância emocional direta — citado lado a lado com Sol-Lua e Vênus-Marte
//    como um dos aspectos mais centrais de sinastria romântica (antes ficava sem boost,
//    pesando igual a qualquer par aleatório)
//  - Ascendente com Sol/Lua/Vênus/Marte: "reconhecimento"/atração física imediata
//  - Mercúrio-pessoal (Mercúrio-Mercúrio, Sol-Mercúrio, Lua-Mercúrio, Ascendente-Mercúrio):
//    a tradição de sinastria trata Sol-Lua (identidade/emoção), Vênus-Marte (atração) e
//    Mercúrio (comunicação/entendimento mental) como os três eixos centrais — a "terceira
//    perna" do tripé clássico. Ficava rebaixado a tier 3 (1.20) e com cobertura incompleta
//    (só Mercúrio-Mercúrio e Mercúrio com Vênus/Marte); agora entra no mesmo peso de
//    Sol-Lua e Vênus-Marte, e ganha os pares que faltavam com Sol/Lua/Ascendente — mesma
//    cobertura que os outros três pessoais já tinham entre si.
//  - Saturno-pessoal (Saturno com Sol/Lua/Vênus/Marte): o quarto eixo clássico, o da
//    permanência/compromisso — citado com a mesma frequência que Sol-Lua e Vênus-Marte
//    em boa parte da literatura séria de sinastria como indicador de relação "que dura".
//    Antes NÃO estava em AXIS_BOOST de jeito nenhum (peso 1.0, igual a qualquer aspecto
//    genérico) — só era rastreado como marcador narrativo à parte (saturnCommitmentContacts,
//    o badge ♄), sem nunca empurrar a porcentagem de Prático. Isso deixava Prático
//    estruturalmente em desvantagem: as outras três categorias tinham representante em
//    tier 1, Prático não tinha nenhum. Corrigido aqui, no mesmo peso dos outros três.
//
// Tier 2 (1.30) — eixo do destino:
//  - Nodo Norte com Sol/Lua/Vênus/Marte: a "sensação de destino/fatalidade" — puxão
//    kármico tradicionalmente lido como tão significativo quanto Vênus-Marte em boa
//    parte da literatura de sinastria moderna.
//  - Nodo-Nodo (eixo nodal mútuo entre os dois mapas): quando os dois eixos nodais se
//    alinham (conjunção/oposição entre Nodo Norte/Sul de A e de B), é lido como um dos
//    marcadores kármicos mais fortes que existem — às vezes citado como mais decisivo
//    que Nodo tocando um pessoal. Ficava sem nenhum boost antes.
//
// Tier 3 (1.20) — eixos pessoais secundários:
//  - Sol-Vênus / Lua-Vênus: afeto e valores ("eu gosto de quem você é")
//  - Sol-Marte / Lua-Marte: vitalidade e impulso — real, mas com mais tendência a
//    atrito misturado do que Vênus-Marte, daí o boost menor
//  - MC/IC com Sol/Lua/Vênus/Marte/Mercúrio: MC é "quero te mostrar ao mundo" (visibilidade
//    pública do vínculo); IC é intimidade doméstica profunda
//  - Descendente com Sol/Lua/Vênus/Marte/Mercúrio: o ângulo de parceria por excelência (7ª casa) —
//    antes tratado como "sempre redundante com o Ascendente do outro" e por isso nunca
//    normalizado/boostado; mas alguns relatórios reportam o Descendente explicitamente
//    como ponto próprio, então agora ele é reconhecido e pesado (um degrau abaixo do
//    Ascendente, no mesmo nível de MC/IC, por ser mais sobre o papel de parceria de longo
//    prazo do que reconhecimento físico instantâneo).
export const AXIS_BOOST = new Map([
  ['Moon-Sun', 1.35],
  ['Mars-Venus', 1.35],
  // Marte-Marte e Vênus-Vênus (auditoria de coesão): ATTRACTION_PAIRS chama o núcleo
  // Marte-Vênus/Marte-Marte/Vênus-Vênus de "desejo/puxão físico clássico" — Marte-Vênus
  // já tinha 1.35, mas os dois pares mútuos (compatibilidade de libido/iniciativa entre
  // si, e de afeto/valores estéticos entre si) ficavam no genérico 1.0. Mesmo tier —
  // fazem parte do mesmo núcleo citado no comentário original do Set.
  ['Mars-Mars', 1.35],
  ['Venus-Venus', 1.35],
  ['Moon-Moon', 1.35],
  // Sol-Sol (auditoria de coesão): todo outro planeta pessoal clássico já tinha seu
  // auto-par nesse tier — Moon-Moon, Mercury-Mercury, Venus-Venus, Mars-Mars, e
  // Saturn-Saturn (este último adicionado explicitamente por auditoria anterior, com o
  // mesmo raciocínio) — mas Sol-Sol não tinha entrada nenhuma, caindo no peso genérico
  // 1.0. Reconhecimento mútuo de identidade/propósito é um dos marcadores de sinastria
  // mais citados na tradição; não há base pra tratá-lo como mais fraco que os outros
  // quatro pessoais já cobertos aqui. (Classificação em categoria de conteúdo e em
  // LUMINARY_STRUCTURE_PAIRS/eixo Estrutura fica pendente pra quando revisarmos as
  // Partes 3/4 — Categorias e Eixos.)
  ['Sun-Sun', 1.35],
  ['Ascendant-Sun', 1.35],
  ['Ascendant-Moon', 1.35],
  ['Ascendant-Venus', 1.35],
  ['Ascendant-Mars', 1.35],
  ['Mercury-Mercury', 1.35],
  ['Mercury-Sun', 1.35],
  ['Mercury-Moon', 1.35],
  ['Ascendant-Mercury', 1.35],
  ['Saturn-Sun', 1.35],
  ['Moon-Saturn', 1.35],
  ['Saturn-Venus', 1.35],
  ['Mars-Saturn', 1.35],
  // Mercúrio-Saturno (auditoria de coesão): saturnCommitmentContacts já conta esse
  // contato como marcador de compromisso (usa CORE_PERSONAL_PLANETS, que inclui
  // Mercúrio), mas faltava aqui — caía no peso genérico 1.0 enquanto Sol/Lua/Vênus/
  // Marte-Saturno já tinham 1.35. Mesmo tier, fechando a família.
  ['Mercury-Saturn', 1.35],

  // Saturno tocando um dos quatro ângulos: mesmo tier 1 do resto da família Saturno-
  // pessoal acima, não o tier 3 (1.20) que MC/IC/DSC recebem tocando Sol/Lua/Vênus/
  // Marte. Motivo: Saturno aqui não é "ângulo + planeta secundário" — é Saturno (já
  // tier 1 sozinho) tocando o próprio território estrutural do vínculo (Ascendente =
  // primeiro contato, Descendente = o ângulo da parceria em si). Segue o mesmo
  // precedente já aplicado a Nodo-ângulo e Vértice-ângulo logo abaixo, que também
  // subiram pro tier do respectivo pessoal em vez de ficar no tier 3 genérico.
  // Antes dessa entrada, Saturno-ângulo nem caía no tier 3 — ficava sem entrada
  // nenhuma no mapa, herdando o peso genérico 1.0.
  ['Ascendant-Saturn', 1.35],
  ['MC-Saturn', 1.35],
  ['IC-Saturn', 1.35],
  ['DSC-Saturn', 1.35],
  // Saturno-Saturno mútuo (auditoria de coesão): Saturno-pessoal já é tier 1 acima ("o
  // quarto eixo clássico"), mas o contato mútuo — os dois Saturnos em conjunção/aspecto
  // entre si — ficava sem entrada nenhuma, caindo no peso genérico 1.0. É um dos
  // marcadores mais citados na literatura séria como indicador de relação que dura
  // (mesmo território de compromisso/estrutura que Saturno-pessoal, só que recíproco).
  // Mesmo tier — não há base pra tratar como mais fraco que Saturno tocando um pessoal.
  ['Saturn-Saturn', 1.35],

  ['Node-Sun', 1.30],
  ['Moon-Node', 1.30],
  ['Node-Venus', 1.30],
  ['Mars-Node', 1.30],
  ['Node-Node', 1.30],
  // Mercúrio-Nodo (auditoria de coesão): mesmo caso do Mercúrio-Saturno acima —
  // nodeDestinyContacts já conta via CORE_PERSONAL_PLANETS, faltava o peso aqui.
  ['Mercury-Node', 1.30],

  // Nodo Sul tocando um pessoal ou a si mesmo: mesmo tier de peso do Nodo Norte —
  // a literatura de sinastria kármica não trata o Nodo Sul como um sinal mais fraco,
  // só qualitativamente diferente (retrospectivo/familiar em vez de direcional/evolutivo).
  // O AXIS_BOOST mede intensidade do sinal, não sua natureza, e nisso Nodo Sul não é
  // menos "fatídico" que Nodo Norte — só aponta pra outro lugar (retrospectivo/familiar).
  ['SouthNode-Sun', 1.30],
  ['Moon-SouthNode', 1.30],
  ['SouthNode-Venus', 1.30],
  ['Mars-SouthNode', 1.30],
  ['SouthNode-SouthNode', 1.30],
  // Mercúrio-Nodo Sul: mesma lacuna, lado Sul (ver comentário no Mercúrio-Nodo acima).
  ['Mercury-SouthNode', 1.30],

  // Nodo Norte de A com Nodo Sul de B ("cruzado"): collapseNodeMirrors já trata isso
  // como um contato genuinamente distinto do par alinhado (Node-Node/SouthNode-SouthNode),
  // não um eco redundante. A literatura descreve essa configuração como complementar —
  // o Nodo Sul de um lado é literalmente o território que o Nodo Norte do outro está
  // buscando, o que a torna tão significativa quanto o par alinhado (algumas fontes
  // tratam como a mais cooperativa/harmoniosa das combinações nodais, não uma mais fraca).
  // Mesmo tier 1.30, sem base na literatura pra diferenciar pra cima ou pra baixo.
  ['Node-SouthNode', 1.30],

  // Nodo tocando um dos quatro ângulos: mesmo tier 1.30 do resto da família Nodo
  // (auditoria: Nodo-Ascendente/MC não tinham entrada nenhuma — caíam no peso genérico
  // 1.0. IC/DSC completam a cobertura dos quatro ângulos, junto com a mudança em
  // anchorHitsPersonal que agora reconhece IC/DSC como ângulo válido pro eixo Destino).
  // Vértice-ângulo NÃO fica mais nesse tier — ver correção de auditoria #6 logo abaixo,
  // no bloco onde o resto da família Vértice foi rebaixada.
  ['Ascendant-Node', 1.30],
  ['MC-Node', 1.30],
  ['IC-Node', 1.30],
  ['DSC-Node', 1.30],

  // Mesma lacuna do Nodo Norte, só que do lado Sul: SouthNode já tinha tier 1.30 com
  // Sol/Lua/Vênus/Marte (ver comentário acima), mas nenhuma entrada com os quatro
  // ângulos — caía no genérico 1.0. Pelo mesmo princípio já registrado ali (Nodo Sul não
  // é sinal mais fraco que Nodo Norte, só aponta pra outro lugar), fecha aqui com o
  // mesmo tier.
  ['Ascendant-SouthNode', 1.30],
  ['MC-SouthNode', 1.30],
  ['IC-SouthNode', 1.30],
  ['DSC-SouthNode', 1.30],

  ['Sun-Venus', 1.20],
  ['Moon-Venus', 1.20],
  ['Mars-Sun', 1.20],
  ['Mars-Moon', 1.20],
  ['MC-Sun', 1.20],
  ['MC-Moon', 1.20],
  ['MC-Venus', 1.20],
  ['MC-Mars', 1.20],
  ['IC-Sun', 1.20],
  ['IC-Moon', 1.20],
  ['IC-Venus', 1.20],
  ['IC-Mars', 1.20],
  // DSC-Sol/Lua/Vênus/Marte saíram do valor fixo aqui — ver
  // DSC_ASC_SYMMETRIC_TIER/DSC_ASC_INTERMEDIATE_TIER e a lógica em axisBoost() logo
  // abaixo (auditoria de simetria Asc/Desc).

  // Correção de auditoria #6 (calibrado com o usuário, revisão Vértice vs. Nodo): até
  // aqui, TODA a família Vértice (pessoal, ângulo, Vértice-Vértice, Nodo-Vértice)
  // dividia o mesmo tier 1.30 do Nodo — decisão revertida por não ter o mesmo lastro.
  // Nodo (eixo lunar) tem uso consolidado na sinastria cármica moderna, com leitura
  // relativamente estável entre escolas ("direção evolutiva/kármica"). Vértice é um
  // ponto puramente geométrico (interseção da eclíptica com o vertical principal),
  // sem consenso de uso — muitos astrólogos sérios nem trabalham com ele, e entre os
  // que trabalham as leituras variam bastante ("encontro fatídico", "onde cedemos
  // controle", "eixo de rendição"). Também é MUITO mais sensível a erro de horário de
  // nascimento que o Nodo (que se move devagar e independe da hora) — um orbe apertado
  // no Vértice carrega uma incerteza embutida que o mesmo orbe em Nodo/Lua não carrega.
  // Rebaixado pro mesmo tier de Quíron/Lilith (1.10, ver bloco logo abaixo) — mesmo
  // raciocínio já usado ali: sinal narrativo real (continua rastreado em
  // vertexFatedContacts), mas ponto moderno/disputado, não equivalente a um eixo
  // cármico de leitura consensual como o Nodo.
  ['Moon-Vertex', 1.10],
  ['Sun-Vertex', 1.10],
  ['Venus-Vertex', 1.10],
  ['Mars-Vertex', 1.10],
  ['Mercury-Vertex', 1.10],
  ['Ascendant-Vertex', 1.10],
  ['MC-Vertex', 1.10],
  ['IC-Vertex', 1.10],
  ['DSC-Vertex', 1.10],
  ['Vertex-Vertex', 1.10],
  // Nodo (Norte ou Sul) tocando Vértice do parceiro: par misto — um lado carrega o tier
  // do Nodo (1.30), o outro o tier rebaixado do Vértice (1.10). Mesmo critério já usado
  // em Chiron-Node/Chiron-SouthNode logo abaixo (ponto-com-ponto, tiers vizinhos
  // diferentes → média exata dos dois, 1.20), em vez de herdar o tier mais alto dos dois
  // lados só porque um deles é o Nodo.
  ['Node-Vertex', 1.20],
  ['SouthNode-Vertex', 1.20],


  // Quíron (ferida/cura) e Lilith (magnetismo/sombra) tocando um pessoal: revisão —
  // estavam no MESMO tier de MC/IC/DSC (1.20), decisão de calibração revertida por não
  // ter base unânime na literatura. MC/IC/DSC são ângulos estruturais (parte da
  // geometria do mapa, presentes em toda escola tradicional); Quíron é um centauro
  // (descoberto em 1977, sem uso na astrologia helenística/tradicional) e Lilith é um
  // ponto com pelo menos três definições concorrentes (média/osculante/asteroide) que
  // várias escolas nem usam. Tratá-los como equivalentes a um ângulo cardeal é uma
  // aposta interpretativa moderna, não um consenso — ambos continuam rastreados como
  // marcadores narrativos fortes (chironWoundContacts, lilithMagneticContacts), só que
  // um tier abaixo (1.10) dos quatro ângulos, não mais no mesmo nível.
  ['Chiron-Sun', 1.10],
  ['Chiron-Moon', 1.10],
  ['Chiron-Venus', 1.10],
  ['Chiron-Mars', 1.10],
  // Mercúrio-Quíron (auditoria de coesão): chironWoundContacts já conta via
  // CORE_PERSONAL_PLANETS, faltava o peso equivalente aqui — mesmo tier do resto da
  // família de Quíron (1.10, ver comentário acima).
  ['Chiron-Mercury', 1.10],
  // Nodo Norte/Sul tocando Quíron (calibrado com o usuário, auditoria de aspectos
  // menores): até aqui esse par não tinha NENHUMA entrada aqui, caindo no genérico 1.0
  // mesmo em orbe praticamente exato — apesar de ser um cruzamento clássico de sinastria
  // kármica (eixo do destino encontrando o eixo da ferida/dom que se ensina ao parceiro).
  // Não é nem Nodo-pessoal (tier 2, 1.30 — eixo de destino tocando planeta pessoal
  // diretamente) nem Quíron-pessoal (tier 3, 1.10 — ponto moderno tocando pessoal): é
  // ponto-com-ponto, nenhum dos dois pessoal. 1.20 é a média exata dos dois tiers
  // vizinhos (1.30+1.10)/2, e não por coincidência já é o tier 3 padrão usado por
  // MC/IC/DSC-pessoal e transpessoal-Vênus/Marte/Sol/Lua/Mercúrio — em vez de inventar
  // um degrau novo de item único, o par cai num degrau que já existe e já tem lastro
  // interpretativo. Nodo Sul entra junto, mesmo tier do Nodo Norte, pelo mesmo raciocínio
  // já aplicado no resto da família Nodo Sul (ver comentário em SouthNode-Sun acima:
  // "não é menos fatídico, só aponta pra outro lugar").
  ['Chiron-Node', 1.20],
  ['Chiron-SouthNode', 1.20],
  // Marte/Vênus tocados por transpessoal (auditoria de coesão): estão em ATTRACTION_PAIRS
  // desde a fusão dos pools originais ("mesma família de magnetismo/idealização/faísca
  // elétrica" — ver comentário do Set). Netuno/Urano/Plutão tocando Marte/Vênus
  // diretamente ficam no tier 3 padrão (1.20, mesmo de MC/IC/DSC) — são planetas
  // transpessoais "de corpo inteiro", não pontos derivados/discutidos como Quíron/Lilith,
  // então não entram na revisão acima.
  ['Mars-Neptune', 1.20],
  ['Mars-Uranus', 1.20],
  ['Mars-Pluto', 1.20],
  ['Neptune-Venus', 1.20],
  ['Uranus-Venus', 1.20],
  ['Pluto-Venus', 1.20],
  ['Lilith-Sun', 1.10],
  ['Lilith-Moon', 1.10],
  ['Lilith-Venus', 1.10],
  ['Lilith-Mars', 1.10],
  // Mercúrio-Lilith: mesma lacuna — lilithMagneticContacts já conta via
  // CORE_PERSONAL_PLANETS, faltava o peso equivalente aqui (tier 1.10, ver acima).
  ['Lilith-Mercury', 1.10],

  // Mercúrio com Vênus/Marte (como cada um verbaliza afeto/desejo): mesmo tier 3 do
  // MC/IC/Quíron/Lilith acima — sinal real, mas um degrau abaixo do eixo central de
  // atração (Vênus-Marte). Mercúrio-Mercúrio e Mercúrio com Sol/Lua/Ascendente já
  // subiram pra tier 1 acima (ver comentário no topo do AXIS_BOOST); MC/IC/DSC-Mercúrio
  // completam aqui a mesma cobertura que MC/IC/DSC já têm com Sol/Lua/Vênus/Marte.
  ['Mars-Mercury', 1.20],
  ['Mercury-Venus', 1.20],
  ['MC-Mercury', 1.20],
  ['IC-Mercury', 1.20],
  // DSC-Mercúrio: mesmo caso do DSC-Sol/Lua/Vênus/Marte acima — ver axisBoost().
  // Mercúrio tocado por transpessoal (auditoria de coesão): Mercury-Uranus, Mercury-
  // Neptune e Mercury-Pluto estão em INTELECTUAL_PAIRS com comentário próprio ("mente
  // esticada por um transpessoal") — mesmo território de intensificação mental que
  // justifica o tier 3 de Mercúrio-Vênus/Marte acima, mas ficavam no genérico 1.0.
  ['Mercury-Uranus', 1.20],
  ['Mercury-Neptune', 1.20],
  ['Mercury-Pluto', 1.20],

  // Júpiter tocando um pessoal: o "calor"/generosidade/facilidade que Júpiter traz pro
  // vínculo — tradicionalmente citado, mas mais como reforço de clima do que como eixo
  // decisivo por si só, daí o mesmo tier 3. Júpiter-Júpiter (otimismo/visão de mundo em
  // comum) entra no mesmo peso.
  ['Jupiter-Sun', 1.20],
  ['Jupiter-Moon', 1.20],
  ['Jupiter-Venus', 1.20],
  ['Jupiter-Mars', 1.20],
  // Júpiter-Mercúrio (auditoria de coesão): está em INTELECTUAL_PAIRS, e todo outro par
  // de Júpiter com pessoal/Ascendente/ele mesmo já tem 1.20 — só Mercúrio ficava de fora,
  // no genérico 1.0, sem razão pra ser tratado diferente do resto da família de Júpiter.
  ['Jupiter-Mercury', 1.20],
  ['Jupiter-Jupiter', 1.20],
  // Júpiter tocando um dos quatro ângulos (auditoria de coesão, fechando a lacuna
  // apontada pelo usuário): Ascendant-Jupiter já tinha 1.20, mas MC/IC/DSC-Jupiter não
  // tinham entrada nenhuma, caindo no genérico 1.0 — mesmo padrão de lacuna que
  // Saturno/Nodo/Vértice já tiveram corrigido antes (ver comentário em
  // Ascendant-Saturn/MC-Saturn/IC-Saturn/DSC-Saturn acima). DSC-Jupiter em
  // conjunção/oposição/quadratura já herda o 1.20 via axisBoost() (simetria Asc/Desc);
  // aqui fechamos MC e IC, que não têm esse atalho.
  ['MC-Jupiter', 1.20],
  ['IC-Jupiter', 1.20],
  ['Ascendant-Jupiter', 1.20],

  // Ascendente-Ascendente e Fortuna tocando pessoal: entraram na categoria Afinidade,
  // mas são casos deliberadamente mais soltos que Júpiter — Ascendente-Ascendente é uma
  // leitura menos unânime na literatura (nem toda fonte trata como "facilidade
  // instantânea", algumas leem mais como semelhança de maneira/estilo), e Fortuna é
  // ponto derivado (Asc+Lua-Sol), não um corpo real — peso baixo pra não deixar 1
  // contato dominar sozinho uma barra que pode ter poucos marcadores (o antigo
  // CALIBRATION.fortuneKarmaWeight documentava essa mesma cautela pro vinculoProfile v1;
  // removido na migração pra v2, mas o cuidado com Fortuna continua valendo aqui).
  // Abaixo do peso genérico (1.0) de propósito.
  ['Ascendant-Ascendant', 0.6],
  // Descendente-Descendente (auditoria de simetria Asc/Desc): mesmo raciocínio do
  // Ascendente-Ascendente acima — leitura ainda menos unânime na literatura que
  // Asc-Asc (é sobre "buscamos o mesmo tipo de parceiro", não semelhança direta de
  // personalidade) — não havia entrada nenhuma aqui, então caía no genérico 1.0,
  // MAIOR que o 0.6 do Asc-Asc sem nenhuma razão astrológica pra isso. Corrigido pra
  // igualar o mesmo peso reduzido.
  ['DSC-DSC', 0.6],
  ['Fortune-Sun', 0.6],
  ['Fortune-Moon', 0.6],
  ['Fortune-Mercury', 0.6],
  ['Fortune-Venus', 0.6],
  ['Fortune-Mars', 0.6],
  // Parte do Espírito tocando pessoal: mesmo estatuto da Fortuna (tríade Asc/Sol/Lua,
  // ponto derivado, não corpo real) — mesmo tier 0.6, sem razão astrológica pra pesar
  // diferente daqui (mesmo critério já usado em core/synastry-weights.js, ver comentário
  // lá em AXIS_BOOST_SYN sobre Fortune/Spirit). Ajuste de paridade: antes caía no
  // genérico 1.0 (peso cheio), inconsistente com o cuidado que a Fortuna já tinha.
  ['Spirit-Sun', 0.6],
  ['Spirit-Moon', 0.6],
  ['Spirit-Mercury', 0.6],
  ['Spirit-Venus', 0.6],
  ['Spirit-Mars', 0.6],

  // Sol tocado por um transpessoal (Netuno/Urano/Plutão): mesmo tier 3 de Quíron/
  // Lilith-Sol logo acima — sinal forte de identidade sendo intensificada/desestabilizada
  // pelo parceiro, que já ganhou marcador narrativo próprio (sunTranspersonalContacts) e
  // categoria (Sexual/Atração, ver ATTRACTION_PAIRS), mas até aqui pesava igual a qualquer aspecto
  // genérico (1.0) na conta geral — inconsistente com o resto do tratamento dado a ele.
  ['Neptune-Sun', 1.20],
  ['Sun-Uranus', 1.20],
  ['Pluto-Sun', 1.20],
  // Lua tocada por transpessoal (auditoria de coesão): Moon-Neptune, Moon-Pluto e
  // Moon-Uranus já estão em EMOCIONAL_PAIRS com comentário próprio ("fusão empática",
  // "apego psicológico profundo", "imprevisibilidade emocional") — sinal narrativo forte
  // igual ao que o Sol recebe tocado pelos mesmos três transpessoais logo acima, mas
  // ficavam sem o peso equivalente aqui, caindo no genérico 1.0. Mesmo tier 3 do trio
  // solar.
  ['Moon-Neptune', 1.20],
  ['Moon-Pluto', 1.20],
  ['Moon-Uranus', 1.20],
  // Ascendente-Netuno: mesmo tier 3 dos outros contatos pessoais de Netuno acima —
  // antes ficava em 1.0 (peso genérico) apesar de já ser tratado como ambivalente na
  // fração harmônica (ver TRANSPERSONAL_PLANETS em harmonicFraction). Agora o peso na
  // conta geral reflete a mesma relevância que o resto do tratamento de Netuno já tem.
  // MC/IC-Netuno (auditoria de coesão, mesma lacuna do Júpiter acima): fecha a família
  // dos quatro ângulos — DSC-Netuno já herda o 1.20 via axisBoost() nos aspectos
  // simétricos, faltava só MC e IC.
  ['MC-Neptune', 1.20],
  ['IC-Neptune', 1.20],
  ['Ascendant-Neptune', 1.20],
]);
export const DSC_ASC_INTERMEDIATE_TIER = 1.28;
// Decaimento do peso por grau de orbe, variando por tipo de aspecto. Conjunção e
// oposição são os aspectos "maiores" clássicos — toleram orbe mais largo sem perder
// muita força. Trígono/quadratura ficam no meio. Sextil, quincunx e semisextil são
// aspectos menores/mais sutis: mesmo orbe numérico representa um contato bem mais
// fraco do que representaria numa conjunção. Quanto MENOR o divisor, mais rápido o
// peso cai conforme o orbe aumenta.
export const ORB_DECAY_DIVISOR = {
  Conjunction: 3.0,
  Opposition: 3.0,
  Trine: 2.5,
  Square: 2.5,
  Sextile: 1.8,
  Quincunx: 1.8,
  Semisextile: 1.5,
  Semisquare: 1.5,
  Sesquiquadrate: 1.5,
};
// Teto de orbe por tipo de aspecto (mesmos valores tradicionalmente usados na
// Efeméride Pessoal — ver ASPECTS lá) — aqui não existia teto nenhum antes: o
// decaimento exponencial acima (ORB_DECAY_DIVISOR) nunca chega a zero sozinho, só
// fica pequeno. Este teto define o ponto em que o aspecto deixa de ser considerado.
export const ORB_BASE_MAX = {
  Conjunction: 8, Opposition: 8, Square: 7, Trine: 7, Sextile: 5,
  Quincunx: 3, Semisextile: 2, Semisquare: 2, Sesquiquadrate: 2,
};
// Multiplicador desse teto por tipo de astro/ponto: luminares, planetas pessoais/
// sociais e os ângulos (Ascendant/MC/DSC/IC) mantêm o teto cheio (1.0) — é o mesmo
// critério explicado na análise da sinastria do caso A. Urano/Netuno/Plutão, por
// serem mais lentos e geracionais, ficam um degrau mais apertados (0.75). Quíron,
// Nodo (Node/SouthNode), Vértice e Parte da Fortuna (Fortune) são pontos derivados/
// discutidos — não planetas no sentido clássico — e pedem orbe bem mais estreito
// (0.35). Lilith (apogeu lunar médio) é puramente um ponto matemático, sem massa,
// o mais conservador de todos (0.25). Isso é um teto de EXATIDÃO, separado do
// desconto de PESO que já existe via AXIS_BOOST/ASPECT_CATEGORY_MULT — os dois
// mecanismos continuam coexistindo, um não substitui o outro. Quando os dois lados
// do aspecto têm multiplicadores diferentes, vale o MENOR dos dois (elo mais frágil).
export const ORB_TYPE_MULT = {
  Uranus: 0.75, Neptune: 0.75, Pluto: 0.75,
  // Spirit (Parte do Espírito) ajustado pra paridade com Fortune: mesmo estatuto de
  // ponto derivado (tríade Asc/Sol/Lua, sem massa própria) — antes ficava de fora
  // daqui e caía no teto genérico 1.0 (3x mais largo que o pretendido).
  Chiron: 0.35, Node: 0.35, SouthNode: 0.35, Vertex: 0.35, Fortune: 0.35, Spirit: 0.35,
  Lilith: 0.25,
};
// Correção de auditoria: até aqui, a ÚNICA coisa que diferenciava aspecto maior de menor
// no peso de sinastria (aspectWeight/harmContribution) era a velocidade de decaimento do
// orbe (ORB_DECAY_DIVISOR acima) — não existia nenhum multiplicador de base por
// categoria. Na prática isso deixava um aspecto menor MUITO exato (ex.: semiquadratura a
// 0,13° de orbe) superar um aspecto maior com orbe só moderadamente mais largo (ex.:
// oposição a 0,40°), mesmo os dois tocando o mesmo par bonificado em AXIS_BOOST — o que
// não bate com a tradição astrológica (aspectos ptolomaicos maiores são estruturalmente
// mais decisivos que os menores, não só "mais tolerantes a orbe largo"). O motor de
// trânsito original (impactScore/ASPECTS.w acima) já tinha essa diferenciação embutida
// no peso `w` de cada aspecto (0.15–0.3 pros menores vs 0.45–1.0 pros maiores) — ela só
// nunca foi portada pro motor de sinastria quando ele foi criado como sistema à parte
// (ver comentário no topo do AXIS_BOOST). 0.6 é uma correção moderada, não uma réplica
// exata da escala do motor de trânsito (que chega a diferenças de 5x): o objetivo aqui é
// restaurar a ORDEM (maior > menor no mesmo par/orbe), não afundar os menores a
// irrelevância — eles continuam contando, só que um degrau abaixo por natureza, além do
// que o orbe já penaliza.
export const MINOR_ASPECTS = new Set(['Quincunx', 'Semisextile', 'Semisquare', 'Sesquiquadrate']);
export const ASPECT_CATEGORY_MULT = { major: 1.0, minorBothPersonal: 0.6, minorOnePersonal: 0.45, minorNonPersonal: 0.35, majorNonPersonalUncurated: 0.75 };
// aspecto → seu "espelho" geométrico ao ponto oposto (ver comentário acima)
export const NODE_MIRROR_ASPECT = {
  Conjunction: 'Opposition', Opposition: 'Conjunction',
  Trine: 'Sextile', Sextile: 'Trine',
  Semisextile: 'Quincunx', Quincunx: 'Semisextile',
  Square: 'Square',
  // Semisquare (45°) e Sesquiquadrate (135°) são espelho um do outro pelo mesmo ponto
  // oposto a 180° — mesma lógica geométrica dos outros pares acima. Faltavam aqui (gap
  // encontrado em auditoria: sem essa entrada, NODE_MIRROR_ASPECT[a.aspect] retornava
  // undefined pra esses dois aspectos, então collapseAxisMirrors nunca colapsava seus
  // ecos em nenhum dos três eixos — Nodo Norte/Sul, Ascendente/Descendente, MC/IC —,
  // contando o mesmo contato duas vezes sempre que o relatório listasse os dois lados).
  Semisquare: 'Sesquiquadrate', Sesquiquadrate: 'Semisquare',
};

