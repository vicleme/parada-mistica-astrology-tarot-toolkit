/**
 * pairs.js — Taxonomia estática do domínio: quais planetas/pares de planetas
 * caem em qual categoria (Intelectual/Emocional/Sexual/...), eixo (Estrutura/
 * Destino) ou marcador de casa. Só dados (Sets/Maps/arrays), nenhuma função de
 * cálculo. Só depende de astro/js/core/weights.js (reexporta as tabelas de peso).
 * Usado por: praticamente todos os módulos de cálculo e renderização (charts.js,
 * comparisons.js, compute.js, dictionary.js, houses.js, parser.js, report.js,
 * scoring.js).
 */

// Semisquare (45°) e Sesquiquadrate (135°) foram adicionados porque vários softwares
// profissionais de sinastria os incluem por padrão — antes caíam em "linha não
// reconhecida" (avisado ao usuário, mas descartado do cálculo). "Square" precisa
// continuar na lista porque a checagem por substring de "Semisquare" já vence "Square"
// (indexOf de "Semisquare" é sempre menor, já que a palavra começa 4 caracteres antes).
export const ASPECT_WORDS = ['Conjunction','Opposition','Trine','Square','Sextile','Quincunx','Semisextile','Semisquare','Sesquiquadrate'];

// Marte e Saturno são os maléficos clássicos: uma conjunção com eles carrega
// fricção/pressão mesmo sendo geometricamente "fácil" — não é um trígono disfarçado.
export const HARD_PLANETS = new Set(['Mars','Saturn']);

// Urano, Netuno e Plutão são transpessoais: intensos e desestabilizadores por
// natureza. Uma conjunção com eles tende a ser ambivalente (nem fácil, nem só tensa).
// (movido para astro/js/core/weights.js, reexportado no fim do arquivo)

// Quíron e Lilith são, na própria simbologia que a literatura de sinastria atribui a
// eles, pontos ambivalentes por natureza — Quíron é "ferida E cura" no mesmo símbolo,
// Lilith é desejo/sombra que magnetiza e desconforta ao mesmo tempo. Uma conjunção com
// qualquer um dos dois intensifica essa dualidade, então não deveria cair no ramo
// puramente harmônico (frac 1.0) só por não ser Marte/Saturno/transpessoal — mesma
// família de tratamento que a conjunção "sozinha" de Saturno logo abaixo (0.5).
export const AMBIVALENT_CONJUNCTION_POINTS = new Set(['Chiron','Lilith']);

// Saturno e Nodo Norte em contato com um pessoal do parceiro não são só "peso extra
// no cálculo" (isso já acontece via HARD_PLANETS e AXIS_BOOST acima) — são também
// marcadores narrativos tradicionais: Saturno como indicador de compromisso/permanência,
// Nodo como indicador de "sensação de destino". Rastreamos os dois à parte, como dado
// estruturado (contagem + descrição de cada contato), pra exibir como marcador visual
// em vez de só embutir numa frase de texto corrido — assim dá pra mostrar, salvar,
// comparar e exportar isso separadamente do resto da leitura.
// Mercúrio entrou aqui (antes só Sol/Lua/Vênus/Marte) — em qualquer classificação
// tradicional de sinastria, Mercúrio É um planeta pessoal. A ausência dele fazia
// Saturno-Mercúrio, Nodo-Mercúrio, Vértice-Mercúrio "sumirem" do eixo Estrutura e da
// categoria Prático (apesar de MC/IC/DSC-Mercúrio já receberem peso extra em outro
// lugar do código — inconsistência corrigida aqui), e também tirava Mercúrio dos
// chips narrativos (saturnCommitmentContacts, nodeDestinyContacts, chironWoundContacts,
// lilithMagneticContacts), que agora passam a reconhecer marcadores clássicos como
// Nodo-Mercúrio ("conversas destinadas") e Lilith-Mercúrio ("fala tabu/provocativa").
// (movido para astro/js/core/weights.js, reexportado no fim do arquivo)

// Vértice é o ponto tradicional de "encontro fatídico" em sinastria — quando ele toca um
// pessoal do parceiro OU um dos ângulos (Ascendente/MC), é lido classicamente como sinal
// de encontro que "parecia destinado a acontecer". Rastreado à parte, no mesmo padrão de
// Saturno/Nodo acima, em vez de só entrar no peso de categoria (que já acontece via
// PLANET_PROFILE) — assim vira um marcador narrativo visível, não só um número diluído.
// Vértice-Vértice mútuo (o "eixo elétrico") também entra aqui: é tradicionalmente tratado
// como sinal de encontro destinado tão forte quanto — ou mais forte que — Vértice tocando
// um pessoal isolado, e sem isso caía como aspecto genérico, sem marcador nenhum.
export const VERTEX_FATED_TARGETS = new Set(['Sun','Moon','Mercury','Venus','Mars','Ascendant','MC','DSC','Vertex']);

// Só contamos um contato como marcador se o orbe for apertado o suficiente pra ser um
// sinal de verdade (não ruído de fundo). Usa o mesmo orbW já calculado por aspecto —
// o valor em si vive em CALIBRATION.significantMarkerOrbWeight.

// --- Eixo Imediato (pegação/faísca) ---
// Existiu como eixo próprio (IMMEDIATE_AXIS_PAIRS), separado da categoria de conteúdo
// Sexual/Intensidade — mas os dois pools compartilhavam quase todo o núcleo de
// marcadores (Vênus-Marte, Lilith, Plutão/Netuno/Urano tocando Vênus/Marte etc.), então
// eram essencialmente o mesmo "clima" medido duas vezes com bordas ligeiramente
// diferentes. Foram fundidos numa categoria só, por união dos dois pools (sem cortar a
// borda de nenhum) — ver ATTRACTION_PAIRS logo abaixo de categoryPoolFor. Dentro dessa
// união, o grupo de Júpiter foi destacado à parte (ver AFFINITY_JUPITER_PAIRS): Júpiter
// tocando pessoal é sobre calor/facilidade/generosidade, não sobre desejo/puxão físico —
// família conceitual diferente do resto do pool, então virou sua própria categoria
// (Afinidade) em vez de diluir a métrica de atração.

// Estrutura: os pontos tradicionalmente ligados a permanência/compromisso (Saturno),
// papel social/doméstico (MC/IC/DSC) e ferida/cura processada ao longo do tempo
// (Quíron) — quando tocam um planeta pessoal do parceiro OU um dos ângulos
// (Ascendente/MC). Quíron entrou aqui (e não no eixo Imediato) porque "ferida e cura" é
// uma dinâmica que se revela e se trabalha com o tempo, não uma faísca de reconhecimento
// instantâneo — mesma família de Saturno.
//
// Nodo e Vértice SAÍRAM daqui — ver DESTINY_ANCHORS logo abaixo. Motivo (validado com a
// literatura): "isso vai durar/tem sustentação" (Estrutura) e "esse encontro tem peso/
// significado" (Destino) são eixos ortogonais. Nodo/Vértice são tratados como "encontro
// fadado", mas isso não promete nem pede duração — Vértice em particular carrega
// conotação de encontro fatídico, às vezes breve e intenso, não de permanência. Quíron é
// diferente: a cura que ele descreve É processual por natureza (funciona através do
// tempo), o que o mantém genuinamente na família de Saturno, mesmo sendo "kármico" num
// sentido distinto (ferida de origem, não destino do encontro).
export const STRUCTURE_ANCHORS = new Set(['Saturn', 'MC', 'IC', 'DSC', 'Chiron']);

// Destino (antes "Kármico"): Nodo (Norte/Sul) e Vértice tocando um planeta pessoal do
// parceiro OU um dos ângulos, ou entre si (Nodo-Nodo, Vértice-Vértice, Nodo-Vértice) —
// o eixo de "esse encontro tem peso/significado", independente de o vínculo durar. Ver
// comentário em STRUCTURE_ANCHORS acima pra justificativa completa da separação.
// Diferente de Estrutura, aqui harmônico e tenso contam OS DOIS igual — o que importa
// pra este eixo é a presença do marcador (o encontro TEM peso), não se ele flui ou
// atrita, então não filtramos por harmonicFraction como faríamos pra "isso é bom sinal".
export const DESTINY_ANCHORS = new Set(['Node', 'SouthNode', 'Vertex']);

// Sol-Lua, Lua-Lua e Sol-Sol: apesar de serem sentidos rapidamente (reconhecimento
// instintivo, quase pré-verbal), a tradição de sinastria trata o que esses contatos
// REPRESENTAM como algo estrutural — sustentação emocional e compatibilidade de longo
// prazo (Lua) ou reconhecimento mútuo de propósito/direção de vida (Sol) —, não como
// faísca/magnetismo (isso é domínio de Vênus-Marte). A velocidade da percepção não é o
// mesmo que a natureza do que ela indica, então os três entram 100% no eixo Estrutura,
// na mesma família de Saturno, e saem do eixo Imediato.
// Sol-Sol foi adicionado depois (auditoria pendente da Parte 2 — ver AXIS_BOOST): já
// tinha peso de auto-par tier 1 (1.35), mas sem entrada aqui axisPoolFor retornava null
// pra esse par, deixando-o fora tanto de structureHarmonyPct quanto de
// destinyHarmonyPct — invisível pro eixo que mais pesa no veredito final.
export const LUMINARY_STRUCTURE_PAIRS = new Set(['Moon-Sun', 'Moon-Moon', 'Sun-Sun']);

// Mercúrio-Mercúrio: compatibilidade de raciocínio/comunicação — a base racional que
// sustenta entendimento mútuo ao longo do tempo, não uma faísca física. Mesma lógica de
// Sol-Lua/Lua-Lua acima (o que o contato REPRESENTA importa mais que a velocidade com
// que é sentido): entra 100% no eixo Estrutura.
export const MENTAL_STRUCTURE_PAIRS = new Set(['Mercury-Mercury']);

// --- Redesign das categorias (Intelectual/Emocional/Atração/Afinidade/Prático) ---
// Substitui o antigo modelo "pizza" (PLANET_PROFILE, todo aspecto rateado entre as 4
// categorias, sempre somando 100%) por um modelo de checklist: cada par de pontos SÓ
// conta pra uma categoria se for um marcador clássico específico daquela área — o
// mesmo padrão já usado em STRUCTURE_ANCHORS/DESTINY_ANCHORS acima (validado como o
// modelo correto na conversa que motivou este refactor). Um aspecto que não é marcador
// de nenhuma categoria de conteúdo mas É reconhecido pelo eixo Estrutura/Destino
// (axisPoolFor) continua contribuindo pro harmonyPct geral — mas um aspecto que não é
// marcador de NENHUM dos dois (nem categoryPoolFor nem axisPoolFor o reconhece) fica de
// fora do harmonyPct geral também, não só das categorias. Decisão pós-discussão: a
// Harmonia geral quer ser "visão panorâmica, mais ampla que qualquer eixo isolado", não
// "todo aspecto que apareceu no relatório colado" — sem essa curadoria mínima, ruído
// sem peso astrológico reconhecido (pares sem nenhum significado tradicional atribuído
// aqui) diluía a leitura na direção de 50%, mascarando exatamente o sinal que os eixos
// abaixo captam. Ver o filtro `isSignificantForHarmony` em computeScores.
// Lista aprovada:
export const INTELECTUAL_PAIRS = new Set([
  'Mercury-Mercury', 'Mercury-Sun', 'Mercury-Moon', 'Ascendant-Mercury',
  'Jupiter-Mercury', 'Mercury-Uranus',
  // Mercúrio-Netuno: entendimento não-verbal, imaginação compartilhada — mas também
  // o clássico risco de mal-entendido crônico ("um fala, o outro ouve outra coisa").
  // Mesma família de Mercúrio-Urano (mente esticada por um transpessoal), mas aqui a
  // "esticada" é rumo à névoa/inspiração em vez da originalidade elétrica.
  'Mercury-Neptune',
  // Mercúrio-Plutão: fala penetrante, obsessão com as ideias/palavras do outro,
  // conversas que vão fundo demais pra serem neutras. Mesma família de intensidade
  // mental que Plutão traz em qualquer contato pessoal que toca.
  'Mercury-Pluto',
]);
export const EMOCIONAL_PAIRS = new Set([
  // Quíron entra aqui (não em Prático) — "ferida e cura" é uma dinâmica emocional que
  // se revela com o tempo, mas o conteúdo em si é emocional, não de compromisso.
  'Moon-Moon', 'Moon-Sun', 'Moon-Venus', 'Ascendant-Moon', 'Chiron-Moon',
  // Lua-Netuno: fusão empática, sentir o que o outro sente antes de ele dizer —
  // o marcador clássico de "sensação de alma gêmea" ou de idealização emocional do
  // outro, dependendo do resto do mapa. Entra aqui (não em Sexual) porque é o
  // território emocional/Lua que está sendo ativado, não o de desejo.
  'Moon-Neptune',
  // Lua-Plutão: intensidade e possessividade emocional, vínculo que vicia — um dos
  // aspectos mais citados em sinastria pra apego psicológico profundo. Mesma lógica:
  // é a Lua (emocional) sendo intensificada, não o eixo de atração física.
  'Moon-Pluto',
  // Lua-Urano: imprevisibilidade nos sentimentos, necessidade de espaço/liberdade
  // emocional — desestabiliza rotina afetiva em vez de sustentá-la.
  'Moon-Uranus',
  // Lua-Marte: mesma dualidade estrutural de Lua-Vênus/Ascendente-Lua (ver
  // DUAL_CATEGORY_PAIRS abaixo de categoryPoolFor) — reação emocional instintiva ao
  // impulso/desejo do parceiro. O CONTEÚDO é território de Lua (Emocional); a
  // velocidade/reconhecimento imediato do "puxão" já é coberta em ATTRACTION_PAIRS.
  // Contam cheio nas duas categorias via DUAL_CATEGORY_PAIRS, não só aqui.
  'Mars-Moon',
]);
// Atração (antes duas coisas separadas: eixo Química/Imediato + categoria Sexual/
// Intensidade) — união dos dois pools originais, sem cortar a borda de nenhum, MENOS o
// grupo de Júpiter (que virou a categoria Afinidade própria, ver AFFINITY_JUPITER_PAIRS
// abaixo — Júpiter é sobre calor/facilidade, não sobre desejo/puxão, família conceitual
// diferente do resto deste pool).
export const ATTRACTION_PAIRS = new Set([
  // núcleo compartilhado pelos dois pools originais — desejo/puxão físico clássico
  'Mars-Venus', 'Mars-Mars', 'Venus-Venus', 'Ascendant-Mars', 'Ascendant-Venus',
  'Lilith-Mars', 'Lilith-Venus', 'Pluto-Venus', 'Mars-Pluto',
  'Mars-Neptune', 'Neptune-Venus', 'Mars-Uranus', 'Uranus-Venus',
  'Ascendant-Neptune',
  // vinham só do antigo eixo Imediato — reconhecimento/faísca rápida que Vênus/Marte
  // sozinhos não cobriam: Ascendente-Sol/Lua (primeira impressão), Sol/Lua tocando
  // Vênus/Marte, Mercúrio com Vênus/Marte (flerte, o "papo" que já sinaliza química).
  // 'Moon-Mars' (grafia antiga, fora de ordem alfabética) foi removido daqui — auditoria:
  // categoryPoolFor sempre ordena o par alfabeticamente antes de consultar o Set
  // ('Mars-Moon', não 'Moon-Mars'), então essa entrada nunca era alcançada; o par já é
  // tratado corretamente via DUAL_CATEGORY_PAIRS['Mars-Moon'] (que intercepta antes de
  // chegar aqui), então a remoção não muda nenhum comportamento — só limpa código morto.
  'Ascendant-Sun', 'Ascendant-Moon', 'Sun-Venus', 'Moon-Venus', 'Mars-Sun',
  'Mars-Mercury', 'Mercury-Venus',
  // vinham só da antiga categoria Sexual — Sol tocado por transpessoal (Plutão/Netuno/
  // Urano): mesma família de magnetismo/idealização/faísca elétrica que Netuno/Plutão/
  // Urano já trazem tocando Vênus/Marte acima, só que mirando a identidade (Sol) inteira
  // em vez do desejo físico.
  'Pluto-Sun', 'Neptune-Sun', 'Sun-Uranus',
]);

// Afinidade — Júpiter tocando um pessoal do parceiro OU o Ascendente, mais Júpiter-
// Júpiter: a sensação de calor/facilidade/generosidade ("é fácil, é bom estar perto")
// que a tradição lê como algo sentido quase de imediato, mas que não é sobre desejo
// físico — daí ficar fora de Atração. Júpiter-Ascendente entra aqui pela primeira vez
// (não estava em nenhuma lista antes): Júpiter aquecendo a primeira impressão é o
// mesmo território de Júpiter-Sol/Lua/Vênus/Marte, só mirando o Ascendente.
export const AFFINITY_JUPITER_PAIRS = new Set([
  'Jupiter-Sun', 'Jupiter-Moon', 'Jupiter-Venus', 'Jupiter-Mars', 'Jupiter-Jupiter',
  'Ascendant-Jupiter',
]);
// Prático usa "âncoras" (Saturno/Nodo/MC/IC/Vértice) tocando um pessoal do parceiro —
// mesmo padrão do STRUCTURE_ANCHORS/DESTINY_ANCHORS, mas como categoria de conteúdo
// própria — mais os pares mútuos entre âncoras (Saturno-Saturno, Nodo-Nodo, Vértice-
// Vértice). Fica igual: essa categoria não foi afetada pela separação Estrutura/Destino.
export const PRATICO_ANCHORS = new Set(['Saturn', 'Node', 'SouthNode', 'MC', 'IC', 'Vertex']);
// Pares que a tradição lê como tendo DUAS naturezas genuinamente distintas no
// mesmo aspecto — não "poderia encaixar em outra categoria", mas "o aspecto É
// duas coisas ao mesmo tempo". Contam cheio (sem diluir) nas duas categorias, o
// que não reintroduz o problema do antigo modelo "pizza" porque as categorias já
// são pools independentes (não normalizados entre si — ver categoryPresenceScale).
// Reservado só pra esses 3 casos, validados um a um; não generalizar sem
// justificativa própria pra cada novo par (senão as categorias voltam a colidir e
// perdem o valor de serem lentes distintas).
// - Ascendant-Moon/Moon-Venus: vieram do antigo eixo Imediato (ver ATTRACTION_PAIRS)
//   pela velocidade do reconhecimento, mas o CONTEÚDO é território de Lua (Emocional).
// - Mars-Moon: mesma dualidade — reação emocional instintiva ao impulso do parceiro.
export const DUAL_CATEGORY_PAIRS = new Map([
  ['Ascendant-Moon', ['emocional', 'sexual']],
  ['Moon-Venus', ['emocional', 'sexual']],
  ['Mars-Moon', ['emocional', 'sexual']],
]);
// --- Sobreposição de casas → categorias de conteúdo ---
// Mesmo espírito de checklist do categoryPoolFor acima: NÃO é o "pizza" antigo (toda
// casa ratea peso pras 4 categorias, sempre somando 100% — PLANET_PROFILE/HOUSE_PROFILE,
// removidos). Só entra aqui o par planeta+casa que a tradição de sinastria reconhece
// como marcador específico daquela área — o resto da sobreposição de casas continua
// só alimentando o chip "Casas · convergência" (computeHouseConvergence), sem virar
// score de categoria.
//
// Diferença importante em relação aos aspectos: casa não tem orbe, então não dá pra
// aplicar o mesmo decaimento exponencial nem dizer se o contato "flui" ou "atrita" —
// planeta-na-casa é presença/ênfase temática, não harmonia. Por isso o peso de cada
// marcador de casa entra SÓ no cálculo de presence (quanto essa área está ativada no
// vínculo) e não entra no harmoniousW/tenseW que alimenta harmonyPct — ver
// CALIBRATION.houseMarkerWeight e o uso de houseW mais abaixo em computeScores.
export const HOUSE_CATEGORY_MARKERS = new Map([
  // Intelectual: 3ª (comunicação do dia a dia, "conversa que não para") e 9ª (visão de
  // mundo/filosofia compartilhada) são as casas mentais clássicas — Mercúrio ativa
  // ambas; Júpiter na 9ª entra também porque é a casa "dele" por regência tradicional
  // (crenças, ensino, expansão de mundo em comum).
  ['Mercury-3', 'intelectual'], ['Mercury-9', 'intelectual'], ['Jupiter-9', 'intelectual'],
  // Emocional: 4ª é a casa de lar/raiz/família — Lua e Vênus caindo ali são o marcador
  // mais citado de "sensação de lar" num relacionamento (o mesmo tema que motivou essa
  // conversa toda, ver caso C). 12ª entra pela Lua: fusão inconsciente, empatia
  // que passa por baixo da fala — território emocional profundo, não estrutural. Sol-4ª
  // fecha o par com Lua-4ª (ver MARRIAGE_HOUSES abaixo): identidade/vitalidade também
  // reconhecendo "lar" como território comum, não só o lado afetivo que Lua/Vênus já
  // cobrem.
  ['Moon-4', 'emocional'], ['Venus-4', 'emocional'], ['Sun-4', 'emocional'], ['Moon-12', 'emocional'],
  // Sexual: 5ª (paixão/romance/flerte) e 8ª (intimidade/fusão de desejo, mais intensa e
  // menos "leve" que a 5ª) são as duas casas eróticas clássicas — Vênus e Marte são os
  // planetas de desejo/iniciativa que as ativam.
  ['Venus-5', 'sexual'], ['Mars-5', 'sexual'], ['Venus-8', 'sexual'], ['Mars-8', 'sexual'],
  // Prático: 1ª/7ª/10ª entram por Sol/Lua (MARRIAGE_HOUSES) além de Vênus/Marte na 7ª —
  // 1ª é identidade combinada logo de cara ("como o vínculo já nasce"), 7ª é a casa da
  // parceria/casamento por excelência (Vênus/Marte ali somam afeto e iniciativa voltados
  // a união formal, ao lado de Sol/Lua), 10ª é o papel público do par (carreira/reputação
  // em comum). As 4 casas de MARRIAGE_HOUSES (1ª/4ª/7ª/10ª) já tinham marcador narrativo
  // dedicado via commitmentHouseContacts, mas só a 10ª também alimentava a camada solta
  // de categoria — inconsistente com o padrão dual do resto do arquivo (ex.: Júpiter-11ª
  // abaixo tem os dois). Fechando a família aqui: Sol/Lua nas 4 casas agora contam pra
  // presence também, não só pro chip "Casas · estrutura de parceria". 2ª entra pela
  // Vênus: conforto material/de valores compartilhado, a base prática de "dá pra
  // construir uma vida com isso".
  ['Sun-1', 'pratico'], ['Moon-1', 'pratico'],
  ['Venus-7', 'pratico'], ['Mars-7', 'pratico'], ['Sun-7', 'pratico'], ['Moon-7', 'pratico'],
  ['Sun-10', 'pratico'], ['Moon-10', 'pratico'],
  ['Venus-2', 'pratico'],
  // Saturno nos quatro ângulos (auditoria): Saturno já é PRATICO_ANCHOR nos aspectos
  // (categoryPoolFor/PRATICO_ANCHORS) — faltava a mesma cobertura aqui, no lado das
  // casas. Todas as 4 (não só 1/7/10 como Sol/Lua) entram em 'pratico', não 'emocional'
  // como a 4ª faz pra Sol/Lua: o conteúdo de Saturno na 4ª não é "sensação de lar"
  // (isso é Lua/Vênus/Sol), é peso/responsabilidade estrutural na base doméstica —
  // mesmo território prático que Saturno tem em qualquer outro ângulo.
  ['Saturn-1', 'pratico'], ['Saturn-4', 'pratico'], ['Saturn-7', 'pratico'], ['Saturn-10', 'pratico'],
  // Urano-1/Urano-7: pesquisa em fontes de sinastria (Authority Astrology, Astrologify,
  // DXP Net, 12andUs, Illume, entre outras) — "conexão elétrica e não-convencional"/
  // "atração instantânea" na 1ª e "excitação, imprevisibilidade e um senso de
  // libertação" (junto com "desafios de comprometimento") na 7ª, sempre em par com a
  // mesma dualidade que já rendeu 0.50 em HOUSE_PLANET_VALENCE. Entram em 'pratico'
  // por fecharem o mesmo grupo de Sol-1/Lua-1 e Vênus-7/Marte-7/Sol-7/Lua-7/Saturno-7
  // — "como o vínculo já nasce" (1ª) e a casa da parceria formal por excelência (7ª),
  // mesmo território estrutural que os outros planetas já ocupam nessas duas casas.
  ['Uranus-1', 'pratico'], ['Uranus-7', 'pratico'],
  // 11ª é a casa de amigos/grupo/esperanças compartilhadas por excelência — Júpiter
  // (sorte, generosidade, expansão) caindo ali é o marcador clássico de "essa pessoa
  // traz oportunidade/crescimento pro círculo social do outro", tradicionalmente citado
  // em sinastria de amizade (ver também FRIENDSHIP_HOUSES/computeFriendshipHouses
  // abaixo, que trata o mesmo par como marcador narrativo dedicado, no mesmo espírito
  // de Sol/Lua-1ª/4ª/7ª/10ª em MARRIAGE_HOUSES). Entra em Afinidade, não Prático:
  // AFFINITY_JUPITER_PAIRS já define o "território" de Júpiter no sistema como a
  // sensação de calor/facilidade/generosidade que não é sobre desejo físico nem sobre
  // estrutura/compromisso (isso é Saturno-ângulo/Vênus-7ª) — categoryPoolFor já trata
  // Júpiter tocando qualquer pessoal como 'afinidade' sistematicamente, e Jupiter-11
  // segue a mesma regra por consistência.
  ['Jupiter-11', 'afinidade'],
  // Urano-11: mesma pesquisa citada acima em Urano-1/Urano-7 — caso mais forte de
  // regência natural entre as quatro casas mapeadas (Urano rege Aquário, signo natural
  // da 11ª), fontes descrevem como "mais natural" que as outras posições — amizade,
  // causas em comum, "libertação... mas pode parecer detached/impessoal". Entra em
  // 'afinidade', fechando o par com Júpiter-11 logo acima (regência só define
  // categoria/tema aqui, não valência — ver comentário em HOUSE_PLANET_VALENCE).
  ['Uranus-11', 'afinidade'],
  // Vênus-11 (afeto genuíno de grupo) e Lua-11 (pertencimento emocional) entram só
  // aqui, na camada solta — coeso com o padrão do resto do arquivo, que já aceita
  // múltiplos planetas somando a mesma área (ex.: Lua-4ª e Vênus-4ª, ambos em
  // 'emocional'). Não ganham marcador narrativo dedicado (computeFriendshipHouses
  // continua só Júpiter): cada marcador dedicado do arquivo é de UM planeta/tema só
  // (Saturno-compromisso, Nodo-destino, Vértice-encontro fatídico, Júpiter-11-sorte),
  // e misturar Vênus/Lua-11 no mesmo contador de Júpiter diluiria sinais diferentes
  // num número só.
  ['Venus-11', 'emocional'], ['Moon-11', 'emocional'],
  // Família Júpiter/Quíron/Lilith/Plutão/Netuno em casas específicas (auditoria a
  // partir de um caso real testado — ver Jupiter-11 acima, que nasceu do mesmo jeito):
  // cada par abaixo é uma leitura casa-específica já citada na tradição, não uma regra
  // genérica de "planeta X em qualquer casa conta".
  // Júpiter: mesma família de Jupiter-11 (calor/expansão) — 7ª (sorte/expansão na
  // própria parceria) e 1ª (Júpiter eleva a identidade combinada desde o início).
  ['Jupiter-7', 'afinidade'], ['Jupiter-1', 'afinidade'],
  // Urano-5: fontes descrevem "química elétrica"/"sinergia criativa" no romance, mas o
  // tom predominante é "diversão/experimentação" mais que desejo denso — decisão
  // pós-discussão de colocar em 'afinidade' em vez de 'sexual' (onde Vênus-5/Marte-5
  // já estão), por não carregar o mesmo peso erótico que justifica aquele par.
  ['Uranus-5', 'afinidade'],
  // Lilith: pareia com os marcadores sexuais já existentes na 5ª/8ª (Venus-5/Mars-5,
  // Venus-8/Mars-8) — magnetismo/sombra (8ª) e desejo tabu no romance (5ª).
  ['Lilith-8', 'sexual'], ['Lilith-5', 'sexual'],
  // Plutão-8: intensifica o que Vênus/Marte-8 já fazem (fusão profunda) — só Sexual,
  // sem o componente estrutural que só a 7ª carrega (ver Plutão-7 em
  // HOUSE_DUAL_CATEGORY_MARKERS abaixo, tratado à parte por ter duas naturezas).
  ['Pluto-8', 'sexual'],
  // Netuno: 1ª e 7ª são as duas casas de identidade/pessoa inteira (você e "o outro"
  // como figura completa) — mais próximas do padrão Netuno-Sol (idealização mirando a
  // identidade inteira, ATTRACTION_PAIRS) do que de Netuno-Lua (fusão de uma
  // necessidade emocional específica, EMOCIONAL_PAIRS). 7ª: idealização/névoa
  // especificamente na parceria. 1ª: projeção sobre o outro.
  ['Neptune-7', 'sexual'], ['Neptune-1', 'sexual'],
  // Quíron: território de ferida/cura (aspectos: Emocional/Estrutura) — 7ª (ferida/cura
  // revelada especificamente na parceria) e 8ª (ferida ligada a intimidade/
  // vulnerabilidade). Fica em Emocional nas duas, mesmo a 8ª sendo Sexual pra Vênus/
  // Marte: o conteúdo de Quíron ali continua sendo ferida/cura, não desejo.
  ['Chiron-7', 'emocional'], ['Chiron-8', 'emocional'],
]);
// Casas com natureza dupla — mesmo espírito de DUAL_CATEGORY_PAIRS acima (pares que são
// "duas coisas ao mesmo tempo", não uma escolha de qual categoria cabe melhor), agora
// pro lado das casas. Reservado caso a caso, com justificativa própria — não generalizar.
// - Plutão-7: a 7ª já é Prático pra Sol/Lua/Saturno/Vênus/Marte (casa do compromisso
//   formal) — Plutão ali não é só intensidade/desejo (Sexual, como Plutão-8), é também a
//   dinâmica de poder/entrega que estrutura o próprio vínculo, o mesmo território que
//   Saturno-7 já ocupa por outro viés. Conta cheio nas duas, sem diluir.
export const HOUSE_DUAL_CATEGORY_MARKERS = new Map([
  ['Pluto-7', ['sexual', 'pratico']],
]);
// Marcador narrativo de "convergência de casas" — casas hoje só entram diluídas nas 4
// categorias (peso baixo), mas alguns padrões tradicionais merecem destaque à parte, no
// mesmo espírito de Saturno/Nodo/Vértice acima:
//  1) sobreposição RECÍPROCA: o mesmo planeta pessoal de A cai na casa N de B, E o
//     mesmo planeta pessoal de B cai na MESMA casa N de A — reforço mútuo real, não
//     coincidência (ex: Lua de A na 1ª de B + Lua de B na 1ª de A). Vale pra QUALQUER
//     casa, não só as listadas em (2) — reciprocidade já é sinal forte por si só.
//  2) planeta pessoal caindo numa casa temática de destaque do outro, mesmo sem
//     reciprocidade — 1ª/7ª (reconhecimento/parceria, os ângulos clássicos), 5ª
//     (romance/paixão — a casa tradicional de affair e prazer), 8ª (intimidade/fusão —
//     vulnerabilidade e desejo profundo, inclusive financeiro/sexual) e 10ª (papel
//     público do vínculo — como o casal aparece pro mundo, carreira em comum).
// Um mesmo par recíproco conta só como (1) — não duplica como (2) também, mesmo que a
// casa envolvida seja uma das temáticas — pra não inflar o mesmo contato duas vezes na
// lista.
export const THEMATIC_HOUSES = new Set([1, 5, 7, 8, 10]);
// Casas de "estrutura de vida a dois": 1ª (reconhecimento mútuo — "esse é o rosto que
// eu procurava"), 4ª (lar, raiz familiar), 7ª (a casa da parceria/casamento por
// excelência) e 10ª (papel público do par — como o vínculo aparece pro mundo, inclusive
// carreira em comum). São os quatro ângulos, e é isso que os torna estruturais: a
// tradição os lê como os pontos onde a vida prática do vínculo se apoia, diferente das
// casas 5/8 (THEMATIC_HOUSES acima), que são sobre paixão/fusão intensa — reais, mas não
// necessariamente sobre construir uma vida junto. Sol e Lua entram aqui: são os dois
// "luminares" que a tradição trata como a fundação identidade+necessidade emocional de
// qualquer compromisso duradouro — Vênus/Marte (desejo/atração) já têm sua própria
// categoria (Atração, ver ATTRACTION_PAIRS) e não competem aqui pelo mesmo motivo que
// Vênus/Marte ficam de fora de LUMINARY_STRUCTURE_PAIRS.
//
// Saturno entrou aqui (auditoria): antes, Saturno caindo num dos quatro ângulos do
// parceiro — um dos marcadores de casa mais citados em sinastria clássica pra "vínculo
// que pesa/amarra/dura" — não aparecia em NENHUM lugar do sistema (não em
// HOUSE_CATEGORY_MARKERS, não em computeHouseConvergence, que só olha
// CORE_PERSONAL_PLANETS). Mesma família conceitual de Sol/Lua aqui: presença estrutural
// num ângulo, sem leitura tensa/harmônica própria (harmonyPct continua vindo só dos
// aspectos) — só que Saturno soma no MESMO marcador de compromisso em vez de um chip à
// parte, porque é o mesmo fenômeno ("esse ângulo estrutural está ativado"), não um tema
// diferente.
export const MARRIAGE_HOUSES = new Set([1, 4, 7, 10]);
// Casa de amizade/círculo social: a 11ª é a casa tradicional de amigos, grupos e
// esperanças/projetos compartilhados. Só Júpiter entra aqui — é o planeta que a
// tradição mais cita caindo na 11ª do outro (traz sorte, generosidade, incentivo,
// "abre portas" pro círculo social/projetos do parceiro) — mesmo espírito de
// MARRIAGE_HOUSES logo abaixo usar só Sol/Lua em vez de qualquer planeta pessoal.
// Deliberadamente não inclui Vênus/Lua-11ª NESTE marcador dedicado (só na camada
// solta HOUSE_CATEGORY_MARKERS, que já soma Venus-11/Moon-11 em 'emocional'): cada
// um teria sua própria leitura (afeto genuíno / pertencimento emocional no grupo) que
// não é o mesmo fenômeno de "Júpiter traz sorte/expansão" — misturá-los no MESMO
// contador diluiria o sinal em vez de reforçá-lo. Extensível com marcador próprio
// (ex.: venusAffectionHouseContacts) se fizer sentido no futuro.
export const FRIENDSHIP_HOUSES = new Set([11]);
// Quíron na 7ª do parceiro: marcador dedicado, no mesmo espírito de FRIENDSHIP_HOUSES
// acima (planeta único, casa única, tema único) — a leitura mais citada de Quíron em
// casas na sinastria moderna é especificamente a ferida/vulnerabilidade sendo revelada
// NA parceria (diferente do marcador de aspecto chironWoundContacts, que é sobre um
// planeta pessoal do parceiro tocando o Quíron do outro; aqui é a casa 7ª em si que
// carrega o tema). Deliberadamente só a 7ª — Quíron-8ª (ferida ligada a intimidade) fica
// só na presença de categoria via HOUSE_CATEGORY_MARKERS, sem chip próprio, por não ter
// citação tão forte quanto a 7ª especificamente.
export const CHIRON_PARTNERSHIP_HOUSES = new Set([7]);
// Plutão na 7ª do parceiro: mesmo espírito do marcador de Quíron logo acima — planeta
// único, casa única. Não existe hoje nenhum marcador narrativo de Plutão (só entra em
// categoria/peso via aspectos), então este é o primeiro chip dedicado dele. A 7ª é a
// leitura mais citada de Plutão em casas — parceria intensa/transformadora, dinâmica de
// poder — e já é tratada como dupla natureza (Sexual + Prático) na camada de categoria
// via HOUSE_DUAL_CATEGORY_MARKERS. Plutão-8ª (fusão profunda, pareia com Vênus/Marte-8ª)
// fica só na presença de categoria, sem chip próprio.
export const PLUTO_PARTNERSHIP_HOUSES = new Set([7]);
// Casas angulares (1/4/7/10) são tradicionalmente as mais "potentes" numa
// sobreposição de casas; cadentes (3/6/9/12) são as mais fracas/difusas; sucedentes
// (2/5/8/11, o resto) ficam no meio — ver CALIBRATION.houseMarkerWeight* pros três
// pesos correspondentes.
export const ANGULAR_HOUSES = new Set([1,4,7,10]);
export const CADENT_HOUSES = new Set([3,6,9,12]);
// Auditoria de simetria Asc/Desc: conjunção, oposição e quadratura são geometricamente
// forçadas a valer o mesmo dos dois lados do eixo Ascendente-Descendente — se o Marte de
// alguém quadra o Ascendente do parceiro, ele TEM que quadrar o Descendente também, no
// mesmo grau de orbe (são pontos opostos, 90° de um é 90° do outro). Não faz sentido
// tratar isso como "a mesma configuração, mas mais fraca vista pelo lado do Descendente"
// — Ascendente e Descendente são definições complementares da mesma coisa, não uma sendo
// derivada/menor que a outra. Por isso esses três tipos de aspecto usam o mesmo peso do
// Ascendente (DSC_ASC_SYMMETRIC_TIER) quando o par é DSC-pessoal.
//
// Trígono, sextil, quincúncio etc. já NÃO são forçados: um trígono ao Ascendente vira
// sextil ao Descendente (ângulos diferentes, pesos tradicionais diferentes), então aí a
// leitura "ângulo de parceria de longo prazo" (Descendente) genuinamente pode pesar
// diferente da "reconhecimento instantâneo" (Ascendente) sem contradizer a geometria.
// Fica num tier intermediário entre o antigo 1.20 (MC/IC) e o 1.35 do Ascendente.
// (movido para astro/js/core/weights.js, reexportado no fim do arquivo)
// (movido para astro/js/core/weights.js, reexportado no fim do arquivo)

// Fração "harmônica" de um aspecto (0 = tenso, 1 = harmônico). Trígono/sextil
// são sempre harmônicos e quadratura/oposição sempre tensos — mas a conjunção
// é neutra por natureza: ela intensifica os dois planetas envolvidos, então
// sua leitura depende de QUEM está conjunto.
// Marte conjunto a Vênus ou a ele mesmo é um dos eixos de atração/paixão mais citados
// em sinastria (química, desejo, "estar na mesma frequência" de energia/libido) — bem
// diferente da fricção clássica de Marte-Saturno ou Marte-Sol. Tratado à parte, ANTES da
// checagem genérica de HARD_PLANETS, porque senão qualquer conjunção com Marte caía em
// 0.15 (quase puramente tensa) só por Marte estar no conjunto de "maléficos clássicos" —
// o que contraria a própria literatura que o resto do peso (AXIS_BOOST, ver
// ATTRACTION_PAIRS) já reconhece como eixo de atração/química.
//
// Marte-Lua NÃO entra neste grupo: é um contato genuinamente mais dividido, não uma
// variação do mesmo tema de Marte-Vênus/Marte-Marte. A franqueza/impulsividade de Marte
// tende a atritar com a sensibilidade emocional da Lua — a literatura de sinastria cita
// esse contato com frequência como fonte de irritação e mágoa (a pessoa-Lua se sente
// atropelada; a pessoa-Marte acha a Lua reativa demais), mesmo tendo também uma carga
// passional real. Fica com um valor próprio, levemente pendendo pra fricção, em vez de
// ser tratado como o mesmo tipo de química de Marte-Vênus/Marte-Marte.
export const MARS_CHEMISTRY_CONJUNCTION_PARTNERS = new Set(['Venus', 'Mars']);
// Vênus benigno em quadratura/oposição: Vênus com Mercúrio, Sol, Lua ou o próprio Vênus
// é território clássico de afeto/afinidade, mesmo quando o aspecto geométrico é duro —
// a tensão existe (não é harmônico disfarçado), mas tende a ser lida como fricção leve
// de gosto/prioridade (ex: divergência de estilo de afeto, ritmo de expressão) em vez do
// bloqueio ou frustração crônica de Marte-Saturno ou Saturno-pessoal. Fica em 0.25 — mais
// brando que o 0.0 genérico, mas ainda claramente do lado tenso (abaixo da faixa
// ambivalente 0.41–0.59), preservando que é fricção real, só que benigna.
export const VENUS_BENIGN_HARD_PARTNERS = new Set(['Mercury', 'Sun', 'Moon', 'Venus']);
// Mesma ordem usada nas barrinhas "Marcadores por área" (renderCategoryVisuals e
// domBarsHtml) e no select de ordenação da comparação (options cat_*) — um único lugar
// pra manter em sync. Ordem FIXA (não reordena por presence) pra dar pra comparar
// visualmente célula-a-célula entre cards/entradas diferentes: Afeição(sexual) ·
// Compromisso(pratico) · Emocional · Intelectual · Afinidade.
export const CATEGORY_KEYS = ['sexual','pratico','emocional','intelectual','afinidade'];

// Só quadratura usa o rótulo fundido Asc/Desc (ou MC/IC) — é o único dos três
// aspectos "travados ao eixo" que preserva o mesmo nome dos dois lados. Conjunção e
// oposição, depois de normalizadas (aspecto já trocado por normalizeAxisAspect),
// representam sempre a leitura do lado Ascendente/MC — usam o rótulo de ponto único.
export const SYMMETRIC_MERGED_LABEL_ASPECTS = new Set(['Square']);

// Conjuntos compartilhados com o sistema de pesos (fonte única em weights.js).
export { TRANSPERSONAL_PLANETS, CORE_PERSONAL_PLANETS, DSC_ASC_SYMMETRIC_ASPECTS, DSC_PERSONAL_PLANETS } from '../../astro/js/core/weights.js';
