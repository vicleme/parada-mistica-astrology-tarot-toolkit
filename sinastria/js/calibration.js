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
  // NITIDEZ: % de aspectos "muito exatos" (orbe menor que strengthTightOrb graus, dentro
  // do pool curado) multiplicado por strengthTightScale e limitado a 100. Vale pra
  // nitidez geral e pra nitidez por lado (harmônico/tenso). Os dois números são "no
  // olho": com 2° e 2.3, a nitidez satura (99 ou 100) em ~40% dos pares aleatórios.
  strengthTightOrb: 2,
  strengthTightScale: 2.3,

  // Nitidez geral abaixo deste valor: classify() devolve cedo "Conexão sutil" (poucos
  // aspectos bem exatos, sem carga concentrada em nenhuma direção).
  minStrengthForReading: 15,

  // Atração (Sexual) precisa passar a maior das outras categorias (Intelectual,
  // Emocional, Prático) por MAIS que este número de pontos de presença pra classify()
  // usar os textos de "caso extremo de Atração".
  extremeAttractionGap: 13,

  // Piso do peso de decisividade na proeminência de uma categoria: vai deste valor
  // (harmonia em 50%, neutra, ou sem dado) até 1.0 (totalmente fácil ou tensa).
  prominenceMinWeight: 0.65,

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

  // Encolhimento (shrinkage) da harmonia por sinal fraco: quando o peso do pool fica
  // abaixo da referência, a harmonia é puxada para 50 em proporção (peso/ref). A
  // referência de cada pool é o 5º percentil do peso na distribuição nula (20 mil pares
  // aleatórios em formato Astro-Seek), ou seja, só ~5% dos pares aleatórios caem abaixo
  // dela. Não foi ajustada com casais reais nem com desfecho de relacionamento.
  shrinkRefWeight: { intelectual: 0.4, emocional: 0.8, sexual: 3.3, pratico: 2.8, afinidade: 0.5, estrutura: 2.6, destino: 0.5 },

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

// AXIS_BOOST, DSC_ASC_INTERMEDIATE_TIER, ORB_DECAY_DIVISOR, MINOR_ASPECTS e
// ASPECT_CATEGORY_MULT moraram aqui até a unificação de pesos: agora vivem em
// astro/js/core/weights.js (fonte única, compartilhada com a coluna de impacto dos
// Mapas). Reexportados daqui pra manter os imports existentes funcionando.
export { AXIS_BOOST, DSC_ASC_INTERMEDIATE_TIER, ORB_DECAY_DIVISOR, MINOR_ASPECTS, ASPECT_CATEGORY_MULT } from '../../astro/js/core/weights.js';
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

