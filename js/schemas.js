/*
 * GÉFRA — schémas SVG générés à partir des données saisies :
 * coupes types cotées, talus de raccordement, rive d'ouvrage, plan des abords,
 * courbe de chute du chargement, règle des cas L1.
 * Toutes les longueurs sont en mètres ; x = 0 à la limite roulable, x = L1 à la limite ferroviaire.
 */
import { fmt, implantationMerlon, porteeChute, fmtTalus, parsePK, fmtPK, longueurAbords } from './engine.js';

export const PAL_ECRAN = {
  ink: 'var(--ink)', muted: 'var(--ink-2)', line: 'var(--line)', bg: 'var(--surface)',
  ground: 'var(--ground)', groundEdge: 'var(--ground-edge)', earth: 'var(--earth)',
  concrete: 'var(--concrete)', steel: 'var(--steel)', cote: 'var(--cote)', accent: 'var(--accent)',
  rail: 'var(--rail)', asphalt: 'var(--asphalt)', hazard: 'var(--hazard)', ok: 'var(--ok)', p0: 'var(--p0)',
  panel: 'var(--surface-2)', water: 'var(--accent-soft)',
  grass: 'var(--grass)', ballast: 'var(--ballast)', marking: 'var(--marking)',
  font: 'inherit',
};

export const PAL_EXPORT = {
  ink: '#17212B', muted: '#4A5866', line: '#A9B3B1', bg: '#FFFFFF',
  ground: '#ECE8DD', groundEdge: '#8C8473', earth: '#D8CBA8',
  concrete: '#C9CFCD', steel: '#3D4B58', cote: '#C0262D', accent: '#1D5C8C',
  rail: '#6B5B4E', asphalt: '#5A6168', hazard: '#E0A800', ok: '#2E7D4F', p0: '#C0262D',
  panel: '#F5F7F6', water: '#E2ECF5', grass: '#DDE6D3', ballast: '#B9B1A4', marking: '#FFFFFF',
  font: 'Arial, Helvetica, sans-serif',
};

let uid = 0;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r1 = (v) => Math.round(v * 10) / 10;

export class Svg {
  constructor(w, h, pal, titre) {
    this.w = w;
    this.h = h;
    this.pal = pal;
    this.titre = titre;
    this.id = `g${++uid}`;
    this.parts = [];
    this.defs = [];
  }
  add(s) { this.parts.push(s); return this; }
  line(x1, y1, x2, y2, stroke, sw = 1, extra = '') {
    return this.add(`<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`);
  }
  rect(x, y, w, h, fill, stroke = 'none', sw = 1, extra = '') {
    const X = Math.min(x, x + w);
    const Y = Math.min(y, y + h);
    return this.add(`<rect x="${r1(X)}" y="${r1(Y)}" width="${r1(Math.abs(w))}" height="${r1(Math.abs(h))}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`);
  }
  poly(pts, fill, stroke = 'none', sw = 1, extra = '') {
    return this.add(`<polygon points="${pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`);
  }
  path(d, fill, stroke, sw = 1, extra = '') {
    return this.add(`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`);
  }
  text(x, y, t, { size = 11, anchor = 'middle', fill = this.pal.ink, weight = 400, rotate = null, italic = false } = {}) {
    const tr = rotate !== null ? ` transform="rotate(${rotate} ${r1(x)} ${r1(y)})"` : '';
    return this.add(`<text x="${r1(x)}" y="${r1(y)}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" font-weight="${weight}"${italic ? ' font-style="italic"' : ''} font-family="${this.pal.font}"${tr}>${esc(t)}</text>`);
  }
  toString() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" width="${this.w}" height="${this.h}" role="img" aria-label="${esc(this.titre)}"><title>${esc(this.titre)}</title><defs>${this.defs.join('')}</defs><rect width="${this.w}" height="${this.h}" fill="${this.pal.bg}"/>${this.parts.join('')}</svg>`;
  }
}

/* ------------------------------------------------------------------ coupe type */

export function voie(s, cx, y, pal) {
  s.poly([[cx - 46, y], [cx - 30, y - 14], [cx + 30, y - 14], [cx + 46, y]], pal.ground, pal.groundEdge, 1);
  s.rect(cx - 36, y - 17, 72, 3, pal.rail);
  s.rect(cx - 22, y - 22, 5, 6, pal.steel);
  s.rect(cx + 17, y - 22, 5, 6, pal.steel);
}

export function poteauCatenaire(s, x, y, h, pal) {
  s.line(x, y, x, y - h, pal.steel, 3);
  s.line(x, y - h + 10, x - 70, y - h + 10, pal.steel, 1.5);
  s.line(x, y - h + 30, x - 70, y - h + 12, pal.steel, 1);
  s.line(x - 50, y - h + 11, x - 50, y - h + 24, pal.steel, 1);
}

export function svgCoupe(spec, pal = PAL_ECRAN) {
  const v = spec.variante;
  const L1vrai = spec.L1 ?? 0;
  const L1 = v === 'SC6-S1' ? Math.min(Math.max(L1vrai, 50), 60) : Math.max(L1vrai, 2);
  const W = 760;
  const mL = 150;
  const mR = 130;
  const span = W - mL - mR;
  const sx = span / L1;
  const sy = Math.max(22, Math.min(sx, 44));
  const hMax = { 'SC4-S1': 3.4, 'SC5-S1': 2.2, 'SC6-S1': 2.2 }[v] ?? 3.9;
  const y0 = 46 + hMax * sy;
  const dessous = v === 'SC5-S1' ? 1.5 * sy + 12 : v.startsWith('SC3') || v.startsWith('SC1') || v.startsWith('SC2') ? Math.max(20, 0.7 * sy + 8) : 20;
  const rowA = y0 + dessous + 16;
  const rowB = rowA + 24;
  const H = rowB + 30;
  const X = (x) => mL + (L1 - x) * sx;
  const Y = (y) => y0 - y * sy;
  const s = new Svg(W, H, pal, `Coupe type ${v}, L1 = ${fmt(L1vrai)} m`);
  const hatch = `${s.id}h`;
  s.defs.push(`<pattern id="${hatch}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${pal.concrete}"/><line x1="0" y1="0" x2="0" y2="6" stroke="${pal.steel}" stroke-width="1"/></pattern>`);

  /* terrain, voie ferrée, chaussée */
  const ferBas = spec.position === 'ferBas' && (spec.denivele ?? 0) > 0;
  const yr = ferBas ? y0 + Math.min(spec.denivele * sy, 70) : y0;
  s.rect(10, y0, W - 20, dessous - 4, pal.ground);
  if (ferBas) {
    s.rect(10, y0 - 1, mL - 10, dessous + 2, pal.bg);
    s.poly([[10, yr], [mL - 44, yr], [mL, y0], [mL, y0 + dessous - 4], [10, y0 + dessous - 4]], pal.ground);
    s.line(10, yr, mL - 44, yr, pal.groundEdge, 1.2);
    s.line(mL - 44, yr, mL, y0, pal.groundEdge, 1.2);
    s.text(mL - 30, (yr + y0) / 2 + 14, `dénivelé ${fmt(spec.denivele)} m`, { size: 9.5, anchor: 'end', fill: pal.muted });
  } else {
    s.line(10, y0, mL, y0, pal.groundEdge, 1.2);
  }
  voie(s, 62, yr, pal);
  poteauCatenaire(s, mL - 22, yr, Math.min(150, yr - 30), pal);
  s.line(mL, y0, W - mR, y0, pal.groundEdge, 1.2);
  s.rect(W - mR, y0 - 5, mR - 10, 7, pal.asphalt);
  s.line(W - mR + 52, y0 - 5, W - mR + 52, y0 + 2, pal.bg, 2, 'stroke-dasharray="3 2"');
  s.text(W - mR + 44, y0 + 24, 'BAU/BDD ≥ 2,00', { size: 9.5, fill: pal.muted });
  s.text(W - mR + 100, y0 - 10, 'chaussée', { size: 9.5, fill: pal.muted });

  /* primitives en mètres */
  const glissiere = (x, label, dashed = false) => {
    const ex = dashed ? 'stroke-dasharray="3 2"' : '';
    s.line(X(x), Y(0), X(x), Y(0.75), pal.steel, 2, ex);
    s.rect(X(x), Y(0.75), 7, 9, dashed ? 'none' : pal.steel, pal.steel, 1, ex);
    if (label) s.text(X(x) + 4, Y(0.75) - 8, label, { size: 10, weight: 600, fill: pal.ink });
  };
  const gba = (x0, label = 'GBA') => {
    s.poly([[X(x0), Y(0)], [X(x0 + 0.28), Y(0.8)], [X(x0 + 0.5), Y(0.8)], [X(x0 + 0.5), Y(0)]], pal.concrete, pal.steel, 1);
    s.text(X(x0 + 0.25), Y(0.8) - 8, label, { size: 10, weight: 600 });
  };
  const lba = () => {
    s.poly([[X(0), Y(0)], [X(0.12), Y(0.25)], [X(0.62), Y(1.5)], [X(0.95), Y(1.5)], [X(0.95), Y(0)]], pal.concrete, pal.steel, 1);
  };
  const ecran = (x, yb, yt, label) => {
    for (let y = yb + 0.4; y < yt - 0.1; y += 0.5) s.line(X(x) - 5, Y(y), X(x) + 5, Y(y), pal.steel, 1.5);
    s.line(X(x), Y(yb), X(x), Y(yt), pal.steel, 3);
    if (label) s.text(X(x) - 8, Y(yt) + 4, label, { size: 10, weight: 600, anchor: 'end' });
  };
  const mur = (x0, x1, h, label) => {
    s.rect(X(x1), Y(h), X(x0) - X(x1), Y(0) - Y(h), `url(#${hatch})`, pal.steel, 1);
    if (label) s.text(X(x1) - 6, Y(h / 2), label, { size: 10, weight: 600, anchor: 'end' });
  };
  const cloture = (x, yb = 0, h = 2) => {
    s.line(X(x), Y(yb), X(x), Y(yb + h), pal.muted, 1);
    for (let y = yb + 0.3; y <= yb + h; y += 0.45) s.text(X(x), Y(y) + 3.5, '×', { size: 9, fill: pal.muted });
  };
  const massif = (x, w = 0.7, d = 0.7) => s.rect(X(x + w / 2), Y(0), X(x - w / 2) - X(x + w / 2), Y(-d) - Y(0), pal.concrete, pal.steel, 1);
  const semelle = (x0, x1, d = 0.3) => s.rect(X(x1), Y(0), X(x0) - X(x1), Y(-d) - Y(0), pal.concrete, pal.steel, 1);
  const caniveau = () => {
    s.rect(X(0) - 2, Y(0), 12, 11, pal.bg, pal.ink, 1);
    s.line(X(0) + 4, Y(0), X(0) + 4, Y(0) + 4, pal.ink, 1);
  };
  const cunette = (xc, w = 1.0, d = 0.3) => s.poly([[X(xc + w / 2), Y(0)], [X(xc), Y(-d)], [X(xc - w / 2), Y(0)]], pal.bg, pal.groundEdge, 1);
  const emprise = (x) => {
    s.line(X(x), 22, X(x), y0, pal.muted, 1, 'stroke-dasharray="5 4"');
    s.text(X(x) - 6, 16, 'Emprise ferroviaire', { size: 9.5, anchor: 'end', fill: pal.muted });
    s.text(X(x) + 6, 16, 'Emprise routière', { size: 9.5, anchor: 'start', fill: pal.muted });
  };
  const cote = (xa, xb, row, label, mini = null) => {
    const pa = X(xa);
    const pb = X(xb);
    const insuff = mini !== null && xb - xa < mini - 1e-6;
    const col = insuff ? pal.p0 : pal.cote;
    s.line(pa, row, pb, row, col, 1);
    s.line(pa, row - 5, pa, row + 5, col, 1);
    s.line(pb, row - 5, pb, row + 5, col, 1);
    const narrow = Math.abs(pa - pb) < 30;
    s.text((pa + pb) / 2, row - 4, label, { size: narrow ? 9 : 10.5, fill: col, weight: insuff ? 700 : 400 });
  };
  const coteV = (x, ya, yb, label, dx = 14) => {
    const px = X(x) + dx;
    s.line(px, Y(ya), px, Y(yb), pal.cote, 1);
    s.line(px - 4, Y(ya), px + 4, Y(ya), pal.cote, 1);
    s.line(px - 4, Y(yb), px + 4, Y(yb), pal.cote, 1);
    s.text(px + (dx > 0 ? 4 : -4), (Y(ya) + Y(yb)) / 2 + 4, label, { size: 10.5, fill: pal.cote, anchor: dx > 0 ? 'start' : 'end' });
  };
  const L = (x) => fmt(x);

  switch (v) {
    case 'SC1-S1': {
      glissiere(0, 'GRC');
      caniveau();
      mur(L1 - 1.0, L1 - 0.5, 3.5, 'Mur BA');
      emprise(L1 - 0.5);
      coteV(L1 - 1.0, 0, 3.5, '3,50', 16);
      cote(0, L1 - 1.0, rowA, L(L1 - 1.0), 1.0);
      cote(L1 - 1.0, L1 - 0.5, rowA, '0,50');
      cote(L1 - 0.5, L1, rowA, '0,50');
      break;
    }
    case 'SC1-S2':
    case 'SC2-S1': {
      semelle(-0.05, 1.0);
      lba();
      ecran(0.95, 1.5, 3.5, 'LBE');
      caniveau();
      coteV(0, 0, 1.5, '1,50', 12);
      coteV(0.95, 0, 3.5, '3,50', -18);
      cote(0, 0.95, rowA, '0,95');
      if (v === 'SC2-S1') {
        cunette(0.95 + 1.75);
        cloture(4.45);
        emprise(4.45);
        cote(0.95, 4.45, rowA, '3,50');
        cote(4.45, L1, rowA, L(L1 - 4.45), 1.55);
      } else {
        emprise(0.95);
        cote(0.95, L1, rowA, L(L1 - 0.95), 1.05);
      }
      break;
    }
    case 'SC1-S3': {
      gba(0);
      caniveau();
      mur(L1 - 1.0, L1 - 0.5, 1.5, 'Mur BA');
      ecran(L1 - 0.75, 1.5, 3.5, 'Écran + clôture');
      emprise(L1 - 0.5);
      coteV(L1 - 1.0, 0, 3.5, '3,50', 16);
      coteV(0.5, 0, 0.8, '0,80', -12);
      cote(0, 0.5, rowA, '0,50');
      cote(0.5, L1 - 1.0, rowA, L(L1 - 1.5), 1.0);
      cote(L1 - 1.0, L1 - 0.5, rowA, '0,50');
      cote(L1 - 0.5, L1, rowA, '0,50');
      break;
    }
    case 'SC3-S1':
    case 'SC3-S2': {
      const xb = L1 - 4.5 >= 6.5 ? L1 - 4.5 : L1 - 1.5;
      if (v === 'SC3-S1') {
        glissiere(0, 'GS4');
        s.line(X(xb), Y(0), X(xb), Y(0.75), pal.steel, 2);
        s.rect(X(xb), Y(0.75), 7, 9, pal.steel);
        ecran(xb, 0.75, 3.0, 'BHE + clôture');
      } else {
        gba(0);
        massif(xb);
        ecran(xb, 0, 3.0, 'Écran + clôture');
      }
      cunette(2.5);
      emprise(xb);
      coteV(xb, 0, 3.0, '3,00', -18);
      cote(0, 1.5, rowA, '1,50');
      cote(1.5, xb, rowA, L(xb - 1.5), 5.0);
      cote(xb, L1, rowA, L(L1 - xb), 1.5);
      break;
    }
    case 'SC4-S1': {
      const m = { ...implantationMerlon(L1), ...(spec.merlon || {}) };
      if (spec.merlon) m.banqFer = L1 - (3 + 1 + m.mRoute * m.h + m.crete + m.mFer * m.h);
      glissiere(0, 'GS4');
      cunette(1.5);
      const xf = 4.0;
      const xc0 = xf + m.mRoute * m.h;
      const xc1 = xc0 + m.crete;
      const xff = xc1 + m.mFer * m.h;
      s.poly([[X(xf), Y(0)], [X(xc0), Y(m.h)], [X(xc1), Y(m.h)], [X(xff), Y(0)]], pal.earth, pal.groundEdge, 1.2);
      s.text((X(xf) + X(xc0)) / 2 + 12, Y(m.h / 2) + 2, '3/2', { size: 10, fill: pal.cote, weight: 600 });
      s.text((X(xc1) + X(xff)) / 2 - 12, Y(m.h / 2) + 2, fmtTalus(m.mFer), { size: 10, fill: pal.muted });
      cloture((xc0 + xc1) / 2, m.h, 1.6);
      emprise((xc0 + xc1) / 2);
      s.text(X((xc0 + xc1) / 2), Y(m.h) + 16, 'Merlon', { size: 10, weight: 600 });
      coteV(xc0, 0, m.h, `${fmt(m.h)} mini`, 10);
      cote(0, 3, rowA, '3,00');
      cote(3, xf, rowA, '1,00');
      cote(xf, xc0, rowA, L(xc0 - xf));
      cote(xc0, xc1, rowA, L(m.crete), 3);
      cote(xc1, xff, rowA, L(xff - xc1));
      cote(xff, L1, rowA, L(L1 - xff), 1);
      break;
    }
    case 'SC5-S1': {
      glissiere(0, 'GS4 si nécessaire', true);
      const xt = 10;
      const d = 1.5;
      s.poly([[X(xt), Y(0)], [X(xt + 2.25), Y(-d)], [X(xt + 5.75), Y(-d)], [X(xt + 8), Y(0)]], pal.bg, pal.groundEdge, 1.2);
      s.text(X(xt + 4), Y(-d) - 6, 'Fossé', { size: 10, weight: 600 });
      const xcl = L1 - 4.5;
      cloture(xcl);
      emprise(xcl);
      coteV(xt + 2.25, 0, -d, '1,50', 8);
      cote(0, xt, rowA, '10,00');
      cote(xt, xt + 8, rowA, '8,00');
      cote(xt + 8, xcl, rowA, L(xcl - xt - 8));
      cote(xcl, L1, rowA, '4,50');
      break;
    }
    case 'SC6-S1': {
      glissiere(0, 'N2 si nécessaire', true);
      s.text(X(L1 / 2), Y(1.2), 'Analyse au cas par cas', { size: 12, weight: 600, fill: pal.muted, italic: true });
      break;
    }
    default:
      break;
  }

  /* limites et L1 */
  s.add(`<circle cx="${r1(X(L1))}" cy="${r1(y0)}" r="4.5" fill="${pal.bg}" stroke="${pal.ink}" stroke-width="1.2"/>`);
  s.add(`<circle cx="${r1(X(0))}" cy="${r1(y0)}" r="4.5" fill="${pal.bg}" stroke="${pal.ink}" stroke-width="1.2"/>`);
  const labelL1 = v === 'SC6-S1' ? `L1 = ${fmt(L1vrai)} m (≥ 50 m)` : `L1 = ${fmt(L1vrai)} m`;
  s.line(X(L1), rowB, X(0), rowB, pal.cote, 1.4);
  s.line(X(L1), rowB - 6, X(L1), rowB + 6, pal.cote, 1.4);
  s.line(X(0), rowB - 6, X(0), rowB + 6, pal.cote, 1.4);
  s.text((X(L1) + X(0)) / 2, rowB - 5, labelL1, { size: 12, fill: pal.cote, weight: 700 });
  s.text(X(L1), H - 8, 'Limite des aménagements ferroviaires', { size: 9.5, anchor: 'start', fill: pal.muted });
  s.text(X(0), H - 8, 'Limite de la largeur roulable', { size: 9.5, anchor: 'end', fill: pal.muted });
  if (Math.abs(sy - sx) / sx > 0.05) s.text(W - 12, 16, 'Échelles H et V distinctes', { size: 9, anchor: 'end', fill: pal.muted, italic: true });
  return s.toString();
}

/* ------------------------------------------------------------------ voie ferrée au-dessus */

export function svgTalus(spec, pal = PAL_ECRAN) {
  const d = Math.max(spec.denivele ?? 4, 0.5);
  const m = spec.talus ?? 1.5;
  const W = 760;
  const xTop = 3 + m * d;
  const total = xTop + 1.5;
  const span = W - 150 - 130;
  const sx = span / total;
  const sy = Math.max(10, Math.min(sx, 150 / d));
  const y0 = 40 + d * sy + 34;
  const H = y0 + 60;
  const X = (x) => 150 + (total - x) * sx;
  const Y = (y) => y0 - y * sy;
  const s = new Svg(W, H, pal, `Voie ferrée au-dessus de la route, dénivelé ${fmt(d)} m, talus ${fmtTalus(m)}`);
  s.poly([[10, Y(d)], [X(xTop), Y(d)], [X(3), Y(0)], [W - 10, Y(0)], [W - 10, H - 30], [10, H - 30]], pal.ground, 'none');
  s.line(10, Y(d), X(xTop), Y(d), pal.groundEdge, 1.2);
  s.line(X(xTop), Y(d), X(3), Y(0), pal.groundEdge, 1.6);
  s.line(X(3), Y(0), W - 130, Y(0), pal.groundEdge, 1.2);
  s.rect(W - 130, y0 - 5, 120, 7, pal.asphalt);
  s.poly([[X(1.0), Y(0)], [X(1.5), Y(-0.3)], [X(2.0), Y(0)]], pal.bg, pal.groundEdge, 1);
  voie(s, 62, Y(d), pal);
  poteauCatenaire(s, 128, Y(d), Math.min(120, Y(d) - 10), pal);
  s.line(X(xTop), Y(d), X(xTop), Y(d) - 40, pal.muted, 1);
  for (let k = 1; k <= 4; k++) s.text(X(xTop), Y(d) - k * 9 + 3, '×', { size: 9, fill: pal.muted });
  s.text(X(xTop) + 6, Y(d) - 32, 'Clôture', { size: 9.5, anchor: 'start', fill: pal.muted });
  s.add(`<circle cx="${r1(X(total))}" cy="${r1(Y(d))}" r="4.5" fill="${pal.bg}" stroke="${pal.ink}" stroke-width="1.2"/>`);
  s.text(X(total) + 2, Y(d) + 18, 'Limite ferroviaire', { size: 9.5, anchor: 'start', fill: pal.muted });

  const v = spec.variante;
  if (v === 'FH-N2' || v === 'FH-N2-option') {
    const dashed = v === 'FH-N2-option';
    const ex = dashed ? 'stroke-dasharray="3 2"' : '';
    s.line(X(0), Y(0), X(0), Y(0.75), pal.steel, 2, ex);
    s.rect(X(0), Y(0.75), 7, 9, dashed ? 'none' : pal.steel, pal.steel, 1, ex);
    s.text(X(0) + 4, Y(0.75) - 8, dashed ? 'N2 possible' : 'GS4 (N2)', { size: 10, weight: 600 });
  }
  const px = X(xTop) - 18;
  s.line(px, Y(0), px, Y(d), pal.cote, 1);
  s.line(px - 4, Y(0), px + 4, Y(0), pal.cote, 1);
  s.line(px - 4, Y(d), px + 4, Y(d), pal.cote, 1);
  s.text(px - 6, (Y(0) + Y(d)) / 2 + 4, `${fmt(d)} m`, { size: 11, fill: pal.cote, anchor: 'end', weight: 700 });
  s.text((X(xTop) + X(3)) / 2 + 10, (Y(d) + Y(0)) / 2 - 4, `talus ${fmtTalus(m)}`, { size: 11, fill: m <= 1.5 ? pal.ok : pal.p0, weight: 700, anchor: 'start' });
  s.add(`<circle cx="${r1(X(0))}" cy="${r1(y0)}" r="4.5" fill="${pal.bg}" stroke="${pal.ink}" stroke-width="1.2"/>`);
  s.text(X(0), H - 10, 'Limite de la largeur roulable', { size: 9.5, anchor: 'end', fill: pal.muted });
  s.line(X(total), Y(d) + 26, X(xTop), Y(d) + 26, pal.cote, 1);
  s.text((X(total) + X(xTop)) / 2, Y(d) + 40, '1,50 mini', { size: 9.5, fill: pal.cote });
  return s.toString();
}

/* ------------------------------------------------------------------ rive d'ouvrage */

export function svgOA(spec, pal = PAL_ECRAN) {
  const W = 760;
  const H = 330;
  const s = new Svg(W, H, pal, spec.variante === 'BLE' ? 'Ensemble BLE en rive d’ouvrage' : 'Barrière H2 en rive d’ouvrage');
  const sc = 38;
  const xe = 330;
  const yd = 170;
  s.rect(xe, yd, W - 10 - xe, 0.9 * sc, pal.concrete, pal.steel, 1);
  s.rect(xe - 0.35 * sc, yd - 0.25 * sc, 0.35 * sc, 1.3 * sc, pal.concrete, pal.steel, 1);
  s.rect(xe + 2.4 * sc, yd - 6, W - 10 - xe - 2.4 * sc, 6, pal.asphalt);
  const xb = xe + 0.35 * sc;
  s.line(xb, yd - 0.25 * sc, xb, yd - 1.0 * sc, pal.steel, 3);
  s.rect(xb, yd - 1.0 * sc, 10, 0.3 * sc, pal.steel);
  if (spec.variante === 'BLE') {
    for (let y = 1.4; y < 3.0; y += 0.45) s.line(xb - 5, yd - y * sc, xb + 5, yd - y * sc, pal.steel, 1.5);
    s.line(xb, yd - 1.0 * sc, xb, yd - 3.0 * sc, pal.steel, 3);
    s.text(xb - 10, yd - 3.0 * sc + 6, 'BLE : BN4 + écran', { size: 11, anchor: 'end', weight: 600 });
    const px = xb + 22;
    s.line(px, yd, px, yd - 3.0 * sc, pal.cote, 1);
    s.line(px - 4, yd - 3.0 * sc, px + 4, yd - 3.0 * sc, pal.cote, 1);
    s.line(px - 4, yd, px + 4, yd, pal.cote, 1);
    s.text(px + 6, yd - 1.5 * sc, '3,00', { size: 11, fill: pal.cote, anchor: 'start' });
  } else {
    s.text(xb - 10, yd - 1.0 * sc, 'Barrière H2 min.', { size: 11, anchor: 'end', weight: 600 });
  }
  const yr = H - 40;
  s.rect(10, yr, xe - 30, 30, pal.ground);
  s.line(10, yr, xe - 20, yr, pal.groundEdge, 1.2);
  voie(s, 150, yr, pal);
  poteauCatenaire(s, 250, yr, 120, pal);
  s.text(W - 20, yd + 0.9 * sc + 18, 'Tablier de l’ouvrage routier', { size: 10, anchor: 'end', fill: pal.muted });
  s.text(20, yr + 22, 'Plate-forme ferroviaire', { size: 10, anchor: 'start', fill: pal.muted });
  return s.toString();
}

/* ------------------------------------------------------------------ plan des abords */

export function svgAbords(spec, pal = PAL_ECRAN) {
  const W = 760;
  const H = 360;
  const angle = Math.max(10, Math.min(spec.angle ?? 90, 170));
  const s = new Svg(W, H, pal, `Plan des abords : angle ${fmt(angle, 0)}°, longueur ${fmt(spec.longueur, 1)} m`);
  const yRail = 60;
  const yTerre = 100;
  const y50 = yTerre + 108;
  s.line(10, yRail, W - 10, yRail, pal.rail, 2, 'stroke-dasharray="14 4 2 4"');
  s.text(W - 14, yRail - 8, 'Axe de la plate-forme ferroviaire', { size: 10, anchor: 'end', fill: pal.muted });
  s.line(10, yTerre, W - 10, yTerre, pal.groundEdge, 1.4);
  for (let x = 16; x < W - 10; x += 10) s.line(x, yTerre, x, yTerre + 6, pal.groundEdge, 1);
  s.text(W - 14, yTerre - 6, 'Entrée en terre', { size: 10, anchor: 'end', fill: pal.muted });
  s.line(10, y50, W - 10, y50, pal.cote, 1, 'stroke-dasharray="6 4"');
  s.line(40, yTerre, 40, y50, pal.cote, 1);
  s.text(46, (yTerre + y50) / 2 + 4, '50 m', { size: 11, fill: pal.cote, anchor: 'start', weight: 700 });

  const rad = (angle * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);
  const cx = W / 2;
  const tLen = (H - yRail + 40) / uy;
  const p0 = [cx - ux * 60, yRail - uy * 60];
  const p1 = [cx + ux * tLen, yRail + uy * tLen];
  const nx = -uy;
  const ny = ux;
  const half = 16;
  s.poly([[p0[0] + nx * half, p0[1] + ny * half], [p1[0] + nx * half, p1[1] + ny * half], [p1[0] - nx * half, p1[1] - ny * half], [p0[0] - nx * half, p0[1] - ny * half]], pal.hazard, 'none', 0, 'opacity="0.55"');
  s.line(p0[0], p0[1], p1[0], p1[1], pal.ink, 1, 'stroke-dasharray="10 5"');
  [1, -1].forEach((sgn) => {
    const off = sgn * (half + 6);
    const tStart = (yTerre - 18 - yRail) / uy;
    const tEnd = (y50 - yRail) / uy;
    const a0 = [cx + ux * tStart + nx * off, yRail + uy * tStart + ny * off];
    const a1 = [cx + ux * tEnd + nx * off, yRail + uy * tEnd + ny * off];
    const a2 = [cx + ux * (tEnd + 26) + nx * off, yRail + uy * (tEnd + 26) + ny * off];
    s.line(a0[0], a0[1], a1[0], a1[1], pal.steel, 3);
    s.line(a1[0], a1[1], a2[0], a2[1], pal.steel, 3, 'stroke-dasharray="4 3"');
  });
  s.text(cx + ux * ((y50 - yRail) / uy + 40) + nx * 40, yRail + uy * ((y50 - yRail) / uy + 40) + ny * 40, 'Dispositif d’extrémité', { size: 10, fill: pal.muted, anchor: 'start' });
  const tm = ((yTerre + y50) / 2 - yRail) / uy;
  s.text(cx + ux * tm - nx * 40, yRail + uy * tm - ny * 40 + 4, `${fmt(spec.longueur, 1)} m`, { size: 13, fill: pal.cote, weight: 700, anchor: ux >= 0 ? 'end' : 'start' });
  s.text(cx + ux * tm - nx * 40, yRail + uy * tm - ny * 40 + 18, 'le long de la route', { size: 10, fill: pal.cote, anchor: ux >= 0 ? 'end' : 'start' });
  s.text(cx + 30, yRail - 14, `α = ${fmt(angle, 0)}°`, { size: 12, weight: 700, anchor: 'start' });
  s.text(20, H - 12, `L = 50 / sin α = ${fmt(spec.longueur, 1)} m de chaque côté, au-delà de l’entrée en terre`, { size: 11, anchor: 'start', fill: pal.ink });
  return s.toString();
}

/* ------------------------------------------------------------------ courbe de chute */

export function svgChute({ d, h, k, h0 = 0 }, pal = PAL_ECRAN) {
  const W = 760;
  const H = 320;
  const hEff = (h ?? 0) + (h0 ?? 0);
  const portee = porteeChute(hEff, k);
  const xmax = Math.max((d ?? 0) * 1.5, portee * 1.35, 6);
  const ymax = Math.max(hEff * 1.35, k * (d ?? 0) ** 2 * 1.1, 2);
  const ox = 70;
  const oy = 50;
  const sxp = (W - ox - 40) / xmax;
  const syp = (H - oy - 50) / ymax;
  const X = (x) => ox + x * sxp;
  const Y = (y) => oy + y * syp;
  const s = new Svg(W, H, pal, 'Courbe de chute du chargement');
  for (let x = 0; x <= xmax + 1e-9; x += xmax > 20 ? 5 : xmax > 10 ? 2 : 1) {
    s.line(X(x), oy, X(x), H - 50, pal.line, 0.6);
    s.text(X(x), H - 34, fmt(x, 0), { size: 9.5, fill: pal.muted });
  }
  for (let y = 0; y <= ymax + 1e-9; y += ymax > 10 ? 2 : 1) {
    s.line(ox, Y(y), W - 40, Y(y), pal.line, 0.6);
    s.text(ox - 8, Y(y) + 3, `-${fmt(y, 0)}`, { size: 9.5, fill: pal.muted, anchor: 'end' });
  }
  s.text((ox + W - 40) / 2, H - 14, 'Distance horizontale depuis la rive routière (m)', { size: 10, fill: pal.muted });
  s.text(18, (oy + H - 50) / 2, 'Chute (m)', { size: 10, fill: pal.muted, rotate: -90 });
  s.rect(10, oy - 6, ox - 10, 6, pal.asphalt);
  s.text(14, oy - 12, 'Route', { size: 10, anchor: 'start', fill: pal.muted });
  if (h !== null && h !== undefined && d !== null && d !== undefined) {
    const yRail = (h ?? 0) + (h0 ?? 0);
    if (yRail >= 0 && yRail <= ymax) {
      s.rect(X(d), Y(yRail), W - 40 - X(d), 8, pal.rail, 'none', 0, 'opacity="0.85"');
      s.text(W - 44, Y(yRail) + 22, 'Plate-forme ferroviaire', { size: 10, anchor: 'end', fill: pal.muted });
    }
    s.line(X(d), oy - 10, X(d), H - 50, pal.cote, 1, 'stroke-dasharray="4 3"');
    s.text(X(d) + 4, oy - 14, `écart ${fmt(d)} m`, { size: 10, fill: pal.cote, anchor: 'start' });
  }
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const x = (xmax * i) / 80;
    const y = k * x * x;
    if (y > ymax) break;
    pts.push(`${r1(X(x))},${r1(Y(y))}`);
  }
  s.add(`<polyline points="${pts.join(' ')}" fill="none" stroke="${pal.accent}" stroke-width="2.5"/>`);
  if (hEff > 0 && portee <= xmax) {
    const atteint = d !== null && d !== undefined && portee > d;
    s.add(`<circle cx="${r1(X(portee))}" cy="${r1(Y(hEff))}" r="5" fill="${atteint ? pal.p0 : pal.ok}"/>`);
    s.text(X(portee) + 8, Y(hEff) - 8, `portée ${fmt(portee)} m`, { size: 11, weight: 700, fill: atteint ? pal.p0 : pal.ok, anchor: 'start' });
  }
  s.text(W - 44, oy + 16, `y = ${fmt(k, 3)} x²`, { size: 12, anchor: 'end', fill: pal.accent, weight: 700 });
  return s.toString();
}

/* ------------------------------------------------------------------ règle des cas L1 */

const SEGMENTS = [
  { a: 0, b: 2, label: '< 2', cas: 'Hors cas' },
  { a: 2, b: 6, label: '2–6', cas: 'Cas 1' },
  { a: 6, b: 8, label: '6–8', cas: 'Cas 2' },
  { a: 8, b: 17, label: '8–17', cas: 'Cas 3' },
  { a: 17, b: 30, label: '17–30', cas: 'Cas 4' },
  { a: 30, b: 50, label: '30–50', cas: 'Cas 5' },
  { a: 50, b: 70, label: '≥ 50', cas: 'Au-delà' },
];

export function svgRegleL1(L1, pal = PAL_ECRAN) {
  const W = 760;
  const H = 74;
  const s = new Svg(W, H, pal, `Position de L1 = ${fmt(L1)} m sur l’échelle des cas`);
  const x0 = 10;
  const w = (W - 20) / SEGMENTS.length;
  SEGMENTS.forEach((g, i) => {
    const actif = L1 !== null && L1 >= g.a && (L1 < g.b || (i === SEGMENTS.length - 1));
    s.rect(x0 + i * w + 1, 26, w - 2, 20, actif ? pal.hazard : pal.ground, actif ? pal.ink : 'none', actif ? 1.2 : 0);
    s.text(x0 + i * w + w / 2, 18, g.cas, { size: 10.5, weight: actif ? 700 : 400, fill: actif ? pal.ink : pal.muted });
    s.text(x0 + i * w + w / 2, 40, `${g.label} m`, { size: 10, fill: pal.ink, weight: actif ? 700 : 400 });
  });
  if (L1 !== null && L1 !== undefined) {
    const i = SEGMENTS.findIndex((g, j) => L1 >= g.a && (L1 < g.b || j === SEGMENTS.length - 1));
    if (i >= 0) {
      const g = SEGMENTS[i];
      const t = Math.min(1, Math.max(0, (L1 - g.a) / (g.b - g.a)));
      const px = x0 + i * w + 1 + t * (w - 2);
      s.poly([[px, 50], [px - 6, 60], [px + 6, 60]], pal.cote);
      s.text(Math.min(Math.max(px, 40), W - 40), 72, `L1 = ${fmt(L1)} m`, { size: 10.5, weight: 700, fill: pal.cote });
    }
  }
  return s.toString();
}

/* ------------------------------------------------------------------ vue en plan cotée (Assistant) */

const posEcran = (L1) => (L1 - 4.5 >= 6.5 ? L1 - 4.5 : L1 - 1.5);

/* Éléments du dispositif en plan : distances (m) depuis le bord de la BAU vers la voie ferrée. */
const ELEMENTS_PLAN = {
  'SC1-S1': (L1) => [{ t: 'barriere', a: 0, lab: 'GRC' }, { t: 'beton', a: L1 - 1.0, b: L1 - 0.5, lab: 'Mur BA 3,50 m' }],
  'SC1-S2': () => [{ t: 'beton', a: 0, b: 0.95, lab: 'LBE (LBA + écran 3,50 m)' }],
  'SC1-S3': (L1) => [{ t: 'beton', a: 0, b: 0.5, lab: 'GBA' }, { t: 'beton', a: L1 - 1.0, b: L1 - 0.5, lab: 'Mur BA 1,50 m + écran 3,50 m' }],
  'SC2-S1': () => [{ t: 'beton', a: 0, b: 0.95, lab: 'LBE (LBA + écran 3,50 m)' }, { t: 'cloture', a: 4.45, lab: 'Clôture' }],
  'SC3-S1': (L1) => [{ t: 'barriere', a: 0, lab: 'GS4' }, { t: 'ecran', a: posEcran(L1), lab: 'BHE 3,00 m + clôture' }],
  'SC3-S2': (L1) => [{ t: 'beton', a: 0, b: 0.5, lab: 'GBA' }, { t: 'ecran', a: posEcran(L1), lab: 'Écran 3,00 m sur massif + clôture' }],
  'SC4-S1': (L1) => {
    const m = implantationMerlon(L1);
    const c0 = 4 + m.mRoute * m.h;
    return [{ t: 'barriere', a: 0, lab: 'GS4' }, { t: 'merlon', a: 4, b: c0 + m.crete + m.mFer * m.h, crete: [c0, c0 + m.crete], lab: `Merlon ${fmt(m.h)} m` }];
  },
  'SC5-S1': () => [{ t: 'barriere', a: 0, lab: 'GS4 si nécessaire', pointille: true }, { t: 'fosse', a: 10, b: 18, lab: 'Fossé 1,50 m' }],
  BLE: () => [{ t: 'ecran', a: 0.3, lab: 'BLE (BN4 + écran 3,00 m) en rive' }],
  H2: () => [{ t: 'barriere', a: 0, lab: 'Barrière d’ouvrage' }],
};

function coteH(s, x1, x2, y, label, pal) {
  s.line(x1, y, x2, y, pal.cote, 1.2);
  s.line(x1, y - 5, x1, y + 5, pal.cote, 1.2);
  s.line(x2, y - 5, x2, y + 5, pal.cote, 1.2);
  if (label) s.text((x1 + x2) / 2, y - 6, label, { size: 12.5, weight: 700, fill: pal.cote });
}

function planSectionCourante(spec, pal) {
  const W = 1000;
  const xa = 130;
  const xb = 770;
  const talus = !!(spec.variante && spec.variante.startsWith('FH'));
  const L1 = spec.L1;
  const L = L1 === null || talus ? 6 : L1;
  // Échelle transversale réelle ; échelle longitudinale : 120 m sur la largeur du plan.
  const dh = spec.denivele ?? null;
  const pente = !talus && (spec.position === 'ferBas' || spec.position === 'ferHaut');
  const largTalus = pente ? Math.min(Math.max((dh ?? 2) * 1.5, 2), 9) : 0;
  const R = 10.5 + largTalus;
  const laterale = spec.zone === 'lat';
  const ROUTE = laterale ? 5.5 : 10;
  const bau = laterale ? 0 : 2.5;
  const k = Math.max(3.5, Math.min(16, 360 / (R + L + ROUTE)));
  const kx = (xb - xa) / 120;
  const y0 = 48;
  const Y = (m) => y0 + m * k;
  const yT = Y(R);
  const yR = Y(R + L);
  const yEnd = Y(R + L + ROUTE);
  const H = yEnd + (spec.zone === 'echangeur' ? 60 : 34);
  const s = new Svg(W, H, pal, `Vue en plan${L1 !== null ? ` : L1 = ${fmt(L1)} m` : ''}`);
  const yOff = (d) => yR - Math.max(0, Math.min(d, L)) * k;
  const id = s.id;
  s.defs.push(`<clipPath id="${id}c"><rect x="${xa}" y="${y0 - 10}" width="${xb - xa}" height="${H}"/></clipPath>`);
  s.defs.push(`<pattern id="${id}hb" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${pal.concrete}"/><line x1="0" y1="0" x2="0" y2="6" stroke="${pal.steel}" stroke-width="1"/></pattern>`);

  // PK et longueur
  const d = parsePK(spec.pkDebut);
  const f = parsePK(spec.pkFin);
  if (d !== null && f !== null && f !== d) {
    coteH(s, xa, xb, 26, `${fmt(Math.abs(f - d), 0)} m`, pal);
    s.text(xa, 14, `PK ${fmtPK(Math.min(d, f))}`, { size: 12, anchor: 'start', fill: pal.muted });
    s.text(xb, 14, `PK ${fmtPK(Math.max(d, f))}`, { size: 12, anchor: 'end', fill: pal.muted });
  }

  s.add(`<g clip-path="url(#${id}c)">`);
  // plate-forme ferroviaire : fossé, piste, deux voies sur ballast
  s.rect(xa, y0, xb - xa, R * k, pal.grass);
  s.rect(xa, Y(0.6), xb - xa, (R - 1.8) * k, pal.ballast);
  [3.0, 7.2].forEach((axe) => {
    const g = 1.435 / 2;
    for (let x = xa + 2; x < xb; x += Math.max(3, 0.6 * kx)) s.line(x, Y(axe - 1.3), x, Y(axe + 1.3), pal.rail, Math.max(1, 0.25 * kx));
    s.line(xa, Y(axe - g), xb, Y(axe - g), pal.steel, 1.6);
    s.line(xa, Y(axe + g), xb, Y(axe + g), pal.steel, 1.6);
  });
  for (let x = xa + 30; x < xb; x += 60 * kx) {
    s.rect(x - 3, Y(9.2) - 3, 6, 6, pal.steel);
    s.line(x, Y(9.2), x, Y(7.2), pal.steel, 1.2);
  }
  s.rect(xa, Y(10.5 - 1.0), xb - xa, 0.7 * k, pal.water, pal.groundEdge, 0.8);
  if (pente) {
    // talus entre la plate-forme ferroviaire et l'entrée en terre (crête de déblai ou pied de remblai)
    const ys = Y(10.5);
    s.rect(xa, ys, xb - xa, yT - ys, pal.earth);
    const depuis = spec.position === 'ferBas' ? yT : ys;
    const vers = spec.position === 'ferBas' ? ys : yT;
    for (let x = xa + 5; x < xb; x += 9) {
      const lg = (Math.round((x - xa) / 9) % 2) ? 1 : 0.55;
      s.line(x, depuis, x, depuis + (vers - depuis) * lg, pal.groundEdge, 1);
    }
  }
  s.add('</g>');

  // interface
  if (talus) {
    s.rect(xa, yT, xb - xa, yR - yT, pal.earth);
    for (let x = xa + 6; x < xb; x += 12) s.line(x, yT, x, yT + ((x / 12) % 2 ? (yR - yT) * 0.7 : (yR - yT) * 0.4), pal.groundEdge, 1);
  } else {
    s.rect(xa, yT, xb - xa, yR - yT, pal.grass);
  }
  s.line(xa, yT, xb, yT, pal.groundEdge, 2);

  const etiquettes = [];
  const supports = (y, pasM, h = 3) => { for (let x = xa + 4; x < xb; x += pasM * kx) s.line(x, y - h, x, y + h, pal.steel, 1.4); };
  if (talus) {
    if (spec.variante !== 'FH-aucun') {
      const opt = spec.variante === 'FH-N2-option';
      s.line(xa, yR - 0.5 * k, xb, yR - 0.5 * k, pal.steel, 2.4, opt ? 'stroke-dasharray="6 4"' : '');
      if (!opt) supports(yR - 0.5 * k, 4);
      etiquettes.push([yR - 0.5 * k, opt ? 'Glissière N2 possible' : 'Glissière N2 (GS4)']);
    }
    etiquettes.push([(yT + yR) / 2, `Talus${spec.talus ? ` ${fmtTalus(spec.talus)}` : ''}${spec.denivele != null ? ` · Δh ${fmt(spec.denivele)} m` : ''}`]);
  } else if (L1 !== null && ELEMENTS_PLAN[spec.variante]) {
    for (const e of ELEMENTS_PLAN[spec.variante](L1)) {
      const ya = yOff(e.a);
      if (e.t === 'barriere') {
        const y = ya - 0.3 * k;
        s.line(xa, y, xb, y, pal.steel, 2.6, e.pointille ? 'stroke-dasharray="6 4"' : '');
        if (!e.pointille) supports(y, 4);
        etiquettes.push([y, `${e.lab} · au bord de la BAU`]);
      } else if (e.t === 'beton') {
        const yb = yOff(e.b);
        const mur = /Mur/.test(e.lab);
        s.rect(xa, yb, xb - xa, Math.max(3, ya - yb), mur ? `url(#${id}hb)` : pal.concrete, pal.steel, 1);
        if (/écran/.test(e.lab)) { s.line(xa, yb, xb, yb, pal.steel, 2.2); supports(yb, 3, 4); }
        etiquettes.push([(ya + yb) / 2, `${e.lab} · ${e.a > 0 ? `de ${fmt(e.a)} à ${fmt(e.b)} m` : `sur ${fmt(e.b)} m`}`]);
      } else if (e.t === 'ecran') {
        s.line(xa, ya, xb, ya, pal.steel, 2.6);
        supports(ya, 3, 4);
        etiquettes.push([ya, `${e.lab} · à ${fmt(e.a)} m`]);
      } else if (e.t === 'cloture') {
        s.line(xa, ya, xb, ya, pal.muted, 1.2);
        for (let x = xa + 6; x < xb; x += 3 * kx) s.add(`<circle cx="${r1(x)}" cy="${r1(ya)}" r="1.8" fill="${pal.muted}"/>`);
        etiquettes.push([ya, `${e.lab} · à ${fmt(e.a)} m`]);
      } else if (e.t === 'merlon') {
        const yb = yOff(e.b);
        const [c0, c1] = e.crete.map(yOff);
        s.rect(xa, yb, xb - xa, ya - yb, pal.earth);
        for (let x = xa + 5; x < xb; x += 9) {
          const lg = (Math.round((x - xa) / 9) % 2) ? 1 : 0.55;
          s.line(x, c0, x, c0 + (ya - c0) * lg, pal.groundEdge, 1);
          s.line(x, c1, x, c1 - (c1 - yb) * lg, pal.groundEdge, 1);
        }
        s.line(xa, c0, xb, c0, pal.groundEdge, 1.4);
        s.line(xa, c1, xb, c1, pal.groundEdge, 1.4);
        s.line(xa, (c0 + c1) / 2, xb, (c0 + c1) / 2, pal.muted, 1);
        etiquettes.push([(c0 + c1) / 2, `${e.lab} · de ${fmt(e.a)} à ${fmt(e.b)} m`]);
      } else if (e.t === 'fosse') {
        const yb = yOff(e.b);
        const m1 = yOff(e.a + 2.25);
        const m2 = yOff(e.b - 2.25);
        s.rect(xa, yb, xb - xa, ya - yb, pal.grass);
        s.rect(xa, m2, xb - xa, m1 - m2, pal.water);
        for (let x = xa + 5; x < xb; x += 9) {
          const lg = (Math.round((x - xa) / 9) % 2) ? 1 : 0.55;
          s.line(x, ya, x, ya - (ya - m1) * lg, pal.groundEdge, 1);
          s.line(x, yb, x, yb + (m2 - yb) * lg, pal.groundEdge, 1);
        }
        etiquettes.push([(m1 + m2) / 2, `${e.lab} · de ${fmt(e.a)} à ${fmt(e.b)} m`]);
      }
    }
  } else if (L1 !== null && spec.variante === 'SC6-S1') {
    etiquettes.push([(yT + yR) / 2, 'Pas de dispositif a priori']);
  }

  // route : BAU, ligne de rive, deux voies, véhicules
  if (spec.zone === 'echangeur') {
    s.add(`<path d="M${xa + 70 * kx},${yEnd} C${xa + 90 * kx},${yEnd} ${xa + 100 * kx},${yEnd + 18} ${xb},${yEnd + 26}" fill="none" stroke="${pal.asphalt}" stroke-width="${Math.max(8, 4 * k)}"/>`);
    s.text(xa + 104 * kx, yEnd + 14, 'bretelle', { size: 11.5, fill: pal.muted, anchor: 'end' });
  }
  s.rect(xa, yR, xb - xa, yEnd - yR, pal.asphalt);
  if (laterale) {
    s.line(xa, yR + 2, xb, yR + 2, pal.marking, 1.6);
  } else {
    s.line(xa, Y(R + L + 2.5), xb, Y(R + L + 2.5), pal.marking, 2);
    s.line(xa, Y(R + L + 6), xb, Y(R + L + 6), pal.marking, 1.6, `stroke-dasharray="${3 * kx} ${10 * kx}"`);
  }
  const vehicule = (x, axe, lg, larg, couleur) => {
    s.rect(x, Y(axe) - (larg * k) / 2, lg * kx, larg * k, couleur, pal.ink, 0.8, 'rx="2"');
    s.rect(x + lg * kx - 2.2 * kx, Y(axe) - (larg * k) / 2, 2.2 * kx, larg * k, pal.panel, pal.ink, 0.8, 'rx="2"');
  };
  if (laterale) {
    vehicule(xa + 60 * kx, R + L + 2.7, 5.5, 2.0, pal.hazard);
  } else {
    vehicule(xa + 40 * kx, R + L + 4.25, 16, 2.5, pal.concrete);
    vehicule(xa + 85 * kx, R + L + 7.75, 4.5, 1.8, pal.accent);
  }
  if (spec.zone === 'oaJum') {
    // les deux plates-formes franchissent une autre voie : vide sous les tabliers
    const xv0 = xa + 50 * kx;
    const xv1 = xa + 72 * kx;
    s.rect(xv0, yT, xv1 - xv0, yR - yT, pal.water, pal.accent, 1);
    s.text((xv0 + xv1) / 2, (yT + yR) / 2 + 4, 'voie franchie', { size: 11, fill: pal.accent, weight: 700 });
    [y0, yT, yR, yEnd].forEach((y) => { s.line(xv0, y, xv1, y, pal.ink, 2.4); });
    s.line(xv0, y0 - 6, xv0, yEnd + 6, pal.ink, 1, 'stroke-dasharray="4 3"');
    s.line(xv1, y0 - 6, xv1, yEnd + 6, pal.ink, 1, 'stroke-dasharray="4 3"');
  }

  // repères et étiquettes à droite
  const xl = xb + 14;
  const droite = [
    [Y(5), `Voie ferrée (2 voies)${spec.position === 'ferBas' ? ', en contrebas' : spec.position === 'ferHaut' ? ', au-dessus' : ''}`, true],
    ...(pente ? [[(Y(10.5) + yT) / 2, `Talus de ${spec.position === 'ferBas' ? 'déblai' : 'remblai'}${dh !== null ? ` · Δh ${fmt(dh)} m` : ''}`, true]] : []),
    [yT, spec.position === 'ferBas' ? 'Entrée en terre (crête du talus)' : spec.position === 'ferHaut' ? 'Entrée en terre (pied du talus)' : 'Entrée en terre', false],
    ...etiquettes.map(([y, t]) => [y, t, true]),
    [yR, laterale ? 'Bord de chaussée' : 'Bord de la BAU', false],
    ...(laterale ? [[Y(R + L + 2.7), 'Voirie latérale de service', true]] : [[Y(R + L + 1.25), 'BAU', false], [Y(R + L + 6), 'Chaussée', false]]),
  ].sort((a, b) => a[0] - b[0]);
  let precedent = -Infinity;
  for (const [y, t, gras] of droite) {
    const yy = Math.max(y + 4, precedent + 15);
    s.line(xb, y, xl - 4, yy - 4, pal.muted, 0.8);
    s.text(xl, yy, t, { size: 12, anchor: 'start', weight: gras ? 700 : 400, fill: gras ? pal.ink : pal.muted });
    precedent = yy;
  }

  // cotes à gauche
  if (L1 !== null && !talus) {
    s.line(100, yT, 100, yR, pal.cote, 1.4);
    s.poly([[100, yT], [95, yT + 9], [105, yT + 9]], pal.cote);
    s.poly([[100, yR], [95, yR - 9], [105, yR - 9]], pal.cote);
    s.text(90, (yT + yR) / 2 - 2, 'L1', { size: 16, weight: 700, fill: pal.cote, anchor: 'end' });
    s.text(90, (yT + yR) / 2 + 15, `${fmt(L1)} m`, { size: 13, weight: 700, fill: pal.cote, anchor: 'end' });
  }
  if (!laterale) {
    s.line(100, yR + 2, 100, Y(R + L + bau), pal.cote, 1);
    s.text(90, Y(R + L + 1.25) + 4, '2,50', { size: 11, fill: pal.cote, anchor: 'end' });
  }

  // échelle
  const e10 = 10 * kx;
  s.line(xa, H - 12, xa + e10, H - 12, pal.ink, 2);
  s.line(xa, H - 16, xa, H - 8, pal.ink, 1);
  s.line(xa + e10, H - 16, xa + e10, H - 8, pal.ink, 1);
  s.text(xa + e10 + 6, H - 8, '10 m (en long)', { size: 11, anchor: 'start', fill: pal.muted });
  s.text(xb, H - 8, 'Largeurs à l’échelle ; distances depuis le bord de la BAU', { size: 11, anchor: 'end', fill: pal.muted, italic: true });
  return s.toString();
}

function planCarrefour(spec, pal) {
  const W = 1000;
  const H = 300;
  const s = new Svg(W, H, pal, 'Vue en plan : carrefour entre les ouvrages');
  s.rect(20, 40, 960, 50, pal.ground, pal.groundEdge, 1);
  for (let x = 24; x < 976; x += 9) s.line(x, 52, x, 78, pal.rail, 1);
  s.line(20, 58, 980, 58, pal.steel, 1.4);
  s.line(20, 72, 980, 72, pal.steel, 1.4);
  s.text(26, 32, 'Voie ferrée', { size: 13, weight: 700, anchor: 'start' });
  s.rect(20, 170, 960, 60, pal.asphalt);
  s.line(20, 200, 980, 200, pal.bg, 1.6, 'stroke-dasharray="16 12"');
  s.text(26, 252, 'Route jumelée', { size: 13, weight: 700, anchor: 'start' });
  s.rect(440, 0, 50, H, pal.asphalt);
  s.line(465, 0, 465, H, pal.bg, 1.2, 'stroke-dasharray="10 8"');
  [[34, 96], [164, 236]].forEach(([a, b]) => {
    s.line(434, a, 434, b, pal.ink, 2.4);
    s.line(496, a, 496, b, pal.ink, 2.4);
  });
  const am = spec.amenagement;
  if (am === 'deplace') {
    s.add(`<path d="M496,${H} L496,250 C496,240 505,236 520,236 L760,236" fill="none" stroke="${pal.asphalt}" stroke-width="16"/>`);
    s.text(770, 240, 'Débouché reporté au-delà des dispositifs', { size: 13, weight: 700, anchor: 'start' });
    s.line(502, 96, 502, 164, pal.steel, 3);
    s.text(512, 134, 'Retenue continue sur l’ouvrage', { size: 12.5, anchor: 'start', fill: pal.muted });
  } else {
    s.rect(490, 122, 290, 18, pal.asphalt, 'none', 0, 'opacity="0.8"');
    s.text(790, 136, 'Accès de service', { size: 12.5, anchor: 'start', fill: pal.muted });
    const ang = spec.decalageAngle ?? 7.5;
    const r = ((am === 'decale' ? ang : 0) * Math.PI) / 180;
    const len = 34;
    s.line(502, 96, 502 + Math.tan(r) * len, 96 + len - 4, pal.steel, 3);
    s.line(502, 164, 502 + Math.tan(r) * len, 164 - len + 4, pal.steel, 3);
    if (am === 'decale') {
      s.add(`<path d="M502,${96 + 22} A22,22 0 0 0 ${502 + Math.sin(r) * 22},${96 + Math.cos(r) * 22}" fill="none" stroke="${ang > 10 ? pal.p0 : pal.cote}" stroke-width="1.4"/>`);
      s.text(540, 104, `Décalage ${fmt(ang, 0)}° (5 à 10° max.)`, { size: 13, weight: 700, anchor: 'start', fill: ang > 10 ? pal.p0 : pal.cote });
    } else if (am === 'musoir' || am === 'musoirAtt') {
      s.poly([[490, 140], [520, 131], [490, 122]], pal.hazard, pal.ink, 1);
      s.text(540, 104, am === 'musoirAtt' ? 'Musoir avec atténuateur de choc' : 'Musoir intégré', { size: 13, weight: 700, anchor: 'start' });
    } else {
      s.text(540, 104, 'Débouché entre les deux ouvrages', { size: 13, weight: 700, anchor: 'start' });
    }
  }
  s.text(980, 32, spec.traficPL === 'fort' ? 'Trafic PL important : débouché à reporter' : 'Trafic PL moyen ou faible', { size: 12.5, anchor: 'end', fill: pal.muted });
  return s.toString();
}

/** Vue en plan cotée de la configuration saisie dans l'Assistant. */
export function svgPlan(spec, pal = PAL_ECRAN) {
  if (spec.zone === 'oa' || spec.zone === 'abords') {
    const angle = spec.angle ?? 90;
    return svgAbords({ angle, longueur: longueurAbords(angle) }, pal);
  }
  if (spec.zone === 'carrefour') return planCarrefour(spec, pal);
  return planSectionCourante(spec, pal);
}

/* ------------------------------------------------------------------ aiguillage */

export function schemaSVG(spec, pal = PAL_ECRAN) {
  if (!spec) return '';
  switch (spec.kind) {
    case 'coupe': return svgCoupe(spec, pal);
    case 'talus': return svgTalus(spec, pal);
    case 'oa': return svgOA(spec, pal);
    case 'abords': return svgAbords(spec, pal);
    default: return '';
  }
}
