// ============================================================================
// core/houses.js
// Ascendente, Meio do Céu, Vértice e os três sistemas de casas (Signos Inteiros,
// Casas Iguais, Placidus por trisecção do arco semi-diurno/noturno). Também os
// utilitários de exibição degMinStr/signOf e o localizador de casa houseOf.
// ============================================================================

import { RAD, normDeg } from './time.js';

export function obliquity(T){ return 23.439291111 - 0.0130042*T - 0.00000016*T*T + 0.000000504*T*T*T; }
export function gmstDeg(jd,T){ return normDeg(280.46061837 + 360.98564736629*(jd-2451545.0) + 0.000387933*T*T - (T*T*T)/38710000); }
export function ascMC(jd,T,lat,lonEast){
  const ramcDeg = normDeg(gmstDeg(jd,T)+lonEast);
  const ramc = ramcDeg*RAD;
  const eps = obliquity(T)*RAD;
  const latR = lat*RAD;
  let mc = normDeg(Math.atan2(Math.sin(ramc), Math.cos(ramc)*Math.cos(eps))/RAD);
  let asc = normDeg(Math.atan2(Math.cos(ramc), -(Math.sin(ramc)*Math.cos(eps)+Math.tan(latR)*Math.sin(eps)))/RAD);
  return {asc,mc,ramc:ramcDeg};
}
// Vértice: mesmo método do Ascendente (mesma fórmula de ascMC acima), mas com RAMC+180°
// e colatitude (90°-lat) no lugar do RAMC/latitude normais — é a receita padrão descrita
// na literatura ("Vértice = Ascendente calculado na colatitude, usando o RAMC do MC",
// com RAMC deslocado 180° pra cair do lado de baixo do horizonte). Verificado numericamente
// contra o comportamento esperado (cai nas casas 5–8, perto do Descendente na maioria das
// latitudes). Como Asc/MC, exige hora+local; diferente de Asc/MC, fica matematicamente
// indefinido bem em cima do equador (lat=0 → colatitude=90° → tangente indo a infinito) —
// caso raro, não tratado com fallback (ao contrário do Placidus perto dos polos).
export function vertexLon(jd,T,lat,lonEast){
  const ramcDeg = normDeg(gmstDeg(jd,T)+lonEast+180);
  const ramc = ramcDeg*RAD;
  const eps = obliquity(T)*RAD;
  const colatR = (90-lat)*RAD;
  return normDeg(Math.atan2(Math.cos(ramc), -(Math.sin(ramc)*Math.cos(eps)+Math.tan(colatR)*Math.sin(eps)))/RAD);
}
export function wholeSignCusps(asc){ const s=Math.floor(normDeg(asc)/30); const c=[]; for(let h=0;h<12;h++) c.push(normDeg((s+h)*30)); return c; }
export function equalCusps(asc){ const c=[]; for(let h=0;h<12;h++) c.push(normDeg(asc+h*30)); return c; }
// Placidus: trisecção do arco semi-diurno/noturno (método iterativo padrão).
// Refs: Munkasey "An Astrological House Formulary"; morinus-astrology.com/placidus-cusps.
export function placidusRA(ramc, tphi, teps, ra0, F, upper){
  let ra = ra0;
  for(let k=0;k<40;k++){
    const raR = ra*RAD;
    const inner = upper ? -Math.sin(raR)*tphi*teps : Math.sin(raR)*tphi*teps;
    if(inner < -1 || inner > 1) return null; // sem solução real (latitude extrema)
    const term = Math.acos(inner)/RAD;
    ra = upper ? normDeg(ramc + term/F) : normDeg(ramc + 180 - term/F);
  }
  return ra;
}
export function raToEclLon(raDeg, epsRad){
  const raR = raDeg*RAD;
  return normDeg(Math.atan2(Math.sin(raR), Math.cos(raR)*Math.cos(epsRad))/RAD);
}
export function placidusCusps(asc,mc,ramc,lat,eps){
  const tphi = Math.tan(lat*RAD), teps = Math.tan(eps*RAD);
  const ra11 = placidusRA(ramc,tphi,teps, ramc+30, 3, true);
  const ra12 = placidusRA(ramc,tphi,teps, ramc+60, 1.5, true);
  const ra2  = placidusRA(ramc,tphi,teps, ramc+120, 1.5, false);
  const ra3  = placidusRA(ramc,tphi,teps, ramc+150, 3, false);
  if([ra11,ra12,ra2,ra3].some(v=>v===null)) return null;
  const epsRad = eps*RAD;
  const c11=raToEclLon(ra11,epsRad), c12=raToEclLon(ra12,epsRad), c2=raToEclLon(ra2,epsRad), c3=raToEclLon(ra3,epsRad);
  const c = new Array(12);
  c[0]=normDeg(asc); c[1]=c2; c[2]=c3; c[3]=normDeg(mc+180); c[4]=normDeg(c11+180); c[5]=normDeg(c12+180);
  c[6]=normDeg(asc+180); c[7]=normDeg(c2+180); c[8]=normDeg(c3+180); c[9]=normDeg(mc); c[10]=c11; c[11]=c12;
  return c;
}
export function houseOf(lon,cusps){
  for(let h=0;h<12;h++){
    const c1=cusps[h], c2=cusps[(h+1)%12];
    let span=normDeg(c2-c1); if(span===0) span=360;
    let rel=normDeg(lon-c1);
    if(rel<span) return h+1;
  }
  return 12;
}
export function degMinStr(lonInSign){
  const d=Math.floor(lonInSign);
  let m=Math.round((lonInSign-d)*60);
  let dd=d; if(m===60){m=0; dd+=1;}
  return dd+"°"+String(m).padStart(2,'0')+"'";
}
export function signOf(lon){ return Math.floor(normDeg(lon)/30); }

// Interceptação: em sistemas de casa desigual (Placidus é o único dos três
// aqui — Signos Inteiros e Casas Iguais sempre espaçam cúspides a exatos
// 30°, então nunca interceptam), uma casa pode cobrir mais de 30° de
// longitude e "engolir" um signo inteiro sem que nenhuma cúspide caia
// dentro dele — signo interceptado, preso por inteiro dentro de uma única
// casa. Por simetria (a soma das 12 casas ainda fecha 360°), sempre que um
// signo fica sem cúspide, outro signo acaba caindo em DUAS cúspides
// diferentes (signo duplicado / regendo duas casas ao mesmo tempo) — não é
// erro de cálculo, é geometria normal do sistema. Detecta os dois casos
// varrendo o signo de cada cúspide; pra achar em qual casa um signo
// interceptado está preso, usa o meio do signo (grau 15) via houseOf —
// seguro porque um signo interceptado nunca tem cúspide cruzando seu meio.
export function interceptedSigns(cusps){
  const cuspSignIdx = cusps.map(c=>signOf(c));
  const intercepted = [];
  for(let s=0;s<12;s++){
    if(!cuspSignIdx.includes(s)) intercepted.push({sign:s, house:houseOf(s*30+15, cusps)});
  }
  const housesBySign = {};
  cuspSignIdx.forEach((s,i)=>{ (housesBySign[s] ||= []).push(i+1); });
  const duplicated = Object.entries(housesBySign)
    .filter(([,houses])=>houses.length>1)
    .map(([sign,houses])=>({sign:Number(sign), houses}));
  return {intercepted, duplicated};
}

