/**
 * parser.js — parseText() transforma o texto de sinastria colado pelo usuário
 * em { aspects, houses } estruturado. Também: teto de orbe por tipo de astro,
 * contagem de reciprocidade, detecção de câmbio de luminares.
 * Depende de: calibration.js, pairs.js, scoring.js.
 * Usado por: comparisons.js, compute.js, dictionary.js, main.js, report.js.
 */

import { ASPECT_CATEGORY_MULT, MINOR_ASPECTS, NODE_MIRROR_ASPECT, ORB_BASE_MAX, ORB_TYPE_MULT } from './calibration.js';
import { ASPECT_WORDS, CORE_PERSONAL_PLANETS } from './pairs.js';
import { harmonicFraction, markerCategory } from './scoring.js';

// Câmbio de luminares (Sol/Lua trocados): quando o Sol de uma pessoa cai no MESMO
// signo da Lua da outra, E vice-versa — um padrão específico, bastante citado na
// tradição de sinastria como indício de reconhecimento emocional profundo entre as
// duas pessoas (cada uma "fala a língua" da outra: uma entende instintivamente o que
// move o parceiro emocionalmente, porque é o próprio signo solar dela).
// A DETECÇÃO do câmbio em si é por coincidência de SIGNO (não depende de orbe/grau
// exato) — por isso continua fora de CALIBRATION.significantMarkerOrbWeight e de
// harmonyPct/AXIS_BOOST, do mesmo jeito que antes.
// A CLASSIFICAÇÃO (harmônico/ambivalente/tenso) é outra história: dois signos do
// mesmo elemento não garantem trígono — a distância real em graus dentro de cada
// signo pode cair em qualquer aspecto, incluindo quadratura. Signo sozinho não dá
// esse dado. Então só classificamos quando os dois aspectos Sol-Lua específicos do
// câmbio (A-Sol↔B-Lua e A-Lua↔B-Sol) também aparecem em `aspects` como aspectos
// reais, com orbe — aí sim usamos o grau exato que o relatório forneceu. Quando um
// dos dois (ou os dois) não está listado como aspecto — o app de origem só lista
// aspectos dentro de um orbe máximo, e esse contato específico pode ter ficado largo
// demais pra entrar —, não inventamos uma cor: o chip continua aparecendo (a
// coincidência de signo é real), só que neutro, sem 🟢/🟡/🔴.
export function findAspectBetween(aspects, name1, planet1, name2, planet2){
  const n1 = name1.trim().toLowerCase(), n2 = name2.trim().toLowerCase();
  return aspects.find(a => {
    const ap1 = a.p1.trim().toLowerCase(), ap2 = a.p2.trim().toLowerCase();
    return (ap1 === n1 && a.planet1 === planet1 && ap2 === n2 && a.planet2 === planet2) ||
           (ap1 === n2 && a.planet1 === planet2 && ap2 === n1 && a.planet2 === planet1);
  }) || null;
}

export function computeLuminarySwap(aspects){
  const signsByPerson = {}; // key: nome normalizado (lowercase) -> { name, Sun, Moon }
  const order = []; // preserva ordem de primeira aparição no texto

  const record = (rawName, planet, sign) => {
    if (planet !== 'Sun' && planet !== 'Moon') return;
    if (!rawName || !sign) return;
    const key = rawName.trim().toLowerCase();
    if (!signsByPerson[key]){
      signsByPerson[key] = { name: rawName.trim() };
      order.push(key);
    }
    // primeira menção do signo prevalece — o mesmo Sol/Lua de uma pessoa aparece em
    // dezenas de linhas de aspecto diferentes, sempre com o mesmo signo (não muda
    // entre linhas), então não há conflito real a resolver aqui.
    if (!signsByPerson[key][planet]) signsByPerson[key][planet] = sign;
  };

  for (const a of aspects){
    record(a.p1, a.planet1, a.sign1);
    record(a.p2, a.planet2, a.sign2);
  }

  // só faz sentido comparar quando dá pra identificar exatamente duas pessoas com Sol
  // E Lua reconhecidos nos dois — relatórios com mapas de terceiros colados junto
  // (raro, mas o formato aceita colar o texto inteiro) ficam de fora por segurança,
  // em vez de arriscar comparar o par errado.
  const complete = order.filter(k => signsByPerson[k].Sun && signsByPerson[k].Moon);
  if (complete.length !== 2) return { isLuminarySwap: false, luminarySwapDetail: '', luminarySwapCategory: null };

  const [ka, kb] = complete;
  const A = signsByPerson[ka], B = signsByPerson[kb];
  const isSwap = A.Sun.toLowerCase() === B.Moon.toLowerCase() && A.Moon.toLowerCase() === B.Sun.toLowerCase();
  if (!isSwap) return { isLuminarySwap: false, luminarySwapDetail: '', luminarySwapCategory: null };

  // tenta achar os dois aspectos reais (com orbe) que sustentam o câmbio, pra
  // classificar por grau exato em vez de assumir pela coincidência de signo
  const aspAtoB = findAspectBetween(aspects, A.name, 'Sun', B.name, 'Moon');
  const aspBtoA = findAspectBetween(aspects, B.name, 'Sun', A.name, 'Moon');

  let luminarySwapCategory = null;
  if (aspAtoB && aspBtoA){
    const sameSignAB = aspAtoB.sign1 && aspAtoB.sign2 ? aspAtoB.sign1.toLowerCase() === aspAtoB.sign2.toLowerCase() : true;
    const sameSignBA = aspBtoA.sign1 && aspBtoA.sign2 ? aspBtoA.sign1.toLowerCase() === aspBtoA.sign2.toLowerCase() : true;
    const fracAB = harmonicFraction(aspAtoB.aspect, aspAtoB.planet1, aspAtoB.planet2, sameSignAB);
    const fracBA = harmonicFraction(aspBtoA.aspect, aspBtoA.planet1, aspBtoA.planet2, sameSignBA);
    luminarySwapCategory = markerCategory((fracAB + fracBA) / 2);
  }

  return {
    isLuminarySwap: true,
    luminarySwapDetail: `${A.name} — Sol em ${A.Sun}, Lua em ${A.Moon}  ·  ${B.name} — Sol em ${B.Sun}, Lua em ${B.Moon}`,
    luminarySwapCategory,
  };
}

export function normPlanet(raw){
  const s = raw.trim();
  // ordem importa: "South Node" precisa ser checado ANTES do regex genérico de /node/i,
  // senão "South Node" também bateria em /node/i e virava indistinguível do Nodo Norte —
  // isso é exatamente o bug que causava contagem dupla de contatos nodais (ver
  // collapseNodeMirrors mais abaixo): Nodo Norte e Nodo Sul têm significados tradicionais
  // opostos (destino/crescimento vs. zona de conforto/passado) e são sempre 180° um do
  // outro, então qualquer aspecto a um tem um "eco" espelhado automático no outro.
  if (/south\s*node/i.test(s)) return 'SouthNode';
  if (/node/i.test(s)) return 'Node';
  if (/ascendant/i.test(s)) return 'Ascendant';
  // Parte da Fortuna: normaliza as variações de nome que relatórios usam ("Part of
  // Fortune", "Pars Fortunae", "Fortune") pro mesmo rótulo interno — sem isso, cada
  // variação virava um "planeta" desconhecido diferente, não reconhecido em nenhum
  // marcador/eixo.
  if (/fortune|fortuna/i.test(s)) return 'Fortune';
  // Descendente: normaliza "Descendant" pro rótulo 'DSC' — sem isso, não batia com
  // VERTEX_FATED_TARGETS/STRUCTURE_ANCHORS e nunca entrava em nenhum marcador/eixo.
  if (/descendant/i.test(s)) return 'DSC';
  // Meio-do-Céu: alguns relatórios exportam "Midheaven" (ou "Medium Coeli") em vez da
  // sigla "MC" que o resto do código usa em STRUCTURE_ANCHORS/PRATICO_ANCHORS/
  // VERTEX_FATED_TARGETS — sem isso, o aspecto era parseado normalmente mas o ponto
  // ficava com o nome cru ("Midheaven"), e sumia silenciosamente de todo marcador/eixo
  // que espera 'MC' (auditoria: gap encontrado, sem aviso nenhum ao usuário).
  if (/midheaven|medium\s*coeli|\bmc\b/i.test(s)) return 'MC';
  // Fundo do Céu: mesmo raciocínio do MC acima — "Imum Coeli" é o nome tradicional por
  // extenso, "IC" é a sigla que STRUCTURE_ANCHORS/PRATICO_ANCHORS esperam.
  if (/imum\s*coeli|\bic\b/i.test(s)) return 'IC';
  // Lilith: relatórios variam entre "Lilith", "Black Moon Lilith", "Dark Moon Lilith",
  // "Lilith (Mean)", "Lilith (True)" etc. — todos os marcadores (AMBIVALENT_CONJUNCTION_
  // POINTS, ATTRACTION_PAIRS via 'Lilith-Mars'/'Lilith-Venus') exigem o rótulo exato
  // 'Lilith'; qualquer variante com texto extra ficava fora de todo esse sistema, sem
  // aviso. Testamos por substring "lilith" (case-insensitive), que cobre todas as
  // variantes citadas sem risco de falso positivo (nenhum outro ponto usado no código
  // contém essa palavra).
  if (/lilith/i.test(s)) return 'Lilith';
  return s;
}

export function orbToDeg(deg,min){ return parseInt(deg,10) + parseInt(min,10)/60; }

export function orbTypeMultiplier(name){ return ORB_TYPE_MULT[name] ?? 1.0; }
export function effectiveMaxOrb(aspect, planet1, planet2){
  const base = ORB_BASE_MAX[aspect] ?? 8;
  return base * Math.min(orbTypeMultiplier(planet1), orbTypeMultiplier(planet2));
}
// Correção de auditoria #2 (calibrado com o usuário, caso Nodo-Quíron): o catMult=0.6
// acima resolvia a inversão de ORDEM entre maior/menor no MESMO orbe (ver comentário
// original acima do ORB_DECAY_DIVISOR), mas não segurava o caso em que os dois fatores
// fracos se empilham — um aspecto MENOR (já um sinal mais subtil por natureza) formado
// entre dois pontos NENHUM dos quais é planeta pessoal (CORE_PERSONAL_PLANETS: Sol/Lua/
// Mercúrio/Vênus/Marte) é um sinal duplamente auxiliar: nem o tipo geométrico nem o par
// carrega peso estrutural por si. Com orbe quase exato (orbW≈1), esse duplo-auxiliar
// ainda alcançava ~72% do teto de um par tier-1 (Lua-Lua etc) — o suficiente pra
// ultrapassar um trígono de Lua-Lua com orbe moderadamente aberto (~1.6°), o que não
// bate com a tradição: minor aspects entre pontos (sem nenhum pessoal envolvido) são
// lidos como nuance/reforço, não como evidência capaz de superar um dos marcadores mais
// citados da sinastria (Lua-Lua) mesmo com esse ainda dentro do orbe tradicionalmente
// tolerado (trígono de luminar: 6-8°).
//
// Correção de auditoria #3 (calibrado com o usuário, caso Lua-Quíron): a divisão acima
// era BINÁRIA (0 pessoais vs "pelo menos 1 pessoal" → mesmo 0.6 de sempre) — isso tratava
// Lua semiquadratura Quíron (só UM lado do par é pessoal, o outro é ponto moderno) igual
// a Sol semiquadratura Marte (os DOIS lados pessoais, lastro tradicional pleno). Na
// prática, Lua-Quíron quase exato (0.13°) ainda superava Mercúrio-Mercúrio trígono a
// 2.14° (0.605 vs 0.574) — mesmo padrão do caso Nodo-Quíron, só que mais sutil porque um
// dos dois lados É pessoal. Terceiro degrau: minorOnePersonal (0.45, entre o 0.6 de
// "dois pessoais" e o 0.35 de "nenhum pessoal") — reconhece que Lua-Quíron carrega mais
// peso que Nodo-Quíron (a Lua É um corpo pessoal de verdade), mas menos que Sol-Marte
// (só um dos dois lados do par é). Empurra o empate Lua-Quíron × Mercúrio-Mercúrio de
// ~2.00° pra ~2.73° — a mesma lógica de "correção moderada, não afundar à irrelevância"
// já usada nos dois degraus anteriores.
//
// Correção de auditoria #5 (calibrado com o usuário, caso Saturno-Lilith / Lilith-
// Plutão): as três correções acima só se aplicavam a MINOR_ASPECTS — um aspecto MAIOR
// (quadratura, sextil, trígono, oposição, conjunção) entre dois pontos NENHUM dos quais
// é planeta pessoal sempre recebia catMult=1.0 (major) cheio, mesmo quando o par também
// não tinha nenhuma entrada específica em AXIS_BOOST (ou seja: nem é planeta pessoal,
// nem é um eixo tradicionalmente citado como Nodo-Nodo/Saturno-Saturno/MC-Nodo, que o
// próprio AXIS_BOOST já reconhece e pesa mesmo sem pessoal envolvido). Na prática isso
// deixava Saturno quadratura Lilith a 0,47° (boost genérico 1.0 × catMult 1.0) e Lilith
// sextil Plutão a 0,35° empatarem/superarem Lua trígono Lua a 1,72° (boost 1.35 × catMult
// 1.0, mas orbe mais aberto) — dois pontos sem nenhum lastro pessoal nem eixo curado
// batendo um dos aspectos mais citados da tradição só por causa do orbe apertado.
// boost===1.0 aqui funciona como proxy de "par sem entrada curada no AXIS_BOOST" (a
// própria axisBoost() já retorna 1.0 nesse caso — ver função abaixo) — pares que O
// SISTEMA JÁ DECIDIU pesar mesmo sem pessoal (Nodo-Nodo, Saturno-Saturno, MC-Nodo etc.,
// todos com boost>1.0) continuam de fora dessa penalidade, de propósito: aqui só entra o
// "sobra" — combinação nem pessoal, nem reconhecida como eixo tradicional. 0.75 é mais
// suave que o 0.6 do minorBothPersonal (um aspecto MAIOR ainda carrega mais peso
// estrutural que um menor, mesmo sem pessoal/eixo — não faz sentido puni-lo tanto quanto
// um aspecto já subtil por natureza), mas suficiente pra tirar esses pares do caminho de
// Lua-Lua/Sol-Sol em orbes comparáveis.
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

export function parseText(text){
  const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
  const aspects = [];
  const houses = [];
  // linhas que têm "Orb:" (ou seja, claramente são uma linha de aspecto) mas que não
  // conseguimos interpretar — aspecto fora do vocabulário suportado, ou formato
  // ligeiramente diferente do esperado. Antes isso era perdido sem nenhum aviso.
  let unrecognizedCount = 0;

  for (const line of lines){
    if (line.startsWith('Sinastria')) continue;

    // House overlay line
    let hm = line.match(/^(.+?)'s\s+(.+?)\s+in\s+the\s+(\d+)(?:st|nd|rd|th)\s+(.+?)'s\s+house/i);
    if (hm){
      houses.push({
        p1: hm[1].trim(), planet: normPlanet(hm[2]), house: parseInt(hm[3],10), p2: hm[4].trim()
      });
      continue;
    }

    // Aspect line — must contain Orb and one aspect keyword
    if (!/Orb:/.test(line)) continue;
    let aspectWord = null, kIdx = -1;
    for (const w of ASPECT_WORDS){
      const idx = line.indexOf(w);
      if (idx !== -1 && (kIdx === -1 || idx < kIdx)){ kIdx = idx; aspectWord = w; }
    }
    if (!aspectWord){ unrecognizedCount++; continue; }

    const left = line.slice(0, kIdx);
    const right = line.slice(kIdx + aspectWord.length);

    let p1, planet1, sign1, p2, planet2, sign2, deg, min;

    // Try REGULAR: left = "P1's Planet in Sign", right = "P2's Planet in Sign (Orb: D°M'"
    // flag "i" pq alguns relatórios exportam "'s" com S maiúsculo (ex: "GD'S Mars...")
    let lm = left.match(/^(.+?)'s\s+(.+?)\s+in\s+(\w+)\s*$/i);
    let rm = right.match(/^\s*(.+?)'s\s+(.+?)\s+in\s+(\w+)\s+\(Orb:\s*(\d+)°(\d+)/i);
    if (lm && rm){
      p1 = lm[1]; planet1 = lm[2]; sign1 = lm[3];
      p2 = rm[1]; planet2 = rm[2]; sign2 = rm[3]; deg = rm[4]; min = rm[5];
    } else {
      // Try IRREGULAR: left = "P1's Planet in Sign P2's", right = "Planet in Sign (Orb: D°M'"
      let lm2 = left.match(/^(.+?)'s\s+(.+?)\s+in\s+(\w+)\s+(.+?)'s\s*$/i);
      let rm2 = right.match(/^\s*(.+?)\s+in\s+(\w+)\s+\(Orb:\s*(\d+)°(\d+)/);
      if (lm2 && rm2){
        p1 = lm2[1]; planet1 = lm2[2]; sign1 = lm2[3]; p2 = lm2[4];
        planet2 = rm2[1]; sign2 = rm2[2]; deg = rm2[3]; min = rm2[4];
      } else {
        unrecognizedCount++;
        continue; // unparseable line, skip
      }
    }

    aspects.push({
      p1: p1.trim(), planet1: normPlanet(planet1), sign1,
      p2: p2.trim(), planet2: normPlanet(planet2), sign2,
      aspect: aspectWord, orb: orbToDeg(deg,min)
    });
  }

  // relatórios às vezes listam o mesmo par de aspecto duas vezes (A→B e B→A,
  // ou a linha repetida) — sem isso, o peso desse aspecto dobra indevidamente.
  const dedupedAspects = dedupeAspects(aspects);
  const duplicatesRemoved = aspects.length - dedupedAspects.length;

  // Nodo Sul é sempre o Nodo Norte + 180° — então TODO aspecto ao Nodo Norte tem um
  // "eco" geometricamente automático ao Nodo Sul (e vice-versa), mesmo sem ser
  // duplicata textual: conjunção vira oposição, trígono vira sextil, sextil vira
  // trígono, semisextil vira quincúncio, quincúncio vira semisextil, e quadratura
  // continua quadratura (90° de P é sempre também 90° de P+180). Muitos relatórios
  // listam as duas leituras como se fossem fatos independentes — sem colapsar isso,
  // um único alinhamento nodal conta 2x (ou até 4x, quando os dois lados do par
  // envolvem Nodo) tanto no peso do harmonyPct quanto nos marcadores narrativos.
  const { collapsed: nodeCollapsedAspects, nodeMirrorsCollapsed } = collapseNodeMirrors(dedupedAspects);

  // Ascendente/Descendente (cruzamento eclíptica-horizonte) e MC/IC (cruzamento
  // eclíptica-meridiano) são, cada par, sempre exatamente opostos entre si — mesma
  // geometria do Nodo Norte/Sul (ver collapseAxisMirrors acima), então sujeitos ao mesmo
  // tipo de eco duplicado se o relatório listar aspectos aos quatro ângulos
  // separadamente. Encadeado depois do Nodo: cada passada só enxerga o eixo que lhe
  // interessa (isAxis checa só primaryPoint/secondaryPoint daquela chamada), então a
  // ordem entre os três não importa — não há sobreposição entre os três eixos.
  const { collapsed: ascDscCollapsedAspects, mirrorsCollapsed: ascDscMirrorsCollapsed } =
    collapseAxisMirrors(nodeCollapsedAspects, 'Ascendant', 'DSC');
  const { collapsed: mcIcCollapsedAspects, mirrorsCollapsed: mcIcMirrorsCollapsed } =
    collapseAxisMirrors(ascDscCollapsedAspects, 'MC', 'IC');

  return {
    aspects: mcIcCollapsedAspects, houses, duplicatesRemoved, unrecognizedCount,
    nodeMirrorsCollapsed, ascDscMirrorsCollapsed, mcIcMirrorsCollapsed
  };
}

// Remove ecos redundantes entre Nodo Norte e Nodo Sul: quando um aspecto ao Nodo Sul
// tem um par correspondente ao Nodo Norte (mesmas duas pessoas, mesmo "outro" planeta/
// ponto, aspecto espelhado por NODE_MIRROR_ASPECT, orbe batendo bem de perto — tolerância
// pequena pra cobrir arredondamento de origem), mantém só a versão do Nodo Norte (é o
// ponto tradicionalmente mais citado) e descarta o eco do Nodo Sul. Se não houver par
// correspondente (relatório só listou um lado), mantém como está — ainda vira marcador,
// só que via SouthNode em vez de Node.
// Generalização de collapseNodeMirrors (ver comentário original abaixo) pra qualquer
// par de pontos sempre-opostos-por-180°: Nodo Norte/Sul foi o primeiro caso resolvido,
// mas Ascendente/Descendente (cruzamento eclíptica-horizonte) e MC/IC (cruzamento
// eclíptica-meridiano) têm exatamente a mesma propriedade geométrica — dois grandes
// círculos sempre se cruzam em dois pontos antípodas, então TODO par de "eixo fixo"
// (não só o nodal) tem esse mesmo problema de eco duplicado se o relatório listar os
// dois lados como aspectos independentes. primaryPoint é o lado preferido quando os
// dois aparecem (Node/Ascendant/MC — os pontos tradicionalmente mais citados);
// secondaryPoint é o lado descartado quando encontra o eco (SouthNode/DSC/IC).
export function collapseAxisMirrors(aspects, primaryPoint, secondaryPoint){
  const ORB_TOLERANCE = 0.05; // graus — cobre diferença de arredondamento entre as duas linhas
  const isAxis = p => p === primaryPoint || p === secondaryPoint;
  const toDrop = new Set();

  for (let i = 0; i < aspects.length; i++){
    const a = aspects[i];
    // só nos interessa quando ALGUM lado do aspecto é o ponto secundário (candidato a eco)
    if (a.planet1 !== secondaryPoint && a.planet2 !== secondaryPoint) continue;
    if (toDrop.has(i)) continue;

    for (let j = 0; j < aspects.length; j++){
      if (i === j || toDrop.has(j)) continue;
      const b = aspects[j];
      if (!isAxis(b.planet1) && !isAxis(b.planet2)) continue;
      // "b" precisa ter o ponto primário no lugar exato onde "a" tem o secundário, com o
      // mesmo "outro" planeta/pessoa do outro lado, e o mesmo par de pessoas
      const sameOtherSide =
        (a.planet1 === secondaryPoint && b.planet1 === primaryPoint && a.planet2 === b.planet2 && a.p1 === b.p1 && a.p2 === b.p2) ||
        (a.planet2 === secondaryPoint && b.planet2 === primaryPoint && a.planet1 === b.planet1 && a.p1 === b.p1 && a.p2 === b.p2);
      if (!sameOtherSide) continue;
      if (NODE_MIRROR_ASPECT[a.aspect] !== b.aspect) continue;
      if (Math.abs(a.orb - b.orb) > ORB_TOLERANCE) continue;
      // achou o par espelhado — descarta o lado secundário, mantém o primário
      toDrop.add(i);
      break;
    }
  }

  // Caso à parte: quando os DOIS lados do aspecto são desse mesmo eixo (ex: Ascendente
  // de A tocando o eixo Ascendente/Descendente de B), o loop acima não pega, porque ele
  // exige um "outro lado" fixo e fora do eixo (ex: Sol) pra comparar. Aqui os dois lados
  // são móveis ao mesmo tempo — mesma lógica alinhado/cruzado do caso nodal original.
  for (let i = 0; i < aspects.length; i++){
    const a = aspects[i];
    if (toDrop.has(i)) continue;
    if (!isAxis(a.planet1) || !isAxis(a.planet2)) continue; // precisa ser do eixo dos dois lados

    for (let j = i + 1; j < aspects.length; j++){
      if (toDrop.has(j)) continue;
      const b = aspects[j];
      if (!isAxis(b.planet1) || !isAxis(b.planet2)) continue;
      if (a.p1 !== b.p1 || a.p2 !== b.p2) continue; // mesmo par de pessoas, mesma orientação
      if (a.aspect !== b.aspect) continue; // eco totalmente no eixo preserva o tipo de aspecto
      if (Math.abs(a.orb - b.orb) > ORB_TOLERANCE) continue;

      // "alinhado" = os dois lados são do mesmo tipo (primário-primário ou
      // secundário-secundário); "cruzado" = um lado de cada. Só colapsa dentro do mesmo
      // grupo — um alinhado nunca é eco de um cruzado (medem ângulos diferentes de verdade).
      const aAligned = a.planet1 === a.planet2;
      const bAligned = b.planet1 === b.planet2;
      if (aAligned !== bAligned) continue;

      // mantém a versão com o ponto primário — dentro do grupo alinhado, primário-primário
      // > secundário-secundário; dentro do grupo cruzado, prioriza o lado de p1 sendo primário.
      const aHasPrimaryFirst = a.planet1 === primaryPoint;
      const bHasPrimaryFirst = b.planet1 === primaryPoint;
      if (aHasPrimaryFirst && !bHasPrimaryFirst){ toDrop.add(j); }
      else if (!aHasPrimaryFirst && bHasPrimaryFirst){ toDrop.add(i); break; }
      else { toDrop.add(j); } // ambíguo (ambos ou nenhum começam com o primário) — mantém o primeiro
    }
  }

  const collapsed = aspects.filter((_, idx) => !toDrop.has(idx));
  return { collapsed, mirrorsCollapsed: toDrop.size };
}

// Nodo Norte/Sul: primeiro caso resolvido (ver collapseAxisMirrors acima pra explicação
// geométrica completa). Mantido como wrapper nomeado — nodeMirrorsCollapsed já é
// consumido em outros pontos do arquivo com esse nome.
export function collapseNodeMirrors(aspects){
  const { collapsed, mirrorsCollapsed } = collapseAxisMirrors(aspects, 'Node', 'SouthNode');
  return { collapsed, nodeMirrorsCollapsed: mirrorsCollapsed };
}

export function dedupeAspects(aspects){
  const byKey = new Map();
  for (const a of aspects){
    // chave simétrica: não importa se A-planeta veio primeiro ou segundo
    const sideA = `${a.p1.toLowerCase()}::${a.planet1.toLowerCase()}`;
    const sideB = `${a.p2.toLowerCase()}::${a.planet2.toLowerCase()}`;
    const key = [sideA, sideB].sort().join('||') + '||' + a.aspect;
    const existing = byKey.get(key);
    // se aparecer mais de uma vez, fica só a leitura com orbe mais exato
    if (!existing || a.orb < existing.orb){
      byKey.set(key, a);
    }
  }
  return Array.from(byKey.values());
}

// Conta, pra cada par de planetas (não-direcional), quantos aspectos existem entre as
// duas pessoas. Quando o mesmo par aparece nos dois sentidos — ex: Vênus de A com Marte
// de B, E Marte de A com Vênus de B — isso é reciprocidade: um reforço mútuo clássico em
// sinastria (não é a mesma coisa que duplicata, que já é removida em dedupeAspects; aqui
// são dois aspectos genuinamente diferentes que por acaso "fecham o ciclo" no mesmo eixo).
export function reciprocityCounts(aspects){
  const counts = new Map();
  for (const a of aspects){
    const planetPair = [a.planet1, a.planet2].sort().join('-');
    counts.set(planetPair, (counts.get(planetPair) || 0) + 1);
  }
  return counts;
}

