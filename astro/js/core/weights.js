// ============================================================================
// core/weights.js
// FONTE ÚNICA dos pesos de sinastria. Antes havia duas cópias: a da Calculadora de
// Sinastria (sinastria/js/calibration.js, nomes em inglês) e uma cópia parcial nos
// Mapas (core/synastry-weights.js). Agora as duas leem daqui:
//   - AXIS_BOOST: peso por PAR de pontos (tiers 1.35 / 1.30 / 1.20 / 1.10 / 0.6)
//   - ORB_DECAY_DIVISOR: decaimento exponencial do peso conforme a orbe abre
//   - ASPECT_CATEGORY_MULT / aspectCategoryMult: maior vs menor, com ou sem planeta pessoal
//   - GENERATIONAL_DISCOUNT: desconto de Urano/Netuno/Plutão entre si (geracional)
//   - RECIPROCITY_BOOST: bônus quando o mesmo par de pontos aparece nos dois sentidos
// Todos os nomes de pontos e aspectos aqui são em INGLÊS (Sun, Moon, Node, Ascendant,
// Trine...). Quem usa nomes em português (Mapas) converte antes de chamar.
// ============================================================================

import { ASPECT_ANGLE_EN, maxOrbFor } from './orbs.js';

// Eixos Ascendente/Descendente: ver axisBoost() abaixo.
export const DSC_ASC_SYMMETRIC_ASPECTS = new Set(['Conjunction', 'Opposition', 'Square']);
export const DSC_PERSONAL_PLANETS = new Set(['Sun', 'Moon', 'Venus', 'Mars', 'Mercury']);
// Sol, Lua, Mercúrio, Vênus e Marte: os "planetas pessoais".
export const CORE_PERSONAL_PLANETS = new Set(['Sun','Moon','Mercury','Venus','Mars']);
// Urano, Netuno e Plutão: transpessoais (geracionais quando entre si).
export const TRANSPERSONAL_PLANETS = new Set(['Uranus','Neptune','Pluto']);

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
// Teto de orbe por tipo de aspecto e multiplicador por tipo de astro/ponto: moram em
// astro/js/core/orbs.js, fonte única compartilhada com os mapas e trânsitos. O
// decaimento exponencial acima (ORB_DECAY_DIVISOR) nunca chega a zero sozinho; é o
// teto de orbe de lá que define o ponto em que o aspecto deixa de ser considerado.
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

// Desconto aplicado quando os DOIS pontos são transpessoais (Urano/Netuno/Plutão): planeta
// lento, qualquer par de idade parecida tem esse aspecto, então ele mede geração e não o
// vínculo entre as duas pessoas.
export const GENERATIONAL_DISCOUNT = 0.3;
// Reciprocidade: o mesmo par de pontos conecta as duas pessoas nos dois sentidos (ex.:
// Vênus de A com Marte de B E Marte de A com Vênus de B). Reforço mútuo clássico.
export const RECIPROCITY_BOOST = 1.15;
// Teto teórico do peso de UM aspecto: orbe exato x maior tier (1.35) x aspecto maior
// (1.0) x reciprocidade. Usado pra normalizar o impacto 0-100 nos Mapas.
export const MAX_ASPECT_WEIGHT = 1.35 * RECIPROCITY_BOOST;

// Chave não direcional de um par de pontos ("Moon-Sun" == "Sun-Moon").
export function pairKey(p1, p2){ return [p1, p2].sort().join('-'); }

export function generationalDiscount(p1, p2){
  return (TRANSPERSONAL_PLANETS.has(p1) && TRANSPERSONAL_PLANETS.has(p2)) ? GENERATIONAL_DISCOUNT : 1.0;
}
export function reciprocityBoost(pairCount){
  return (pairCount || 1) >= 2 ? RECIPROCITY_BOOST : 1.0;
}
export function orbDecay(aspect, orb){
  return Math.exp(-orb / (ORB_DECAY_DIVISOR[aspect] || 2.5));
}

export function axisBoost(planet1, planet2, aspect){
  // Conjunção/oposição/quadratura ao Descendente são geometricamente IDÊNTICAS ao
  // mesmo aspecto formado com o Ascendente (mesmo eixo, 180° opostos). Vale pra QUALQUER
  // planeta ou ponto — por isso, nesses três aspectos, DSC é tratado como Ascendente na
  // consulta ao AXIS_BOOST, herdando o peso que o Ascendente já tiver com aquele ponto.
  if (DSC_ASC_SYMMETRIC_ASPECTS.has(aspect)){
    const p1 = planet1 === 'DSC' ? 'Ascendant' : planet1;
    const p2 = planet2 === 'DSC' ? 'Ascendant' : planet2;
    return AXIS_BOOST.get(pairKey(p1, p2)) || 1.0;
  }
  // Fora desses três aspectos a simetria não existe (um trígono ao Ascendente vira sextil
  // ao Descendente): DSC-pessoal usa o tier intermediário; o resto usa o mapa ou 1.0.
  const isDscPersonal = (planet1 === 'DSC' && DSC_PERSONAL_PLANETS.has(planet2))
    || (planet2 === 'DSC' && DSC_PERSONAL_PLANETS.has(planet1));
  if (isDscPersonal) return DSC_ASC_INTERMEDIATE_TIER;
  return AXIS_BOOST.get(pairKey(planet1, planet2)) || 1.0;
}

// Multiplicador de categoria do aspecto (maior/menor, com desconto composto se menor E sem
// planeta pessoal; desconto mais leve se MAIOR, sem pessoal E sem eixo curado no AXIS_BOOST).
// Histórico das calibrações (auditorias #2, #3 e #5) no comentário de ASPECT_CATEGORY_MULT.
export function aspectCategoryMult(aspectName, planet1, planet2, boost){
  const personalCount = (CORE_PERSONAL_PLANETS.has(planet1) ? 1 : 0) + (CORE_PERSONAL_PLANETS.has(planet2) ? 1 : 0);
  if (!MINOR_ASPECTS.has(aspectName)){
    if (personalCount === 0 && boost === 1.0) return ASPECT_CATEGORY_MULT.majorNonPersonalUncurated;
    return ASPECT_CATEGORY_MULT.major;
  }
  if (personalCount === 2) return ASPECT_CATEGORY_MULT.minorBothPersonal;
  if (personalCount === 1) return ASPECT_CATEGORY_MULT.minorOnePersonal;
  return ASPECT_CATEGORY_MULT.minorNonPersonal;
}

// Peso completo de um aspecto de sinastria (sem a fração harmônica, que depende do
// contexto). pairCount = quantos aspectos existem entre o mesmo par de pontos (1 se não
// houver reciprocidade). Zera acima do teto de orbe do tipo de ponto (orbs.js).
export function aspectWeight(aspect, planet1, planet2, orb, pairCount = 1){
  const orbW = orb <= maxOrbFor(ASPECT_ANGLE_EN[aspect], planet1, planet2) ? orbDecay(aspect, orb) : 0;
  const boost = axisBoost(planet1, planet2, aspect);
  return orbW * boost * aspectCategoryMult(aspect, planet1, planet2, boost)
    * generationalDiscount(planet1, planet2) * reciprocityBoost(pairCount);
}
