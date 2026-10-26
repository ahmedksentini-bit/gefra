/*
 * GÉFRA — imports et exports : tableaux (CSV, XLSX, collage Excel), Word (.docx), JSON.
 * Les bibliothèques sont chargées à la demande depuis un CDN, avec contrôle d'intégrité.
 */
import * as E from './engine.js';
import * as S from './schemas.js';
import * as M from './modele.js';

const LIBS = {
  xlsx: {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    sri: 'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw',
    global: 'XLSX',
  },
  docx: {
    url: 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
    sri: 'sha384-4xaIisuLEy2lo2HkB2C4rEf7v8jbTb2kuogX6TkuEt9feTWKBSFSOzsqNNbV+sKh',
    global: 'docx',
  },
};
const chargements = {};

export function chargerLib(nom) {
  const lib = LIBS[nom];
  if (window[lib.global]) return Promise.resolve(window[lib.global]);
  if (!chargements[nom]) {
    chargements[nom] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = lib.url;
      s.integrity = lib.sri;
      s.crossOrigin = 'anonymous';
      s.onload = () => (window[lib.global] ? resolve(window[lib.global]) : reject(new Error(`${nom} indisponible`)));
      s.onerror = () => {
        delete chargements[nom];
        reject(new Error(`Impossible de charger la bibliothèque ${nom}. Vérifiez la connexion Internet.`));
      };
      document.head.appendChild(s);
    });
  }
  return chargements[nom];
}

export function telecharger(nom, donnees, type = 'application/octet-stream') {
  const blob = donnees instanceof Blob ? donnees : new Blob([donnees], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function nomFichier(projet, suffixe, ext) {
  const base = (projet.nom || 'gefra').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '_').replace(/_+/g, '_').slice(0, 60);
  return `${base}_${suffixe}.${ext}`;
}

/* ------------------------------------------------------------------ correspondance des colonnes */

const COLONNES = [
  ['pkDebut', 'PK début'], ['pkFin', 'PK fin'], ['cote', 'Côté'], ['zone', 'Zone'], ['L1', 'L1 (m)'],
  ['position', 'Niveaux relatifs'], ['denivele', 'Dénivelé (m)'], ['talus', 'Pente talus (H/V)'],
  ['traficPL', 'Trafic PL'], ['acces', 'Accès de service'], ['angle', 'Angle des axes (°)'],
  ['niveauOA', 'Niveau sur ouvrage'], ['ecartOA', 'Écart tabliers (m)'], ['deniveleOA', 'Dénivelé tabliers (m)'],
  ['projet', 'Dispositif projeté'], ['hauteur', 'Hauteur projetée (m)'], ['niveauProjete', 'Niveau projeté'],
  ['longueurProjetee', 'Prolongement projeté (m)'], ['amenagement', 'Aménagement carrefour'],
  ['decalageAngle', 'Angle de décalage (°)'], ['merlonTalusRoute', 'Talus merlon côté route'], ['remarques', 'Remarques'],
];

const ALIAS = {
  pkDebut: ['pkdebut', 'pkdeb', 'debut', 'pk1', 'pkorigine', 'de'],
  pkFin: ['pkfin', 'fin', 'pk2', 'pkextremite', 'a'],
  cote: ['cote', 'sens', 'side'],
  zone: ['zone', 'type', 'typezone', 'typedezone'],
  L1: ['l1', 'l1m', 'distance', 'distancel1'],
  position: ['position', 'niveaux', 'niveauxrelatifs', 'positionfer'],
  denivele: ['denivele', 'denivelem', 'deniv', 'dh'],
  talus: ['talus', 'pente', 'pentetalus', 'pentetalushv', 'pentedutalus'],
  traficPL: ['traficpl', 'pl', 'trafic', 'traficpoidslourds'],
  acces: ['acces', 'accesdeservice', 'accesservice'],
  angle: ['angle', 'angledesaxes', 'angleaxes'],
  niveauOA: ['niveausurouvrage', 'niveauoa', 'niveauouvrage'],
  ecartOA: ['ecarttabliers', 'ecarttabliersm', 'ecartoa'],
  deniveleOA: ['denileletabliers', 'deniveletabliers', 'deniveletabliersm', 'deniveleoa'],
  projet: ['dispositifprojete', 'dispositif', 'projet', 'projete'],
  hauteur: ['hauteurprojetee', 'hauteurprojeteem', 'hauteur', 'h', 'profondeur'],
  niveauProjete: ['niveauprojete', 'niveauretenue', 'niveauderetenue'],
  longueurProjetee: ['prolongementprojete', 'prolongementprojetem', 'longueur', 'longueurprojetee', 'prolongement'],
  amenagement: ['amenagementcarrefour', 'amenagement'],
  decalageAngle: ['anglededecalage', 'angledecalage', 'decalage'],
  merlonTalusRoute: ['talusmerloncoteroute', 'talusmerlon', 'talusroute'],
  remarques: ['remarques', 'remarque', 'observations', 'observation', 'commentaire', 'commentaires'],
};

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

function champDepuisEntete(h) {
  const n = norm(h);
  if (!n) return null;
  for (const [champ, alias] of Object.entries(ALIAS)) if (alias.includes(n)) return champ;
  return null;
}

function valeur(champ, brut) {
  const v = String(brut ?? '').trim();
  const n = norm(v);
  switch (champ) {
    case 'zone':
      if (!n || n === 'sc' || n.includes('courante')) return 'sc';
      if (n.includes('jum')) return 'oaJum';
      if (n.includes('abord')) return 'abords';
      if (n.includes('carref')) return 'carrefour';
      if (n.includes('echang')) return 'echangeur';
      if (n.includes('lat') || n.includes('voirie') || n.includes('acces')) return 'lat';
      if (n === 'oa' || n.includes('ouvrage') || n.includes('pont') || n.startsWith('ps')) return 'oa';
      return E.ZONES[v] ? v : 'sc';
    case 'position':
      if (n.includes('contrebas') || n.includes('dessous') || n === 'ferbas' || n.includes('bas')) return 'ferBas';
      if (n.includes('dessus') || n === 'ferhaut' || n.includes('haut')) return 'ferHaut';
      return 'meme';
    case 'cote':
      if (n.startsWith('g')) return 'G';
      if (n.startsWith('d')) return 'D';
      return '';
    case 'traficPL':
      return /fort|important|eleve|oui|^o$|^x$/.test(n) ? 'fort' : 'moyen';
    case 'acces':
      return /^(oui|o|x|1|vrai|true|yes)$/.test(n);
    case 'projet': {
      if (E.PROJETS[v]) return v;
      if (!n) return '';
      if (n.includes('aucun') || n === 'non' || n === 'sans') return 'aucun';
      if (n.includes('lbe')) return 'lbe';
      if (n.includes('bhe')) return 'bhe';
      if (n.includes('ble')) return 'ble';
      if (n.includes('merlon')) return 'merlon';
      if (n.includes('fosse')) return n.includes('gs') ? 'fosseGS4' : 'fosse';
      if (n.includes('massif')) return 'ecranMassif';
      if (n.includes('mur') && n.includes('ecran')) return 'murEcran';
      if (n.includes('mur')) return 'murBA';
      if (n.includes('h3') || n.includes('bn416') || n.includes('s16') || n.includes('bhab')) return 'h3';
      if (n.includes('h2') || n.includes('gba') || n.includes('dba') || n.includes('bho') || n.includes('bn4') || n.includes('bn1') || n.includes('s13')) return 'h2';
      if (n.includes('n2') || n.includes('gs4') || n.includes('gs2') || n.includes('grc') || n.includes('gcu') || n.includes('glissiere')) return 'n2';
      return 'autre';
    }
    case 'niveauOA':
    case 'niveauProjete': {
      const m = v.toUpperCase().match(/(N1|N2|H1|H2|H3|H4)/);
      return m ? m[1] : champ === 'niveauOA' ? 'H2' : '';
    }
    case 'amenagement':
      if (E.AMENAGEMENTS_CARREFOUR[v]) return v;
      if (!n) return '';
      if (n.includes('depl') || n.includes('report')) return 'deplace';
      if (n.includes('decal')) return 'decale';
      if (n.includes('musoir') && n.includes('att')) return 'musoirAtt';
      if (n.includes('musoir')) return 'musoir';
      if (n.includes('aucun')) return 'aucun';
      return '';
    case 'talus':
    case 'merlonTalusRoute':
      return /^\d{1,2}\s*[/:]\s*\d{1,2}$|^\d+(?:[.,]\d+)?\s*h?\s*\/\s*\d+(?:[.,]\d+)?\s*v?$|^\d+(?:[.,]\d+)?$/i.test(v) ? v : '';
    default:
      return v;
  }
}

/** Tableau 2D (première ligne éventuellement d'en-têtes) → lignes du linéaire. */
export function lignesDepuisTableau(t) {
  const rangees = t.filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
  if (!rangees.length) return { lignes: [], colonnes: [] };
  const entetes = rangees[0].map(champDepuisEntete);
  const avecEntete = entetes.filter(Boolean).length >= 2;
  const champs = avecEntete ? entetes : COLONNES.map(([c]) => c);
  const donnees = avecEntete ? rangees.slice(1) : rangees;
  const lignes = donnees.map((r) => {
    const init = {};
    champs.forEach((c, i) => {
      if (c && i < r.length) init[c] = valeur(c, r[i]);
    });
    return M.nouvelleLigne(init);
  });
  return { lignes, colonnes: champs.filter(Boolean) };
}

export function parseTSV(texte) {
  const sep = texte.includes('\t') ? '\t' : texte.includes(';') ? ';' : ',';
  return texte.replace(/\r/g, '').split('\n').map((l) => l.split(sep));
}

export async function lireFichierTableau(fichier) {
  const X = await chargerLib('xlsx');
  const buf = await fichier.arrayBuffer();
  const wb = X.read(buf, { type: 'array', raw: false, codepage: 65001 });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return X.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
}

/* ------------------------------------------------------------------ Excel */

function tableauLineaire(projet) {
  const entetes = ['N°', ...COLONNES.map(([, l]) => l), 'Cas Géfra', 'Référence', 'Exigence', 'Contrôle', 'Écarts'];
  const lignes = projet.lignes.map((l, i) => {
    const ev = M.evaluerLigne(l, projet.ligne);
    const st = M.statutLigne(ev);
    return [
      i + 1,
      ...COLONNES.map(([c]) => {
        const v = l[c];
        if (c === 'zone') return E.ZONES[v]?.label ?? v;
        if (c === 'position') return E.POSITIONS[v] ?? v;
        if (c === 'projet') return E.PROJETS[v]?.label ?? '';
        if (c === 'amenagement') return E.AMENAGEMENTS_CARREFOUR[v] ?? '';
        if (c === 'traficPL') return v === 'fort' ? 'Important' : 'Moyen ou faible';
        if (c === 'acces') return v ? 'Oui' : '';
        if (['L1', 'denivele', 'angle', 'ecartOA', 'deniveleOA', 'hauteur', 'longueurProjetee', 'decalageAngle'].includes(c)) return E.num(v) ?? '';
        return v ?? '';
      }),
      `${ev.res.titre}${ev.res.plage ? ` (${ev.res.plage})` : ''}`,
      `Géfra ${ev.res.ref}`,
      E.libelleExigence(ev.res),
      st.label,
      ev.ctl.ecarts.map((e) => `${e.priorite} : ${e.ecart}`).join('\n'),
    ];
  });
  return [entetes, ...lignes];
}

function tableauConstats(projet) {
  const entetes = ['N°', 'Localisation', 'Priorité', 'Constat', 'Risque', 'Recommandation', 'Référence'];
  return [entetes, ...M.constats(projet).filter((c) => !c.exclu).map((c) => [c.num, c.localisation, c.priorite, c.constat, c.risque, c.recommandation, c.ref])];
}

function feuille(X, aoa, largeurs) {
  const ws = X.utils.aoa_to_sheet(aoa);
  ws['!cols'] = largeurs.map((w) => ({ wch: w }));
  ws['!autofilter'] = { ref: X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: aoa[0].length - 1 } }) };
  return ws;
}

export async function exporterXlsx(projet) {
  const X = await chargerLib('xlsx');
  const wb = X.utils.book_new();
  const lin = tableauLineaire(projet);
  X.utils.book_append_sheet(wb, feuille(X, lin, lin[0].map((h, i) => (i === 0 ? 5 : h.length > 18 ? 22 : 14)).map((w, i, a) => (i >= a.length - 5 ? 34 : w))), 'Linéaire');
  X.utils.book_append_sheet(wb, feuille(X, tableauConstats(projet), [7, 26, 9, 60, 50, 60, 22]), 'Constats');
  const s = M.synthese(projet);
  const syn = [
    ['Projet', projet.meta.projet || projet.nom],
    ['Date', projet.meta.date],
    ['Tronçons', s.troncons],
    ['Longueur cumulée (m)', Math.round(s.longueur)],
    ['Conformes', s.conforme],
    ['Écarts P0', s.P0],
    ['Écarts P1', s.P1],
    ['Écarts P2', s.P2],
    ['Projet non renseigné', s.nonRenseigne],
    ['À compléter', s.incomplet],
  ];
  X.utils.book_append_sheet(wb, feuille(X, syn, [26, 50]), 'Synthèse');
  const out = X.write(wb, { type: 'array', bookType: 'xlsx' });
  telecharger(nomFichier(projet, 'gefra', 'xlsx'), new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}

export async function exporterModele() {
  const X = await chargerLib('xlsx');
  const wb = X.utils.book_new();
  const ent = COLONNES.map(([, l]) => l);
  const ex = [
    ['0+000', '0+250', 'D', 'Section courante', '7,2', 'Même niveau', '', '', '', '', '', '', '', '', 'LBE', '3,5', '', '', '', '', '', ''],
    ['0+250', '0+600', 'D', 'Section courante', '', 'Voie ferrée au-dessus', '4,5', '2H/1V', '', '', '', '', '', '', 'Aucun', '', '', '', '', '', '', ''],
    ['0+600', '0+640', 'D', 'Ouvrage routier au-dessus de la voie ferrée', '', '', '', '', 'Important', '', '70', '', '', '', 'BLE', '3', '', '', '', '', '', ''],
  ];
  const ws = X.utils.aoa_to_sheet([ent, ...ex]);
  ws['!cols'] = ent.map((h) => ({ wch: Math.max(12, h.length + 2) }));
  X.utils.book_append_sheet(wb, ws, 'Linéaire');
  const valeurs = [
    ['Champ', 'Valeurs acceptées'],
    ['Zone', Object.values(E.ZONES).map((z) => z.label).join(' ; ')],
    ['Niveaux relatifs', Object.values(E.POSITIONS).join(' ; ')],
    ['Dispositif projeté', Object.values(E.PROJETS).map((p) => p.label).join(' ; ') + ' (mots-clés reconnus : LBE, BHE, BLE, merlon, fossé, mur, massif, H2, H3, N2, GS4, GBA, BHO…)'],
    ['Aménagement carrefour', Object.values(E.AMENAGEMENTS_CARREFOUR).join(' ; ')],
    ['Trafic PL', 'Important ; Moyen ou faible'],
    ['Pente talus (H/V)', 'Saisir 3H/2V, 2H/1V ou 1,5 : Excel convertit « 3/2 » en date.'],
    ['Côté', 'D ; G'],
    ['PK', '1+250 ou 1250'],
  ];
  const wv = X.utils.aoa_to_sheet(valeurs);
  wv['!cols'] = [{ wch: 24 }, { wch: 120 }];
  X.utils.book_append_sheet(wb, wv, 'Valeurs');
  const out = X.write(wb, { type: 'array', bookType: 'xlsx' });
  telecharger('modele_lineaire_gefra.xlsx', new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}

/* ------------------------------------------------------------------ Word */

export function svgEnPng(svg, largeurPx = 1600) {
  return new Promise((resolve, reject) => {
    const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const w = Number(m?.[1] ?? 760);
    const h = Number(m?.[2] ?? 300);
    const k = largeurPx / w;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.round(w * k);
      c.height = Math.round(h * k);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? b.arrayBuffer().then((ab) => resolve({ data: new Uint8Array(ab), w, h })) : reject(new Error('Conversion de la figure impossible'))), 'image/png');
    };
    img.onerror = () => reject(new Error('Conversion de la figure impossible'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export async function exporterDocx(projet) {
  const D = await chargerLib('docx');
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel,
    AlignmentType, ShadingType, PageOrientation, ImageRun, Footer, PageNumber, BorderStyle,
  } = D;
  const meta = projet.meta;
  const s = M.synthese(projet);
  const cs = M.constats(projet).filter((c) => !c.exclu);
  const couleurs = { P0: 'B9232A', P1: 'B85A12', P2: '4F5596', ok: '26734A' };

  const run = (text, o = {}) => new TextRun({ text, bold: o.bold, color: o.color, size: o.size, italics: o.italics, font: o.font });
  const para = (text, o = {}) => new Paragraph({
    children: String(text ?? '').split('\n').map((t, i) => new TextRun({ text: t, bold: o.bold, italics: o.italics, color: o.color, size: o.size, break: i ? 1 : undefined })),
    spacing: { after: o.after ?? 100 },
  });
  const lignesPara = (text, o = {}) => String(text ?? '').split('\n').map((t) => new Paragraph({ children: [run(t, o)], spacing: { after: 40 } }));
  const titre = (text, niveau = HeadingLevel.HEADING_1) => new Paragraph({ text, heading: niveau, spacing: { before: 280, after: 120 } });
  const cell = (text, o = {}) => new TableCell({
    children: lignesPara(text, { size: o.size ?? 17, bold: o.bold, color: o.color }),
    shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
    width: o.width ? { size: o.width, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
  });
  const table = (entetes, lignes, largeurs) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: entetes.map((h, i) => cell(h, { bold: true, fill: 'E8ECEA', width: largeurs?.[i] })) }),
      ...lignes.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => (typeof c === 'object' && c !== null ? cell(c.t, { ...c, width: largeurs?.[i] }) : cell(c, { width: largeurs?.[i] }))) })),
    ],
  });

  const enfants = [];
  enfants.push(new Paragraph({ children: [run('CONTRÔLE GÉFRA', { bold: true, size: 20, color: '4B5865' })], spacing: { after: 60 } }));
  enfants.push(new Paragraph({ children: [run('Dispositifs de protection anti-pénétration – jumelage rail-route', { bold: true, size: 34 })], spacing: { after: 160 } }));
  enfants.push(table(['Rubrique', 'Valeur'], [
    ['Projet', meta.projet || projet.nom],
    ['Maître d’ouvrage', meta.maitreOuvrage || '—'],
    ['Dossier / phase', meta.dossier || '—'],
    ['Auditeur', meta.auditeur || '—'],
    ['Date', meta.date || '—'],
    ['Indice', meta.indice || '—'],
  ], [25, 75]));
  if (meta.objet) enfants.push(new Paragraph({ children: [run(meta.objet, { italics: true })], spacing: { before: 120 } }));

  enfants.push(titre('1. Objet et référentiel'));
  TEXTE_OBJET.forEach((t) => enfants.push(para(t)));

  enfants.push(titre('2. Synthèse'));
  enfants.push(table(['Indicateur', 'Valeur'], [
    ['Tronçons analysés', String(s.troncons)],
    ['Longueur cumulée', `${Math.round(s.longueur)} m`],
    ['Tronçons conformes', String(s.conforme)],
    [{ t: 'Tronçons en écart P0 (critique)', color: couleurs.P0, bold: true }, { t: String(s.P0), color: couleurs.P0, bold: true }],
    [{ t: 'Tronçons en écart P1 (important)', color: couleurs.P1, bold: true }, { t: String(s.P1), color: couleurs.P1, bold: true }],
    [{ t: 'Tronçons en écart P2 (à vérifier)', color: couleurs.P2 }, { t: String(s.P2), color: couleurs.P2 }],
    ['Dispositif projeté non renseigné', String(s.nonRenseigne)],
    ['Données à compléter', String(s.incomplet)],
    ['Constats retenus', `${s.constats.total} (P0 : ${s.constats.P0}, P1 : ${s.constats.P1}, P2 : ${s.constats.P2})`],
  ], [60, 40]));

  let n = 3;
  if (projet.rapport.lineaire && projet.lignes.length) {
    enfants.push(titre(`${n++}. Analyse du linéaire`));
    enfants.push(table(['N°', 'Localisation', 'Situation', 'Cas Géfra', 'Exigence', 'Dispositif projeté', 'Avis'],
      projet.lignes.map((l, i) => {
        const ev = M.evaluerLigne(l, projet.ligne);
        const st = M.statutLigne(ev);
        const col = st.cls === 'ok' ? couleurs.ok : couleurs[st.cls.toUpperCase()];
        return [String(i + 1), M.localisation(l, i), situationCourte(ev.p), `${ev.res.titre}${ev.res.plage ? `\n${ev.res.plage}` : ''}\n${ev.res.ref}`, E.libelleExigence(ev.res), E.libelleProjete(ev.p), { t: st.label, color: col, bold: true }];
      }), [4, 13, 20, 17, 15, 20, 11]));
  }

  if (projet.rapport.constats) {
    enfants.push(titre(`${n++}. Constats`));
    if (!cs.length) enfants.push(para('Aucun écart relevé au regard du guide Géfra.'));
    else enfants.push(table(['N°', 'Localisation', 'Constat', 'Risque', 'Recommandation', 'Priorité'],
      cs.map((c) => [{ t: c.num, bold: true }, c.localisation, c.constat, c.risque, `${c.recommandation}${c.ref ? `\n(${c.ref})` : ''}`, { t: c.priorite, bold: true, color: couleurs[c.priorite] }]),
      [6, 12, 30, 20, 26, 6]));
  }

  if (projet.rapport.fiche) {
    const ev = M.evaluerLigne(projet.assistant, projet.ligne);
    enfants.push(titre(`${n++}. Fiche de configuration (assistant)`));
    enfants.push(para(E.libelleSituation(ev.p, ev.res), { bold: true }));
    enfants.push(para(ev.res.resume));
    enfants.push(para(`Exigence : ${E.libelleExigence(ev.res)} (Géfra ${ev.res.ref}).`));
    for (const sol of ev.res.solutions) {
      enfants.push(titre(`${sol.nom} – ${sol.role}`, HeadingLevel.HEADING_3));
      sol.texte.forEach((t) => enfants.push(para(`– ${t}`, { after: 40 })));
      const svg = S.schemaSVG(sol.schema, S.PAL_EXPORT);
      if (svg) {
        try {
          const img = await svgEnPng(svg);
          enfants.push(new Paragraph({ children: [new ImageRun({ data: img.data, transformation: { width: 620, height: Math.round((620 * img.h) / img.w) } })], spacing: { before: 80, after: 160 } }));
        } catch { /* figure omise */ }
      }
    }
  }

  if (projet.rapport.verifs) {
    enfants.push(titre(`${n++}. Points de vérification généraux`));
    VERIFS_RAPPORT.forEach((t) => enfants.push(para(`– ${t}`, { after: 40 })));
  }

  if (projet.rapport.catalogue) {
    enfants.push(titre(`${n++}. Annexe : modèles de dispositifs de retenue (guide Géfra, 2004)`));
    enfants.push(table(['Modèle', 'Composition', 'Niveau de retenue', 'Matériau', 'Référence', 'Domaine d’emploi'], E.CATALOGUE.map((c) => [c.nom, c.compo || '—', c.niveau, c.materiau, c.ref, c.emploi]), [12, 22, 16, 14, 18, 18]));
  }

  const doc = new Document({
    creator: meta.auditeur || 'GÉFRA',
    title: `Contrôle Géfra – ${meta.projet || projet.nom}`,
    styles: {
      default: { document: { run: { font: 'Calibri', size: 20 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', run: { size: 28, bold: true, color: '16202A' }, paragraph: { spacing: { before: 280, after: 120 } } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', run: { size: 22, bold: true, color: '1F5E8F' } },
      ],
    },
    sections: [{
      properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 800, bottom: 800, left: 850, right: 850 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'A8B3B0', space: 4 } },
            children: [
              new TextRun({ text: `Contrôle Géfra – ${meta.projet || projet.nom} – indice ${meta.indice || '—'} – page `, size: 16, color: '4B5865' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '4B5865' }),
              new TextRun({ text: ' / ', size: 16, color: '4B5865' }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '4B5865' }),
            ],
          })],
        }),
      },
      children: enfants,
    }],
  });
  const blob = await Packer.toBlob(doc);
  telecharger(nomFichier(projet, `controle_gefra_ind${meta.indice || ''}`, 'docx'), blob);
}

export function situationCourte(p) {
  const n = E.normaliser(p);
  const z = E.ZONES[n.zone].court;
  const parts = [z];
  if (['sc', 'lat', 'oaJum', 'echangeur'].includes(n.zone)) {
    if (n.L1 !== null) parts.push(`L1 ${E.fmtM(n.L1)}`);
    if (n.zone !== 'oaJum' && n.position !== 'meme') parts.push(`${E.POSITIONS[n.position].toLowerCase()}${n.denivele !== null ? ` (${E.fmtM(n.denivele)})` : ''}`);
    if (n.position === 'ferHaut' && n.talus) parts.push(`talus ${E.fmtTalus(n.talus)}`);
  }
  if (['oa', 'oaJum', 'carrefour'].includes(n.zone)) parts.push(n.traficPL === 'fort' ? 'fort trafic PL' : 'trafic PL moyen');
  if (['oa', 'abords'].includes(n.zone) && n.angle !== null) parts.push(`angle ${E.fmt(n.angle, 0)}°`);
  return parts.join(', ');
}

export const TEXTE_OBJET = [
  "La présente note contrôle les dispositifs de protection anti-pénétration prévus à l'interface entre la plate-forme routière et la plate-forme ferroviaire, au regard du guide technique Sétra « Géfra – Jumelage des plates-formes ferroviaires et routières ou autoroutières. Aide à la définition des dispositifs de protection anti-pénétration » (avril 2004).",
  "Pour chaque tronçon homogène, la distance L1 entre la limite de la largeur roulable (bord extérieur de la BAU ou de la BDD) et la limite des aménagements ferroviaires (entrée en terre), les niveaux relatifs des plates-formes et la nature de la zone déterminent le cas du guide, le niveau de retenue minimal et l'élément anti-pénétration exigés. Le dispositif projeté est comparé à cette exigence.",
  "Les écarts sont classés P0 (sécurité ferroviaire non assurée, à lever avant validation), P1 (écart au guide, à corriger dans le dossier) et P2 (point de vigilance ou justification à apporter). Les niveaux de retenue s'entendent au sens de la norme NF EN 1317-2 ; les modèles cités par le guide datent de 2004 et leur homologation doit être vérifiée.",
];

export const VERIFS_RAPPORT = [
  "Mesure de L1 : bord extérieur de la BAU/BDD côté route ; entrée en terre de la plate-forme (génératrice extérieure de l'assainissement, crête de déblai ou pied de remblai), ou nu extérieur d'un mur anti-bruit, côté fer (§4.1).",
  'Assainissement des deux plates-formes séparé et entretenu depuis chaque infrastructure (§3.5).',
  "Protocole d'accord entre gestionnaires sur les limites foncières et l'entretien des espaces résiduels (§4.1).",
  "Sécurité du personnel : distance de 3 m minimum aux conducteurs de moins de 50 kV lors de la pose et de la maintenance des dispositifs, notamment des écrans en jumelage très étroit (§3.5).",
  'Ligne classique à signalisation latérale et jumelage étroit : évaluer la gêne des phares routiers pour les conducteurs de train (§3.2).',
  'Interférences électromagnétiques avec les équipements routiers : étude au cas par cas (§3.4).',
  "Continuité des dispositifs sur et aux abords des ouvrages, sur 50 m depuis l'entrée en terre mesurés perpendiculairement à l'axe ferroviaire (§5.1 et §5.2).",
  'Homologation ou marquage CE actuel des dispositifs de retenue retenus (liste du guide établie en 2004).',
];
