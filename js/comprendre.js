/*
 * GÉFRA — vue « Comprendre » : le fonctionnement de l'outil en schémas, avec le minimum de texte.
 * Schémas redessinés à partir des règles du guide ; les renvois indiquent la page de l'original.
 */
import { Svg, PAL_ECRAN, voie, poteauCatenaire } from './schemas.js';

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

function legende(s, x, y, titre, sous, { anchor = 'start', vers = null } = {}) {
  s.text(x, y, titre, { size: 14.5, weight: 700, anchor });
  if (sous) s.text(x, y + 19, sous, { size: 13, anchor, fill: P.muted });
  if (vers) {
    const [ax, ay, bx, by] = vers;
    s.line(ax, ay, bx, by, P.ink, 1.1, 'stroke-dasharray="3 3"');
    s.add(`<circle cx="${bx}" cy="${by}" r="3.5" fill="${P.ink}"/>`);
  }
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

/* ------------------------------------------------------------------ icônes du parcours */

const ICONES = {
  decrire: '<svg viewBox="0 0 80 64" aria-hidden="true"><rect x="2" y="44" width="76" height="9" rx="2" fill="var(--ground)"/><path d="M6 44 l5 -6 h16 l5 6z" fill="var(--ground)" stroke="var(--ground-edge)"/><rect x="10" y="35" width="18" height="3" fill="var(--rail)"/><rect x="54" y="38" width="24" height="6" fill="var(--asphalt)"/><line x1="33" y1="25" x2="53" y2="25" stroke="var(--cote)" stroke-width="2"/><path d="M33 25 l7 -4 v8z M53 25 l-7 -4 v8z" fill="var(--cote)"/><text x="43" y="17" text-anchor="middle" font-size="13" font-weight="700" fill="var(--cote)" font-family="inherit">L1</text></svg>',
  classer: '<svg viewBox="0 0 80 64" aria-hidden="true"><circle cx="12" cy="32" r="7" fill="var(--surface-2)" stroke="var(--ink)" stroke-width="2"/><path d="M19 32 C34 32 34 12 48 12 M19 32 H48 M19 32 C34 32 34 52 48 52" fill="none" stroke="var(--ink-2)" stroke-width="2"/><rect x="48" y="5" width="26" height="14" rx="3" fill="var(--surface-2)" stroke="var(--line-strong)"/><rect x="48" y="25" width="26" height="14" rx="3" fill="var(--hazard)" stroke="var(--ink)" stroke-width="1.5"/><rect x="48" y="45" width="26" height="14" rx="3" fill="var(--surface-2)" stroke="var(--line-strong)"/></svg>',
  exiger: '<svg viewBox="0 0 80 64" aria-hidden="true"><rect x="2" y="52" width="76" height="8" fill="var(--ground)"/><rect x="58" y="47" width="20" height="5" fill="var(--asphalt)"/><path d="M36 52 l3 -14 h9 v14z" fill="var(--concrete)" stroke="var(--steel)"/><line x1="48" y1="38" x2="48" y2="6" stroke="var(--steel)" stroke-width="3.4"/><g stroke="var(--steel)" stroke-width="1.5"><line x1="43" y1="30" x2="53" y2="30"/><line x1="43" y1="21" x2="53" y2="21"/><line x1="43" y1="12" x2="53" y2="12"/></g><text x="22" y="30" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)" font-family="inherit">H3</text></svg>',
  controler: '<svg viewBox="0 0 80 64" aria-hidden="true"><rect x="12" y="8" width="18" height="48" rx="2" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 3"/><rect x="44" y="34" width="18" height="22" rx="2" fill="var(--p0)"/><path d="M47 14 l12 12 M59 14 l-12 12" stroke="var(--p0)" stroke-width="3" stroke-linecap="round"/><line x1="4" y1="56" x2="76" y2="56" stroke="var(--line-strong)" stroke-width="1.5"/></svg>',
  rediger: '<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M20 4 h30 l10 10 v46 h-40z" fill="var(--surface)" stroke="var(--ink-2)" stroke-width="2"/><path d="M50 4 v10 h10" fill="none" stroke="var(--ink-2)" stroke-width="2"/><rect x="26" y="22" width="6" height="6" fill="var(--p0)"/><line x1="36" y1="25" x2="54" y2="25" stroke="var(--ink-2)" stroke-width="2"/><rect x="26" y="34" width="6" height="6" fill="var(--p1)"/><line x1="36" y1="37" x2="54" y2="37" stroke="var(--ink-2)" stroke-width="2"/><rect x="26" y="46" width="6" height="6" fill="var(--p2)"/><line x1="36" y1="49" x2="50" y2="49" stroke="var(--ink-2)" stroke-width="2"/></svg>',
};

const ETAPES = [
  ['decrire', 'Décrire', 'zone, L1, niveaux', '#assistant', 'Assistant · Linéaire'],
  ['classer', 'Classer', 'le cas du guide', '#referentiel', 'automatique'],
  ['exiger', 'Exiger', 'retenue + écran', '#assistant', 'Assistant'],
  ['controler', 'Contrôler', 'le projet du dossier', '#lineaire', 'Linéaire'],
  ['rediger', 'Rédiger', 'constats P0 · P1 · P2', '#constats', 'Constats · Rapport'],
];

/* ------------------------------------------------------------------ 1. mesurer L1 */

export function svgMesureL1(encarts = true) {
  const s = new Svg(1000, encarts ? 370 : 250, P, 'Mesure de L1 : de l’entrée en terre ferroviaire au bord de la BAU');
  const yg = 176;
  s.rect(20, yg, 960, 26, P.ground);
  s.line(20, yg, 300, yg, P.groundEdge, 1.3);
  s.line(340, yg, 700, yg, P.groundEdge, 1.3);
  s.poly([[300, yg], [320, yg + 15], [340, yg]], P.bg, P.groundEdge, 1.3);
  voie(s, 130, yg, P);
  poteauCatenaire(s, 238, yg, 104, P);
  s.rect(700, yg - 7, 80, 9, P.asphalt, 'none', 0, 'opacity="0.6"');
  s.rect(780, yg - 7, 200, 9, P.asphalt);
  s.line(870, yg - 3, 980, yg - 3, P.bg, 1.6, 'stroke-dasharray="12 9"');
  s.text(130, yg + 46, 'voie ferrée', { size: 13, fill: P.muted });
  s.text(740, yg + 46, 'BAU', { size: 13, fill: P.muted });
  s.text(880, yg + 46, 'chaussée', { size: 13, fill: P.muted });

  s.line(340, 82, 340, yg - 10, P.ink, 1, 'stroke-dasharray="3 3"');
  s.line(700, 82, 700, yg - 10, P.ink, 1, 'stroke-dasharray="3 3"');
  s.text(340, 52, 'Entrée en terre', { size: 16, weight: 700 });
  s.text(340, 72, 'limite côté fer', { size: 13, fill: P.muted });
  s.text(700, 52, 'Bord de la BAU', { size: 16, weight: 700 });
  s.text(700, 72, 'limite côté route', { size: 13, fill: P.muted });
  repere(s, 340, yg);
  repere(s, 700, yg);
  cote(s, 340, yg + 40, 700, 'L1', 24);

  if (!encarts) return s.toString();
  const enc = [
    ['en déblai', 'crête du talus'],
    ['en remblai', 'pied du talus'],
    ['avec mur anti-bruit', 'nu du mur'],
  ];
  s.text(20, 262, 'Où est l’entrée en terre ?', { size: 13.5, weight: 700, anchor: 'start', fill: P.muted });
  enc.forEach(([titre, lab], i) => {
    const ox = 20 + i * 330;
    const oy = 274;
    s.rect(ox, oy, 310, 90, P.panel, P.line, 1, 'rx="10"');
    s.text(ox + 14, oy + 22, `Voie ferrée ${titre}`, { size: 13, weight: 700, anchor: 'start' });
    let mx;
    let my;
    if (i === 0) {
      s.add(`<polyline points="${ox + 14},${oy + 78} ${ox + 110},${oy + 78} ${ox + 150},${oy + 46} ${ox + 296},${oy + 46}" fill="none" stroke="${P.groundEdge}" stroke-width="2"/>`);
      rail(s, ox + 60, oy + 78, 40);
      [mx, my] = [ox + 150, oy + 46];
    } else if (i === 1) {
      s.add(`<polyline points="${ox + 14},${oy + 44} ${ox + 100},${oy + 44} ${ox + 145},${oy + 78} ${ox + 296},${oy + 78}" fill="none" stroke="${P.groundEdge}" stroke-width="2"/>`);
      rail(s, ox + 55, oy + 44, 40);
      [mx, my] = [ox + 145, oy + 78];
    } else {
      s.line(ox + 14, oy + 78, ox + 296, oy + 78, P.groundEdge, 2);
      rail(s, ox + 55, oy + 78, 40);
      s.rect(ox + 128, oy + 36, 12, 42, P.concrete, P.steel, 1);
      [mx, my] = [ox + 140, oy + 78];
    }
    repere(s, mx, my, 6);
    s.text(mx + 14, my - 8, lab, { size: 13, weight: 700, anchor: 'start' });
  });
  return s.toString();
}

/* ------------------------------------------------------------------ 2. règle des cas */

const CAS = [
  { cas: 'Hors cas', plage: '< 2 m', exig: 'étude spécifique', type: 'hors' },
  { cas: 'Cas 1', plage: '2 – 6 m', exig: 'H3 + écran 3,50', type: 'mur' },
  { cas: 'Cas 2', plage: '6 – 8 m', exig: 'H3 + LBE 3,50', type: 'lbe' },
  { cas: 'Cas 3', plage: '8 – 17 m', exig: 'H2 + écran 3,00', type: 'bhe' },
  { cas: 'Cas 4', plage: '17 – 30 m', exig: 'N2 + merlon 3 m', type: 'merlon' },
  { cas: 'Cas 5', plage: '30 – 50 m', exig: 'fossé 1,50 m', type: 'fosse' },
  { cas: 'Au-delà', plage: '≥ 50 m', exig: 'cas par cas', type: 'rien' },
];

export function svgCas() {
  const W = 1000;
  const cw = (W - 20) / CAS.length;
  const s = new Svg(W, 300, P, 'Règle des cas : dispositif exigé selon L1');
  s.line(30, 22, W - 40, 22, P.muted, 1.6);
  s.poly([[W - 28, 22], [W - 40, 16], [W - 40, 28]], P.muted);
  s.text(30, 14, 'Interface étroite : protection lourde', { size: 12.5, anchor: 'start', fill: P.muted });
  s.text(W - 30, 14, 'Interface large : protection légère', { size: 12.5, anchor: 'end', fill: P.muted });
  const yg = 150;
  CAS.forEach((c, i) => {
    const x = 10 + i * cw;
    s.rect(x + 4, 36, cw - 8, 256, P.bg, P.line, 1, 'rx="10"');
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
    s.text(x + cw / 2, 194, c.cas, { size: 17, weight: 700 });
    s.text(x + cw / 2, 218, c.plage, { size: 14.5, weight: 700, fill: P.cote });
    s.line(x + 24, 236, x + cw - 24, 236, P.line, 1);
    s.text(x + cw / 2, 262, c.exig, { size: 13.5, weight: 600 });
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
  const s = new Svg(1000, 470, P, 'Zones particulières sur un jumelage type');
  s.rect(0, 0, 1000, 470, P.panel);
  s.poly([[296, 110], [344, 110], [394, 330], [346, 330]], P.accentSoft, P.accent, 0.8);
  s.rect(20, 150, 960, 40, P.ground, P.groundEdge, 1);
  for (let x = 24; x < 976; x += 9) s.line(x, 158, x, 182, P.rail, 1);
  s.line(20, 163, 980, 163, P.steel, 1.4);
  s.line(20, 177, 980, 177, P.steel, 1.4);
  s.rect(20, 240, 960, 60, P.asphalt);
  s.line(20, 270, 980, 270, P.bg, 1.6, 'stroke-dasharray="14 10"');
  [[150, 190], [240, 300]].forEach(([a, b]) => {
    s.line(312, a - 5, 382, a - 5, P.ink, 2.2);
    s.line(326, b + 5, 396, b + 5, P.ink, 2.2);
  });
  s.text(24, 142, 'Voie ferrée', { size: 13, weight: 700, anchor: 'start', fill: P.muted });
  s.text(24, 318, 'Route jumelée', { size: 13, weight: 700, anchor: 'start', fill: P.muted });

  s.line(170, 192, 170, 238, P.cote, 1.6);
  s.poly([[170, 191], [165, 201], [175, 201]], P.cote);
  s.poly([[170, 239], [165, 229], [175, 229]], P.cote);
  s.text(180, 220, 'L1', { size: 16, weight: 700, fill: P.cote, anchor: 'start' });

  s.rect(600, 0, 40, 470, P.asphalt);
  s.line(620, 0, 620, 470, P.bg, 1.2, 'stroke-dasharray="10 8"');
  [[144, 196], [234, 306]].forEach(([a, b]) => {
    s.line(595, a, 595, b, P.ink, 2.6);
    s.line(645, a, 645, b, P.ink, 2.6);
  });
  s.line(20, 104, 980, 104, P.cote, 1.2, 'stroke-dasharray="7 5"');
  s.line(590, 104, 590, 144, P.steel, 3.2);
  s.line(650, 104, 650, 144, P.steel, 3.2);
  s.line(590, 90, 590, 104, P.steel, 3.2, 'stroke-dasharray="4 3"');
  s.line(650, 90, 650, 104, P.steel, 3.2, 'stroke-dasharray="4 3"');
  s.text(976, 98, '50 m', { size: 13, weight: 700, fill: P.cote, anchor: 'end' });

  s.rect(640, 207, 64, 16, P.asphalt, 'none', 0, 'opacity="0.75"');
  s.add(`<circle cx="644" cy="215" r="17" fill="none" stroke="${P.hazard}" stroke-width="3.5"/>`);

  // Échangeur contigu en losange : voie franchissante sur ouvrage et quatre bretelles ;
  // les bretelles côté voie ferrée, surlignées, portent la protection.
  const bretelle = (d) => {
    s.add(`<path d="${d}" fill="none" stroke="${P.panel}" stroke-width="16" stroke-linecap="round"/>`);
    s.add(`<path d="${d}" fill="none" stroke="${P.asphalt}" stroke-width="11" stroke-linecap="round"/>`);
  };
  const cotesFer = ['M716,236 C762,234 806,207 846,205', 'M882,205 C922,207 958,234 992,236'];
  cotesFer.forEach((d) => s.add(`<path d="${d}" fill="none" stroke="${P.hazard}" stroke-width="26" stroke-linecap="round" opacity="0.4"/>`));
  [...cotesFer, 'M716,304 C762,306 806,333 846,335', 'M882,335 C922,333 958,306 992,304'].forEach(bretelle);
  s.add(`<path d="M744,224 C786,219 818,197 846,196" fill="none" stroke="${P.steel}" stroke-width="3.2" stroke-linecap="round"/>`);
  s.add(`<path d="M882,196 C910,197 942,219 984,224" fill="none" stroke="${P.steel}" stroke-width="3.2" stroke-linecap="round"/>`);
  s.rect(846, 0, 36, 470, P.asphalt);
  s.line(864, 0, 864, 470, P.bg, 1.2, 'stroke-dasharray="10 8"');
  [[144, 196], [234, 306]].forEach(([a, b]) => {
    s.line(841, a, 841, b, P.ink, 2.6);
    s.line(887, a, 887, b, P.ink, 2.6);
  });

  legende(s, 40, 40, 'Jumelées sur ouvrage', 'continuité + courbe de chute', { vers: [180, 64, 330, 150] });
  legende(s, 570, 40, 'Ouvrage sur la voie ferrée', 'H2 · H3 + écran si PL fort', { anchor: 'end', vers: [560, 64, 606, 168] });
  legende(s, 680, 40, 'Abords de l’ouvrage', 'prolonger sur 50 m', { vers: [690, 64, 650, 120] });
  legende(s, 830, 420, 'Échangeur contigu', 'BLE, BHE ou LBE', { anchor: 'end', vers: [790, 402, 792, 214] });
  legende(s, 40, 362, 'Section courante', 'règle des cas selon L1', { vers: [110, 344, 168, 232] });
  legende(s, 420, 366, 'Carrefour entre ouvrages', 'débouché reporté ou décalé', { vers: [530, 348, 636, 226] });
  legende(s, 420, 430, 'Voirie latérale de service', 'comme la section courante', { vers: [600, 412, 690, 223] });
  return s.toString();
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
  { nav: 'Le principe', titre: 'GÉFRA en cinq étapes', sous: 'De la saisie du tronçon au constat d’audit.', ref: null, rendu: () => `<ol class="flux">${etapes()}</ol>` },
  { nav: 'La mesure', titre: 'Tout part de L1', sous: 'La largeur entre la voie ferrée et la route.', ref: 'Guide §4.1, p. 13', rendu: () => figure(svgMesureL1(false)) },
  { nav: 'Le cas', titre: 'L1 donne le dispositif', sous: 'Plus l’interface est étroite, plus la protection est lourde.', ref: 'Guide §4.2, p. 13 à 19', rendu: () => figure(svgCas()) },
  { nav: 'Le constat', titre: 'Le projet est comparé au guide', sous: 'Chaque écart devient un constat classé P0, P1 ou P2.', ref: null, rendu: () => figure(svgConstat()) },
];
export const NB_DIAPOS = DIAPOS.length;

function figure(svg) {
  return `<figure class="figure schema">${svg}</figure>`;
}

function etapes() {
  return ETAPES.map(([icone, titre, sous, lien, onglet], i) => `
    <li><a href="${lien}">
      <span class="flux-n">${i + 1}</span>
      ${ICONES[icone]}
      <strong>${esc(titre)}</strong>
      <span class="flux-sous">${esc(sous)}</span>
      <span class="flux-onglet">${esc(onglet)}</span>
    </a></li>`).join('');
}

/** Une diapositive à la fois, avec sa navigation. */
export function htmlComprendre(index = 0) {
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
      ${d.rendu()}
      <div class="diapo-pied">
        <button type="button" class="btn ghost" data-diapo="${n - 1}"${n === 0 ? ' disabled' : ''}>← Précédent</button>
        <span class="compteur">${n + 1} / ${DIAPOS.length}</span>
        ${suivant}
      </div>
    </section>`;
}
