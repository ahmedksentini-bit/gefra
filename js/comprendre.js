/*
 * GÉFRA — vue « Comprendre » : schémas explicatifs du fonctionnement de l'application.
 * Les schémas suivent la configuration de l'assistant (chemin de décision, position de L1).
 */
import * as E from './engine.js';
import * as M from './modele.js';
import { Svg, PAL_ECRAN, voie, poteauCatenaire } from './schemas.js';

const P = {
  ...PAL_ECRAN,
  panel: 'var(--surface-2)',
  accentSoft: 'var(--accent-soft)',
  water: 'var(--accent-soft)',
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function lignes(s, x, y, textes, opts = {}, pas = 15) {
  textes.forEach((t, i) => s.text(x, y + i * pas, t, opts));
}

function repere(s, x, y) {
  s.add(`<circle cx="${x}" cy="${y}" r="6" fill="${P.hazard}" stroke="${P.ink}" stroke-width="1.5"/>`);
}

function fleche(s, x1, y, x2, label) {
  s.line(x1, y, x2, y, P.cote, 1.4);
  s.poly([[x1, y], [x1 + 9, y - 4], [x1 + 9, y + 4]], P.cote);
  s.poly([[x2, y], [x2 - 9, y - 4], [x2 - 9, y + 4]], P.cote);
  if (label) s.text((x1 + x2) / 2, y - 7, label, { size: 18, weight: 700, fill: P.cote });
}

/* ------------------------------------------------------------------ 1. mesurer L1 */

export function svgMesureL1() {
  const s = new Svg(960, 440, P, 'Mesure de la distance L1 entre la limite roulable et l’entrée en terre ferroviaire');
  const yg = 214;
  s.rect(20, yg, 920, 24, P.ground);
  s.line(20, yg, 290, yg, P.groundEdge, 1.2);
  s.line(340, yg, 700, yg, P.groundEdge, 1.2);
  voie(s, 120, yg, P);
  poteauCatenaire(s, 235, yg, 120, P);
  s.poly([[290, yg], [315, yg + 16], [340, yg]], P.bg, P.groundEdge, 1.2);
  s.text(315, yg + 40, 'assainissement', { size: 11, fill: P.muted });
  s.text(120, yg + 40, 'plate-forme ferroviaire', { size: 11, fill: P.muted });

  s.rect(700, yg - 7, 70, 9, P.asphalt, 'none', 0, 'opacity="0.65"');
  s.rect(770, yg - 7, 170, 9, P.asphalt);
  s.line(772, yg - 7, 772, yg + 2, P.bg, 2);
  s.line(860, yg - 3, 940, yg - 3, P.bg, 1.5, 'stroke-dasharray="10 8"');
  s.text(735, yg + 40, 'BAU ou BDD', { size: 11, fill: P.muted });
  s.text(855, yg + 40, 'chaussée', { size: 11, fill: P.muted });

  s.text(520, yg - 18, 'Interface : emplacement des dispositifs anti-pénétration', { size: 12, fill: P.muted, italic: true });

  s.line(340, yg + 8, 340, yg + 70, P.cote, 1, 'stroke-dasharray="4 3"');
  s.line(700, yg + 8, 700, yg + 70, P.cote, 1, 'stroke-dasharray="4 3"');
  fleche(s, 340, yg + 64, 700, 'L1');
  repere(s, 340, yg);
  repere(s, 700, yg);

  s.rect(40, 26, 360, 84, P.panel, P.line, 1, 'rx="8"');
  s.text(56, 52, 'Limite des aménagements ferroviaires', { size: 14, weight: 700, anchor: 'start' });
  lignes(s, 56, 74, ['Entrée en terre de la plate-forme : génératrice', 'extérieure de l’assainissement (cas ci-dessus)'], { size: 12, anchor: 'start', fill: P.muted });
  s.line(340, yg - 9, 300, 110, P.ink, 1);

  s.rect(580, 26, 350, 84, P.panel, P.line, 1, 'rx="8"');
  s.text(596, 52, 'Limite de la largeur roulable', { size: 14, weight: 700, anchor: 'start' });
  lignes(s, 596, 74, ['Bord extérieur de la bande d’arrêt d’urgence', '(BAU) ou de la bande dérasée de droite (BDD)'], { size: 12, anchor: 'start', fill: P.muted });
  s.line(700, yg - 9, 700, 110, P.ink, 1);

  const encarts = [
    { titre: 'Voie ferrée en déblai', legende: 'crête du talus de déblai' },
    { titre: 'Voie ferrée en remblai', legende: 'pied du talus de remblai' },
    { titre: 'Mur anti-bruit', legende: 'nu extérieur du mur' },
  ];
  encarts.forEach((e, i) => {
    const ox = 20 + i * 310;
    const oy = 310;
    s.rect(ox, oy, 296, 120, P.bg, P.line, 1, 'rx="8"');
    s.text(ox + 12, oy + 20, e.titre, { size: 12.5, weight: 700, anchor: 'start' });
    let mx;
    let my;
    if (i === 0) {
      s.poly([[ox + 10, oy + 98], [ox + 110, oy + 98], [ox + 150, oy + 62], [ox + 286, oy + 62], [ox + 286, oy + 112], [ox + 10, oy + 112]], P.ground);
      s.add(`<polyline points="${ox + 10},${oy + 98} ${ox + 110},${oy + 98} ${ox + 150},${oy + 62} ${ox + 286},${oy + 62}" fill="none" stroke="${P.groundEdge}" stroke-width="1.4"/>`);
      s.rect(ox + 40, oy + 92, 40, 5, P.rail);
      [mx, my] = [ox + 150, oy + 62];
    } else if (i === 1) {
      s.poly([[ox + 10, oy + 56], [ox + 100, oy + 56], [ox + 150, oy + 96], [ox + 286, oy + 96], [ox + 286, oy + 112], [ox + 10, oy + 112]], P.ground);
      s.add(`<polyline points="${ox + 10},${oy + 56} ${ox + 100},${oy + 56} ${ox + 150},${oy + 96} ${ox + 286},${oy + 96}" fill="none" stroke="${P.groundEdge}" stroke-width="1.4"/>`);
      s.rect(ox + 35, oy + 50, 40, 5, P.rail);
      [mx, my] = [ox + 150, oy + 96];
    } else {
      s.rect(ox + 10, oy + 90, 276, 22, P.ground);
      s.line(ox + 10, oy + 90, ox + 286, oy + 90, P.groundEdge, 1.4);
      s.rect(ox + 45, oy + 84, 40, 5, P.rail);
      s.rect(ox + 130, oy + 40, 12, 50, P.concrete, P.steel, 1);
      [mx, my] = [ox + 142, oy + 90];
    }
    s.text(mx + 12, my - 8, e.legende, { size: 11.5, anchor: 'start', fill: P.ink, weight: 600 });
    repere(s, mx, my);
  });
  return s.toString();
}

/* ------------------------------------------------------------------ 2. règle des cas */

const BANDES = [
  { cle: 'SC0', cas: 'Hors cas', plage: 'L1 < 2 m', exig: 'Étude spécifique', disp: 'Avis du groupe Géfra' },
  { cle: 'SC1', cas: 'Cas 1', plage: '2 à 6 m', exig: 'H3 + écran 3,50 m', disp: 'Mur BA, mur + écran ou LBE' },
  { cle: 'SC2', cas: 'Cas 2', plage: '6 à 8 m', exig: 'H3 + écran 3,50 m', disp: 'LBE + bande de 3,50 m' },
  { cle: 'SC3', cas: 'Cas 3', plage: '8 à 17 m', exig: 'H2 + écran 3,00 m', disp: 'GS4 + BHE, ou écran sur massif' },
  { cle: 'SC4', cas: 'Cas 4', plage: '17 à 30 m', exig: 'N2 + merlon 3 m', disp: 'GS4 + merlon, talus 3/2' },
  { cle: 'SC5', cas: 'Cas 5', plage: '30 à 50 m', exig: 'Fossé 1,50 m', disp: 'Fossé à 10 m, GS4 si besoin' },
  { cle: 'SC6', cas: 'Au-delà', plage: 'L1 ≥ 50 m', exig: 'Cas par cas', disp: 'N2 si nécessaire' },
];

export function svgBandes(codeActif) {
  const W = 980;
  const cw = W / BANDES.length;
  const s = new Svg(W, 262, P, 'Dispositif exigé selon la distance L1 en section courante');
  const yg = 118;
  BANDES.forEach((b, i) => {
    const x = i * cw;
    const actif = b.cle === codeActif;
    s.rect(x + 3, 6, cw - 6, 250, actif ? P.accentSoft : P.bg, actif ? P.accent : P.line, actif ? 2 : 1, 'rx="8"');
    s.rect(x + 12, yg, cw - 24, 10, P.ground);
    s.line(x + 12, yg, x + cw - 12, yg, P.groundEdge, 1);
    s.rect(x + 14, yg - 4, 20, 4, P.rail);
    s.rect(x + cw - 34, yg - 4, 22, 5, P.asphalt);
    const g = (px) => x + px;
    const post = (px, h = 15, dashed = false) => {
      const ex = dashed ? 'stroke-dasharray="3 2"' : '';
      s.line(g(px), yg, g(px), yg - h, P.steel, 2, ex);
      s.rect(g(px), yg - h, 5, 6, dashed ? 'none' : P.steel, P.steel, 1, ex);
    };
    const ecran = (px, y0, h) => {
      s.line(g(px), yg - y0, g(px), yg - h, P.steel, 3);
      for (let y = y0 + 8; y < h; y += 10) s.line(g(px) - 4, yg - y, g(px) + 4, yg - y, P.steel, 1.2);
    };
    const cloture = (px, h = 34, base = 0) => {
      s.line(g(px), yg - base, g(px), yg - base - h, P.muted, 1);
      for (let y = 6; y <= h; y += 8) s.text(g(px), yg - base - y + 3, '×', { size: 8, fill: P.muted });
    };
    switch (b.cle) {
      case 'SC0':
        s.add(`<rect x="${g(40)}" y="${yg - 66}" width="${cw - 86}" height="66" fill="${P.panel}" stroke="${P.line}" stroke-dasharray="4 3"/>`);
        s.text(g(cw / 2), yg - 26, '?', { size: 30, weight: 700, fill: P.muted });
        break;
      case 'SC1':
        s.rect(g(84), yg - 70, 9, 70, P.concrete, P.steel, 1);
        post(cw - 44);
        break;
      case 'SC2':
        s.poly([[g(cw - 44), yg], [g(cw - 52), yg - 30], [g(cw - 60), yg - 30], [g(cw - 60), yg]], P.concrete, P.steel, 1);
        ecran(cw - 60, 30, 70);
        cloture(56);
        break;
      case 'SC3':
        post(cw - 44);
        post(56, 16);
        ecran(56, 16, 60);
        break;
      case 'SC4':
        s.poly([[g(38), yg], [g(62), yg - 60], [g(80), yg - 60], [g(104), yg]], P.earth, P.groundEdge, 1.2);
        cloture(71, 26, 60);
        post(cw - 30);
        break;
      case 'SC5':
        s.poly([[g(46), yg], [g(60), yg + 9], [g(86), yg + 9], [g(100), yg]], P.bg, P.groundEdge, 1.2);
        post(cw - 30, 15, true);
        break;
      default:
        post(cw - 30, 15, true);
        s.text(g(cw / 2 - 6), yg - 30, 'cas par cas', { size: 11, fill: P.muted, italic: true });
    }
    s.text(x + cw / 2, 152, b.cas, { size: 15, weight: 700, fill: actif ? P.accent : P.ink });
    s.text(x + cw / 2, 172, b.plage, { size: 12, fill: P.cote, weight: 600 });
    s.text(x + cw / 2, 198, b.exig, { size: 11.5, weight: 600 });
    const mots = b.disp.split(' ');
    const l1 = [];
    const l2 = [];
    mots.forEach((m) => ((l1.join(' ') + ' ' + m).length <= 18 && !l2.length ? l1.push(m) : l2.push(m)));
    s.text(x + cw / 2, 220, l1.join(' '), { size: 11, fill: P.muted });
    if (l2.length) s.text(x + cw / 2, 236, l2.join(' '), { size: 11, fill: P.muted });
  });
  return s.toString();
}

/* ------------------------------------------------------------------ 3. arbre de décision */

const XA = 66;
const XB = 265;
const XC = 455;
const XD = 770;
const XE = 1020;
const WF = 270;
const XF = 765;
const WZ = 770;

const NOEUDS = {
  racine: { x: XA, y: 380, w: 112, t: ['Zone du', 'tronçon'], k: 'q' },
  zSC: { x: XB, y: 190, w: 172, t: ['Section courante', 'ou voirie latérale'], k: 'z' },
  zOAJ: { x: XB, y: 430, w: 172, t: ['Plates-formes', 'jumelées sur ouvrage'], k: 'z' },
  zOA: { x: XB, y: 500, w: 172, t: ['Ouvrage au-dessus', 'de la voie ferrée'], k: 'z' },
  zAB: { x: XB, y: 570, w: 172, t: ['Abords d’ouvrage'], k: 'z' },
  zCA: { x: XB, y: 640, w: 172, t: ['Carrefour surélevé', 'contigu'], k: 'z' },
  zEC: { x: XB, y: 710, w: 172, t: ['Échangeur', 'contigu'], k: 'z' },
  qPos: { x: XC, y: 190, w: 168, t: ['Niveaux relatifs', 'des plates-formes'], k: 'q' },
  qL1: { x: XD, y: 128, w: 150, t: ['Distance L1'], k: 'q' },
  qDh: { x: XD, y: 300, w: 150, t: ['Dénivelé Δh'], k: 'q' },
  SC0: { x: XE, y: 26, w: WF, t: ['< 2 m : hors cas, étude spécifique'], k: 'f' },
  SC1: { x: XE, y: 60, w: WF, t: ['2–6 m : cas 1, H3 + écran 3,50 m'], k: 'f' },
  SC2: { x: XE, y: 94, w: WF, t: ['6–8 m : cas 2, LBE 3,50 m'], k: 'f' },
  SC3: { x: XE, y: 128, w: WF, t: ['8–17 m : cas 3, H2 + écran 3,00 m'], k: 'f' },
  SC4: { x: XE, y: 162, w: WF, t: ['17–30 m : cas 4, merlon 3 m + N2'], k: 'f' },
  SC5: { x: XE, y: 196, w: WF, t: ['30–50 m : cas 5, fossé 1,50 m'], k: 'f' },
  SC6: { x: XE, y: 230, w: WF, t: ['≥ 50 m : analyse au cas par cas'], k: 'f' },
  FHr: { x: XE, y: 284, w: WF, t: ['3–6 m, talus ≥ 3/2 : aucune protection'], k: 'f' },
  FHd: { x: XE, y: 318, w: WF, t: ['3–6 m, talus < 3/2 : barrière N2'], k: 'f' },
  FH2: { x: XE, y: 360, w: WF, t: ['> 6 m : aucun dispositif nécessaire'], k: 'f' },
  fOAJ: { x: XF, y: 430, w: WZ, t: ['Niveau du cas de section courante selon L1 (H2 minimum en rive), écran si', 'la courbe de chute y = 0,111 x² atteint la plate-forme ferroviaire · §5.1'], k: 'f' },
  fOA: { x: XF, y: 500, w: WZ, t: ['H2 minimum ; fort trafic PL : H3 avec ensemble BLE (BN4 + écran de 3,00 m)', 'LBE non implantable en rive d’ouvrage courant · §5.1'], k: 'f' },
  fAB: { x: XF, y: 570, w: WZ, t: ['Prolonger le dispositif sur 50 m perpendiculairement à la voie ferrée,', 'soit 50 / sin α le long de la route, puis le dispositif d’extrémité · §5.2'], k: 'f' },
  fCA: { x: XF, y: 640, w: WZ, t: ['Fort trafic PL : débouché reporté au-delà des dispositifs de retenue ;', 'sinon alignement décalé de 5 à 10° ou musoir intégré · §5.4'], k: 'f' },
  fEC: { x: XF, y: 710, w: WZ, t: ['Analyse particulière ; dispositifs BLE, BHE ou LBE préconisés · §5.5'], k: 'f' },
};

const ARETES = [
  ['racine', 'zSC'], ['racine', 'zOAJ'], ['racine', 'zOA'], ['racine', 'zAB'], ['racine', 'zCA'], ['racine', 'zEC'],
  ['zSC', 'qPos'],
  ['qPos', 'qL1', 'à niveau ou fer en contrebas'],
  ['qPos', 'qDh', 'fer au-dessus'],
  ['qDh', 'qL1', 'Δh < 3 m'],
  ...['SC0', 'SC1', 'SC2', 'SC3', 'SC4', 'SC5', 'SC6'].map((c) => ['qL1', c]),
  ['qDh', 'FHr'], ['qDh', 'FHd'], ['qDh', 'FH2'],
  ['zOAJ', 'fOAJ'], ['zOA', 'fOA'], ['zAB', 'fAB'], ['zCA', 'fCA'], ['zEC', 'fEC'],
];

/** Nœuds et arêtes empruntés par une configuration. */
export function chemin(ligne) {
  const p = E.normaliser(ligne);
  const res = E.evaluer(p);
  const n = new Set(['racine']);
  const zone = { sc: 'zSC', lat: 'zSC', oaJum: 'zOAJ', oa: 'zOA', abords: 'zAB', carrefour: 'zCA', echangeur: 'zEC' }[p.zone];
  n.add(zone);
  if (zone === 'zSC') {
    n.add('qPos');
    if (p.position === 'ferHaut') {
      n.add('qDh');
      if (res.code === 'FH2') n.add('FH2');
      else if (res.code === 'FH1') {
        if (res.statut === 'aucune') n.add('FHr');
        else if (res.statut !== 'incomplet') n.add('FHd');
      } else if (p.denivele !== null) n.add('qL1');
    } else n.add('qL1');
    if (n.has('qL1') && /^SC\d$/.test(res.code)) n.add(res.code);
  } else {
    n.add(`f${zone.slice(1)}`);
  }
  const a = new Set(ARETES.filter(([d, f]) => n.has(d) && n.has(f) && !(d === 'qPos' && f === 'qL1' && n.has('qDh'))).map(([d, f]) => `${d}>${f}`));
  return { noeuds: n, aretes: a, res };
}

export function svgArbre(ligne) {
  const { noeuds, aretes } = chemin(ligne);
  const s = new Svg(1170, 742, P, 'Arbre de décision du guide Géfra');
  const id = s.id;
  s.defs.push(`<marker id="${id}m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${P.line}"/></marker>`);
  s.defs.push(`<marker id="${id}a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${P.accent}"/></marker>`);
  const H = (nd) => (nd.t.length > 1 ? 44 : 28);

  const libelles = [];
  for (const [d, f, lab] of ARETES) {
    const a = NOEUDS[d];
    const b = NOEUDS[f];
    const actif = aretes.has(`${d}>${f}`);
    const x1 = a.x + a.w / 2;
    const y1 = a.y;
    let x2 = b.x - b.w / 2;
    let y2 = b.y;
    let dPath;
    if (d === 'qDh' && f === 'qL1') {
      x2 = b.x;
      y2 = b.y + H(b) / 2;
      dPath = `M${a.x},${a.y - H(a) / 2} L${x2},${y2 + 2}`;
    } else {
      const mx = (x1 + x2) / 2;
      dPath = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2 - 2},${y2}`;
    }
    s.path(dPath, 'none', actif ? P.accent : P.line, actif ? 2.6 : 1.2, `marker-end="url(#${id}${actif ? 'a' : 'm'})"`);
    if (lab) {
      let lx;
      let ly;
      if (d === 'qDh' && f === 'qL1') [lx, ly] = [b.x + 8, (a.y + b.y) / 2 + 4];
      else [lx, ly] = [(x1 + x2) / 2 + 4, (y1 + y2) / 2 + (y2 < y1 ? -6 : 14)];
      libelles.push([lx, ly, lab, actif, d === 'qDh' && f === 'qL1' ? 'start' : 'middle']);
    }
  }
  for (const [lx, ly, lab, actif, anchor] of libelles) {
    const w = lab.length * 6.2 + 10;
    const x0 = anchor === 'start' ? lx - 4 : lx - w / 2;
    s.rect(x0, ly - 12, w, 16, P.bg, 'none', 0, 'rx="3"');
    s.text(lx + (anchor === 'start' ? 1 : 0), ly, lab, { size: 11, anchor, fill: actif ? P.accent : P.muted, weight: actif ? 700 : 400 });
  }

  for (const [cle, nd] of Object.entries(NOEUDS)) {
    const actif = noeuds.has(cle);
    const h = H(nd);
    const fill = actif ? P.accentSoft : nd.k === 'q' ? P.panel : P.bg;
    const stroke = actif ? P.accent : nd.k === 'f' ? P.line : P.line;
    s.rect(nd.x - nd.w / 2, nd.y - h / 2, nd.w, h, fill, stroke, actif ? 2.2 : 1, `rx="${nd.k === 'q' ? 14 : 6}"`);
    const size = nd.k === 'f' ? 11.5 : 12.5;
    const weight = nd.k === 'f' ? (actif ? 700 : 400) : 700;
    const anchor = nd.k === 'f' ? 'start' : 'middle';
    const tx = nd.k === 'f' ? nd.x - nd.w / 2 + 12 : nd.x;
    nd.t.forEach((t, i) => s.text(tx, nd.y + (i - (nd.t.length - 1) / 2) * 15 + 4, t, { size, weight, anchor, fill: actif ? P.ink : nd.k === 'f' ? P.ink : P.ink }));
  }
  s.text(20, 22, 'Question', { size: 11, anchor: 'start', fill: P.muted });
  s.rect(76, 10, 26, 16, P.panel, P.line, 1, 'rx="8"');
  s.text(112, 22, 'Résultat', { size: 11, anchor: 'start', fill: P.muted });
  s.rect(164, 10, 26, 16, P.bg, P.line, 1, 'rx="3"');
  s.text(200, 22, 'Chemin de la configuration de l’assistant', { size: 11, anchor: 'start', fill: P.accent, weight: 700 });
  s.line(456, 18, 486, 18, P.accent, 2.6);
  return s.toString();
}

/* ------------------------------------------------------------------ 4. carte des zones */

export function svgZones() {
  const s = new Svg(1000, 430, P, 'Les types de zones sur un plan de jumelage');
  const num = (x, y, n) => {
    s.add(`<circle cx="${x}" cy="${y}" r="13" fill="${P.ink}"/>`);
    s.text(x, y + 4.5, String(n), { size: 13, weight: 700, fill: P.bg });
  };
  s.rect(0, 0, 1000, 430, P.ground, 'none', 0, 'opacity="0.45"');
  // rivière franchie par les deux plates-formes
  s.poly([[300, 0], [345, 0], [395, 430], [350, 430]], P.water, P.accent, 0.8);
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
  num(120, 167, 1);
  num(358, 167, 3);
  // voie franchissante (ouvrage)
  s.rect(590, 0, 44, 430, P.asphalt);
  s.line(612, 0, 612, 430, P.bg, 1.2, 'stroke-dasharray="10 8"');
  [[86, 144], [190, 264]].forEach(([y0, y1]) => {
    s.line(584, y0, 584, y1, P.ink, 2.4);
    s.line(640, y0, 640, y1, P.ink, 2.4);
  });
  num(668, 108, 4);
  // ⑤ abords : 50 m perpendiculaires à la voie ferrée
  s.line(20, 34, 980, 34, P.cote, 1, 'stroke-dasharray="6 5"');
  s.text(976, 28, '50 m de l’entrée en terre', { size: 11, fill: P.cote, anchor: 'end' });
  s.line(578, 34, 578, 86, P.steel, 3);
  s.line(646, 34, 646, 86, P.steel, 3);
  s.line(578, 18, 578, 34, P.steel, 3, 'stroke-dasharray="4 3"');
  s.line(646, 18, 646, 34, P.steel, 3, 'stroke-dasharray="4 3"');
  num(548, 58, 5);
  // ⑥ carrefour entre les deux ouvrages et ② voirie latérale
  s.rect(634, 158, 250, 18, P.asphalt, 'none', 0, 'opacity="0.8"');
  s.add(`<circle cx="636" cy="167" r="16" fill="none" stroke="${P.hazard}" stroke-width="3"/>`);
  num(676, 167, 6);
  num(820, 167, 2);
  // ⑦ échangeur contigu
  s.add(`<path d="M780,258 C780,330 900,350 900,300 C900,268 860,262 840,258" fill="none" stroke="${P.asphalt}" stroke-width="12"/>`);
  s.add(`<path d="M720,258 C700,320 640,330 634,330" fill="none" stroke="${P.asphalt}" stroke-width="10"/>`);
  num(930, 330, 7);
  return s.toString();
}

const LEGENDE_ZONES = [
  ['sc', 'La distance L1 entre les deux plates-formes fixe le cas (§4).'],
  ['lat', 'Protégée vis-à-vis de la voie ferrée comme une section courante (§5.3).'],
  ['oaJum', 'Les deux plates-formes franchissent ensemble une autre voie : continuité de la protection et courbe de chute (§5.1).'],
  ['oa', 'H2 en rive, ou H3 avec écran de 3,00 m si le trafic PL est fort (§5.1).'],
  ['abords', 'Le dispositif de l’ouvrage se prolonge sur 50 m depuis l’entrée en terre (§5.2).'],
  ['carrefour', 'Débouché situé entre les deux ouvrages : reporté, décalé ou équipé d’un musoir (§5.4).'],
  ['echangeur', 'Analyse particulière, dispositifs BLE, BHE ou LBE (§5.5).'],
];

/* ------------------------------------------------------------------ vue */

const ETAPES = [
  ['Décrire', 'Vous saisissez la configuration : zone, L1, niveaux relatifs, dénivelé, pente du talus, trafic PL, angle de franchissement.', 'assistant', 'Assistant ou Linéaire'],
  ['Classer', 'Le moteur suit l’arbre de décision du guide et identifie le cas Géfra applicable (§4.2, §4.3, §5).', 'referentiel', 'Référentiel'],
  ['Exiger', 'Il en déduit le niveau de retenue minimal, l’élément anti-pénétration et ses dimensions, puis propose les solutions du guide avec une coupe cotée.', 'assistant', 'Assistant'],
  ['Contrôler', 'Il compare le dispositif projeté au dossier avec l’exigence et relève chaque écart.', 'lineaire', 'Linéaire'],
  ['Rédiger', 'Chaque écart devient un constat classé P0, P1 ou P2, repris dans le rapport Word, PDF ou Excel.', 'constats', 'Constats et Rapport'],
];

const EXEMPLE = { zone: 'sc', L1: '7,1', position: 'meme', projet: 'n2', pkDebut: '0+180', pkFin: '0+420', cote: 'D' };

function htmlExemple() {
  const { p, res, ctl } = M.evaluerLigne(EXEMPLE, 'classique');
  const maillons = [
    ['Tronçon', `${M.localisation(EXEMPLE, 0)} · L1 = ${E.fmtM(E.num(p.L1))} · ${E.libelleProjete(p)}`],
    ['Cas Géfra', `${res.titre} (${res.plage}), ${res.ref}`],
    ['Exigence', E.libelleExigence(res)],
    ['Écarts', ctl.ecarts.map((e) => `${e.priorite} : ${e.ecart}`).join(' ')],
    ['Constat', `GF01, priorité ${ctl.priorite}, avec risque et recommandation, repris dans le rapport`],
  ];
  return `<ol class="chaine">${maillons.map(([k, v]) => `<li><span class="k">${esc(k)}</span><span>${esc(v)}</span></li>`).join('')}</ol>`;
}

export function htmlComprendre(projet) {
  const a = projet.assistant;
  const { res } = chemin(a);
  const n = E.normaliser(a);
  const codeBande = ['sc', 'lat'].includes(n.zone) && /^SC\d$/.test(res.code) ? res.code : null;
  const resumeChemin = `${E.ZONES[n.zone].label}${n.L1 !== null && ['sc', 'lat', 'oaJum', 'echangeur'].includes(n.zone) ? `, L1 = ${E.fmtM(n.L1)}` : ''} : ${res.titre}${res.plage ? ` (${res.plage})` : ''}.`;
  return `
  <section class="panel ref-section">
    <h2>Ce que fait GÉFRA</h2>
    <p class="prose">GÉFRA applique le guide Sétra « Géfra » (2004) à l’interface entre une route et une voie ferrée jumelées. Il répond à deux questions : <strong>quelle protection anti-pénétration le guide exige-t-il ici ?</strong> et <strong>le dispositif prévu au dossier y répond-il ?</strong></p>
    <ol class="flux">${ETAPES.map(([t, d, vue, onglet], i) => `<li><span class="flux-n">${i + 1}</span><h3>${esc(t)}</h3><p>${esc(d)}</p><a href="#${vue}">${esc(onglet)} →</a></li>`).join('')}</ol>
  </section>

  <section class="panel ref-section">
    <h2>La donnée clé : la distance L1</h2>
    <p class="prose">Le guide raisonne sur la largeur disponible entre les deux plates-formes. L1 se mesure perpendiculairement aux axes, de la limite de la largeur roulable à la limite des aménagements ferroviaires. Selon le profil, l’entrée en terre ferroviaire se situe à un endroit différent.</p>
    <figure class="figure schema">${svgMesureL1()}</figure>
  </section>

  <section class="panel ref-section">
    <h2>Plus l’interface est étroite, plus la protection est lourde</h2>
    <p class="prose">En section courante, à niveau ou voie ferrée en contrebas, L1 suffit à fixer le cas. Une interface étroite exige un écran haut et une forte retenue ; une interface large laisse place à un merlon ou à un fossé, que le guide préfère aux barrières.${codeBande ? ' La colonne encadrée correspond à la configuration de l’assistant.' : ''}</p>
    <figure class="figure schema">${svgBandes(codeBande)}<figcaption>Coupes de principe, voie ferrée à gauche et route à droite. Largeurs de colonnes égales : l’échelle des distances n’est pas proportionnelle.</figcaption></figure>
  </section>

  <section class="panel ref-section">
    <h2>L’arbre de décision appliqué</h2>
    <p class="prose">Toutes les configurations passent par cet arbre. En bleu, le chemin suivi par la configuration de l’assistant : <strong>${esc(resumeChemin)}</strong> <a href="#assistant">Modifier dans l’assistant →</a></p>
    <figure class="figure schema large">${svgArbre(a)}</figure>
  </section>

  <section class="panel ref-section">
    <h2>Quelle zone choisir ?</h2>
    <p class="prose">Le champ « Zone » de l’assistant et du linéaire désigne la situation du tronçon. Le plan ci-dessous les situe sur un jumelage type.</p>
    <figure class="figure schema">${svgZones()}</figure>
    <ol class="legende-zones">${LEGENDE_ZONES.map(([k, t]) => `<li><strong>${esc(E.ZONES[k].label)}.</strong> ${esc(t)}</li>`).join('')}</ol>
  </section>

  <section class="panel ref-section">
    <h2>Du dispositif projeté au constat</h2>
    <p class="prose">Pour chaque tronçon, le dispositif du dossier est comparé à l’exigence du guide. Exemple tiré du projet de démonstration :</p>
    ${htmlExemple()}
    <div class="prio-cols">
      <div class="prio-col p0"><h3><span class="pill p0">P0</span> Critique</h3><ul>
        <li>Niveau de retenue projeté inférieur au niveau exigé</li>
        <li>Écran, mur ou merlon exigé absent</li>
        <li>Accès de service en jumelage très étroit (cas 1)</li>
        <li>L1 inférieure à 2 m</li></ul></div>
      <div class="prio-col p1"><h3><span class="pill p1">P1</span> Important</h3><ul>
        <li>Hauteur d’écran, de mur ou de merlon insuffisante</li>
        <li>Talus du merlon côté route différent de 3/2</li>
        <li>Prolongement aux abords d’ouvrage trop court</li>
        <li>LBE en rive d’ouvrage, décalage de carrefour au-delà de 10°</li></ul></div>
      <div class="prio-col p2"><h3><span class="pill p2">P2</span> À vérifier</h3><ul>
        <li>Variante différente du guide, à justifier</li>
        <li>Écran à la place du merlon préconisé</li>
        <li>Absence de dispositif au-delà de 50 m</li>
        <li>L1 à moins de 0,20 m d’un seuil</li></ul></div>
    </div>
    <p class="help">Ces priorités sont des propositions : l’auditeur peut les modifier dans l’onglet Constats.</p>
  </section>

  <section class="panel ref-section">
    <h2>Vos données</h2>
    <p class="prose">Les projets sont enregistrés dans ce navigateur uniquement ; rien n’est envoyé à un serveur. Pour sauvegarder, transmettre un projet ou changer de poste, utilisez « Exporter le projet (.json) » puis « Importer un projet » dans le menu ⋯ en haut à droite.</p>
  </section>`;
}
