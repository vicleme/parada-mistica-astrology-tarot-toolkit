/**
 * houses.js — Marcadores derivados de sobreposição de casa entre os dois mapas
 * (convergência geral, casas de compromisso/destino/amizade, Quíron/Plutão na
 * 7ª...). Usado só dentro do cálculo principal, não tem consumidor de UI direto.
 * Depende de: labels.js, pairs.js.
 * Usado por: compute.js.
 */

import { PLANET_LABEL_PT } from './labels.js';
import { CHIRON_PARTNERSHIP_HOUSES, CORE_PERSONAL_PLANETS, DESTINY_ANCHORS, FRIENDSHIP_HOUSES, MARRIAGE_HOUSES, PLUTO_PARTNERSHIP_HOUSES, THEMATIC_HOUSES } from './pairs.js';

export function computeHouseConvergence(houses){
  const contacts = [];
  const details = [];
  const seen = new Set();

  for (const h of houses){
    if (!CORE_PERSONAL_PLANETS.has(h.planet)) continue;
    const planetLabel = PLANET_LABEL_PT[h.planet] || h.planet;

    const reciprocal = houses.find(h2 =>
      h2 !== h && h2.planet === h.planet && h2.house === h.house &&
      h2.p1 === h.p2 && h2.p2 === h.p1
    );

    if (reciprocal){
      const key = [`${h.p1}-${h.planet}-${h.house}`, `${reciprocal.p1}-${reciprocal.planet}-${reciprocal.house}`].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      contacts.push({ type:'reciprocal' });
      details.push(`${h.p1} (${planetLabel}) na ${h.house}ª de ${h.p2} ↔ ${reciprocal.p1} (${planetLabel}) na ${reciprocal.house}ª de ${reciprocal.p2} — sobreposição recíproca`);
    } else if (THEMATIC_HOUSES.has(h.house)){
      contacts.push({ type:'thematic' });
      details.push(`${h.p1} (${planetLabel}) na ${h.house}ª de ${h.p2}`);
    }
  }

  return { houseConvergenceContacts: contacts.length, houseConvergenceDetails: details };
}

export function computeCommitmentHouses(houses){
  const contacts = [];
  const details = [];
  const seen = new Set();

  for (const h of houses){
    if (h.planet !== 'Sun' && h.planet !== 'Moon' && h.planet !== 'Saturn') continue;
    if (!MARRIAGE_HOUSES.has(h.house)) continue;
    const key = `${h.p1}-${h.planet}-${h.house}-${h.p2}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const planetLabel = PLANET_LABEL_PT[h.planet] || h.planet;

    // recíproco aqui não exige a MESMA casa nos dois sentidos (ex: Sol de A na 7ª de B
    // E Lua de B na 4ª de A já é reforço mútuo de "vida a dois" — não precisa ser
    // simetria perfeita de casa/planeta como em computeHouseConvergence, porque o que
    // importa aqui é "os dois se enxergam num dos quatro ângulos", não um espelho exato).
    const reciprocal = houses.find(h2 =>
      h2 !== h && (h2.planet === 'Sun' || h2.planet === 'Moon' || h2.planet === 'Saturn') &&
      MARRIAGE_HOUSES.has(h2.house) && h2.p1 === h.p2 && h2.p2 === h.p1
    );

    contacts.push({ house: h.house, reciprocal: !!reciprocal });
    details.push(`${h.p1} (${planetLabel}) na ${h.house}ª de ${h.p2}${reciprocal ? ' — sobreposição recíproca (ângulo dos dois lados)' : ''}`);
  }

  return { commitmentHouseContacts: contacts.length, commitmentHouseDetails: details };
}

// Casas de "eixo Destino": mesmos quatro ângulos de MARRIAGE_HOUSES (1ª/4ª/7ª/10ª), mas
// agora com Nodo Norte, Nodo Sul ou Vértice caindo ali — mesmo raciocínio usado em
// DESTINY_ANCHORS/axisPoolFor pro lado dos aspectos: esses três pontos são a mesma
// "família" de destino/encontro com peso, e um deles caindo bem num ângulo (não só
// aspectando um planeta pessoal) é lido pela tradição como sinal de que o vínculo tem
// peso/significado kármico "instalado na estrutura" do relacionamento, não só de
// passagem. Análogo estrutural do que Sol/Lua fazem em MARRIAGE_HOUSES (identidade e
// necessidade emocional), só que no eixo Destino em vez do eixo Estrutura — por isso
// tem função e marcador PRÓPRIOS, não bundled em computeCommitmentHouses.
export function computeDestinyHouses(houses){
  const contacts = [];
  const details = [];
  const seen = new Set();

  for (const h of houses){
    if (!DESTINY_ANCHORS.has(h.planet)) continue;
    if (!MARRIAGE_HOUSES.has(h.house)) continue;
    const key = `${h.p1}-${h.planet}-${h.house}-${h.p2}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const planetLabel = PLANET_LABEL_PT[h.planet] || h.planet;

    // mesmo espírito de reciprocidade "frouxa" de computeCommitmentHouses: não exige a
    // MESMA casa/ponto nos dois sentidos, só que os dois lados tenham algum ponto de
    // DESTINY_ANCHORS caindo em algum dos quatro ângulos do outro.
    const reciprocal = houses.find(h2 =>
      h2 !== h && DESTINY_ANCHORS.has(h2.planet) &&
      MARRIAGE_HOUSES.has(h2.house) && h2.p1 === h.p2 && h2.p2 === h.p1
    );

    contacts.push({ house: h.house, reciprocal: !!reciprocal });
    details.push(`${h.p1} (${planetLabel}) na ${h.house}ª de ${h.p2}${reciprocal ? ' — sobreposição recíproca (ângulo dos dois lados)' : ''}`);
  }

  return { destinyHouseContacts: contacts.length, destinyHouseDetails: details };
}

export function computeFriendshipHouses(houses){
  const contacts = [];
  const details = [];
  const seen = new Set();

  for (const h of houses){
    if (h.planet !== 'Jupiter') continue;
    if (!FRIENDSHIP_HOUSES.has(h.house)) continue;
    const key = `${h.p1}-${h.planet}-${h.house}-${h.p2}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // recíproco: o Júpiter dos DOIS lados cai na 11ª do outro — reforço mútuo de
    // "cada um traz sorte/expansão pro círculo social do outro", não só de um lado.
    const reciprocal = houses.find(h2 =>
      h2 !== h && h2.planet === 'Jupiter' &&
      FRIENDSHIP_HOUSES.has(h2.house) && h2.p1 === h.p2 && h2.p2 === h.p1
    );

    contacts.push({ house: h.house, reciprocal: !!reciprocal });
    details.push(`${h.p1} (Júpiter) na ${h.house}ª de ${h.p2}${reciprocal ? ' — sobreposição recíproca (Júpiter dos dois lados)' : ''}`);
  }

  return { friendshipHouseContacts: contacts.length, friendshipHouseDetails: details };
}

export function computeChironPartnershipHouse(houses){
  const contacts = [];
  const details = [];
  const seen = new Set();

  for (const h of houses){
    if (h.planet !== 'Chiron') continue;
    if (!CHIRON_PARTNERSHIP_HOUSES.has(h.house)) continue;
    const key = `${h.p1}-${h.planet}-${h.house}-${h.p2}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const reciprocal = houses.find(h2 =>
      h2 !== h && h2.planet === 'Chiron' &&
      CHIRON_PARTNERSHIP_HOUSES.has(h2.house) && h2.p1 === h.p2 && h2.p2 === h.p1
    );

    contacts.push({ house: h.house, reciprocal: !!reciprocal });
    details.push(`${h.p1} (Quíron) na ${h.house}ª de ${h.p2}${reciprocal ? ' — sobreposição recíproca (Quíron dos dois lados)' : ''}`);
  }

  return { chironPartnershipHouseContacts: contacts.length, chironPartnershipHouseDetails: details };
}

export function computePlutoPartnershipHouse(houses){
  const contacts = [];
  const details = [];
  const seen = new Set();

  for (const h of houses){
    if (h.planet !== 'Pluto') continue;
    if (!PLUTO_PARTNERSHIP_HOUSES.has(h.house)) continue;
    const key = `${h.p1}-${h.planet}-${h.house}-${h.p2}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const reciprocal = houses.find(h2 =>
      h2 !== h && h2.planet === 'Pluto' &&
      PLUTO_PARTNERSHIP_HOUSES.has(h2.house) && h2.p1 === h.p2 && h2.p2 === h.p1
    );

    contacts.push({ house: h.house, reciprocal: !!reciprocal });
    details.push(`${h.p1} (Plutão) na ${h.house}ª de ${h.p2}${reciprocal ? ' — sobreposição recíproca (Plutão dos dois lados)' : ''}`);
  }

  return { plutoPartnershipHouseContacts: contacts.length, plutoPartnershipHouseDetails: details };
}

