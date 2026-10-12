/**
 * labels.js — Textos em PT-BR: rótulos de planeta/aspecto/signo/categoria, e os
 * textos narrativos que variam por tipo de vínculo (romântico/amizade/família).
 * Depende de compute.js (só de capitalize()) — import circular intencional, ver
 * README.
 * Usado por: charts.js, comparisons.js, compute.js, dictionary.js, houses.js,
 * report.js, scoring.js.
 */

import { capitalize } from './compute.js';

// Emoji único de categoria, pra marcadores binários (presença/ausência, não contagem)
// como o câmbio de luminares — null/undefined = sem dado de grau suficiente pra
// qualificar, fica sem cor (não é "neutro" no sentido de ambivalente, é "não sei").
export const CATEGORY_LABEL_PT = { harmonic: 'Harmônico', ambivalent: 'Ambivalente', tense: 'Tenso', tenseLight: 'Tenso leve' };
export const PLANET_LABEL_PT = {
  Sun:'Sol', Moon:'Lua', Mercury:'Mercúrio', Venus:'Vênus', Mars:'Marte', Jupiter:'Júpiter', Saturn:'Saturno',
  Uranus:'Urano', Neptune:'Netuno', Pluto:'Plutão', Chiron:'Quíron', Lilith:'Lilith',
  Node:'Nodo Norte', SouthNode:'Nodo Sul', Vertex:'Vértice', Ascendant:'Ascendente', MC:'Meio-do-Céu', DSC:'Descendente',
  IC:'Fundo do Céu',
  Fortune:'Parte da Fortuna', Spirit:'Parte do Espírito',
};
export const ASPECT_LABEL_PT = {
  Conjunction:'conjunção', Trine:'trígono', Square:'quadratura', Opposition:'oposição',
  Sextile:'sextil', Quincunx:'quincúncio', Semisextile:'semisextil',
  Semisquare:'semiquadratura', Sesquiquadrate:'sesquiquadratura',
};
export const SIGN_LABEL_PT = {
  Aries:'Áries', Taurus:'Touro', Gemini:'Gêmeos', Cancer:'Câncer', Leo:'Leão', Virgo:'Virgem',
  Libra:'Libra', Scorpio:'Escorpião', Sagittarius:'Sagitário', Capricorn:'Capricórnio',
  Aquarius:'Aquário', Pisces:'Peixes',
};
// Signo oposto na roda do zodíaco (6 casas de distância) — usado por axisMirrorNote
// pra mostrar o signo do outro lado do eixo Ascendente/Descendente ou MC/IC, já que os
// dois pontos de um mesmo eixo estão sempre em signos opostos.
export const OPPOSITE_SIGN = {
  Aries:'Libra', Libra:'Aries', Taurus:'Scorpio', Scorpio:'Taurus',
  Gemini:'Sagittarius', Sagittarius:'Gemini', Cancer:'Capricorn', Capricorn:'Cancer',
  Leo:'Aquarius', Aquarius:'Leo', Virgo:'Pisces', Pisces:'Virgo',
};
// Substantivo pro eixo Química dentro da frase, e os dois "destinos" possíveis pro
// vínculo (duradouro vs leve) — únicos pontos onde o texto varia por relType. Evita
// reproduzir linguagem de "casamento"/"paixão" pra amizade e família, sem precisar de
// um dicionário bespoke por célula da matriz (9 células × 3 tipos ficaria grande demais
// pra manter consistente).
export const VINCULO_CHEM_NOUN_BY_TYPE = {
  romantico: 'a química/paixão',
  amizade:   'o afeto',
  familia:   'a proximidade',
};
export const VINCULO_TERMS_BY_TYPE = {
  romantico: { durable: 'algo sério e duradouro', light: 'manter mais leve, sem prometer o resto' },
  amizade:   { durable: 'uma amizade de longo prazo', light: 'manter no companheirismo leve, sem se cobrar mais que isso' },
  familia:   { durable: 'um vínculo familiar sólido', light: 'manter o contato mais leve, sem forçar mais proximidade' },
};

// 3×3: eixo Estrutura (linha) × eixo Química (coluna). label fica relType-neutro
// (mostrado como badge curto); description é montada com chemNoun/terms acima.
export const VINCULO_MATRIX = {
  tenso: {
    tenso:     { label: 'Vínculo de Crescimento/Lição',
      desc: (chem, t) => `Poucos sinais de base sólida, e ${chem} também não ajuda — o que aparece aqui puxa mais pro lado de crescimento pessoal e lição do que pra ${t.durable}.` },
    misto:     { label: 'Sinal Misto, Pendendo pra Lição',
      desc: (chem, t) => `A base estrutural pende pro lado tenso, e ${chem} nem confirma nem descarta — o que vier daqui tende mais a ensinar do que a sustentar ${t.durable}.` },
    harmonico: { label: 'Intensidade que Ensina',
      desc: (chem, t) => `${capitalize(chem)} aparece forte, mas a base que sustentaria ${t.durable} vem tensa — pode ser intenso e também desgastante; tende a caber melhor ${t.light} do que apostar em algo mais sério.` },
  },
  misto: {
    tenso:     { label: 'Base em Aberto, Pouca Química',
      desc: (chem, t) => `A base ainda não tem uma direção clara, e ${chem} também não ajuda muito aqui — vínculo mais neutro, sem um tema forte puxando pra nenhum lado.` },
    misto:     { label: 'Conexão em Aberto',
      desc: (chem, t) => `Nem a base nem ${chem} têm um sinal forte pra nenhum lado — é cedo pra cravar onde esse vínculo se encaixa; vale observar como evolui com o tempo.` },
    harmonico: { label: 'Química em Alta, Base Ambivalente',
      desc: (chem, t) => `O que puxa aqui é ${chem} — tende a fazer mais sentido ${t.light} por enquanto, já que a base estrutural ainda não confirmou nada mais sólido.` },
  },
  harmonico: {
    tenso:     { label: 'Base Sólida, Pouca Química',
      desc: (chem, t) => `Os marcadores de ${t.durable} são bons, mas ${chem} não acompanha — o tipo de vínculo que sustenta bem no dia a dia sem ser o mais intenso.` },
    misto:     { label: 'Bom Pra Construir',
      desc: (chem, t) => `A base pra ${t.durable} é sólida, e ${chem} nem atrapalha nem é o centro da história — vínculo com chão real debaixo dos pés.` },
    harmonico: { label: 'Bom Pra Construir — Com Química',
      desc: (chem, t) => `Base sólida e ${chem} que acompanha — combinação rara de ${t.durable} com química de verdade junto.` },
  },
};

// Rótulos e textos abaixo variam por tipo de vínculo (romantico/amizade/familia) — é
// só uma camada de texto por cima do MESMO cálculo (PLANET_PROFILE, aspectos, pesos
// etc. não mudam). A ideia: os aspectos medem intensidade/magnetismo entre duas pessoas
// independente da natureza do vínculo, mas "Sexual/Paixão" e um texto sobre "ficada" não
// fazem sentido nenhum quando a sinastria é entre amigos ou parentes — então trocamos só
// o vocabulário, mantendo os números e a estrutura da leitura intactos.
export const REL_TYPE_LABEL_PT = { romantico:'Romântico', amizade:'Amizade', familia:'Família' };

export const PAIR_INFO_BY_TYPE = {
  romantico: {
    'emocional+sexual': {
      title: 'Paixão com Vínculo Afetivo',
      tenseTitle: 'Paixão Intensa e Turbulenta',
      harm: 'afeto e desejo caminham juntos, e a maior parte flui sem muito atrito — combinação clássica de paixão que também acolhe. Tem potencial tanto pra uma ficada gostosa quanto pro início de algo sério, dependendo do que vocês escolherem construir.',
      tense: 'afeto e desejo dominam, mas vêm carregados de tensão — o tipo de química intensa e um pouco instável, que pode ser marcante e também desgastante ao mesmo tempo.'
    },
    'emocional+pratico': {
      title: 'Base Sólida',
      tenseTitle: 'Vínculo com Peso',
      harm: 'tem afeto genuíno e uma estrutura prática consistente — o perfil típico de quem constrói uma relação de longo prazo, mesmo que a faísca sexual não seja o ponto mais forte do mapa.',
      tense: 'afeto e senso de responsabilidade mútua aparecem fortes, mas com bastante fricção — relação com cara de "time" ou de "família", que também gera atrito recorrente.'
    },
    'emocional+intelectual': {
      title: 'Amizade Profunda',
      tenseTitle: 'Cumplicidade com Atrito',
      harm: 'mente e coração conversam muito mais do que o corpo aqui — afinidade genuína, do tipo que gera amizade profunda ou intimidade emocional forte, com pouca faísca romântica no radar.',
      tense: 'há entendimento emocional e mental de verdade, mas com atrito misturado — o tipo de vínculo em que vocês se entendem bem e também discutem bastante.'
    },
    'pratico+sexual': {
      title: 'Atração com Chão',
      tenseTitle: 'Atração Complicada',
      harm: 'desejo físico e senso prático de parceria caminham juntos — uma atração que não é só fogo passageiro, tem estrutura por trás.',
      tense: 'desejo físico forte, mas junto de tensão estrutural — atração que costuma esbarrar em choques de ritmo ou de estilo de vida.'
    },
    'intelectual+sexual': {
      title: 'Química Estimulante',
      tenseTitle: 'Provocação Mútua',
      harm: 'tesão e boas conversas dominam — combinação estimulante tanto na cama quanto fora dela, ótima pra uma ficada ou pro início de um romance.',
      tense: 'desejo e estímulo mental fortes, com boa dose de provocação e atrito — química picante, mas nem sempre tranquila.'
    },
    'intelectual+pratico': {
      title: 'Parceria Funcional',
      tenseTitle: 'Competência com Atrito',
      harm: 'vocês formam um bom time — conversa afiada e senso prático de organização. Tem mais cara de parceria funcional (de projeto, de casa, de vida) do que de romance ardente.',
      tense: 'há competência mútua reconhecida, mas com bastante atrito na hora de decidir e organizar as coisas juntos.'
    },
  },
  amizade: {
    'emocional+sexual': {
      title: 'Amizade Intensa e Presente',
      tenseTitle: 'Amizade Marcante e Turbulenta',
      harm: 'afeto e intensidade caminham juntos, e a maior parte flui sem muito atrito — o tipo de amizade forte, presente, que ocupa espaço de verdade na vida de vocês.',
      tense: 'afeto e intensidade dominam, mas vêm carregados de tensão — uma amizade magnética, cheia de admiração, mas também com atrito e idas e vindas.'
    },
    'emocional+pratico': {
      title: 'Base Sólida',
      tenseTitle: 'Vínculo com Peso',
      harm: 'tem afeto genuíno e uma estrutura prática consistente — o perfil de uma amizade que dura, com espaço real de apoio mútuo de verdade.',
      tense: 'afeto e senso de responsabilidade mútua aparecem fortes, mas com bastante fricção — amizade com cara de "time" ou de "família escolhida", que também gera atrito recorrente.'
    },
    'emocional+intelectual': {
      title: 'Amizade Profunda',
      tenseTitle: 'Cumplicidade com Atrito',
      harm: 'mente e coração conversam muito — afinidade genuína, do tipo que gera intimidade emocional forte e conversas que vão fundo de verdade.',
      tense: 'há entendimento emocional e mental de verdade, mas com atrito misturado — o tipo de amizade em que vocês se entendem bem e também discutem bastante.'
    },
    'pratico+sexual': {
      title: 'Presença com Chão',
      tenseTitle: 'Presença Complicada',
      harm: 'intensidade e senso prático de parceria caminham juntos — uma amizade que não é só admiração passageira, tem estrutura por trás.',
      tense: 'intensidade forte, mas junto de tensão estrutural — amizade que costuma esbarrar em choques de ritmo ou de estilo de vida.'
    },
    'intelectual+sexual': {
      title: 'Troca Estimulante',
      tenseTitle: 'Provocação Mútua',
      harm: 'energia e boas conversas dominam — combinação estimulante, do tipo que rende risada, debate e trocas que carregam.',
      tense: 'intensidade e estímulo mental fortes, com boa dose de provocação e atrito — amizade vibrante, mas nem sempre tranquila.'
    },
    'intelectual+pratico': {
      title: 'Parceria Funcional',
      tenseTitle: 'Competência com Atrito',
      harm: 'vocês formam um bom time — conversa afiada e senso prático de organização. Tem cara de parceria de verdade (de projeto, de casa, de vida).',
      tense: 'há competência mútua reconhecida, mas com bastante atrito na hora de decidir e organizar as coisas em conjunto.'
    },
  },
  familia: {
    'emocional+sexual': {
      title: 'Vínculo Intenso e Presente',
      tenseTitle: 'Vínculo Marcante e Turbulento',
      harm: 'afeto e intensidade caminham juntos, e a maior parte flui sem muito atrito — o tipo de laço familiar forte e presente, que pesa (no bom sentido) na vida de vocês.',
      tense: 'afeto e intensidade dominam, mas vêm carregados de tensão — um vínculo magnético, mas também com bastante atrito e altos e baixos.'
    },
    'emocional+pratico': {
      title: 'Base Sólida',
      tenseTitle: 'Vínculo com Peso',
      harm: 'tem afeto genuíno e uma estrutura prática consistente — o perfil de um laço familiar que se mantém firme com o tempo.',
      tense: 'afeto e senso de responsabilidade mútua aparecem fortes, mas com bastante fricção — vínculo com cara de obrigação e cuidado misturados, que também gera atrito recorrente.'
    },
    'emocional+intelectual': {
      title: 'Cumplicidade Profunda',
      tenseTitle: 'Cumplicidade com Atrito',
      harm: 'mente e coração conversam muito — afinidade genuína, do tipo que gera intimidade emocional forte entre vocês.',
      tense: 'há entendimento emocional e mental de verdade, mas com atrito misturado — vocês se entendem bem e também discutem bastante.'
    },
    'pratico+sexual': {
      title: 'Presença com Chão',
      tenseTitle: 'Presença Complicada',
      harm: 'intensidade e senso prático de convivência caminham juntos — um laço com estrutura real por trás.',
      tense: 'intensidade forte, mas junto de tensão estrutural — vínculo que costuma esbarrar em choques de ritmo ou de jeito de viver.'
    },
    'intelectual+sexual': {
      title: 'Troca Estimulante',
      tenseTitle: 'Provocação Mútua',
      harm: 'energia e boas conversas dominam — trocas que rendem debate e cumplicidade.',
      tense: 'intensidade e estímulo mental fortes, com boa dose de provocação e atrito — vínculo vivo, mas nem sempre tranquilo.'
    },
    'intelectual+pratico': {
      title: 'Parceria Funcional',
      tenseTitle: 'Competência com Atrito',
      harm: 'vocês formam um bom time — conversa afiada e senso prático de organização, cara de parceria de verdade dentro da família.',
      tense: 'há competência mútua reconhecida, mas com bastante atrito na hora de decidir e organizar as coisas em conjunto.'
    },
  },
};

// Texto do caso especial de dominância extrema de "Sexual/Intensidade" — também varia
// por tipo de vínculo (evita falar em "ficada"/"romance" quando o vínculo é amizade/família).
export const EXTREME_TEXT_BY_TYPE = {
  romantico: {
    harmonicTitle: 'Química forte — Ficada ou Amizade Colorida',
    tenseTitle: 'Paixão Turbulenta',
    harmonicFlavor: (S, h) => `atração física domina o mapa (Sexual em ${S.toFixed(0)}%), e de forma fluida — harmonia em ${h}%. É o tipo de conexão em que o corpo entende antes da cabeça: ótima pra uma ficada ou amizade colorida saudável, mesmo sem virar algo sério.`,
    tenseFlavor: (S, h) => `atração física domina o mapa (Sexual em ${S.toFixed(0)}%), mas cercada de tensão — harmonia de só ${h}%. Atração magnética e um pouco desestabilizadora, mais intensa do que estável.`,
  },
  amizade: {
    harmonicTitle: 'Magnetismo Forte — Amizade Intensa',
    tenseTitle: 'Magnetismo Turbulento',
    harmonicFlavor: (S, h) => `intensidade domina o mapa (${S.toFixed(0)}%), e de forma fluida — harmonia em ${h}%. É o tipo de amizade em que a conexão é imediata e magnética, sem depender de esforço nenhum dos dois lados.`,
    tenseFlavor: (S, h) => `intensidade domina o mapa (${S.toFixed(0)}%), mas cercada de tensão — harmonia de só ${h}%. Conexão magnética e um pouco desestabilizadora, mais intensa do que estável.`,
  },
  familia: {
    harmonicTitle: 'Vínculo Magnético',
    tenseTitle: 'Vínculo Turbulento',
    harmonicFlavor: (S, h) => `intensidade domina o mapa (${S.toFixed(0)}%), e de forma fluida — harmonia em ${h}%. Um laço com presença forte e natural entre vocês, do tipo que não precisa de esforço pra se fazer sentir.`,
    tenseFlavor: (S, h) => `intensidade domina o mapa (${S.toFixed(0)}%), mas cercada de tensão — harmonia de só ${h}%. Vínculo magnético e um pouco desestabilizador, mais intenso do que estável.`,
  },
};

// Texto do "imbalanceNote" (desequilíbrio Imediato x Estrutura) — também varia por
// tipo de vínculo, no mesmo padrão do EXTREME_TEXT_BY_TYPE acima (evita falar em
// "pegação"/"paixão" quando o vínculo é amizade ou família).
//
// tier varia o FECHO da frase conforme o nível absoluto do lado mais fraco (não só a
// diferença relativa entre os dois eixos, que é o que decide SE a nota aparece — ver
// imbalanceThreshold em classify()). Auditoria real (caso A: estrutura em
// 66%, ainda majoritariamente favorável, só que 28pp abaixo do imediato): o texto único
// que existia antes soava igualmente cauteloso pra um eixo fraco em 66% e um em 30%,
// quando esses dois casos pedem leituras bem diferentes — 66% não é "frágil", só é
// menor que a química; 30% aí sim é tensão de verdade. Reaproveita o mesmo
// CALIBRATION.harmonyZone já usado pra "faixa mista" no resto de classify(), em vez de
// inventar um limiar novo só pra isso.
export const IMBALANCE_TEXT_BY_TYPE = {
  romantico: {
    immediateOverStructure: (imm, str, tier) => {
      const closing = {
        low:  'Nesse patamar, os sinais de sustentação no tempo são realmente escassos — vale não presumir solidez de longo prazo só pela química.',
        mid:  'Os sinais de sustentação no tempo estão numa faixa mista — nem ausentes, nem consistentes o bastante pra confiar de olhos fechados.',
        high: 'Pode ser uma ótima paixão e dar início a algo gostoso, mas os sinais de longo prazo, embora reais e relevantes, não assumem o mesmo protagonismo que a química nessa leitura.',
      }[tier];
      return ` Vale observar: essa conexão puxa mais forte pro lado imediato — pegação, faísca, reconhecimento físico (${imm}%) — do que pra estrutura de longo prazo (${str}%). ${closing}`;
    },
    structureOverImmediate: (imm, str, tier) => {
      const closing = {
        low:  'Nesse patamar, a faísca imediata é bem escassa — o vínculo pode levar tempo pra "acender" fisicamente, se é que acende.',
        mid:  'A faísca imediata está numa faixa mista — existe, mas não domina o mapa.',
        high: 'Tende a ser uma boa base pra construir algo sólido, mas com menos combustão nos primeiros momentos.',
      }[tier];
      return ` Atenção: essa conexão tem mais estrutura de longo prazo (${str}%) do que faísca imediata (${imm}%). ${closing}`;
    },
  },
  amizade: {
    immediateOverStructure: (imm, str, tier) => {
      const closing = {
        low:  'Nesse patamar, os sinais de sustentação no tempo são realmente escassos — vale não presumir que isso vira algo duradouro só pela sintonia inicial.',
        mid:  'Os sinais de sustentação no tempo estão numa faixa mista — nem ausentes, nem consistentes o bastante pra confiar de olhos fechados.',
        high: 'Pode ser uma amizade que engata rápido e é ótima logo de cara, mas os sinais de sustentação no tempo são menos concentrados do que a leitura geral sugere.',
      }[tier];
      return ` Atenção: essa conexão puxa bem mais forte pro lado imediato — sintonia rápida, magnetismo instantâneo (${imm}%) — do que pra estrutura de longo prazo (${str}%). ${closing}`;
    },
    structureOverImmediate: (imm, str, tier) => {
      const closing = {
        low:  'Nesse patamar, o magnetismo imediato é bem escasso — a amizade pode demorar a "engatar" de fato, se é que engata.',
        mid:  'O magnetismo imediato está numa faixa mista — existe, mas não domina o mapa.',
        high: 'Tende a ser uma amizade que cresce devagar e se firma bem, mesmo sem aquele "clique" instantâneo.',
      }[tier];
      return ` Atenção: essa conexão tem bem mais estrutura de longo prazo (${str}%) do que magnetismo imediato (${imm}%). ${closing}`;
    },
  },
  familia: {
    immediateOverStructure: (imm, str, tier) => {
      const closing = {
        low:  'Nesse patamar, os sinais de sustentação no tempo são realmente escassos — vale não presumir solidez duradoura só pela proximidade inicial.',
        mid:  'Os sinais de sustentação no tempo estão numa faixa mista — nem ausentes, nem consistentes o bastante pra confiar de olhos fechados.',
        high: 'Pode ser um vínculo com ótima energia inicial, mas os sinais de sustentação no tempo são menos concentrados do que a leitura geral sugere.',
      }[tier];
      return ` Atenção: essa conexão puxa bem mais forte pro lado imediato — proximidade e reconhecimento que se sentem logo de cara (${imm}%) — do que pra estrutura de longo prazo (${str}%). ${closing}`;
    },
    structureOverImmediate: (imm, str, tier) => {
      const closing = {
        low:  'Nesse patamar, a proximidade imediata é bem escassa — o vínculo pode levar tempo pra se sentir próximo de fato, se é que se sente.',
        mid:  'A proximidade imediata está numa faixa mista — existe, mas não domina o mapa.',
        high: 'Tende a se firmar com o tempo e a convivência, mesmo com menos "clique" natural de cara.',
      }[tier];
      return ` Atenção: esse vínculo tem bem mais estrutura de longo prazo (${str}%) do que proximidade imediata (${imm}%). ${closing}`;
    },
  },
};

export const CAT_META = {
  intelectual: { label:'Intelectual', color:'var(--violet)' },
  emocional:   { label:'Emocional',   color:'var(--rose)'   },
  sexual:      { label:'Sexual / Paixão', color:'#d4534f' },
  pratico:     { label:'Prático / Compromisso', color:'var(--teal)' },
  // Afinidade: nome fixo, não troca por tipo de vínculo (diferente de "sexual" logo
  // abaixo) — "é fácil estar perto" não pede reframe romântico/amizade/família. Cor
  // própria, tom dourado/âmbar (Júpiter/Fortuna), pra não colidir com as outras 4.
  afinidade:   { label:'Afinidade', color:'#c99a3d' },
};
// Só o rótulo da categoria "sexual" (internamente ainda chamada assim — é a categoria
// Atração, ver ATTRACTION_PAIRS, união dos dois pools originais que existiam antes do
// redesign) muda por
// tipo de vínculo. Cor e as outras categorias ficam iguais. O cálculo nunca muda, só o
// texto. "Intensidade / Magnetismo" (amizade) virou "Afeição" — mais preciso pro tipo de
// calor que Atração descreve numa amizade, sem a conotação física de "magnetismo".
export const SEXUAL_LABEL_BY_TYPE = {
  romantico: 'Sexual / Paixão',
  amizade:   'Afeição',
  familia:   'Intensidade / Proximidade',
};
// Desenha o painel das 4 categorias a partir de `categoryScores` (ver computeScores):
// cada categoria é independente (não soma 100%), com uma barra de dois eixos —
// tamanho preenchido = presence (quanto essa área apareceu no mapa), cor = favorável
// (verde) vs tenso (vermelho) proporcional ao harmonyPct daquela categoria
// especificamente. Usada tanto logo após calcular quanto ao reabrir uma entrada salva
// do histórico (viewComparison), pra não duplicar a lógica de desenho em dois lugares.
export const CATEGORY_HARMONIC_COLOR = '#7fae6d';
// rótulo do badge de "veredito", adaptado ao tipo de vínculo em foco no filtro ativo —
// "melhor namorado(a)", "melhor amigo(a)" etc., como pedido. Sem filtro (Todos), fica
// genérico porque aí o grupo mistura tipos de vínculo diferentes entre si.
export const POTENTIAL_LABEL_BY_FILTER = {
  romantico: 'Melhor parceiro(a) no veredito',
  amizade: 'Melhor amigo(a) no veredito',
  familia: 'Melhor vínculo familiar no veredito',
  all: 'Maior veredito do grupo',
};

// Mostra o painel de resultado completo pra uma entrada já salva, usando só os campos
// que já estão guardados em `c` (sem reprocessar c.raw, sem entrar em modo de edição).
// Existe porque o card no grid de comparação é compacto por design — não tem espaço pra
// descrição do veredito, os 4 stats completos, nem o detalhe de cada marcador — e esse
// painel (o mesmo usado logo após calcular) já sabe mostrar tudo isso.
// Monta o HTML dos chips de "Marcadores por área", agrupados (Estrutura / Destino /
// Categorias / Só informativo) e ordenados dentro de cada grupo por número de contatos
// (maior primeiro — empate cai na ordem de inserção abaixo, que o Array.sort estável do
// JS moderno preserva). Perfil de vínculo fica fora dos grupos, sempre primeiro, por ser
// a síntese dos dois eixos, não mais um item pra categorizar. Compartilhada entre
// viewComparison e o handler do calcBtn — os dois só diferem em passar `c.campo` (dado
// salvo) ou o mesmo objeto plano montado a partir das variáveis locais recém-calculadas.
// Mapa grupo → chips que pertencem a ele (só distingue os 4 grupos; ordem de contagem é
// aplicada depois, não aqui):
// 1 Estrutura: Saturno·compromisso, Sol-Lua·reconhecimento, Quíron, Casas·estrutura de parceria
// 2 Destino: Nodo·eixo do destino, Nodo/Vértice·mútuo, Vértice·encontro, Casas·eixo Destino
// 3 Categorias (não entram em eixo): Lilith, Sol transpessoal, Fortuna, Casas·círculo social, Quíron·parceria(7ª), Plutão·parceria(7ª)
// 4 Só informativo: Câmbio de luminares, Casas·convergência
// Chips "straddling" (contam pra eixo E categoria ao mesmo tempo) ficam só no grupo do
// eixo — a leitura mais "pesada" deles — mas ganham uma nota final no marker-detail
// avisando da outra categoria que também alimentam, pra não mentir por omissão.
export const GROUP_META = {
  1: { icon: '⚖️', label: 'Estrutura' },
  2: { icon: '☊', label: 'Destino' },
  3: { icon: '🧭', label: 'Categorias' },
  4: { icon: '📝', label: 'Só informativo' },
};
// Assinatura direção-neutra (Sol trígono Lua == Lua trígono Sol) — cobre o caso mais
// comum de reutilização entre sinastrias, onde o que importa é o par de planetas e o
// tipo de aspecto, não quem colou como Pessoa 1 ou Pessoa 2 no relatório.
// Fusão Asc/Desc e MC/IC no dicionário (pedido do usuário): quadratura com o
// Ascendente é a MESMA configuração (mesmo nome de aspecto) vista do Descendente
// (mesmo eixo, 180° opostos — 90° de um ponto é sempre também 90° do seu oposto), e o
// mesmo vale pro eixo MC/IC. Não faz sentido cadastrar o significado duas vezes pra
// essencialmente a mesma coisa olhada de dois lados — então, nesse aspecto, DSC é
// tratado como Ascendente e IC como MC na hora de gerar a assinatura do padrão,
// fazendo os dois caírem na mesma linha do dicionário (e herdando o mesmo significado
// cadastrado).
// Conjunção e oposição são diferentes: elas TROCAM de identidade de um lado pro outro
// do eixo, não permanecem a mesma (correção de bug reportado pelo usuário — a versão
// anterior tratava as três como "a mesma coisa", o que só é verdade pra quadratura).
// Se o Ascendente de alguém está em conjunção com a Lua do parceiro, o Descendente
// dessa mesma pessoa está, nesse instante, em OPOSIÇÃO com a mesma Lua (são pontos
// opostos: 0° de um é 180° do outro) — e vice-versa. Ou seja, "Descendente oposição
// Lua" não é igual a "Ascendente oposição Lua": é a mesma configuração que "Ascendente
// conjunção Lua". Por isso essas duas trocam de aspecto (via NODE_MIRROR_ASPECT, a
// mesma tabela já usada em collapseAxisMirrors pro Nodo Norte/Sul) ao serem
// normalizadas pro lado Ascendente/MC, e o rótulo mostrado nesse caso é o do ponto
// único (Ascendente ou MC), nunca o combinado "Ascendente/Descendente" — combinar
// afirmaria (errado) que o Descendente está no mesmo aspecto, quando na verdade está
// no espelhado.
// Fora desses três aspectos (conjunção/oposição/quadratura) a fusão NÃO acontece: um
// trígono ao Ascendente vira sextil ao Descendente (ângulo diferente, sem forçar a
// mesma configuração), então continuam como padrões distintos, cada um com seu
// próprio significado.
export const ANGLE_AXIS_LABEL_PT = { Ascendant: 'Ascendente/Descendente', MC: 'MC/IC' };
// Redesenha só o cabeçalho (título + badges) de uma linha do dicionário — chamada tanto
// na criação da linha quanto depois de salvar/remover um significado, pra refletir o
// "has-entry" na hora, sem precisar recarregar a página ou trocar de sinastria.
// FLAVOR_ICON: mesmo par de círculos usado em formatMarkerDetail (🟢/🟡/🔴), pra
// identificar de cara se o padrão é harmônico/ambivalente/desarmônico — padrões sem
// flavor (a maioria das casas, sem curadoria própria de harmonia) não recebem ícone.
export const DICT_FLAVOR_ICON = { harmonic:'🟢', ambivalent:'🟡', tenseLight:'🟠', tense:'🔴' };
export const DICT_FLAVOR_LABEL = { harmonic:'Harmônico', ambivalent:'Ambivalente', tenseLight:'Tenso leve', tense:'Desarmônico' };


