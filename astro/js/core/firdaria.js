// ============================================================================
// core/firdaria.js
// Fase 2 (parte 2): Firdaria (sistema persa de períodos planetários por
// idade). Depende da Seita (ver structural.js/computeSect) — a ordem dos 9
// períodos maiores muda conforme o mapa é diurno ou noturno — e da idade
// exata da pessoa (não é geometria do mapa, é um motor de tempo histórico).
//
// IMPORTANTE — convenções adotadas (confira contra sua referência):
// 1) Ordem e duração dos 9 períodos maiores (Sol 10, Vênus 8, Mercúrio 13,
//    Lua 9, Saturno 11, Júpiter 12, Marte 7, Nodo Norte 3, Nodo Sul 2 — soma
//    75 anos) é a tabela clássica padrão, sem ambiguidade relevante de
//    escola: só a ORDEM muda entre dia/noite (mapa diurno começa no Sol,
//    noturno começa na Lua), a duração de cada planeta é a mesma nos dois.
// 2) Subperíodos: cada um dos 9 períodos maiores se divide em 7 subperíodos
//    iguais (duração do maior ÷ 7), um pra cada planeta clássico (SEM os
//    nodos), percorrendo a MESMA ordem dia/noite dos 7 clássicos dentro
//    dela, começando pelo próprio regente do período maior quando ele é um
//    dos 7 clássicos. Nos dois períodos de nodo (que não são planetas),
//    a subdivisão começa do primeiro da ordem clássica (Sol se diurno, Lua
//    se noturno) — essa parte específica (início da subdivisão nos períodos
//    de nodo) é a convenção mais comum que encontrei, mas é o ponto mais
//    sujeito a variar entre autores; vale conferir contra sua fonte.
// 3) Ciclo além de 75 anos: reinicia (2º ciclo etc.) — mantido só por
//    completude, a tradição raramente interpreta além do 1º ciclo.
// ============================================================================

export const FIRDARIA_YEARS = {
  Sol:10, Venus:8, Mercurio:13, Lua:9, Saturno:11, Jupiter:12, Marte:7, NodoNorte:3, NodoSul:2
};
export const FIRDARIA_ORDER_DAY   = ['Sol','Venus','Mercurio','Lua','Saturno','Jupiter','Marte','NodoNorte','NodoSul'];
export const FIRDARIA_ORDER_NIGHT = ['Lua','Saturno','Jupiter','Marte','Sol','Venus','Mercurio','NodoNorte','NodoSul'];
const CLASSICAL_ORDER_DAY   = ['Sol','Venus','Mercurio','Lua','Saturno','Jupiter','Marte'];
const CLASSICAL_ORDER_NIGHT = ['Lua','Saturno','Jupiter','Marte','Sol','Venus','Mercurio'];

export const FIRDARIA_CYCLE_YEARS = FIRDARIA_ORDER_DAY.reduce((s,p)=>s+FIRDARIA_YEARS[p], 0); // 75

// Constrói a lista dos 9 períodos maiores com início/fim em anos de idade
// (0-indexado a partir do nascimento), pra um ciclo (0..75).
function buildMajorPeriods(isDay){
  const order = isDay ? FIRDARIA_ORDER_DAY : FIRDARIA_ORDER_NIGHT;
  let acc = 0;
  return order.map(planet=>{
    const years = FIRDARIA_YEARS[planet];
    const period = {planet, startAge: acc, endAge: acc+years, years};
    acc += years;
    return period;
  });
}

// Subperíodos de UM período maior: 7 fatias iguais, ordem clássica dia/noite
// começando no próprio regente (se ele for um dos 7 clássicos) ou no
// primeiro da ordem clássica (se o período maior for de nodo).
function buildSubPeriods(major, isDay){
  const classicalOrder = isDay ? CLASSICAL_ORDER_DAY : CLASSICAL_ORDER_NIGHT;
  const startIdx = classicalOrder.indexOf(major.planet);
  const rotated = startIdx>=0
    ? classicalOrder.slice(startIdx).concat(classicalOrder.slice(0,startIdx))
    : classicalOrder.slice();
  const subYears = major.years/7;
  let acc = major.startAge;
  return rotated.map(planet=>{
    const sub = {planet, startAge: acc, endAge: acc+subYears};
    acc += subYears;
    return sub;
  });
}

// Ponto de entrada: dado a idade exata (anos, fracionária) e a Seita
// (isDay=true/false), devolve o período maior e o subperíodo ativos.
export function computeFirdaria(ageYears, isDay){
  const cycle = Math.floor(ageYears / FIRDARIA_CYCLE_YEARS);
  const ageInCycle = ageYears - cycle*FIRDARIA_CYCLE_YEARS;
  const majors = buildMajorPeriods(isDay);
  const major = majors.find(m=>ageInCycle>=m.startAge && ageInCycle<m.endAge) || majors[majors.length-1];
  const subs = buildSubPeriods(major, isDay);
  const sub = subs.find(s=>ageInCycle>=s.startAge && ageInCycle<s.endAge) || subs[subs.length-1];
  return {
    ageYears, cycle, ageInCycle,
    major: {planet: major.planet, startAge: major.startAge+cycle*FIRDARIA_CYCLE_YEARS, endAge: major.endAge+cycle*FIRDARIA_CYCLE_YEARS, years: major.years},
    sub: {planet: sub.planet, startAge: sub.startAge+cycle*FIRDARIA_CYCLE_YEARS, endAge: sub.endAge+cycle*FIRDARIA_CYCLE_YEARS},
    majors, // lista completa do ciclo, pra eventualmente exibir a linha do tempo inteira
  };
}

// Idade exata em anos (fracionária) a partir do JD de nascimento e do JD de
// "hoje" (ambos no mesmo referencial — quem chama passa jdNow calculado com
// a mesma função toJD/dateToJD_UT usada pro nascimento).
export function ageInYears(birthJD, nowJD){
  return (nowJD - birthJD) / 365.25;
}
