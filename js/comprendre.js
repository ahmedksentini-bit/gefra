/*
 * GÉFRA — vue « Comprendre » : le fonctionnement de l'outil en schémas, avec le minimum de texte.
 * Schémas redessinés à partir des règles du guide ; les renvois indiquent la page de l'original.
 */
import { Svg, PAL_ECRAN, svgCoupe } from './schemas.js';
import { ZONES } from './engine.js';

const P = {
  ...PAL_ECRAN,
  panel: 'var(--surface-2)',
  accentSoft: 'var(--accent-soft)',
  okSoft: 'var(--ok-soft)',
  p0Soft: 'var(--p0-soft)',
  p1: 'var(--p1)',
  p1Soft: 'var(--p1-soft)',
  p2: 'var(--p2)',
  p2Soft: 'var(--p2-soft)',
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------------ primitives */

function repere(s, x, y, r = 7) {
  s.add(`<circle cx="${x}" cy="${y}" r="${r}" fill="${P.hazard}" stroke="${P.ink}" stroke-width="1.6"/>`);
}

function cote(s, x1, y, x2, label, size = 20) {
  s.line(x1, y, x2, y, P.cote, 1.6);
  s.poly([[x1, y], [x1 + 10, y - 5], [x1 + 10, y + 5]], P.cote);
  s.poly([[x2, y], [x2 - 10, y - 5], [x2 - 10, y + 5]], P.cote);
  if (label) s.text((x1 + x2) / 2, y - 9, label, { size, weight: 700, fill: P.cote });
}

function fleche(s, x1, y, x2) {
  s.line(x1, y, x2 - 9, y, P.muted, 2, 'stroke-linecap="round"');
  s.poly([[x2, y], [x2 - 11, y - 6], [x2 - 11, y + 6]], P.muted);
}

function pastille(s, x, y, w, h, texte, { fill, stroke, col, size = 13.5 }) {
  s.rect(x, y, w, h, fill, stroke, 1.4, `rx="${h / 2}"`);
  s.text(x + w / 2, y + h / 2 + size * 0.36, texte, { size, weight: 700, fill: col });
}

function rail(s, cx, y, w = 44) {
  s.poly([[cx - w / 2, y], [cx - w / 2 + 8, y - 8], [cx + w / 2 - 8, y - 8], [cx + w / 2, y]], P.ground, P.groundEdge, 1);
  s.rect(cx - w / 2 + 6, y - 10, w - 12, 2.5, P.rail);
}

function route(s, x, y, w) {
  s.rect(x, y - 6, w, 7, P.asphalt);
}

function glissiere(s, x, y, h = 16, pointille = false) {
  const ex = pointille ? 'stroke-dasharray="3 2"' : '';
  s.line(x, y, x, y - h, P.steel, 2.4, ex);
  s.rect(x, y - h, 6, 7, pointille ? 'none' : P.steel, P.steel, 1, ex);
}

function ecran(s, x, y0, y1) {
  s.line(x, y0, x, y1, P.steel, 3.4);
  for (let y = y0 - 9; y > y1 + 4; y -= 11) s.line(x - 5, y, x + 5, y, P.steel, 1.4);
}

/* ------------------------------------------------------------------ 1. mesure de L1 selon la configuration */

const MESURES = [
  { type: 'fosse', titre: 'À niveau, avec fossé', texte: 'Jusqu’au bord extérieur du fossé.', gauche: 'bord du fossé', droite: 'bord BAU' },
  { type: 'deblai', titre: 'Voie ferrée en déblai', texte: 'Jusqu’à la crête du talus. Règle des cas quel que soit Δh.', gauche: 'crête du talus', droite: 'bord BAU' },
  { type: 'remblai', titre: 'Voie ferrée en remblai', texte: 'Jusqu’au pied du talus. Si Δh ≥ 3 m : règle du dénivelé.', gauche: 'pied du talus', droite: 'bord BAU' },
  { type: 'mur', titre: 'Avec mur anti-bruit', texte: 'Jusqu’au nu extérieur du mur.', gauche: 'nu du mur', droite: 'bord BAU' },
  { type: 'bdd', titre: 'Route sans BAU', texte: 'Depuis le bord extérieur de la bande dérasée.', gauche: 'bord du fossé', droite: 'bord BDD' },
  { type: 'oa', titre: 'Plates-formes sur ouvrage', texte: 'Entre les rives des tabliers, plus la courbe de chute.', gauche: 'rive du tablier', droite: 'bord BAU' },
];

export function svgMesure(type) {
  const m = MESURES.find((x) => x.type === type);
  const s = new Svg(480, 210, P, `Mesure de L1 : ${m.titre}`);
  const sol = (pts) => {
    s.poly([...pts, [470, 172], [10, 172]], P.ground);
    s.add(`<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${P.groundEdge}" stroke-width="2"/>`);
  };
  const chaussee = (y, xBord, largeBande = 40) => {
    s.rect(xBord, y - 7, largeBande, 8, P.asphalt, 'none', 0, 'opacity="0.55"');
    s.rect(xBord + largeBande, y - 7, 470 - xBord - largeBande, 8, P.asphalt);
    s.line(xBord + largeBande + 20, y - 3, 470, y - 3, P.bg, 1.4, 'stroke-dasharray="9 7"');
  };
  const dh = (x, y1, y2) => {
    s.line(x, y1, x, y2, P.cote, 1.2);
    s.line(x - 4, y1, x + 4, y1, P.cote, 1.2);
    s.line(x - 4, y2, x + 4, y2, P.cote, 1.2);
    s.text(x - 6, (y1 + y2) / 2 + 4, 'Δh', { size: 12.5, weight: 700, fill: P.cote, anchor: 'end' });
  };
  let xg;
  let yg;
  let xd = 360;
  let yd = 120;
  switch (type) {
    case 'deblai':
      sol([[10, 150], [100, 150], [150, 104], [470, 104]]);
      rail(s, 52, 150, 56);
      dh(120, 150, 104);
      [xg, yg, yd] = [150, 104, 104];
      chaussee(104, xd);
      break;
    case 'remblai':
      sol([[10, 70], [100, 70], [155, 124], [470, 124]]);
      rail(s, 52, 70, 56);
      dh(122, 70, 124);
      [xg, yg, yd] = [155, 124, 124];
      chaussee(124, xd);
      break;
    case 'mur':
      sol([[10, 124], [470, 124]]);
      rail(s, 56, 124, 56);
      s.rect(130, 70, 14, 54, P.concrete, P.steel, 1.2);
      [xg, yg, yd] = [144, 124, 124];
      chaussee(124, xd);
      break;
    case 'oa':
      s.line(10, 186, 470, 186, P.muted, 1, 'stroke-dasharray="6 5"');
      s.text(240, 202, 'voie franchie', { size: 11.5, fill: P.muted });
      s.rect(10, 92, 160, 14, P.concrete, P.steel, 1);
      s.rect(70, 106, 16, 80, P.concrete, P.steel, 1, 'opacity="0.7"');
      rail(s, 70, 92, 56);
      s.rect(300, 104, 170, 14, P.concrete, P.steel, 1);
      s.rect(380, 118, 16, 68, P.concrete, P.steel, 1, 'opacity="0.7"');
      s.rect(306, 97, 30, 7, P.asphalt, 'none', 0, 'opacity="0.55"');
      s.rect(336, 97, 134, 7, P.asphalt);
      [xg, yg, xd, yd] = [170, 92, 306, 104];
      break;
    default:
      sol([[10, 124], [124, 124], [140, 138], [156, 124], [470, 124]]);
      rail(s, 58, 124, 56);
      [xg, yg, yd] = [156, 124, 124];
      chaussee(124, xd, type === 'bdd' ? 18 : 40);
  }
  const yc = type === 'oa' ? 150 : 166;
  s.line(xg, yg + 7, xg, yc + 6, P.cote, 1, 'stroke-dasharray="3 3"');
  s.line(xd, yd + 7, xd, yc + 6, P.cote, 1, 'stroke-dasharray="3 3"');
  cote(s, xg, yc, xd, 'L1', 16);
  repere(s, xg, yg, 6);
  repere(s, xd, yd, 6);
  s.text(xg, Math.min(yg, yd) - 32, m.gauche, { size: 12.5, weight: 700, anchor: xg < 160 ? 'start' : 'middle' });
  s.line(xg, Math.min(yg, yd) - 26, xg, yg - 9, P.ink, 0.8, 'stroke-dasharray="2 2"');
  s.text(xd, yd - 32, m.droite, { size: 12.5, weight: 700 });
  s.line(xd, yd - 26, xd, yd - 9, P.ink, 0.8, 'stroke-dasharray="2 2"');
  return s.toString();
}

function htmlMesures() {
  return `<div class="mesures">${MESURES.map((m) => `
    <figure class="mesure">
      ${svgMesure(m.type)}
      <figcaption><strong>${esc(m.titre)}</strong><span>${esc(m.texte)}</span></figcaption>
    </figure>`).join('')}</div>`;
}

/* ------------------------------------------------------------------ 2. règle des cas */

const CAS = [
  { code: 'SC0', cas: 'Hors cas', plage: '< 2 m', exig: 'étude spécifique', disp: 'avis Géfra', type: 'hors' },
  { code: 'SC1', cas: 'Cas 1', plage: '2 – 6 m', exig: 'H3 + écran 3,50', disp: 'mur BA ou LBE', type: 'mur' },
  { code: 'SC2', cas: 'Cas 2', plage: '6 – 8 m', exig: 'H3 + LBE 3,50', disp: 'LBE + bande 3,50', type: 'lbe' },
  { code: 'SC3', cas: 'Cas 3', plage: '8 – 17 m', exig: 'H2 + écran 3,00', disp: 'GS4 + BHE', type: 'bhe' },
  { code: 'SC4', cas: 'Cas 4', plage: '17 – 30 m', exig: 'N2 + merlon 3 m', disp: 'talus 3/2', type: 'merlon' },
  { code: 'SC5', cas: 'Cas 5', plage: '30 – 50 m', exig: 'fossé 1,50 m', disp: 'à 10 m de la BAU', type: 'fosse' },
  { code: 'SC6', cas: 'Au-delà', plage: '≥ 50 m', exig: 'cas par cas', disp: 'N2 si besoin', type: 'rien' },
];

/** Coupes types cotées de chaque cas (L1 d'exemple pris dans la plage du cas). */
export const COUPES_CAS = {
  SC0: [{ nom: 'Base minimale, à justifier', variante: 'SC1-S1', L1: 1.9 }],
  SC1: [
    { nom: 'Près de 2 m : glissière + mur BA 3,50 m', variante: 'SC1-S1', L1: 2.4 },
    { nom: 'Entre les deux : barrière H2 + mur 1,50 m + écran', variante: 'SC1-S3', L1: 4 },
    { nom: 'Près de 6 m : LBE 3,50 m', variante: 'SC1-S2', L1: 5.5 },
  ],
  SC2: [{ nom: 'LBE 3,50 m + bande d’entretien', variante: 'SC2-S1', L1: 7 }],
  SC3: [
    { nom: 'Préconisée : GS4 + BHE 3,00 m', variante: 'SC3-S1', L1: 12 },
    { nom: 'Variante : barrière H2 + écran sur massif', variante: 'SC3-S2', L1: 12 },
  ],
  SC4: [{ nom: 'GS4 + merlon 3 m', variante: 'SC4-S1', L1: 20 }],
  SC5: [{ nom: 'Fossé 1,50 m à 10 m de la BAU', variante: 'SC5-S1', L1: 40 }],
  SC6: [{ nom: 'Analyse au cas par cas', variante: 'SC6-S1', L1: 60 }],
};

export function svgCas(choisi = null) {
  const W = 1000;
  const cw = (W - 20) / CAS.length;
  const s = new Svg(W, 310, P, 'Règle des cas : dispositif exigé selon L1');
  s.line(30, 22, W - 40, 22, P.muted, 1.6);
  s.poly([[W - 28, 22], [W - 40, 16], [W - 40, 28]], P.muted);
  s.text(30, 14, 'Interface étroite : protection lourde', { size: 12.5, anchor: 'start', fill: P.muted });
  s.text(W - 30, 14, 'Interface large : protection légère', { size: 12.5, anchor: 'end', fill: P.muted });
  const yg = 150;
  CAS.forEach((c, i) => {
    const x = 10 + i * cw;
    const actif = c.code === choisi;
    s.add(`<g data-cas="${c.code}" role="button" tabindex="0" aria-label="${c.cas}, ${c.plage} : voir la coupe type" aria-pressed="${actif}" class="cas-cliquable">`);
    s.rect(x + 4, 36, cw - 8, 266, actif ? P.accentSoft : P.bg, actif ? P.accent : P.line, actif ? 2.4 : 1, 'rx="10"');
    s.rect(x + 12, yg, cw - 24, 9, P.ground);
    rail(s, x + 30, yg, 30);
    route(s, x + cw - 40, yg, 28);
    const g = (px) => x + px;
    switch (c.type) {
      case 'hors':
        s.rect(g(46), yg - 66, cw - 96, 66, P.panel, P.line, 1, 'rx="4" stroke-dasharray="4 3"');
        s.text(g(cw / 2), yg - 24, '?', { size: 32, weight: 700, fill: P.muted });
        break;
      case 'mur':
        s.rect(g(70), yg - 78, 10, 78, P.concrete, P.steel, 1.2);
        glissiere(s, g(cw - 50), yg);
        break;
      case 'lbe':
        s.poly([[g(cw - 48), yg], [g(cw - 56), yg - 32], [g(cw - 64), yg - 32], [g(cw - 64), yg]], P.concrete, P.steel, 1.2);
        ecran(s, g(cw - 64), yg - 32, yg - 78);
        break;
      case 'bhe':
        glissiere(s, g(cw - 50), yg);
        glissiere(s, g(58), yg, 18);
        ecran(s, g(58), yg - 18, yg - 66);
        break;
      case 'merlon':
        s.poly([[g(40), yg], [g(62), yg - 62], [g(80), yg - 62], [g(102), yg]], P.earth, P.groundEdge, 1.3);
        glissiere(s, g(cw - 50), yg);
        break;
      case 'fosse':
        s.poly([[g(46), yg], [g(60), yg + 9], [g(86), yg + 9], [g(100), yg]], P.bg, P.groundEdge, 1.4);
        glissiere(s, g(cw - 50), yg, 16, true);
        break;
      default:
        glissiere(s, g(cw - 50), yg, 16, true);
        s.text(g(cw / 2 - 8), yg - 34, '…', { size: 28, weight: 700, fill: P.muted });
    }
    s.text(x + cw / 2, 194, c.cas, { size: 17, weight: 700, fill: actif ? P.accent : P.ink });
    s.text(x + cw / 2, 218, c.plage, { size: 14.5, weight: 700, fill: P.cote });
    s.line(x + 24, 236, x + cw - 24, 236, P.line, 1);
    s.text(x + cw / 2, 260, c.exig, { size: 13.5, weight: 600 });
    s.text(x + cw / 2, 282, c.disp, { size: 12.5, fill: P.muted });
    s.add('</g>');
  });
  return s.toString();
}

/* ------------------------------------------------------------------ 3. niveaux relatifs (§4.3) */

export function svgNiveaux() {
  const s = new Svg(1000, 300, P, 'Voie ferrée plus haute ou plus basse que la route');
  const cols = [
    { titre: 'Voie ferrée en contrebas', sous: 'tout dénivelé', hr: -26, issue: [['Règle des cas (L1)', 'info']] },
    { titre: 'Voie ferrée au-dessus', sous: 'Δh < 3 m', hr: 22, issue: [['Règle des cas (L1)', 'info']] },
    { titre: 'Voie ferrée au-dessus', sous: '3 m ≤ Δh ≤ 6 m', hr: 54, double: true, issue: [['talus ≥ 3/2 : rien', 'ok'], ['talus < 3/2 : glissière N2', 'p1']] },
    { titre: 'Voie ferrée au-dessus', sous: 'Δh > 6 m', hr: 82, issue: [['Aucun dispositif', 'ok']] },
  ];
  const cw = 238;
  const pas = (1000 - 20 - cw) / 3;
  const yRoute = 170;
  const couleurs = { info: [P.accentSoft, P.accent], ok: [P.okSoft, P.ok], p1: [P.p1Soft, P.p1] };
  cols.forEach((c, i) => {
    const ox = 10 + i * pas;
    s.rect(ox, 6, cw, 288, P.bg, P.line, 1, 'rx="10"');
    s.text(ox + cw / 2, 30, c.titre, { size: 14.5, weight: 700 });
    s.text(ox + cw / 2, 50, c.sous, { size: 14, weight: 700, fill: P.cote });
    const yr = yRoute - c.hr;
    const crete = ox + 92;
    const pied = c.hr > 0 ? crete + c.hr * 0.75 : crete + 26;
    const pts = [[ox + 12, yr], [crete, yr], [pied, yRoute], [ox + cw - 12, yRoute]];
    s.poly([...pts, [ox + cw - 12, yRoute + 26], [ox + 12, yRoute + 26]], P.ground);
    s.add(`<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${P.groundEdge}" stroke-width="2"/>`);
    if (c.double) {
      const piedDoux = crete + c.hr * 1.8;
      const ym = (yr + yRoute) / 2;
      s.line(crete, yr, piedDoux, yRoute, P.p0, 2, 'stroke-dasharray="6 4"');
      s.text(crete + c.hr * 0.375 - 8, ym + 4, '≥ 3/2', { size: 12.5, weight: 700, fill: P.ok, anchor: 'end' });
      s.text(crete + c.hr * 0.9 + 16, ym + 4, '< 3/2', { size: 12.5, weight: 700, fill: P.p0, anchor: 'start' });
    }
    rail(s, ox + 50, yr, 50);
    route(s, ox + cw - 62, yRoute, 50);
    if (c.hr > 0) {
      const xd = ox + cw - 22;
      s.line(crete + 4, yr, xd, yr, P.cote, 0.8, 'stroke-dasharray="3 3"');
      s.line(xd, yr, xd, yRoute - 8, P.cote, 1.4);
      s.line(xd - 5, yr, xd + 5, yr, P.cote, 1.4);
      s.line(xd - 5, yRoute - 8, xd + 5, yRoute - 8, P.cote, 1.4);
      s.text(xd - 7, (yr + yRoute) / 2 + 2, 'Δh', { size: 13, weight: 700, fill: P.cote, anchor: 'end' });
    }
    c.issue.forEach(([t, k], j) => {
      const [f, col] = couleurs[k];
      const y = c.issue.length > 1 ? 210 + j * 40 : 232;
      pastille(s, ox + 14, y, cw - 28, 30, t, { fill: f, stroke: col, col, size: 13.5 });
    });
  });
  return s.toString();
}

/* ------------------------------------------------------------------ 4. carte des zones */

export function svgZones() {
  const s = new Svg(1000, 430, P, 'Les configurations de jumelage sur un plan type');
  const num = (x, y, n) => {
    s.add(`<circle cx="${x}" cy="${y}" r="14" fill="${P.ink}" stroke="${P.bg}" stroke-width="2.5"/>`);
    s.text(x, y + 5, String(n), { size: 14, weight: 700, fill: P.bg });
  };
  s.rect(0, 0, 1000, 430, P.ground, 'none', 0, 'opacity="0.45"');
  // rivière franchie par les deux plates-formes
  s.poly([[300, 0], [345, 0], [395, 430], [350, 430]], P.accentSoft, P.accent, 0.8);
  // voie ferrée
  s.rect(20, 92, 960, 46, P.ground, P.groundEdge, 1);
  for (let x = 24; x < 976; x += 9) s.line(x, 104, x, 126, P.rail, 1);
  s.line(20, 108, 980, 108, P.steel, 1.4);
  s.line(20, 122, 980, 122, P.steel, 1.4);
  s.text(26, 84, 'Plate-forme ferroviaire', { size: 12, weight: 700, anchor: 'start' });
  // route jumelée
  s.rect(20, 196, 960, 62, P.asphalt);
  s.line(20, 227, 980, 227, P.bg, 1.5, 'stroke-dasharray="14 10"');
  s.text(26, 280, 'Route ou autoroute jumelée', { size: 12, weight: 700, anchor: 'start' });
  // ponts sur la rivière
  [[92, 138], [196, 258]].forEach(([y0, y1]) => {
    s.line(312, y0 - 4, 378, y0 - 4, P.ink, 2);
    s.line(318, y1 + 4, 384, y1 + 4, P.ink, 2);
  });
  // ① section courante : L1
  s.line(170, 140, 170, 194, P.cote, 1.4);
  s.poly([[170, 140], [166, 149], [174, 149]], P.cote);
  s.poly([[170, 194], [166, 185], [174, 185]], P.cote);
  s.text(180, 172, 'L1', { size: 14, weight: 700, fill: P.cote, anchor: 'start' });
  // voie franchissante (ouvrage)
  s.rect(590, 0, 44, 430, P.asphalt);
  s.line(612, 0, 612, 430, P.bg, 1.2, 'stroke-dasharray="10 8"');
  [[86, 144], [190, 264]].forEach(([y0, y1]) => {
    s.line(584, y0, 584, y1, P.ink, 2.4);
    s.line(640, y0, 640, y1, P.ink, 2.4);
  });
  // ⑤ abords : 50 m perpendiculaires à la voie ferrée
  s.line(20, 34, 980, 34, P.cote, 1, 'stroke-dasharray="6 5"');
  s.text(866, 28, '50 m de l’entrée en terre', { size: 11, fill: P.cote, anchor: 'end' });
  s.line(578, 34, 578, 86, P.steel, 3);
  s.line(646, 34, 646, 86, P.steel, 3);
  s.line(578, 18, 578, 34, P.steel, 3, 'stroke-dasharray="4 3"');
  s.line(646, 18, 646, 34, P.steel, 3, 'stroke-dasharray="4 3"');
  // ⑥ carrefour entre les deux ouvrages et ② voirie latérale
  s.rect(634, 158, 150, 18, P.asphalt, 'none', 0, 'opacity="0.8"');
  s.add(`<circle cx="636" cy="167" r="16" fill="none" stroke="${P.hazard}" stroke-width="3"/>`);
  // ⑦ échangeur contigu en losange ; bretelles côté voie ferrée surlignées, avec leur protection
  const bretelle = (d) => {
    s.add(`<path d="${d}" fill="none" stroke="${P.panel}" stroke-width="15" stroke-linecap="round"/>`);
    s.add(`<path d="${d}" fill="none" stroke="${P.asphalt}" stroke-width="10" stroke-linecap="round"/>`);
  };
  const cotesFer = ['M800,194 C836,192 862,166 884,164', 'M916,164 C938,166 962,192 986,194'];
  cotesFer.forEach((d) => s.add(`<path d="${d}" fill="none" stroke="${P.hazard}" stroke-width="24" stroke-linecap="round" opacity="0.4"/>`));
  [...cotesFer, 'M800,260 C836,262 862,288 884,290', 'M916,290 C938,288 962,262 986,260'].forEach(bretelle);
  s.add(`<path d="M820,184 C850,178 868,156 884,154" fill="none" stroke="${P.steel}" stroke-width="3" stroke-linecap="round"/>`);
  s.add(`<path d="M916,154 C932,156 950,178 978,184" fill="none" stroke="${P.steel}" stroke-width="3" stroke-linecap="round"/>`);
  s.rect(884, 0, 32, 430, P.asphalt);
  s.line(900, 0, 900, 430, P.bg, 1.2, 'stroke-dasharray="10 8"');
  [[86, 144], [190, 264]].forEach(([y0, y1]) => {
    s.line(879, y0, 879, y1, P.ink, 2.4);
    s.line(921, y0, 921, y1, P.ink, 2.4);
  });

  num(120, 167, 1);
  num(740, 167, 2);
  num(358, 167, 3);
  num(668, 108, 4);
  num(548, 58, 5);
  num(676, 167, 6);
  num(950, 330, 7);
  return s.toString();
}

const LEGENDE_ZONES = [
  ['sc', 'La distance L1 entre les deux plates-formes fixe le cas (§4).'],
  ['lat', 'Protégée vis-à-vis de la voie ferrée comme une section courante (§5.3).'],
  ['oaJum', 'Les deux plates-formes franchissent ensemble une autre voie : continuité de la protection et courbe de chute (§5.1).'],
  ['oa', 'H2 en rive, ou H3 avec écran de 3,00 m si le trafic PL est fort (§5.1).'],
  ['abords', 'Le dispositif de l’ouvrage se prolonge sur 50 m depuis l’entrée en terre (§5.2).'],
  ['carrefour', 'Débouché situé entre les deux ouvrages : reporté, décalé ou équipé d’un musoir (§5.4).'],
  ['echangeur', 'Bretelles le long de la voie ferrée : analyse particulière, BLE, BHE ou LBE (§5.5).'],
];

function htmlLegendePlan() {
  return `<ol class="legende-plan">${LEGENDE_ZONES.map(([k, t], i) => `<li><span class="legende-n">${i + 1}</span><span><strong>${esc(ZONES[k].label)}.</strong> ${esc(t)}</span></li>`).join('')}</ol>`;
}

/* ------------------------------------------------------------------ 5. du contrôle au constat */

export function svgConstat() {
  const s = new Svg(1000, 300, P, 'Du dispositif projeté au constat');
  const boite = (x, y, w, h, titre, col) => {
    s.rect(x, y, w, h, P.bg, col, 1.6, 'rx="10"');
    s.text(x + 14, y + 24, titre, { size: 14.5, weight: 700, anchor: 'start', fill: col });
  };
  boite(20, 14, 250, 118, 'Exigé par le guide', P.accent);
  const yg1 = 112;
  s.rect(36, yg1, 218, 8, P.ground);
  rail(s, 60, yg1, 36);
  route(s, 214, yg1, 34);
  s.poly([[200, yg1], [194, yg1 - 24], [186, yg1 - 24], [186, yg1]], P.concrete, P.steel, 1.2);
  ecran(s, 186, yg1 - 24, yg1 - 66);
  s.text(166, yg1 - 40, 'H3 + écran 3,50', { size: 13, weight: 700, anchor: 'end' });

  boite(20, 160, 250, 118, 'Prévu au dossier', P.ink);
  const yg2 = 258;
  s.rect(36, yg2, 218, 8, P.ground);
  rail(s, 60, yg2, 36);
  route(s, 214, yg2, 34);
  glissiere(s, 196, yg2);
  s.text(176, yg2 - 26, 'N2, sans écran', { size: 13, weight: 700, anchor: 'end' });

  s.line(270, 73, 324, 140, P.muted, 2);
  s.line(270, 219, 324, 160, P.muted, 2);
  s.add(`<circle cx="345" cy="150" r="24" fill="${P.panel}" stroke="${P.ink}" stroke-width="1.6"/>`);
  s.text(345, 159, '≠', { size: 26, weight: 700 });
  fleche(s, 371, 150, 432);

  s.rect(436, 98, 220, 104, P.p0Soft, P.p0, 1.8, 'rx="10"');
  s.text(546, 136, 'Écart P0', { size: 22, weight: 700, fill: P.p0 });
  s.text(546, 162, 'retenue et écran', { size: 13.5, fill: P.p0 });
  s.text(546, 182, 'insuffisants', { size: 13.5, fill: P.p0 });
  fleche(s, 660, 150, 718);

  s.add(`<path d="M732,92 h70 l18 18 v100 h-88z" fill="${P.bg}" stroke="${P.muted}" stroke-width="2"/>`);
  [[P.p0, 128], [P.p1, 150], [P.p2, 172]].forEach(([c, y]) => {
    s.rect(744, y - 6, 9, 9, c);
    s.line(760, y - 2, 806, y - 2, P.muted, 2);
  });
  s.text(842, 138, 'Constat GF01', { size: 16, weight: 700, anchor: 'start' });
  s.text(842, 160, 'risque + recommandation', { size: 13, anchor: 'start', fill: P.muted });
  s.text(842, 180, '→ rapport', { size: 13, anchor: 'start', fill: P.muted });

  [
    ['P0 · critique', 'retenue ou écran manquant', P.p0, P.p0Soft],
    ['P1 · important', 'hauteur, géométrie, longueur', P.p1, P.p1Soft],
    ['P2 · à vérifier', 'variante à justifier', P.p2, P.p2Soft],
  ].forEach(([t, d, col, fill], i) => {
    const x = 436 + i * 186;
    s.rect(x, 232, 176, 56, fill, col, 1.2, 'rx="8"');
    s.text(x + 12, 254, t, { size: 13.5, weight: 700, anchor: 'start', fill: col });
    s.text(x + 12, 274, d, { size: 12, anchor: 'start', fill: P.ink });
  });
  return s.toString();
}

/* ------------------------------------------------------------------ vue */

const DIAPOS = [
  { nav: 'La mesure', titre: 'Mesurer L1', sous: 'Du bord de la BAU (ou de la BDD) à l’entrée en terre ferroviaire, selon le profil.', ref: 'Guide §4.1, p. 13', rendu: () => htmlMesures() },
  { nav: 'Le cas', titre: 'L1 donne le dispositif', sous: 'Cliquez sur un cas pour voir sa coupe type cotée.', ref: 'Guide §4.2, p. 13 à 19', rendu: (o) => figure(svgCas(o.cas)) + htmlCoupeCas(o.cas, o.sol) },
  { nav: 'Les situations', titre: 'Les configurations de jumelage, en plan', sous: 'Chaque numéro correspond à une zone de l’Assistant et du Linéaire.', ref: 'Guide §4 et §5, p. 13 à 32', rendu: () => figure(svgZones()) + htmlLegendePlan() },
  { nav: 'Le constat', titre: 'Le projet est comparé au guide', sous: 'Chaque écart devient un constat classé P0, P1 ou P2.', ref: null, rendu: () => figure(svgConstat()) },
];
export const NB_DIAPOS = DIAPOS.length;

function figure(svg) {
  return `<figure class="figure schema">${svg}</figure>`;
}

function htmlCoupeCas(code, sol = 0) {
  const coupes = COUPES_CAS[code] || COUPES_CAS.SC1;
  const c = coupes[Math.min(sol, coupes.length - 1)];
  const infos = CAS.find((x) => x.code === code) || CAS[1];
  const choix = coupes.length > 1
    ? `<div class="coupe-sols" role="group" aria-label="Solutions proposées par le guide pour ce cas">${coupes.map((x, i) => `<button type="button" data-sol="${i}" aria-pressed="${x === c}">${esc(x.nom)}</button>`).join('')}</div>`
    : `<span class="coupe-nom">${esc(c.nom)}</span>`;
  return `
    <div class="coupe-cas">
      <div class="coupe-tete"><strong>${esc(infos.cas)} · ${esc(infos.plage)}</strong>${choix}</div>
      <figure class="figure">${svgCoupe({ kind: 'coupe', variante: c.variante, L1: c.L1, position: 'meme' })}
        <figcaption>Coupe de principe cotée pour L1 = ${String(c.L1).replace('.', ',')} m, en exemple. Dans l’Assistant, elle se redessine avec votre L1.</figcaption>
      </figure>
    </div>`;
}

/** Une diapositive à la fois, avec sa navigation. */
export function htmlComprendre(index = 0, options = {}) {
  const o = { cas: options.cas || 'SC1', sol: options.sol || 0 };
  const n = Number.isInteger(index) ? Math.min(Math.max(index, 0), DIAPOS.length - 1) : 0;
  const d = DIAPOS[n];
  const nav = DIAPOS.map((x, i) => `<button type="button" role="tab" data-diapo="${i}" aria-selected="${i === n}"><span>${i + 1}</span>${esc(x.nav)}</button>`).join('');
  const suivant = n < DIAPOS.length - 1
    ? `<button type="button" class="btn primary" data-diapo="${n + 1}">Suivant →</button>`
    : '<a class="btn primary" href="#assistant">Ouvrir l’assistant →</a>';
  return `
    <div class="diapo-nav" role="tablist" aria-label="Étapes">${nav}</div>
    <section class="panel diapo" role="tabpanel" aria-label="${esc(d.titre)}">
      <div class="schema-tete"><h2>${esc(d.titre)}</h2>${d.ref ? `<span class="schema-ref">${esc(d.ref)}</span>` : ''}</div>
      <p class="schema-sous">${esc(d.sous)}</p>
      ${d.rendu(o)}
      <div class="diapo-pied">
        <button type="button" class="btn ghost" data-diapo="${n - 1}"${n === 0 ? ' disabled' : ''}>← Précédent</button>
        <span class="compteur">${n + 1} / ${DIAPOS.length}</span>
        ${suivant}
      </div>
    </section>`;
}
