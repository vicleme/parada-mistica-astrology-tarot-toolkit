// ============================================================================
// core/structural.js
// Fase 1 da leitura estrutural do mapa natal (ver conversa de design): fatos
// derivados da distribuição dos planetas no mapa, sem juízo de valor —
// Configuração, Padrão de aspecto (T-Quadrado/Grande Cruz/Grande Trígono/Yod),
// Hemisfério/Setor dominante, Seita (diurno/noturno), Casas mais densas
// (stellium), predominância de Modalidade, balanço Yin/Yang, Signo predominante
// e o bloco de Marca Geracional (aspectos transpessoal-transpessoal, tratados à
// parte por serem geracionais, não pessoais — ver discussão).
//
// Depende de core/houses.js (signOf/houseOf) e core/constants.js (SIGNS,
// PLANET_LABEL — só pros textos de Configuração/Padrão de aspecto). Não
// depende de core/aspects.js nem de nenhum estado de UI: Padrão de aspecto e
// Marca Geracional recebem a lógica de aspecto injetada via `findAspectFn`
// (quem chama já tem essa função disponível) — este módulo só recebe
// natalChart e devolve dados/texto prontos; quem importa decide como
// renderizar.
//
// IMPORTANTE — convenções que dependem de fonte/escola e merecem sua conferência:
// 1) Hemisfério Norte/Sul do mapa: aqui uso Sul = casas 1–6 (abaixo do horizonte,
//    "noite" do mapa, foco subjetivo/interno) e Norte = casas 7–12 (acima do
//    horizonte, foco objetivo/social) — é a convenção mais comum nos cursos que
//    encontrei, mas há literatura que inverte os rótulos Norte/Sul (a geometria —
//    quais casas formam cada metade — não muda, só o nome). Ajuste
//    HEMISPHERE_NS_LABELS abaixo se a sua referência (Ana Rodrigues) usar o
//    oposto — é uma troca de uma linha.
// 2) Hemisfério Leste/Oeste: aqui uso Leste = casas 10,11,12,1,2,3 (lado do
//    Ascendente, autodeterminação/iniciativa própria), Oeste = casas
//    4,5,6,7,8,9 (lado do Descendente, dependência de outros/circunstâncias).
//    CONFIRMADO com você: bate com a convenção padrão (Leste = onde o
//    Ascendente nasce) e com sua leitura de que casas 10-3 são mais sobre a
//    pessoa em si e 4-9 envolvem mais o externo. O exemplo do docx de
//    referência ("Oeste... independência") foi tratado como deslize daquela
//    leitura específica, não como convenção a seguir.
// 3) Configuração (padrão de distribuição espacial) x Padrão de aspecto (T-
//    Quadrado/Grande Cruz/Grande Trígono/Yod, ângulos exatos): são coisas
//    diferentes, já implementadas separadas (ver computeChartShape vs
//    computeAspectPatterns) — resolvido, mas fica documentado aqui pra não se
//    perder a razão da separação.
// ============================================================================

import { normDeg } from './time.js';
import { signOf, houseOf } from './houses.js';
import { SIGNS, PLANET_LABEL } from './constants.js';

// Planetas considerados para Configuração/Hemisfério/Modalidade/Yin-Yang/Signo
// predominante: os 10 corpos "clássicos + modernos", sem pontos derivados
// (Asc/MC/Fortuna/Espirito), nós ou Lilith — é o conjunto padrão usado nessas técnicas na
// tradição que você descreveu (mesmo pool que aparece na tabela de Predominância
// de Elementos do docx, coluna "3/2/1 pontos", exceto AC/MC que entram só nas
// tabelas de pontos, não aqui).
export const STRUCTURAL_BODIES = ["Sol","Lua","Mercurio","Venus","Marte","Jupiter","Saturno","Urano","Netuno","Plutao"];

export const TRANSPERSONAL = ["Urano","Netuno","Plutao"];

// ---------------------------------------------------------------------------
// Modalidade (cardinal/fixo/mutável) e Yin/Yang (masculino=fogo/ar,
// feminino=terra/água) por signo — tabelas fixas, sem ambiguidade de escola.
// ---------------------------------------------------------------------------
const MODALITY_BY_SIGN = ["cardinal","fixo","mutavel","cardinal","fixo","mutavel","cardinal","fixo","mutavel","cardinal","fixo","mutavel"];
export const POLARITY_BY_SIGN = ["yang","yin","yang","yin","yang","yin","yang","yin","yang","yin","yang","yin"]; // Áries=yang ... alterna
const ELEMENT_BY_SIGN  = ["fogo","terra","ar","agua","fogo","terra","ar","agua","fogo","terra","ar","agua"];

export const MODALITY_LABEL = {cardinal:"Cardinal", fixo:"Fixo", mutavel:"Mutável"};
export const ELEMENT_LABEL = {fogo:"Fogo", terra:"Terra", ar:"Ar", agua:"Água"};

export const HEMISPHERE_NS_LABELS = {
  sul: "Hemisfério Sul (casas 1–6, abaixo do horizonte) — foco subjetivo, introspectivo",
  norte: "Hemisfério Norte (casas 7–12, acima do horizonte) — foco objetivo, social",
};
export const HEMISPHERE_LO_LABELS = {
  leste: "Hemisfério Leste (casas 10,11,12,1,2,3) — autodeterminação, iniciativa própria",
  oeste: "Hemisfério Oeste (casas 4,5,6,7,8,9) — dependência de outros/circunstâncias",
};

// Versões curtas — pra compor a linha única "Norte e Oeste (extrospecção e
// independência), mapa diurno", no mesmo formato do seu docx de referência
// (ver aviso sobre Leste/Oeste no cabeçalho do arquivo).
export const HEMISPHERE_NS_SHORT = { sul: "Sul", norte: "Norte" };
export const HEMISPHERE_NS_TRAIT = { sul: "introspecção", norte: "extrospecção" };
export const HEMISPHERE_LO_SHORT = { leste: "Leste", oeste: "Oeste" };
export const HEMISPHERE_LO_TRAIT = { leste: "autodeterminação", oeste: "dependência de outros/circunstâncias" };

function housesEast(){ return new Set([10,11,12,1,2,3]); }
function housesSouth(){ return new Set([1,2,3,4,5,6]); }

// ---------------------------------------------------------------------------
// Modalidade / Yin-Yang / Signo predominante — contagem simples sobre
// STRUCTURAL_BODIES. Retorna contagens e o(s) predominante(s) (empate = lista
// com mais de um item, pra não forçar falso desempate).
// ---------------------------------------------------------------------------
export function computeModality(positions){
  const counts = {cardinal:0, fixo:0, mutavel:0};
  STRUCTURAL_BODIES.forEach(name=>{
    const lon = positions[name];
    if(lon===undefined || lon===null) return;
    counts[MODALITY_BY_SIGN[signOf(lon)]]++;
  });
  const max = Math.max(...Object.values(counts));
  const predominant = Object.keys(counts).filter(k=>counts[k]===max && max>0);
  return {counts, predominant};
}

export function computeYinYang(positions){
  const counts = {yang:0, yin:0};
  STRUCTURAL_BODIES.forEach(name=>{
    const lon = positions[name];
    if(lon===undefined || lon===null) return;
    counts[POLARITY_BY_SIGN[signOf(lon)]]++;
  });
  const total = counts.yang+counts.yin;
  const dominant = counts.yang===counts.yin ? null : (counts.yang>counts.yin ? 'yang' : 'yin');
  return {counts, total, dominant};
}

export function computeSignDominance(positions){
  const counts = new Array(12).fill(0);
  STRUCTURAL_BODIES.forEach(name=>{
    const lon = positions[name];
    if(lon===undefined || lon===null) return;
    counts[signOf(lon)]++;
  });
  const max = Math.max(...counts);
  const predominant = max>0 ? counts.map((c,i)=>c===max?i:-1).filter(i=>i>=0) : [];
  return {counts, predominant, max};
}

// ---------------------------------------------------------------------------
// Casas mais densas / stellium — exige casas calculadas (hasHouses). Considera
// stellium a partir de 3 corpos no mesmo signo OU na mesma casa (limiar
// tradicional mais comum; 3 é o mínimo geralmente aceito, alguns autores pedem
// 4 — deixei 3 com o valor exato de planetas explícito no retorno pra você
// decidir na hora de exibir se quer marcar como "stellium" só a partir de 4).
// ---------------------------------------------------------------------------
export function computeDensity(natalChart){
  const bySign = new Array(12).fill(0).map(()=>[]);
  STRUCTURAL_BODIES.forEach(name=>{
    const lon = natalChart.positions[name];
    if(lon===undefined || lon===null) return;
    bySign[signOf(lon)].push(name);
  });
  const signStelliums = bySign.map((list,i)=>({sign:i, bodies:list})).filter(s=>s.bodies.length>=3);

  let houseStelliums = [];
  if(natalChart.hasHouses){
    const byHouse = new Array(13).fill(0).map(()=>[]); // índice 1..12
    STRUCTURAL_BODIES.forEach(name=>{
      const lon = natalChart.positions[name];
      if(lon===undefined || lon===null) return;
      byHouse[houseOf(lon, natalChart.cusps)].push(name);
    });
    houseStelliums = byHouse.map((list,i)=>({house:i, bodies:list})).filter(h=>h.bodies.length>=3);
  }
  return {signStelliums, houseStelliums, hasHouses: natalChart.hasHouses};
}

// ---------------------------------------------------------------------------
// Hemisfério/Setor dominante — exige casas (a divisão N/S e L/O é definida
// pelas cúspides). Sem hora/local, não dá pra calcular (retorna null).
// ---------------------------------------------------------------------------
export function computeHemispheres(natalChart){
  if(!natalChart.hasHouses) return null;
  const south = housesSouth(), east = housesEast();
  let southCount=0, northCount=0, eastCount=0, westCount=0;
  STRUCTURAL_BODIES.forEach(name=>{
    const lon = natalChart.positions[name];
    if(lon===undefined || lon===null) return;
    const h = houseOf(lon, natalChart.cusps);
    if(south.has(h)) southCount++; else northCount++;
    if(east.has(h)) eastCount++; else westCount++;
  });
  return {
    ns: {sul: southCount, norte: northCount, dominant: southCount===northCount?null:(southCount>northCount?'sul':'norte')},
    lo: {leste: eastCount, oeste: westCount, dominant: eastCount===westCount?null:(eastCount>westCount?'leste':'oeste')},
  };
}

// ---------------------------------------------------------------------------
// Seita (mapa diurno/noturno) — Sol acima do horizonte (casas 7–12) = diurno;
// abaixo (casas 1–6) = noturno. Exige casas.
// ---------------------------------------------------------------------------
export function computeSect(natalChart){
  if(!natalChart.hasHouses) return null;
  const sunHouse = houseOf(natalChart.positions.Sol, natalChart.cusps);
  const diurno = sunHouse>=7 && sunHouse<=12;
  return {sunHouse, diurno};
}

// ---------------------------------------------------------------------------
// Configuração (padrões de Marc Edmund Jones) — algoritmo por maiores vãos
// (gaps) vazios entre os corpos ordenados ao redor do círculo. Heurística
// documentada nos comentários; casos de fronteira caem em "Espalhado (padrão
// misto)" em vez de forçar uma classificação duvidosa.
//
// Recebe natalChart inteiro (não só positions) porque, quando há hora de
// nascimento, também calcula QUAIS CASAS o agrupamento ocupa — o nome do
// padrão sozinho ("Bacia") não diz em que área da vida ele está concentrado;
// isso muda de pessoa pra pessoa mesmo dentro do mesmo padrão.
// ---------------------------------------------------------------------------
function houseListLabel(houses){
  if(!houses || !houses.length) return '';
  if(houses.length===1) return `Casa ${houses[0]}`;
  return `Casas ${houses.slice(0,-1).join(', ')} e ${houses[houses.length-1]}`;
}

export function computeChartShape(natalChart){
  const positions = natalChart.positions;
  const entries = STRUCTURAL_BODIES
    .map(name=>({name, lon: positions[name]}))
    .filter(e=>e.lon!==undefined && e.lon!==null)
    .map(e=>({...e, lon: normDeg(e.lon)}))
    .sort((a,b)=>a.lon-b.lon);
  if(entries.length<2) return {pattern:'indeterminado', gaps:[], detail:'Poucos corpos disponíveis para classificar.', houses:null, housesLabel:''};

  const n = entries.length;
  const gaps = entries.map((e,i)=>{
    const next = entries[(i+1)%n];
    const span = normDeg(next.lon - e.lon) || 360;
    return {from:e.name, to:next.name, span};
  }).sort((a,b)=>b.span-a.span);

  const largest = gaps[0], second = gaps[1];

  // Casas ocupadas pelos corpos que ENTRAM no agrupamento principal (todos,
  // exceto quando há um corpo isolado tratado à parte — ver Balde abaixo).
  // null quando não há hora/local (sem casas calculadas).
  const housesOf = (list)=> natalChart.hasHouses
    ? Array.from(new Set(list.map(e=>houseOf(e.lon, natalChart.cusps)))).sort((a,b)=>a-b)
    : null;
  const allHouses = housesOf(entries);
  const allHousesLabel = allHouses ? houseListLabel(allHouses) : '';
  const areaSuffix = allHousesLabel ? ` (${allHousesLabel})` : '';

  // Feixe (Bundle): tudo cabe dentro de um trígono (120°) — vão vazio >= 240°.
  if(largest.span >= 240){
    return {pattern:'feixe', label:'Feixe (Bundle)', gaps, houses:allHouses, housesLabel:allHousesLabel,
      detail:`Todos os corpos concentrados num arco de ${Math.round(360-largest.span)}°${areaSuffix} — foco de vida muito canalizado numa área específica.`};
  }
  // Bacia (Bowl): tudo dentro de um semicírculo (180°) — vão vazio entre 180° e 240°.
  if(largest.span >= 180){
    return {pattern:'bacia', label:'Bacia (Bowl)', gaps, houses:allHouses, housesLabel:allHousesLabel,
      detail:`Todos os corpos num semicírculo de ${Math.round(360-largest.span)}°${areaSuffix} — energia voltada pra um "lado" da vida, com o lado oposto por preencher/buscar.`};
  }
  // Locomotiva (Locomotive): um trígono (120°) vazio, corpos ocupando os 240° restantes.
  if(largest.span >= 100 && largest.span < 180){
    // Balde (Bucket): variante da Bacia/Locomotiva com 1 corpo isolado como "alça",
    // sozinho num vão grande, longe do resto do agrupamento.
    const isolated = entries.find(e=>{
      const prevGap = gaps.find(g=>g.to===e.name)?.span || 0;
      const nextGap = gaps.find(g=>g.from===e.name)?.span || 0;
      return prevGap>60 && nextGap>60;
    });
    if(isolated && n>=4){
      const rest = entries.filter(e=>e.name!==isolated.name);
      const restHouses = housesOf(rest);
      const restLabel = restHouses ? houseListLabel(restHouses) : '';
      const handleHouse = natalChart.hasHouses ? houseOf(isolated.lon, natalChart.cusps) : null;
      const handleSuffix = handleHouse ? ` (Casa ${handleHouse})` : '';
      const restSuffix = restLabel ? ` (${restLabel})` : '';
      return {pattern:'balde', label:'Balde (Bucket)', gaps, houses:allHouses, housesLabel:allHousesLabel,
        detail:`Maioria dos corpos agrupada${restSuffix}, com ${PLANET_LABEL[isolated.name]||isolated.name} isolado${handleSuffix} como "alça" — um tema/planeta que funciona como válvula de escape ou foco isolado do resto do mapa.`};
    }
    return {pattern:'locomotiva', label:'Locomotiva (Locomotive)', gaps, houses:allHouses, housesLabel:allHousesLabel,
      detail:`Um arco de ~${Math.round(largest.span)}° vazio${areaSuffix} — energia "empurrando" ativamente através das duas outras áreas ocupadas, tema de iniciativa/impulso.`};
  }
  // Gangorra (See-Saw): dois agrupamentos claramente opostos, cada um separado
  // por um vão grande — checa se os dois maiores vãos são ambos >= 60° e se os
  // corpos se dividem em ~2 blocos.
  if(largest.span>=60 && second.span>=60){
    return {pattern:'gangorra', label:'Gangorra (See-Saw)', gaps, houses:allHouses, housesLabel:allHousesLabel,
      detail:`Dois agrupamentos de corpos em lados opostos do mapa${areaSuffix} — vida vivida em tensão/alternância entre dois polos ou áreas.`};
  }
  // Disperso (Splash): sem vãos grandes, corpos espalhados por muitos signos.
  const signsOccupied = new Set(entries.map(e=>signOf(e.lon))).size;
  if(largest.span<60 && signsOccupied>=8){
    return {pattern:'disperso', label:'Disperso (Splash)', gaps, houses:allHouses, housesLabel:allHousesLabel,
      detail:'Corpos espalhados por quase todo o zodíaco, sem concentração clara — versatilidade grande, energia distribuída por muitas áreas da vida.'};
  }
  // Fallback: não se encaixou com clareza em nenhum padrão clássico.
  return {pattern:'espalhado', label:'Espalhado (padrão misto)', gaps, houses:allHouses, housesLabel:allHousesLabel,
    detail:'Distribuição irregular, sem um padrão único dominante — combina traços de mais de uma configuração clássica.'};
}

// ---------------------------------------------------------------------------
// Padrão de aspecto (T-Quadrado, Grande Cruz, Grande Trígono, Yod) — diferente
// de Configuração acima (que é sobre a DISTRIBUIÇÃO espacial dos corpos ao
// redor do círculo): isto é sobre ÂNGULOS EXATOS entre eles. São os quatro
// padrões clássicos mais consolidados na literatura (Yod também chamado de
// "Dedo de Deus"/"Finger of God"). Igual à Marca Geracional, depende da tabela
// de aspectos completa — `findAspectFn` é a mesma função injetada, assinatura
// (lon1,lon2,nameA,nameB)=>{aspect,glyph,orb}|null, e nameA/nameB TÊM que ser
// repassados (mesmo motivo do aviso lá embaixo: sem eles o multiplicador de
// orbe do Urano/Netuno/Plutão etc. não é aplicado).
//
// Pra não duplicar leitura, uma Grande Cruz "engole" os dois T-Quadrados que a
// compõem (não lista os dois T-Quadrados soltos de novo); um T-Quadrado que
// usa a mesma oposição de uma Grande Cruz mas com um ápice diferente continua
// sendo reportado à parte, porque é informação nova.
// ---------------------------------------------------------------------------
export function computeAspectPatterns(positions, findAspectFn){
  const bodies = STRUCTURAL_BODIES.filter(n=>positions[n]!==undefined && positions[n]!==null);
  const key = (a,b)=> a<b ? a+'|'+b : b+'|'+a;
  const table = {};
  for(let i=0;i<bodies.length;i++){
    for(let j=i+1;j<bodies.length;j++){
      const a=bodies[i], b=bodies[j];
      const asp = findAspectFn(positions[a], positions[b], a, b);
      if(asp) table[key(a,b)] = asp;
    }
  }
  const is = (a,b,name)=>{ const x=table[key(a,b)]; return !!x && x.aspect===name; };

  const patterns = [];

  const oppositions = [];
  for(let i=0;i<bodies.length;i++) for(let j=i+1;j<bodies.length;j++){
    if(is(bodies[i],bodies[j],'Oposição')) oppositions.push([bodies[i],bodies[j]]);
  }

  // Grande Cruz: dois eixos de oposição perpendiculares, com quadratura entre
  // todos os pares cruzados (as 4 "pernas"). Checada antes do T-Quadrado.
  const crosses = [];
  for(let i=0;i<oppositions.length;i++){
    for(let j=i+1;j<oppositions.length;j++){
      const [a,b]=oppositions[i], [c,d]=oppositions[j];
      if(new Set([a,b,c,d]).size<4) continue;
      if(is(a,c,'Quadratura') && is(a,d,'Quadratura') && is(b,c,'Quadratura') && is(b,d,'Quadratura')){
        crosses.push({axis1:[a,b], axis2:[c,d], bodies:[a,b,c,d]});
        patterns.push({type:'grande-cruz', bodies:[a,b,c,d]});
      }
    }
  }
  const isLegOfReportedCross = (a,b,apex)=> crosses.some(cr=>{
    const set = new Set(cr.bodies);
    return set.has(a) && set.has(b) && set.has(apex);
  });

  // T-Quadrado: oposição + os dois em quadratura com um terceiro (ápice, onde
  // a tensão do padrão costuma se concentrar/expressar).
  for(const [a,b] of oppositions){
    for(const apex of bodies){
      if(apex===a || apex===b) continue;
      if(isLegOfReportedCross(a,b,apex)) continue;
      if(is(a,apex,'Quadratura') && is(b,apex,'Quadratura')){
        patterns.push({type:'t-quadrado', bodies:[a,b,apex], apex});
      }
    }
  }

  // Grande Trígono: três corpos mutuamente em trígono.
  for(let i=0;i<bodies.length;i++) for(let j=i+1;j<bodies.length;j++) for(let k=j+1;k<bodies.length;k++){
    const a=bodies[i], b=bodies[j], c=bodies[k];
    if(is(a,b,'Trígono') && is(b,c,'Trígono') && is(a,c,'Trígono')){
      patterns.push({type:'grande-trigono', bodies:[a,b,c]});
    }
  }

  // Yod (Dedo de Deus): dois corpos em sextil, ambos em quincúncio com um
  // terceiro (ápice, foco de ajuste do padrão).
  for(let i=0;i<bodies.length;i++) for(let j=i+1;j<bodies.length;j++){
    const a=bodies[i], b=bodies[j];
    if(!is(a,b,'Sextil')) continue;
    for(const apex of bodies){
      if(apex===a||apex===b) continue;
      if(is(a,apex,'Quincúncio') && is(b,apex,'Quincúncio')){
        patterns.push({type:'yod', bodies:[a,b,apex], apex});
      }
    }
  }

  return patterns;
}

export const ASPECT_PATTERN_LABEL = {
  'grande-cruz':'Grande Cruz', 't-quadrado':'T-Quadrado',
  'grande-trigono':'Grande Trígono', 'yod':'Yod (Dedo de Deus)',
};

// Texto-síntese por tipo de padrão — factual mas com a leitura tradicional
// mais consolidada de cada um, no mesmo espírito de `detail` em chartShape
// acima (fato + o que a tradição costuma associar a ele, sem "bom/ruim").
export function aspectPatternDetail(p){
  const L = n=>PLANET_LABEL[n]||n;
  if(p.type==='grande-cruz'){
    const [a,b,c,d]=p.bodies;
    return `${L(a)}, ${L(b)}, ${L(c)} e ${L(d)} formando dois eixos de oposição perpendiculares entre si, com quadratura entre todos os pares cruzados — o padrão de aspecto mais tenso dos quatro, mas também o mais motor: exige ação/ajuste nas quatro áreas ao mesmo tempo, sem um único ponto de descarga.`;
  }
  if(p.type==='t-quadrado'){
    const [a,b]=p.bodies.filter(n=>n!==p.apex);
    return `${L(a)} e ${L(b)} em oposição, ambos em quadratura com ${L(p.apex)} (ápice) — a tensão do eixo tende a se concentrar e se expressar através de ${L(p.apex)}, que funciona como ponto de ação do padrão.`;
  }
  if(p.type==='grande-trigono'){
    const [a,b,c]=p.bodies;
    return `${L(a)}, ${L(b)} e ${L(c)} mutuamente em trígono — fluidez e talento natural na área desses três planetas; o ponto de atenção clássico é a comodidade excessiva, já que o padrão não força ação por si só.`;
  }
  if(p.type==='yod'){
    const [a,b]=p.bodies.filter(n=>n!==p.apex);
    return `${L(a)} e ${L(b)} em sextil, ambos em quincúncio com ${L(p.apex)} (ápice) — sensação de ajuste ou "chamado" específico concentrado em ${L(p.apex)}, algo que costuma pedir adaptação ao longo da vida em vez de vir pronto.`;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Marca geracional — aspectos ENTRE os três transpessoais (Urano-Netuno,
// Urano-Plutão, Netuno-Plutão). Propositalmente feito à parte de Nitidez/
// Harmonia/Categorias (ver discussão): não descreve a pessoa, descreve a
// geração dela. `findAspectFn` é injetado (assinatura
// (lon1,lon2,nameA,nameB)=>{aspect,glyph,orb}|null) pra este módulo não
// precisar depender de core/aspects.js diretamente — quem chama já tem essa
// função disponível. IMPORTANTE: nameA/nameB têm que ser sempre repassados —
// é deles que effectiveMaxOrb tira o multiplicador de orbe apertado do
// Urano/Netuno/Plutão (0.75); passar só lon1/lon2 faz o teto cair pro padrão
// (1.0) e o orbe fica frouxo demais pra esses três (bug real que já apareceu
// aqui uma vez — cuidado ao mexer).
// ---------------------------------------------------------------------------
export function computeGenerationalMarks(positions, findAspectFn){
  const marks = [];
  for(let i=0;i<TRANSPERSONAL.length;i++){
    for(let j=i+1;j<TRANSPERSONAL.length;j++){
      const p1 = TRANSPERSONAL[i], p2 = TRANSPERSONAL[j];
      const lon1 = positions[p1], lon2 = positions[p2];
      if(lon1===undefined || lon2===undefined) continue;
      const asp = findAspectFn(lon1, lon2, p1, p2);
      if(asp) marks.push({p1, p2, ...asp});
    }
  }
  return marks;
}

// Tom harmônico/tenso/ambivalente por aspecto — usado só na Marca Geracional,
// pra escolher a moldura de texto certa (ver discussão: "canaliza com fluidez"
// vs "vive por ruptura/crise", nunca "bom/ruim").
export const ASPECT_TONE = {
  "Trígono":"harmonico", "Sextil":"harmonico", "Semissextil":"harmonico",
  "Quadratura":"tenso", "Oposição":"tenso", "Semiquadratura":"tenso", "Sesquiquadratura":"tenso",
  "Conjunção":"ambivalente", "Quincúncio":"ambivalente",
};

// ---------------------------------------------------------------------------
// Agregador — chama tudo de uma vez e devolve um objeto pronto pra renderizar.
// ---------------------------------------------------------------------------
export function computeStructuralProfile(natalChart, findAspectFn){
  return {
    modality: computeModality(natalChart.positions),
    yinYang: computeYinYang(natalChart.positions),
    signDominance: computeSignDominance(natalChart.positions),
    density: computeDensity(natalChart),
    hemispheres: computeHemispheres(natalChart),
    sect: computeSect(natalChart),
    chartShape: computeChartShape(natalChart),
    aspectPatterns: findAspectFn ? computeAspectPatterns(natalChart.positions, findAspectFn) : [],
    generational: findAspectFn ? computeGenerationalMarks(natalChart.positions, findAspectFn) : [],
  };
}
