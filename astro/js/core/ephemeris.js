// ============================================================================
// core/ephemeris.js
// Elementos orbitais keplerianos e cálculo heliocêntrico das posições planetárias
// (válido ~1900-2100), série lunar de termos periódicos, e o agregador
// computeDayPositions() que devolve a posição geocêntrica de todos os corpos
// para um dado tempo juliano T (em séculos julianos desde J2000).
// ============================================================================

import { RAD, normDeg } from './time.js';

export const ELEMENTS = {
 Mercurio: {a:[0.38709927,0.00000037], e:[0.20563593,0.00001906], i:[7.00497902,-0.00594749], L:[252.25032350,149472.67411175], peri:[77.45779628,0.16047689], node:[48.33076593,-0.12534081]},
 Venus:    {a:[0.72333566,0.00000390], e:[0.00677672,-0.00004107], i:[3.39467605,-0.00078890], L:[181.97909950,58517.81538729], peri:[131.60246718,0.00268329], node:[76.67984255,-0.27769418]},
 Terra:    {a:[1.00000261,0.00000562], e:[0.01671123,-0.00004392], i:[-0.00001531,-0.01294668], L:[100.46457166,35999.37244981], peri:[102.93768193,0.32327364], node:[0.0,0.0]},
 Marte:    {a:[1.52371034,0.00001847], e:[0.09339410,0.00007882], i:[1.84969142,-0.00813131], L:[-4.55343205,19140.30268499], peri:[-23.94362959,0.44441088], node:[49.55953891,-0.29257343]},
 Jupiter:  {a:[5.20288700,-0.00011607], e:[0.04838624,-0.00013253], i:[1.30439695,-0.00183714], L:[34.39644051,3034.74612775], peri:[14.72847983,0.21252668], node:[100.47390909,0.20469106]},
 Saturno:  {a:[9.53667594,-0.00125060], e:[0.05386179,-0.00050991], i:[2.48599187,0.00193609], L:[49.95424423,1222.49362201], peri:[92.59887831,-0.41897216], node:[113.66242448,-0.28867794]},
 Urano:    {a:[19.18916464,-0.00196176], e:[0.04725744,-0.00004397], i:[0.77263783,-0.00242939], L:[313.23810451,428.48202785], peri:[170.95427630,0.40805281], node:[74.01692503,0.04240589]},
 Netuno:   {a:[30.06992276,0.00026291], e:[0.00859048,0.00005105], i:[1.77004347,0.00035372], L:[-55.12002969,218.45945325], peri:[44.96476227,-0.32241464], node:[131.78422574,-0.00508664]},
 Plutao:   {a:[39.48211675,-0.00031596], e:[0.24882730,0.00005170], i:[17.14001206,0.00004818], L:[238.92903833,145.20780515], peri:[224.06891629,-0.04062942], node:[110.30393684,-0.01183482]},
 // Quíron (2060 Chiron): elementos osculadores em J2000 (JD 2451545.0), sem taxas seculares de i/e/peri/node
 // (órbita de centauro perturbada por Saturno/Júpiter, não segue Kepler puro a longo prazo).
 // a=13.70 UA, e=0.3772, i=6.93°, arg. periélio=339.48°, nodo=209.38°, anomalia média=13.18° em J2000.
 // Período ~50.71 anos → movimento médio ~709.85°/século, usado apenas em L.
 Quiron:   {a:[13.70,0], e:[0.3772,0], i:[6.93,0], L:[202.04,709.85], peri:[188.86,0], node:[209.38,0]}
};

export function keplerSolve(M,e){
  let E=M;
  for(let k=0;k<50;k++){
    const dE=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
    E-=dE;
    if(Math.abs(dE)<1e-9) break;
  }
  return E;
}
export function heliocentric(el,T){
  const a=el.a[0]+el.a[1]*T;
  const e=el.e[0]+el.e[1]*T;
  const i=(el.i[0]+el.i[1]*T)*RAD;
  const L=normDeg(el.L[0]+el.L[1]*T);
  const peri=normDeg(el.peri[0]+el.peri[1]*T);
  const node=normDeg(el.node[0]+el.node[1]*T);
  const w=normDeg(peri-node)*RAD;
  const Om=node*RAD;
  let M=normDeg(L-peri); if(M>180) M-=360; M*=RAD;
  const E=keplerSolve(M,e);
  const xOrb=a*(Math.cos(E)-e);
  const yOrb=a*Math.sqrt(1-e*e)*Math.sin(E);
  const cw=Math.cos(w), sw=Math.sin(w), co=Math.cos(Om), so=Math.sin(Om), ci=Math.cos(i), si=Math.sin(i);
  const x=(cw*co-sw*so*ci)*xOrb + (-sw*co-cw*so*ci)*yOrb;
  const y=(cw*so+sw*co*ci)*xOrb + (-sw*so+cw*co*ci)*yOrb;
  return {x,y};
}
export function moonLongitude(T){
  const D=normDeg(297.8501921+445267.1114034*T-0.0018819*T*T)*RAD;
  const M=normDeg(357.5291092+35999.0502909*T-0.0001536*T*T)*RAD;
  const Mp=normDeg(134.9633964+477198.8675055*T+0.0087414*T*T)*RAD;
  const F=normDeg(93.2720950+483202.0175233*T-0.0036539*T*T)*RAD;
  const Lp=normDeg(218.3164477+481267.88123421*T-0.0015786*T*T);
  let s=6.288774*Math.sin(Mp)+1.274027*Math.sin(2*D-Mp)+0.658314*Math.sin(2*D)+0.213618*Math.sin(2*Mp)
   -0.185116*Math.sin(M)-0.114332*Math.sin(2*F)+0.058793*Math.sin(2*D-2*Mp)+0.057066*Math.sin(2*D-M-Mp)
   +0.053322*Math.sin(2*D+Mp)+0.045758*Math.sin(2*D-M)-0.040923*Math.sin(M-Mp)-0.034720*Math.sin(D)
   -0.030383*Math.sin(M+Mp)+0.015327*Math.sin(2*D-2*F)-0.012528*Math.sin(Mp+2*F)+0.010980*Math.sin(Mp-2*F)
   +0.010675*Math.sin(4*D-Mp)+0.010034*Math.sin(3*Mp)+0.008548*Math.sin(4*D-2*Mp)-0.007888*Math.sin(2*D+M-Mp)
   -0.006766*Math.sin(2*D+M)-0.005163*Math.sin(D-Mp)+0.004987*Math.sin(D+M)+0.004036*Math.sin(2*D-M+Mp)
   +0.003994*Math.sin(2*D+2*Mp)+0.003861*Math.sin(4*D)+0.003665*Math.sin(2*D-3*Mp)-0.002689*Math.sin(M-2*Mp)
   -0.002602*Math.sin(2*D-Mp+2*F)+0.002390*Math.sin(2*D-M-Mp);
  return normDeg(Lp+s);
}
// ---------------------------------------------------------------------------
// Sizígia Pré-Natal (SAN) — a Lua Nova ou Cheia mais recente antes do
// nascimento, um dos 5 "lugares da vida" usados no Almuten Figuris (ver
// computeAlmutenFiguris em dignities.js). Não existe fórmula fechada pra
// isso: busca-se retroativamente no tempo o instante exato em que a
// elongação Lua-Sol cruza 0° (conjunção/Lua Nova) ou 180° (oposição/Lua
// Cheia), partindo do nascimento.
//
// Método: acompanha a elongação de forma "desembrulhada" (soma/subtrai 360°
// a cada passo pra não perder a continuidade ao cruzar 0°/360°) enquanto
// recua em passos de 1 dia, até passar do alvo (0° ou 180°, o que estiver
// mais próximo abaixo da elongação de nascimento); depois refina por
// bisseção. Precisão final bem abaixo de 1 minuto de tempo, suficiente pra
// qualquer diferença de grau na dignidade essencial.
// ---------------------------------------------------------------------------
const DAY_T = 1/36525; // 1 dia em séculos julianos
function elongationAt(T){
  const pos = computeDayPositions(T);
  return {raw: normDeg(pos.Lua - pos.Sol), pos};
}
export function computePrenatalSyzygy(Tbirth){
  if(Tbirth==null) return null;
  const birth = elongationAt(Tbirth);
  const refE = birth.raw; // [0,360)
  const target = Math.floor(refE/180)*180; // 0 (Lua Nova) ou 180 (Lua Cheia) — o mais próximo abaixo
  function unwrapped(T){
    let e = normDeg(computeDayPositions(T).Lua - computeDayPositions(T).Sol);
    while(e - refE > 180) e -= 360;
    while(e - refE < -180) e += 360;
    return e;
  }
  let Tprev = Tbirth, Eprev = refE;
  let Tcur = Tbirth, Ecur = refE;
  let iterations = 0;
  while(Ecur > target && iterations < 60){
    Tprev = Tcur; Eprev = Ecur;
    Tcur = Tcur - DAY_T;
    Ecur = unwrapped(Tcur);
    iterations++;
  }
  // Bisseção entre Tcur (E<=target) e Tprev (E>=target)
  let a = Tcur, b = Tprev;
  for(let i=0;i<40;i++){
    const mid = (a+b)/2;
    const Emid = unwrapped(mid);
    if(Emid > target) b = mid; else a = mid;
  }
  const Tsyzygy = (a+b)/2;
  const pos = computeDayPositions(Tsyzygy);
  const isNewMoon = target % 360 === 0;
  // Lua Nova: Sol e Lua no mesmo grau (uso o do Sol); Lua Cheia: uso o grau
  // da Lua — convenção clássica (Valens/Hefestião) pra "grau da sizígia".
  const lon = isNewMoon ? pos.Sol : pos.Lua;
  return {lon, isNewMoon, T: Tsyzygy};
}
export function computeDayPositions(T){
  const earth=heliocentric(ELEMENTS.Terra,T);
  const out={};
  out.Sol=normDeg(Math.atan2(earth.y,earth.x)/RAD+180);
  out.Lua=moonLongitude(T);
  out.NodoNorte=normDeg(125.04452-1934.136261*T);
  // Lilith média (apogeu lunar médio) — mesmo tipo de fórmula polinomial de movimento
  // médio usada acima pro Nodo Norte médio (não é a Lilith osculante/"true", que exige
  // perturbações do Sol). A constante 83.3532465+4069.0137287*T é o PERIGEU lunar médio
  // (Meeus, "Astronomical Algorithms", eq. 45.7) — a Lilith (apogeu) é o perigeu +180°.
  out.Lilith=normDeg(83.3532465+4069.0137287*T+180);
  ["Mercurio","Venus","Marte","Jupiter","Saturno","Urano","Netuno","Plutao","Quiron"].forEach(name=>{
    const p=heliocentric(ELEMENTS[name],T);
    out[name]=normDeg(Math.atan2(p.y-earth.y,p.x-earth.x)/RAD);
  });
  return out;
}
