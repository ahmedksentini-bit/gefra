/*
 * GÉFRA — moteur de règles.
 *
 * Transcrit les règles de décision du guide technique Sétra
 * « Géfra – Jumelage des plates-formes ferroviaires et routières ou autoroutières.
 *   Aide à la définition des dispositifs de protection anti-pénétration » (avril 2004, réf. 0401).
 *
 * Module pur (aucun accès au DOM) : utilisable dans le navigateur et sous Node pour les tests.
 * Conventions :
 *   - L1 : distance entre la limite de la largeur roulable routière (bord extérieur BAU/BDD)
 *          et la limite des aménagements ferroviaires (entrée en terre), en mètres (§4.1).
 *   - Pente de talus notée H/V (3/2 = 3 de base pour 2 de hauteur). Une pente « supérieure »
 *     à 3/2 est plus raide, donc un rapport H/V plus petit.
 */

export const G = 9.81;
export const NIVEAUX = ['N1', 'N2', 'H1', 'H2', 'H3', 'H4'];

export const PRIORITES = {
  P0: { titre: 'Critique', desc: 'Sécurité ferroviaire non assurée : à lever avant validation du dossier.' },
  P1: { titre: 'Important', desc: 'Écart au guide Géfra : à corriger dans le dossier.' },
  P2: { titre: 'À vérifier', desc: 'Point de vigilance ou justification à apporter.' },
};

export const ZONES = {
  sc: { label: 'Section courante', court: 'Section courante', ref: '§4' },
  lat: { label: "Voirie latérale d'accès de service", court: 'Voirie latérale', ref: '§5.3' },
  oaJum: { label: 'Plates-formes jumelées sur ouvrage', court: 'OA jumelés', ref: '§5.1' },
  oa: { label: 'Ouvrage routier au-dessus de la voie ferrée', court: 'OA sur voie ferrée', ref: '§5.1' },
  abords: { label: "Abords d'ouvrage de franchissement", court: "Abords d'OA", ref: '§5.2' },
  carrefour: { label: "Carrefour d'accès surélevé contigu", court: 'Carrefour', ref: '§5.4' },
  echangeur: { label: 'Échangeur surélevé contigu', court: 'Échangeur', ref: '§5.5' },
};

export const POSITIONS = {
  meme: 'Même niveau',
  ferBas: 'Voie ferrée en contrebas',
  ferHaut: 'Voie ferrée au-dessus',
};

/* Dispositifs projetés proposés au contrôle de conformité.
   niveau : niveau de retenue retenu par défaut (modifiable) ; phys : élément anti-pénétration
   (écran de retenue de chargement / mur, merlon, fossé) ; h : hauteur ou profondeur par défaut. */
export const PROJETS = {
  aucun: { label: 'Aucun dispositif', niveau: null, phys: null, h: null },
  n2: { label: 'Barrière N2 seule (GS2, GS4, GRC…)', niveau: 'N2', phys: null, h: null },
  h2: { label: 'Barrière H2 seule (GBA, BHO, BN4…)', niveau: 'H2', phys: null, h: null },
  h3: { label: 'Barrière H3 seule (BN4-16, TETRA S16…)', niveau: 'H3', phys: null, h: null },
  murBA: { label: 'GRC/GS2 + mur BA (cas 1, sol. 1)', niveau: 'H3', phys: 'ecran', h: 3.5 },
  murEcran: { label: 'Barrière H2 + mur BA 1,50 m + écran (cas 1, sol. 3)', niveau: 'H3', phys: 'ecran', h: 3.5 },
  lbe: { label: 'LBE : LBA + écran', niveau: 'H3', phys: 'ecran', h: 3.5 },
  bhe: { label: 'GS4 + BHE : BHO + écran (cas 3, sol. 1)', niveau: 'H2', phys: 'ecran', h: 3.0 },
  ecranMassif: { label: 'Barrière H2 + écran sur massif (cas 3, sol. 2)', niveau: 'H2', phys: 'ecran', h: 3.0 },
  ble: { label: 'BLE : BN4 + écran (ouvrage)', niveau: 'H3', phys: 'ecran', h: 3.0 },
  merlon: { label: 'GS4 + merlon (cas 4)', niveau: 'N2', phys: 'merlon', h: 3.0 },
  fosseGS4: { label: 'GS4 + fossé (cas 5)', niveau: 'N2', phys: 'fosse', h: 1.5 },
  fosse: { label: 'Fossé seul (cas 5)', niveau: null, phys: 'fosse', h: 1.5 },
  autre: { label: 'Autre dispositif (préciser)', niveau: null, phys: null, h: null },
};

export const PHYS = {
  aucun: 'Aucun',
  ecran: 'Écran de retenue de chargement / mur',
  merlon: 'Merlon',
  fosse: 'Fossé',
};

export const AMENAGEMENTS_CARREFOUR = {
  aucun: 'Débouché entre les ouvrages, sans disposition particulière',
  deplace: 'Débouché reporté au-delà des dispositifs de retenue (cas 1)',
  decale: 'Alignement des dispositifs décalé de 5 à 10° (cas 2, sol. 1)',
  musoir: 'Musoir intégré au dispositif de retenue (cas 2, sol. 2)',
  musoirAtt: 'Musoir intégré avec atténuateur de choc (cas 2, sol. 2)',
};

/* Tableau récapitulatif des modèles de dispositifs de retenue (annexe du guide, état 2004). */
export const CATALOGUE = [
  { nom: 'LBE', compo: 'LBA + écran', niveau: 'H3/H4', materiau: 'Béton + acier', ref: '—', emploi: 'Accotement, y compris tranchées couvertes' },
  { nom: 'BHE', compo: 'BHO + écran', niveau: 'Variable selon la combinaison', materiau: 'Acier', ref: '—', emploi: 'Accotement' },
  { nom: 'BLE', compo: 'BN4 + écran', niveau: 'Variable selon la barrière (H3 attendu au §5.1)', materiau: 'Acier', ref: '—', emploi: 'Ponts' },
  { nom: 'GS4', compo: 'Supports C100 ou U100 tous les 4 m', niveau: 'N2', materiau: 'Acier', ref: 'C 88-49 ; NF P 98-410', emploi: 'Accotement, ponts' },
  { nom: 'GS2', compo: 'Supports C100 ou U100 tous les 2 m', niveau: 'N2', materiau: 'Acier', ref: 'C 88-49 ; NF P 98-410', emploi: 'Accotement, ponts' },
  { nom: 'GRC', compo: 'Supports C125 tous les 2 m', niveau: 'N2', materiau: 'Acier', ref: '—', emploi: 'Accotement' },
  { nom: 'GCU', compo: 'C125 + C100 ou U100 tous les 2 m', niveau: 'N2', materiau: 'Acier', ref: '—', emploi: 'Accotement' },
  { nom: 'BN1-2', compo: '', niveau: 'H2', materiau: 'Béton armé + métal', ref: 'C 88-49 ; XP P 98-422', emploi: 'Ponts' },
  { nom: 'BN3', compo: '', niveau: 'H2', materiau: 'Béton précontraint', ref: 'C 88-49', emploi: "Ponts (n'est plus utilisée)" },
  { nom: 'BN4', compo: '', niveau: 'H2', materiau: 'Acier', ref: 'C 88-49 ; XP P 98-421', emploi: 'Ponts' },
  { nom: 'BHO', compo: '', niveau: 'H2', materiau: 'Acier', ref: 'C 88-49 ; XP P 98-420', emploi: 'Accotement' },
  { nom: 'BN5', compo: '', niveau: 'H2', materiau: 'Acier', ref: 'XP P 98-424', emploi: 'Accotement' },
  { nom: 'TETRA S13', compo: '', niveau: 'H2', materiau: 'Acier', ref: 'C 99-64', emploi: 'Ponts' },
  { nom: 'DBA / GBA', compo: '', niveau: 'H2', materiau: 'Béton non armé', ref: 'C 88-49 ; NF P 98-430', emploi: 'Accotement, ponts' },
  { nom: 'BN4-16', compo: '', niveau: 'H3', materiau: 'Acier', ref: 'C 95-68', emploi: 'Ponts' },
  { nom: 'TETRA S16', compo: '', niveau: 'H3', materiau: 'Acier', ref: 'C 99-64', emploi: 'Ponts' },
  { nom: 'BHAB', compo: '', niveau: 'H3', materiau: 'Acier', ref: 'C 98-09', emploi: 'Ponts' },
  { nom: 'LBA', compo: '', niveau: 'H3/H4', materiau: 'Béton', ref: '—', emploi: 'Accotement' },
];

export const SEUILS_L1 = [2, 6, 8, 17, 30, 50];

/* ------------------------------------------------------------------ utilitaires */

export function rang(n) {
  if (!n) return -1;
  const m = String(n).toUpperCase().match(/^(N1|N2|H1|H2|H3|H4)/);
  return m ? NIVEAUX.indexOf(m[1]) : -1;
}

export function num(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(/[\s  ]/g, '').replace(',', '.').replace(/m$/i, '');
  if (s === '') return null;
  const x = Number(s);
  return Number.isFinite(x) ? x : null;
}

export function fmt(x, d = 2) {
  if (x === null || x === undefined || !Number.isFinite(x)) return '–';
  return x.toFixed(d).replace('.', ',');
}

export function fmtM(x, d = 2) {
  return x === null || x === undefined || !Number.isFinite(x) ? '–' : `${fmt(x, d)} m`;
}

/** « 1+250 », « PK 12+345,5 », « 1250 » → mètres. */
export function parsePK(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(/^pk\s*/i, '').replace(/\s/g, '').replace(',', '.');
  const m = s.match(/^(-?\d+)\+(\d+(?:\.\d+)?)$/);
  if (m) return Number(m[1]) * 1000 + Number(m[2]) * (m[1].startsWith('-') ? -1 : 1);
  return num(s);
}

export function fmtPK(m) {
  if (m === null || m === undefined || !Number.isFinite(m)) return '';
  const neg = m < 0;
  const a = Math.abs(m);
  const km = Math.floor(a / 1000);
  const r = a - km * 1000;
  const entier = Math.abs(r - Math.round(r)) < 1e-6;
  const reste = entier ? String(Math.round(r)).padStart(3, '0') : r.toFixed(1).padStart(5, '0').replace('.', ',');
  return `${neg ? '-' : ''}${km}+${reste}`;
}

/** Pente de talus → rapport H/V. Accepte « 3/2 », « 3H/2V », « 1,5 », « 66% » (V/H). */
export function parseTalus(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v > 0 ? v : null;
  const s = String(v).trim().toLowerCase().replace(/,/g, '.').replace(/\s/g, '');
  if (!s) return null;
  let m = s.match(/^(\d+(?:\.\d+)?)h?[/:](\d+(?:\.\d+)?)v?$/);
  if (m) {
    const h = Number(m[1]);
    const vv = Number(m[2]);
    return h > 0 && vv > 0 ? h / vv : null;
  }
  m = s.match(/^(\d+(?:\.\d+)?)%$/);
  if (m) return Number(m[1]) > 0 ? 100 / Number(m[1]) : null;
  m = s.match(/^\d+(?:\.\d+)?$/);
  if (m) return Number(s) > 0 ? Number(s) : null;
  return null;
}

export function fmtTalus(hv) {
  if (!hv || !Number.isFinite(hv)) return '–';
  for (let v = 1; v <= 4; v++) {
    const h = hv * v;
    if (Math.abs(h - Math.round(h)) < 1e-6) return `${Math.round(h)}/${v}`;
  }
  return `${fmt(hv, 2)}/1`;
}

function oui(v) {
  if (typeof v === 'boolean') return v;
  return /^(1|o|oui|y|yes|x|vrai|true)$/i.test(String(v ?? '').trim());
}

/* ------------------------------------------------------------------ calculs */

/** Coefficient de la courbe de chute y = k·x² (§3.1). Par défaut 70 km/h sous 20° : k ≈ 0,111. */
export function coefChute(vKmh = 70, angleDeg = 20) {
  const vt = (vKmh / 3.6) * Math.sin((angleDeg * Math.PI) / 180);
  return { vt, k: vt > 0 ? G / (2 * vt * vt) : Infinity };
}

/** Distance horizontale parcourue pendant une chute de h mètres. */
export function porteeChute(h, k) {
  return h > 0 && Number.isFinite(k) ? Math.sqrt(h / k) : 0;
}

/**
 * Le chargement atteint-il la plate-forme ferroviaire ?
 * d : écart horizontal entre le point de départ (rive routière) et le bord de la plate-forme ferroviaire ;
 * h : dénivelé, positif quand la plate-forme ferroviaire est plus basse que le point de départ.
 */
export function atteinteChargement(d, h, k) {
  if (d === null || h === null || d === undefined || h === undefined) return null;
  const yd = k * d * d;
  return { yd, portee: porteeChute(h, k), atteint: h > 0 && yd < h };
}

/** Longueur de protection à prévoir le long de la route aux abords d'un ouvrage (§5.2). */
export function longueurAbords(angleDeg, distance = 50) {
  const a = num(angleDeg);
  if (a === null || a <= 0 || a >= 180) return null;
  const s = Math.sin((Math.min(a, 180 - a) * Math.PI) / 180);
  return distance / s;
}

/** Emprise d'un merlon du 4e cas, de la limite roulable à la limite ferroviaire. */
export function merlonEmprise({ h = 3, crete = 4, mRoute = 1.5, mFer = 1.5, zoneBAU = 3, banqRoute = 1, banqFer = 1 } = {}) {
  return zoneBAU + banqRoute + mRoute * h + crete + mFer * h + banqFer;
}

/** Hauteur maximale d'un merlon logeable dans L1. */
export function merlonHauteurMax(L1, { crete = 4, mRoute = 1.5, mFer = 1.5, zoneBAU = 3, banqRoute = 1, banqFer = 1 } = {}) {
  return (L1 - zoneBAU - banqRoute - crete - banqFer) / (mRoute + mFer);
}

/** Implantation par défaut d'un merlon de 3 m : crête de 4 m si possible, sinon 3 m. */
export function implantationMerlon(L1, h = 3) {
  const base = { h, mRoute: 1.5, mFer: 1.5, zoneBAU: 3, banqRoute: 1 };
  let crete = 4;
  let banqFer = L1 - merlonEmprise({ ...base, crete, banqFer: 0 });
  if (banqFer < 1) {
    crete = 3;
    banqFer = L1 - merlonEmprise({ ...base, crete, banqFer: 0 });
  }
  return { ...base, crete, banqFer, faisable: banqFer >= 1 - 1e-9 };
}

/* ------------------------------------------------------------------ normalisation */

export function normaliser(p = {}) {
  const projet = PROJETS[p.projet] ? p.projet : '';
  return {
    zone: ZONES[p.zone] ? p.zone : 'sc',
    L1: num(p.L1),
    position: POSITIONS[p.position] ? p.position : 'meme',
    denivele: num(p.denivele) === null ? null : Math.abs(num(p.denivele)),
    talus: parseTalus(p.talus),
    traficPL: p.traficPL === 'fort' || oui(p.traficPL) ? 'fort' : 'moyen',
    acces: oui(p.acces),
    angle: num(p.angle),
    ecartOA: num(p.ecartOA),
    deniveleOA: num(p.deniveleOA),
    niveauOA: rang(p.niveauOA) >= 0 ? p.niveauOA : 'H2',
    ligne: p.ligne === 'lgv' ? 'lgv' : 'classique',
    vitesse: num(p.vitesse) ?? 70,
    angleImpact: num(p.angleImpact) ?? 20,
    projet,
    amenagement: AMENAGEMENTS_CARREFOUR[p.amenagement] ? p.amenagement : '',
    hauteur: num(p.hauteur),
    niveauProjete: rang(p.niveauProjete) >= 0 ? p.niveauProjete : '',
    physProjete: PHYS[p.physProjete] ? p.physProjete : '',
    longueurProjetee: num(p.longueurProjetee),
    merlonTalusRoute: parseTalus(p.merlonTalusRoute),
    decalageAngle: num(p.decalageAngle),
  };
}

/* ------------------------------------------------------------------ évaluation */

function base(p) {
  return {
    zone: p.zone,
    code: '',
    titre: '',
    plage: '',
    ref: '',
    statut: 'protection',
    resume: '',
    exigence: { niveauMin: null, phys: null, barriereBAU: '', longueurMin: null, amenagement: null },
    solutions: [],
    verifs: [],
    alertes: [],
    calculs: [],
    notes: [],
  };
}

export function casSC(L1) {
  if (L1 === null || L1 === undefined) return null;
  if (L1 < 2) return 'SC0';
  if (L1 < 6) return 'SC1';
  if (L1 < 8) return 'SC2';
  if (L1 < 17) return 'SC3';
  if (L1 < 30) return 'SC4';
  if (L1 < 50) return 'SC5';
  return 'SC6';
}

export const CAS = {
  SC0: { titre: 'Hors cas types', plage: 'L1 < 2 m', ref: '§4.2' },
  SC1: { titre: '1er cas – jumelage très étroit', plage: '2 m ≤ L1 < 6 m', ref: '§4.2, 1er cas' },
  SC2: { titre: '2e cas', plage: '6 m ≤ L1 < 8 m', ref: '§4.2, 2e cas' },
  SC3: { titre: '3e cas', plage: '8 m ≤ L1 < 17 m', ref: '§4.2, 3e cas' },
  SC4: { titre: '4e cas – merlon', plage: '17 m ≤ L1 < 30 m', ref: '§4.2, 4e cas' },
  SC5: { titre: '5e cas – fossé', plage: '30 m ≤ L1 < 50 m', ref: '§4.2, 5e cas' },
  SC6: { titre: 'Au-delà de 50 m', plage: 'L1 ≥ 50 m', ref: '§4.2' },
  FH1: { titre: 'Voie ferrée au-dessus, dénivelé 3 à 6 m', plage: '3 m ≤ dénivelé ≤ 6 m', ref: '§4.3, 2e cas' },
  FH2: { titre: 'Voie ferrée au-dessus, dénivelé > 6 m', plage: 'dénivelé > 6 m', ref: '§4.3, 2e cas' },
  OA: { titre: 'Ouvrage au-dessus de la voie ferrée', plage: 'Rive d’ouvrage', ref: '§5.1' },
  OAJ: { titre: 'Plates-formes jumelées sur ouvrage', plage: '', ref: '§5.1 et §3.1' },
  AB: { titre: 'Abords de l’ouvrage', plage: '50 m depuis l’entrée en terre', ref: '§5.2' },
  CA1: { titre: 'Carrefour – trafic important, notamment PL', plage: 'Cas 1', ref: '§5.4, 1er cas' },
  CA2: { titre: 'Carrefour – trafic moyen, faible trafic PL', plage: 'Cas 2', ref: '§5.4, 2e cas' },
  EC: { titre: 'Échangeur surélevé contigu', plage: 'Analyse particulière', ref: '§5.5' },
};

const VERIF_GENERALES = [
  "Limites de mesure de L1 : bord extérieur de la BAU/BDD côté route ; entrée en terre de la plate-forme (ou nu extérieur d'un mur anti-bruit) côté fer (§4.1).",
  'Assainissement des deux plates-formes réalisé séparément, entretenu depuis chaque infrastructure (§3.5).',
  "Protocole d'accord entre gestionnaires : limites foncières et entretien des espaces résiduels (§4.1).",
  'Sécurité du personnel de pose et de maintenance : 3 m minimum aux conducteurs de moins de 50 kV ; alimentation 25 kV alternatif ou 1,5 kV continu (§3.5).',
  'Niveaux de retenue au sens de la NF EN 1317-2 ; vérifier que les modèles retenus sont toujours homologués ou marqués CE (liste du guide établie en 2004).',
];

function solution(id, nom, role, texte, schema) {
  return { id, nom, role, texte, schema };
}

function appliquerCasSC(res, code, p) {
  const c = CAS[code];
  res.code = code;
  res.titre = c.titre;
  res.plage = c.plage;
  res.ref = c.ref;
  const L1 = p.L1;
  const sch = (variante) => ({ kind: 'coupe', variante, L1, position: p.position, denivele: p.denivele });

  switch (code) {
    case 'SC0':
      res.statut = 'horsDomaine';
      res.resume = "Jumelage de moins de 2 m : configuration hors des cas types du guide.";
      res.exigence = { ...res.exigence, niveauMin: 'H3', phys: { type: 'ecran', hMin: 3.5 }, barriereBAU: 'Glissière GRC ou équivalent' };
      res.solutions.push(solution('SC0', 'Étude spécifique', 'indiquée', [
        'Le guide ne traite pas les jumelages de moins de 2 m : étude spécifique et avis du groupe Géfra nécessaires.',
        'Base minimale à justifier : glissière en bord de BAU/BDD et mur en béton armé de 3,50 m dimensionné au choc (solution 1 du 1er cas).',
        "Rechercher d'abord un élargissement de l'interface pour revenir dans le 1er cas.",
      ], sch('SC1-S1')));
      res.alertes.push({ p: 'P0', t: 'L1 < 2 m : configuration non couverte par les cas types. Étude spécifique obligatoire.' });
      break;

    case 'SC1': {
      res.resume = 'Niveau de retenue H3 minimum et écran ou mur de 3,50 m. Configuration à réserver aux cas exceptionnels.';
      res.exigence = { ...res.exigence, niveauMin: 'H3', phys: { type: 'ecran', hMin: 3.5 }, barriereBAU: 'GRC/GS2, ou barrière H2 (GBA, BHO), ou LBA' };
      const t = (L1 - 2) / 4;
      const indiquee = t < 1 / 3 ? 'SC1-S1' : t < 2 / 3 ? 'SC1-S3' : 'SC1-S2';
      res.solutions.push(solution('SC1-S1', 'Solution 1 – Glissière + mur en béton armé de 3,50 m', indiquee === 'SC1-S1' ? 'indiquée' : 'alternative', [
        'Préconisée pour un jumelage proche de 2 m.',
        'Glissière renforcée GRC (ou similaire) en bord de BAU/BDD, remplacée par une GS2 dès que la largeur le permet.',
        'Mur en béton armé de 3,50 m de hauteur, faisant office de clôture séparative.',
        'Dimensionnement du mur : choc latéral FA = 500 kN appliqué à 1,50 m au-dessus de la chaussée (BAEL 91, art. D.1.1.4.2), puis FA/5 en crête au-dessus de 1,50 m.',
        'Cotes de principe : 1,00 m minimum entre glissière et mur, mur de 0,50 m, 0,50 m minimum derrière le mur.',
      ], sch('SC1-S1')));
      res.solutions.push(solution('SC1-S3', 'Solution 3 – Barrière H2 + mur BA de 1,50 m + écran jusqu’à 3,50 m', indiquee === 'SC1-S3' ? 'indiquée' : 'alternative', [
        'Pour les largeurs intermédiaires entre les solutions 1 et 2.',
        'Barrière de niveau H2 en bord de BAU/BDD : béton GBA, ou métallique BHO ou similaire.',
        "Mur en béton armé de 1,50 m complété par un écran de retenue de chargement jusqu'à 3,50 m ; clôture intégrée à l'écran.",
        "Effort de calcul du mur réduit grâce à la barrière H2 placée en avant (guide PP 73, pièce 3.3, et BAEL 91).",
        'Cotes de principe : barrière de 0,50 m, 1,00 m minimum jusqu’au mur, mur de 0,50 m.',
      ], sch('SC1-S3')));
      res.solutions.push(solution('SC1-S2', 'Solution 2 – Barrière béton LBE (LBA + écran) de 3,50 m', indiquee === 'SC1-S2' ? 'indiquée' : 'alternative', [
        'Préconisée pour un jumelage proche de 6 m.',
        "Ensemble LBE : séparateur lourd LBA surmonté d'un écran de retenue de chargement, hauteur totale 3,50 m ; peut servir de clôture.",
        'Semelle de fondation en béton légèrement armé (0,30 m d’épaisseur, environ 1,00 m de large) sous la LBA sur terrain non revêtu.',
        'Cotes de principe : écran à 0,95 m de la limite roulable, 1,05 m minimum derrière.',
      ], sch('SC1-S2')));
      res.notes.push("Solution indiquée selon la position de L1 dans l'intervalle (tiers « proche de 2 m », « intermédiaire », « proche de 6 m ») : interprétation de l'application, le choix reste à justifier.");
      res.verifs.push(
        'Assainissement de la chaussée par caniveau à fente en limite de BAU/BDD.',
        'Aucun accès de service routier aux plates-formes dans ce cas.',
        'BAU ou BDD de 2,00 m minimum.',
        'Sécurité du personnel lors de la pose et de la maintenance des écrans, surtout si la voie ferrée est en contrebas (§3.5).',
      );
      if (p.acces) res.alertes.push({ p: 'P0', t: 'Accès de service routier en jumelage très étroit : interdit dans le 1er cas.' });
      break;
    }

    case 'SC2':
      res.resume = 'Barrière béton LBE de 3,50 m (niveau H3 minimum) et bande d’entretien de 3,50 m jusqu’à la clôture.';
      res.exigence = { ...res.exigence, niveauMin: 'H3', phys: { type: 'ecran', hMin: 3.5 }, barriereBAU: 'LBA (ensemble LBE)' };
      res.solutions.push(solution('SC2-S1', 'Barrière béton LBE (LBA + écran) de 3,50 m', 'préconisée', [
        'Ensemble LBE de 3,50 m de hauteur, niveau de retenue H3 minimum.',
        'Semelle de fondation en béton légèrement armé (0,30 m × 1,00 m environ) sous la LBA sur terrain non revêtu.',
        "Bande de 3,50 m minimum entre la LBE et la clôture, réservée à l'entretien mécanisé (assainissement de la plate-forme routière…).",
        'Cotes de principe : 0,95 m + 3,50 m + 1,55 m minimum jusqu’à la limite ferroviaire.',
      ], sch('SC2-S1')));
      res.verifs.push('Largeur de la bande d’entretien entre LBE et clôture ≥ 3,50 m.', 'BAU ou BDD de 2,00 m minimum.');
      break;

    case 'SC3':
      res.resume = 'Glissière en bord de BAU/BDD et écran de retenue de chargement de 3,00 m en limite d’emprise (niveau H2 minimum).';
      res.exigence = { ...res.exigence, niveauMin: 'H2', phys: { type: 'ecran', hMin: 3.0 }, barriereBAU: 'GS4 (sol. 1) ou barrière H2 GBA/BHO (sol. 2)' };
      res.solutions.push(solution('SC3-S1', 'Solution 1 – GS4 + ensemble BHE de 3,00 m', 'préconisée', [
        'Glissière GS4 (ou similaire) en bord de BAU/BDD.',
        "Ensemble BHE : barrière BHO surmontée d'un écran de retenue de chargement avec clôture intégrée, hauteur 3,00 m.",
        'Cotes de principe : 1,50 m + 5,00 m minimum (bande d’entretien) + 1,50 m minimum jusqu’à la limite ferroviaire (4,50 m souhaitables en section courante).',
      ], sch('SC3-S1')));
      res.solutions.push(solution('SC3-S2', 'Solution 2 – Barrière H2 + écran sur massif d’ancrage', 'alternative', [
        'Barrière de niveau H2 en bord de BAU/BDD : GBA, ou BHO ou similaire.',
        "Écran de retenue de chargement de 3,00 m avec clôture intégrée, posé sur un massif d'ancrage en limite des emprises.",
        'Mêmes cotes de principe que la solution 1.',
      ], sch('SC3-S2')));
      res.verifs.push("Distances minimales entre les deux éléments respectées pour l'entretien mécanisé et l'assainissement de la bande.");
      if (L1 >= 15) res.notes.push('Jumelage proche de 17 m : un merlon (4e cas) peut être envisagé, avec un talus raidi côté ferroviaire. Le merlon est à privilégier chaque fois que possible (§3.1).');
      break;

    case 'SC4': {
      res.resume = 'Merlon de 3,00 m minimum, clôture en crête, et glissière N2 (GS4) en bord de BAU/BDD.';
      res.exigence = { ...res.exigence, niveauMin: 'N2', phys: { type: 'merlon', hMin: 3.0 }, barriereBAU: 'GS4 ou similaire (N2)' };
      res.solutions.push(solution('SC4-S1', 'Merlon de 3,00 m minimum + glissière N2', 'préconisée', [
        'Merlon de hauteur 3,00 m minimum, clôture séparative implantée en crête.',
        'Glissière de niveau N2 (GS4 ou similaire) en bord de BAU/BDD.',
        'Talus côté route impérativement à 3/2 : plus doux (2/1), il serait franchissable ; plus raide (1/1), il serait trop agressif pour les usagers.',
        'Largeur restante à répartir entre la crête (4 m souhaitables pour l’entretien), les banquettes, la pente côté fer et la hauteur (selon matériaux et dépôts disponibles).',
        'Cotes de principe pour L1 = 17 m : 3,00 + 1,00 + 4,50 + 3,00 + 4,50 + 1,00 m.',
      ], sch('SC4-S1')));
      const imp = implantationMerlon(L1);
      res.calculs.push(
        { label: 'Emprise d’un merlon de 3 m, crête de 4 m', valeur: fmtM(merlonEmprise({ h: 3, crete: 4 })), detail: 'Talus 3/2 des deux côtés, banquettes de 1,00 m.' },
        { label: 'Hauteur maximale logeable (crête 4 m, talus 3/2)', valeur: fmtM(merlonHauteurMax(L1, { crete: 4 })), detail: `Avec L1 = ${fmtM(L1)}.` },
        { label: 'Banquette restante côté fer (merlon 3 m)', valeur: fmtM(imp.banqFer), detail: `Crête retenue : ${fmtM(imp.crete)} ; 4,50 m souhaitables côté fer en section courante.` },
      );
      res.verifs.push('Talus côté route du merlon à 3/2.', 'Crête de 4 m souhaitable pour l’entretien.', 'Clôture en crête du merlon.');
      break;
    }

    case 'SC5':
      res.resume = 'Fossé de 1,50 m de profondeur à 10 m du bord de BAU/BDD ; glissière N2 si nécessaire.';
      res.exigence = { ...res.exigence, niveauMin: null, phys: { type: 'fosse', hMin: 1.5 }, barriereBAU: 'GS4 (N2) si nécessaire' };
      res.solutions.push(solution('SC5-S1', 'Fossé de 1,50 m à 10 m de la BAU/BDD', 'préconisée', [
        'Fossé à 10 m du bord de BAU/BDD : 1,50 m de profondeur, 3,50 m de largeur en pied, talus à 3/2 (8,00 m en tête).',
        'Entretien minimal permanent pour garder son efficacité (rétention d’eau, végétation).',
        'Glissière de niveau N2 (GS4 ou similaire) en bord de BAU/BDD si nécessaire.',
        'Clôture à 4,50 m de la limite ferroviaire ; largeur intermédiaire variable de 7,50 m à 27,50 m.',
        'En cas d’excédent de matériaux, le merlon du 4e cas peut être réalisé.',
      ], sch('SC5-S1')));
      res.verifs.push('Entretien du fossé prévu (eau, végétation).');
      break;

    case 'SC6':
      res.statut = 'casParCas';
      res.resume = 'Risque de pénétration quasi inexistant : pas de dispositif spécifique a priori, mais analyse au cas par cas.';
      res.exigence = { ...res.exigence, niveauMin: null, phys: null, barriereBAU: 'N2 minimum si nécessaire' };
      res.solutions.push(solution('SC6-S1', 'Analyse au cas par cas', 'indiquée', [
        'Au-delà de 50 m, s’assurer qu’aucun dispositif spécifique n’est nécessaire (géométrie, trafic, conditions climatiques).',
        'Si nécessaire, barrière de niveau N2 minimum en bord de BAU/BDD.',
      ], sch('SC6-S1')));
      break;
    default:
      break;
  }
}

function evalSectionCourante(p) {
  const res = base(p);

  if (p.position === 'ferHaut' && p.denivele !== null && p.denivele >= 3) {
    const sch = (variante) => ({ kind: 'talus', variante, denivele: p.denivele, talus: p.talus });
    if (p.denivele > 6) {
      Object.assign(res, { code: 'FH2', ...pick(CAS.FH2), statut: 'aucune' });
      res.resume = 'Risque quasi inexistant quelle que soit la pente du talus : pas de dispositif nécessaire.';
      res.solutions.push(solution('FH2', 'Aucun dispositif nécessaire', 'indiquée', [
        'Dénivelé supérieur à 6 m : le risque de pénétration est considéré comme quasi inexistant, quelle que soit la pente du talus de raccordement.',
      ], sch('FH-aucun')));
    } else {
      Object.assign(res, { code: 'FH1', ...pick(CAS.FH1) });
      if (p.talus === null) {
        res.statut = 'incomplet';
        res.resume = 'Renseigner la pente du talus de raccordement pour conclure.';
      } else if (p.talus <= 1.5 + 1e-9) {
        res.statut = 'aucune';
        res.resume = `Talus de raccordement à ${fmtTalus(p.talus)}, au moins aussi raide que 3/2 : pas de protection nécessaire a priori.`;
        res.solutions.push(solution('FH1-raide', 'Aucune protection a priori', 'indiquée', [
          'Talus de raccordement de pente supérieure ou égale à 3/2 : aucune protection nécessaire a priori entre les deux infrastructures.',
          'Dans les zones de transition (dénivelé proche de 3 m), une barrière de niveau N2 minimum peut être implantée en bord de BAU/BDD.',
        ], sch(p.denivele <= 3.5 ? 'FH-N2-option' : 'FH-aucun')));
        if (p.denivele <= 3.5) res.alertes.push({ p: 'P2', t: 'Zone de transition (dénivelé proche de 3 m) : examiner la pose d’une barrière N2 en bord de BAU/BDD.' });
      } else {
        res.resume = `Talus de raccordement à ${fmtTalus(p.talus)}, plus doux que 3/2 : barrière N2 minimum en bord de BAU/BDD.`;
        res.exigence = { ...res.exigence, niveauMin: 'N2', barriereBAU: 'GS4 ou similaire (N2)' };
        res.solutions.push(solution('FH1-doux', 'Barrière N2 minimum en bord de BAU/BDD', 'préconisée', [
          'Talus de raccordement de pente inférieure à 3/2 (franchissable) : barrière de niveau N2 minimum, GS4 ou similaire, en bord de BAU/BDD.',
        ], sch('FH-N2')));
      }
    }
    res.verifs.push(
      'La position de la limite entre emprises est sans incidence sur le dispositif à mettre en œuvre.',
      'Banquette de 1,50 m minimum (4,50 m souhaitables) entre la limite ferroviaire et la clôture.',
    );
    finaliser(res, p);
    return res;
  }

  if (p.L1 === null) {
    res.statut = 'incomplet';
    res.titre = 'Données incomplètes';
    res.resume = 'Renseigner L1 pour déterminer le cas Géfra.';
    finaliser(res, p);
    return res;
  }

  appliquerCasSC(res, casSC(p.L1), p);

  if (p.position === 'ferBas') res.notes.push('Voie ferrée en contrebas : les dispositifs du §4.2 s’appliquent selon L1, quel que soit le dénivelé (§4.3, 1er cas).');
  if (p.position === 'ferHaut') res.notes.push('Voie ferrée au-dessus avec un dénivelé inférieur à 3 m : les dispositifs du §4.2 s’appliquent selon L1 (§4.3).');
  if (p.zone === 'lat') res.notes.push('Voirie latérale d’accès de service : protection vis-à-vis de la plate-forme ferroviaire traitée comme en section courante (§5.3).');
  finaliser(res, p);
  return res;
}

function pick(c) {
  return { titre: c.titre, plage: c.plage, ref: c.ref };
}

function evalOA(p) {
  const res = base(p);
  Object.assign(res, { code: 'OA', ...pick(CAS.OA) });
  const fort = p.traficPL === 'fort';
  if (fort) {
    res.resume = 'Itinéraire à fort trafic PL : niveau H3, ensemble BLE (BN4 + écran) de 3,00 m en rive d’ouvrage.';
    res.exigence = { ...res.exigence, niveauMin: 'H3', phys: { type: 'ecran', hMin: 3.0 }, barriereBAU: 'BLE (BN4 + écran de retenue de chargement)' };
    res.solutions.push(solution('OA-BLE', 'Ensemble BLE (BN4 + écran) de 3,00 m – H3', 'préconisée', [
      "Barrière métallique BN4 surmontée d'un écran de retenue de chargement, 3,00 m de hauteur.",
      'Niveau de retenue H3 exigé sur les itinéraires à fort trafic poids lourds.',
    ], { kind: 'oa', variante: 'BLE' }));
  } else {
    res.resume = 'Dispositif de niveau H2 minimum en rive d’ouvrage au-dessus de la plate-forme ferroviaire.';
    res.exigence = { ...res.exigence, niveauMin: 'H2', barriereBAU: 'Barrière H2 minimum (BN4, BN1-2, TETRA S13…)' };
    res.solutions.push(solution('OA-H2', 'Barrière de niveau H2 minimum en rive d’ouvrage', 'préconisée', [
      'Niveau de retenue H2 minimum (BN4, BN1-2, TETRA S13 ou similaire).',
      "Choix du niveau selon le fascicule « Choix d'un dispositif de retenue en bord libre d'un pont en fonction du site » (Sétra/CTOA, 2002).",
      'Sur itinéraire à fort trafic PL : passer au niveau H3 avec un ensemble BLE de 3,00 m.',
    ], { kind: 'oa', variante: 'H2' }));
  }
  res.verifs.push(
    'Sur ouvrage courant, la rive n’autorise pas l’implantation d’une LBE.',
    'Prolonger le dispositif hors ouvrage sur au moins 50 m depuis l’entrée en terre, mesurés perpendiculairement à l’axe ferroviaire (§5.2) : créer une ligne « Abords d’OA ».',
    'En cas de risque particulièrement important : détecteur de chute de véhicules (DCV) prolongé le long de la plate-forme ferroviaire.',
  );
  const L = longueurAbords(p.angle);
  if (L) res.calculs.push({ label: 'Longueur de protection aux abords, le long de la route', valeur: fmtM(L, 1), detail: `50 m / sin ${fmt(p.angle, 0)}°, de chaque côté, au-delà de l’entrée en terre, hors dispositif d’extrémité.` });
  finaliser(res, p);
  return res;
}

function evalOAJumele(p) {
  const res = base(p);
  Object.assign(res, { code: 'OAJ', ...pick(CAS.OAJ) });
  if (p.L1 === null) {
    res.statut = 'incomplet';
    res.resume = 'Renseigner L1 : écart entre la limite roulable et la plate-forme ferroviaire sur les ouvrages.';
    finaliser(res, p);
    return res;
  }
  const sc = base(p);
  appliquerCasSC(sc, casSC(p.L1), p);
  res.casSC = sc.code;
  res.plage = `${sc.plage} (${sc.titre})`;
  res.notes.push('Continuité de la protection entre les deux plates-formes sur ouvrage, avec un niveau de retenue équivalent à celui de la section courante (§5.1).');

  let niveauMin = sc.exigence.niveauMin;
  let phys = sc.exigence.phys?.type === 'ecran' ? { ...sc.exigence.phys } : null;
  if (sc.exigence.phys && sc.exigence.phys.type !== 'ecran') {
    if (rang(niveauMin) < rang('H2')) niveauMin = 'H2';
    res.notes.push('Merlon et fossé ne sont pas transposables sur ouvrage : niveau H2 minimum retenu en rive (interprétation de l’application, à justifier).');
  }
  if (sc.code === 'SC0') {
    res.statut = 'horsDomaine';
    res.alertes.push({ p: 'P0', t: 'L1 < 2 m : configuration non couverte par les cas types. Étude spécifique obligatoire.' });
  }
  if (sc.code === 'SC6') res.statut = 'casParCas';

  const { k } = coefChute(p.vitesse, p.angleImpact);
  const d = p.ecartOA ?? p.L1;
  if (p.deniveleOA !== null) {
    const a = atteinteChargement(d, p.deniveleOA, k);
    res.calculs.push(
      { label: 'Chute du chargement à l’aplomb de la plate-forme ferroviaire', valeur: fmtM(a.yd), detail: `y = ${fmt(k, 3)} × ${fmt(d)}² pour un écart de ${fmtM(d)} ; dénivelé ${fmtM(p.deniveleOA)}.` },
      { label: 'Portée horizontale de la chute', valeur: fmtM(a.portee), detail: 'Distance parcourue avant de descendre au niveau de la plate-forme ferroviaire.' },
    );
    res.chute = { d, h: p.deniveleOA, k, ...a };
    if (a.atteint) {
      res.alertes.push({ p: 'P1', t: `Le chargement atteint la plate-forme ferroviaire (portée ${fmtM(a.portee)} > écart ${fmtM(d)}) : écran de retenue de chargement nécessaire.` });
      phys = { type: 'ecran', hMin: Math.max(phys?.hMin ?? 0, 3.0) };
      if (res.statut === 'casParCas') res.statut = 'protection';
    }
  } else {
    res.alertes.push({ p: 'P2', t: 'Renseigner le dénivelé entre tabliers pour appliquer la courbe de chute du chargement (§3.1).' });
  }
  if (p.traficPL === 'fort') {
    if (rang(niveauMin) < rang('H3')) niveauMin = 'H3';
    phys = { type: 'ecran', hMin: Math.max(phys?.hMin ?? 0, 3.0) };
  }

  res.exigence = { ...res.exigence, niveauMin, phys, barriereBAU: phys ? 'Barrière d’ouvrage + écran (BLE)' : niveauMin ? `Barrière d’ouvrage ${niveauMin}` : '—' };
  if (!niveauMin && !phys) {
    res.resume = 'Écart suffisant : pas de dispositif spécifique a priori, analyse au cas par cas.';
    res.solutions.push(solution('OAJ-0', 'Analyse au cas par cas', 'indiquée', ['Vérifier l’absence de risque par la courbe de chute et la géométrie des tabliers.'], null));
  } else if (phys) {
    res.resume = `Rive d’ouvrage de niveau ${niveauMin} minimum avec écran de retenue de chargement de ${fmtM(phys.hMin)}.`;
    res.solutions.push(solution('OAJ-BLE', `Ensemble BLE (BN4 + écran) de ${fmt(phys.hMin)} m ou équivalent – ${niveauMin}`, 'préconisée', [
      `Dispositif d’ouvrage de niveau ${niveauMin} minimum surmonté d’un écran de retenue de chargement de ${fmtM(phys.hMin)}.`,
      'L’ensemble BLE (barrière BN4 + écran) est la solution d’ouvrage du guide ; niveau H3 attendu sur les itinéraires à fort trafic PL.',
      'Assurer la continuité avec les dispositifs de section courante de part et d’autre de l’ouvrage.',
    ], { kind: 'oa', variante: 'BLE' }));
  } else {
    res.resume = `Rive d’ouvrage de niveau ${niveauMin} minimum, en continuité avec la section courante.`;
    res.solutions.push(solution('OAJ-H', `Barrière d’ouvrage de niveau ${niveauMin} minimum`, 'préconisée', [
      `Barrière d’ouvrage de niveau ${niveauMin} minimum (BN4, BN1-2, TETRA S13 ou similaire pour H2 ; BN4-16, TETRA S16, BHAB pour H3).`,
      'Assurer la continuité avec les dispositifs de section courante de part et d’autre de l’ouvrage.',
    ], { kind: 'oa', variante: 'H2' }));
  }
  res.verifs.push('Les solutions de section courante (mur, LBE, merlon, fossé) ne sont pas transposables en rive d’ouvrage courant.');
  finaliser(res, p);
  return res;
}

function evalAbords(p) {
  const res = base(p);
  Object.assign(res, { code: 'AB', ...pick(CAS.AB) });
  const L = longueurAbords(p.angle ?? 90);
  const niveau = rang(p.niveauOA) > rang('H2') ? p.niveauOA : 'H2';
  res.exigence = { ...res.exigence, niveauMin: niveau, longueurMin: L, barriereBAU: `Dispositif de l’ouvrage prolongé (${niveau} minimum)` };
  res.resume = `Prolonger le dispositif de l’ouvrage sur ${fmtM(L, 1)} le long de la route, de chaque côté, au-delà de l’entrée en terre.`;
  res.solutions.push(solution('AB-1', 'Prolongement du dispositif hors ouvrage', 'préconisée', [
    `Dispositif de niveau ${niveau} minimum prolongé jusqu’à 50 m depuis l’entrée en terre, mesurés perpendiculairement à l’axe de la plate-forme ferroviaire.`,
    `Avec un angle de ${fmt(p.angle ?? 90, 0)}° entre les axes, cela représente ${fmtM(L, 1)} le long de la route, puis le dispositif d’extrémité.`,
    rang(niveau) > rang('H2')
      ? `Dispositif de l’ouvrage de niveau ${niveau}, supérieur à H2 : même niveau sur toute la longueur de la brèche (ouvrage + zones B).`
      : 'Si le dispositif sur ouvrage dépasse le niveau H2, le même niveau est à mettre en œuvre sur toute la brèche (ouvrage + zones B).',
    'Complément possible : merlons de terre parallèles à la plate-forme ferroviaire.',
  ], { kind: 'abords', angle: p.angle ?? 90, longueur: L }));
  res.calculs.push({ label: 'Longueur minimale le long de la route (chaque côté)', valeur: fmtM(L, 1), detail: `50 m / sin ${fmt(p.angle ?? 90, 0)}°.` });
  if (p.angle === null) res.alertes.push({ p: 'P2', t: 'Angle entre les axes non renseigné : calcul fait à 90°.' });
  if (p.angle !== null && Math.min(p.angle, 180 - p.angle) < 20) res.alertes.push({ p: 'P2', t: 'Franchissement très biais : longueur importante, vérifier la continuité avec la section courante jumelée.' });
  res.verifs.push(
    'Au-delà de 50 m, analyse au cas par cas pour vérifier que la protection n’est pas à prolonger.',
    'En cas de risque particulièrement important : détecteur de chute de véhicules (DCV) sur l’ouvrage, prolongé le long de la plate-forme ferroviaire.',
  );
  finaliser(res, p);
  return res;
}

function evalCarrefour(p) {
  const res = base(p);
  const fort = p.traficPL === 'fort';
  Object.assign(res, { code: fort ? 'CA1' : 'CA2', ...pick(fort ? CAS.CA1 : CAS.CA2) });
  res.exigence = { ...res.exigence, amenagement: fort ? ['deplace'] : ['decale', 'musoir', 'musoirAtt', 'deplace'] };
  if (fort) {
    res.resume = 'Reporter le débouché de l’accès au-delà de la zone sensible, sans interrompre les dispositifs de retenue aux abords du pont.';
    res.solutions.push(solution('CA1', 'Déplacement du débouché au-delà de la zone sensible', 'préconisée', [
      'Jumeler la voie d’accès à la voie franchissante sur l’ouvrage et la raccorder au-delà des dispositifs de retenue.',
      'Les dispositifs de retenue ne sont pas interrompus aux abords du pont et l’accès gagne en visibilité.',
      'Des écrans anti-éblouissement peuvent être nécessaires.',
    ], { kind: 'carrefour', variante: 'deplace' }));
  } else {
    res.resume = 'Aménager le débouché entre les deux ouvrages : alignement des dispositifs décalé de 5 à 10°, ou musoir intégré.';
    res.solutions.push(solution('CA2-S1', 'Solution 1 – Décalage de l’alignement des dispositifs de retenue', 'préconisée', [
      'Augmenter l’angle des dispositifs de retenue par rapport à la voie, de 5 à 10° au maximum, pour réduire le danger des arrondis obligatoires.',
      'Peut imposer un léger élargissement du tablier : à prévoir dès la conception.',
    ], { kind: 'carrefour', variante: 'decale' }));
    res.solutions.push(solution('CA2-S2', 'Solution 2 – Musoir intégré au dispositif de retenue', 'alternative', [
      'Intégrer un musoir dans le dispositif de retenue.',
      'Équiper les musoirs d’atténuateurs de choc si le trafic de véhicules légers le justifie.',
    ], { kind: 'carrefour', variante: 'musoir' }));
  }
  res.verifs.push(
    'Longueurs minimales d’ancrage des dispositifs de retenue respectées malgré la proximité du débouché.',
    'Voiries latérales d’accès protégées vis-à-vis de la plate-forme ferroviaire comme en section courante (§5.3).',
  );
  finaliser(res, p);
  return res;
}

function evalEchangeur(p) {
  const res = base(p);
  Object.assign(res, { code: 'EC', ...pick(CAS.EC), statut: 'analyse' });
  let niveauMin = 'H2';
  let hMin = 3.0;
  const cas = casSC(p.L1);
  if (cas && CAS[cas]) {
    const tmp = base(p);
    appliquerCasSC(tmp, cas, p);
    if (rang(tmp.exigence.niveauMin) > rang(niveauMin)) niveauMin = tmp.exigence.niveauMin;
    if (tmp.exigence.phys?.type === 'ecran') hMin = Math.max(hMin, tmp.exigence.phys.hMin);
    res.notes.push(`Avec L1 = ${fmtM(p.L1)}, la section courante relèverait du ${CAS[cas].titre} (${CAS[cas].plage}).`);
  }
  res.exigence = { ...res.exigence, niveauMin, phys: { type: 'ecran', hMin }, barriereBAU: 'LBE, BHE ou BLE' };
  res.resume = 'Analyse particulière : dispositifs de type BLE, BHE ou LBE préconisés.';
  res.solutions.push(solution('EC-1', 'Dispositifs BLE, BHE ou LBE', 'préconisée', [
    'Les échangeurs surélevés et contigus aux plates-formes jumelées font l’objet d’une analyse particulière.',
    'Dispositifs préconisés : LBE (accotement), BHE (accotement), BLE (ouvrages).',
    'Consulter le groupe Géfra en présence d’échangeurs complexes ou d’une géométrie routière contraignante.',
  ], null));
  res.alertes.push({ p: 'P2', t: 'Échangeur contigu : analyse particulière à produire (géométrie, trajectoires, trafic).' });
  finaliser(res, p);
  return res;
}

function finaliser(res, p) {
  if (p.L1 !== null && ['sc', 'lat', 'oaJum', 'echangeur'].includes(p.zone)) {
    const proche = SEUILS_L1.find((s) => Math.abs(p.L1 - s) <= 0.2 && Math.abs(p.L1 - s) > 1e-9);
    if (proche) res.alertes.push({ p: 'P2', t: `L1 = ${fmtM(p.L1)}, à moins de 0,20 m du seuil de ${proche} m : vérifier la mesure (limite roulable, entrée en terre).` });
  }
  if (p.ligne === 'classique' && ['sc', 'lat'].includes(p.zone) && p.L1 !== null && p.L1 < 17) {
    res.notes.push('Ligne classique à signalisation latérale et jumelage étroit : évaluer la gêne des phares routiers pour les conducteurs de train, voire prévoir un dispositif anti-éblouissement (§3.2).');
  }
  if (['sc', 'lat', 'oaJum'].includes(p.zone)) res.verifs.push(...VERIF_GENERALES);
  return res;
}

export function evaluer(p0) {
  const p = normaliser(p0);
  switch (p.zone) {
    case 'oa': return evalOA(p);
    case 'oaJum': return evalOAJumele(p);
    case 'abords': return evalAbords(p);
    case 'carrefour': return evalCarrefour(p);
    case 'echangeur': return evalEchangeur(p);
    default: return evalSectionCourante(p);
  }
}

/* ------------------------------------------------------------------ contrôle de conformité */

const R = {
  vehicule: 'Franchissement du dispositif par un véhicule en perdition, notamment un poids lourd, et intrusion sur la plate-forme ferroviaire : collision avec une circulation, déraillement, sur-accident.',
  chargement: 'Projection ou chute du chargement d’un poids lourd sur les voies ou la caténaire : obstacle, collision, déraillement.',
  merlonDoux: 'Talus côté route trop doux : le merlon devient franchissable par un véhicule.',
  merlonRaide: 'Talus côté route trop raide : obstacle rigide agressif pour les occupants des véhicules.',
  abords: 'Pénétration possible sur la plate-forme ferroviaire en extrémité de protection, aux abords de l’ouvrage.',
  carrefour: 'Interruption des dispositifs de retenue au débouché (ancrages réduits, abords non protégés, musoirs agressifs) : sortie de chaussée vers la plate-forme ferroviaire.',
  acces: 'Interruption du dispositif de protection et manœuvres de véhicules à proximité immédiate des voies.',
  hors: 'Configuration non couverte par les cas types : aucune marge de récupération et protection non justifiée.',
  lbeOA: 'Dispositif non adapté à la rive d’un ouvrage courant : ancrage et tenue au choc non garantis.',
  analyse: 'Absence de justification du dispositif dans une zone où le guide exige une analyse particulière.',
};

function nomsSolutions(res) {
  const pref = res.solutions.filter((s) => s.role !== 'alternative');
  const liste = (pref.length ? pref : res.solutions).map((s) => s.nom.replace(/^Solution \d – /, ''));
  return liste.join(' ou ');
}

export function controler(p0, res0) {
  const p = normaliser(p0);
  const res = res0 || evaluer(p);
  const ecarts = [];
  const add = (priorite, ecart, risque, reco) => ecarts.push({ priorite, ecart, risque, reco });
  const fin = (statutSiVide = 'conforme') => {
    const ordre = ['P0', 'P1', 'P2'];
    const priorite = ecarts.length ? ordre.find((o) => ecarts.some((e) => e.priorite === o)) : null;
    return { statut: ecarts.length ? 'ecart' : statutSiVide, priorite, ecarts };
  };

  if (res.statut === 'incomplet') return { statut: 'incomplet', priorite: null, ecarts };

  if (p.zone === 'carrefour') {
    if (!p.amenagement) return { statut: 'nonRenseigne', priorite: null, ecarts };
    const fort = p.traficPL === 'fort';
    if (p.amenagement === 'aucun') {
      add(fort ? 'P0' : 'P1', 'Débouché de l’accès entre les deux ouvrages sans disposition particulière.', R.carrefour, fort
        ? 'Reporter le débouché au-delà des dispositifs de retenue en jumelant la voie d’accès à la voie franchissante sur l’ouvrage (Géfra §5.4, 1er cas).'
        : 'Décaler l’alignement des dispositifs de retenue de 5 à 10° ou intégrer un musoir, avec atténuateur si le trafic VL le justifie (Géfra §5.4, 2e cas).');
    } else if (fort && p.amenagement !== 'deplace') {
      add('P1', 'Trafic important, notamment PL : l’aménagement retenu correspond au 2e cas (trafic moyen).', R.carrefour, 'Reporter le débouché au-delà de la zone sensible (Géfra §5.4, 1er cas).');
    }
    if (p.amenagement === 'decale' && p.decalageAngle !== null) {
      if (p.decalageAngle > 10) add('P1', `Décalage de l’alignement de ${fmt(p.decalageAngle, 0)}°, au-delà du maximum de 10°.`, R.carrefour, 'Limiter l’angle des dispositifs de retenue par rapport à la voie à 10° (Géfra §5.4).');
      else if (p.decalageAngle < 5) add('P2', `Décalage de l’alignement de ${fmt(p.decalageAngle, 0)}°, inférieur à 5°.`, R.carrefour, 'Justifier l’efficacité du décalage ou le porter entre 5 et 10° (Géfra §5.4).');
    }
    if (p.amenagement === 'musoir' && !fort) add('P2', 'Musoir sans atténuateur de choc.', 'Choc frontal sur musoir pour les véhicules légers.', 'Vérifier le trafic VL et prévoir un atténuateur de choc si nécessaire (Géfra §5.4).');
    return fin();
  }

  if (!p.projet) return { statut: 'nonRenseigne', priorite: null, ecarts };
  const pj = PROJETS[p.projet];
  const niveauP = p.niveauProjete || pj.niveau;
  const physP = p.physProjete === 'aucun' ? null : p.physProjete || pj.phys;
  const hP = p.hauteur ?? pj.h;
  const ex = res.exigence;
  const reco = `Mettre en œuvre : ${nomsSolutions(res)} (Géfra ${res.ref}).`;

  if (res.statut === 'horsDomaine') {
    add('P0', `L1 = ${fmtM(p.L1)} < 2 m : configuration hors des cas types du guide.`, R.hors, 'Élargir l’interface pour revenir au 1er cas, ou produire une étude spécifique soumise à l’avis du groupe Géfra.');
  }

  if (p.zone === 'echangeur') {
    if (p.projet === 'aucun') add('P0', 'Aucun dispositif de protection anti-pénétration prévu à l’échangeur contigu.', R.vehicule, 'Mettre en œuvre un dispositif de type LBE, BHE ou BLE après analyse particulière (Géfra §5.5).');
    else if (!['lbe', 'bhe', 'ble'].includes(p.projet)) add('P2', `Dispositif « ${pj.label} » différent des types préconisés (BLE, BHE, LBE).`, R.analyse, 'Justifier le choix par l’analyse particulière de l’échangeur ou retenir un dispositif BLE, BHE ou LBE (Géfra §5.5).');
  }

  if (['oa', 'oaJum'].includes(p.zone) && p.projet === 'lbe') {
    add('P1', 'LBE prévue en rive d’ouvrage : la conception des rives des ouvrages courants n’en permet pas l’implantation.', R.lbeOA, 'Retenir un ensemble BLE (BN4 + écran de 3,00 m) ou une barrière d’ouvrage du niveau requis (Géfra §5.1).');
  }

  let ecartNiveau = null;
  if (ex.niveauMin && rang(niveauP) < rang(ex.niveauMin)) {
    const txt = niveauP
      ? `Niveau de retenue projeté ${niveauP}, inférieur au niveau ${ex.niveauMin} minimum exigé.`
      : `Aucun dispositif de retenue alors que le niveau ${ex.niveauMin} minimum est exigé.`;
    add('P0', txt, R.vehicule, `Porter le niveau de retenue à ${ex.niveauMin} minimum.`);
    ecartNiveau = ecarts[ecarts.length - 1];
  }

  if (ex.phys) {
    const t = ex.phys.type;
    const critique = ['SC0', 'SC1', 'SC2', 'SC3', 'SC4', 'OA', 'EC'].includes(res.code) || p.zone === 'oaJum';
    if (t === 'ecran') {
      if (physP !== 'ecran') {
        add(critique ? 'P0' : 'P1', `Absence de l’écran de retenue de chargement (ou du mur) de ${fmtM(ex.phys.hMin)} exigé par le guide.`, R.chargement, reco);
      } else if (hP !== null && hP < ex.phys.hMin - 1e-9) {
        add('P1', `Écran ou mur de ${fmtM(hP)}, inférieur aux ${fmtM(ex.phys.hMin)} exigés au-dessus de la chaussée.`, R.chargement, `Porter la hauteur de l’écran de retenue de chargement à ${fmtM(ex.phys.hMin)} (Géfra ${res.ref}).`);
      }
    } else if (t === 'merlon') {
      if (physP === 'merlon') {
        if (hP !== null && hP < ex.phys.hMin - 1e-9) add('P1', `Merlon de ${fmtM(hP)}, inférieur aux ${fmtM(ex.phys.hMin)} minimum.`, R.vehicule, `Porter la hauteur du merlon à ${fmtM(ex.phys.hMin)} minimum (Géfra ${res.ref}).`);
        if (p.merlonTalusRoute !== null && Math.abs(p.merlonTalusRoute - 1.5) > 0.05) {
          const doux = p.merlonTalusRoute > 1.5;
          add('P1', `Talus du merlon côté route à ${fmtTalus(p.merlonTalusRoute)} au lieu de 3/2.`, doux ? R.merlonDoux : R.merlonRaide, 'Réaliser le talus côté route à 3/2 exactement (Géfra §4.2, 4e cas).');
        }
      } else if (physP === 'ecran' && (hP ?? 0) >= 3 - 1e-9 && rang(niveauP) >= rang('H2')) {
        add('P2', 'Écran retenu à la place du merlon.', 'Dispositif plus coûteux et plus agressif pour l’usager qu’un merlon.', 'Le merlon est à privilégier chaque fois que possible (Géfra §3.1) : justifier le choix de l’écran.');
      } else {
        add(critique ? 'P0' : 'P1', `Absence de merlon de ${fmtM(ex.phys.hMin)} minimum (ou d’écran équivalent).`, R.vehicule, reco);
      }
    } else if (t === 'fosse') {
      if (physP === 'fosse') {
        if (hP !== null && hP < ex.phys.hMin - 1e-9) add('P1', `Fossé de ${fmtM(hP)} de profondeur, inférieur aux ${fmtM(ex.phys.hMin)} prévus.`, R.vehicule, 'Réaliser un fossé de 1,50 m de profondeur, 3,50 m en pied, talus à 3/2, à 10 m de la BAU/BDD (Géfra §4.2, 5e cas).');
      } else if (!(physP === 'merlon' && (hP ?? 0) >= 3 - 1e-9) && !(physP === 'ecran' && (hP ?? 0) >= 3 - 1e-9)) {
        add('P1', 'Absence de fossé anti-pénétration (ou de merlon) entre les plates-formes.', R.vehicule, reco);
      }
    }
  }

  if (p.acces && res.code === 'SC1') add('P0', 'Accès de service routier prévu en jumelage très étroit (2 m ≤ L1 < 6 m).', R.acces, 'Supprimer l’accès ou le reporter dans une zone où L1 ≥ 6 m (Géfra §4.2, 1er cas).');

  if (p.zone === 'abords') {
    if (p.longueurProjetee === null) add('P2', 'Longueur de prolongement hors ouvrage non renseignée.', R.abords, `Vérifier un prolongement de ${fmtM(ex.longueurMin, 1)} au-delà de l’entrée en terre, de chaque côté (Géfra §5.2).`);
    else if (p.longueurProjetee < ex.longueurMin - 0.05) add('P1', `Prolongement hors ouvrage de ${fmtM(p.longueurProjetee, 1)}, inférieur aux ${fmtM(ex.longueurMin, 1)} requis.`, R.abords, `Prolonger le dispositif sur ${fmtM(ex.longueurMin, 1)} le long de la route au-delà de l’entrée en terre, puis le dispositif d’extrémité (Géfra §5.2).`);
  }

  if (res.code === 'SC6' && p.projet === 'aucun') add('P2', 'Absence de dispositif au-delà de 50 m.', 'Risque résiduel non évalué (géométrie, trafic, climat).', 'Justifier l’absence de dispositif par une analyse au cas par cas ; à défaut, barrière N2 en bord de BAU/BDD (Géfra §4.2).');

  if (ecartNiveau && !ecarts.some((e) => e.reco === reco)) ecartNiveau.reco += ` ${reco}`;
  return fin();
}

/* ------------------------------------------------------------------ libellés */

export function libelleSituation(p0, res) {
  const p = normaliser(p0);
  const morceaux = [ZONES[p.zone].label];
  if (['sc', 'lat', 'oaJum', 'echangeur'].includes(p.zone)) {
    if (p.zone !== 'oaJum') morceaux.push(POSITIONS[p.position].toLowerCase());
    if (p.L1 !== null) morceaux.push(`L1 = ${fmtM(p.L1)}`);
    if (p.position !== 'meme' && p.denivele !== null) morceaux.push(`dénivelé ${fmtM(p.denivele)}`);
    if (p.position === 'ferHaut' && p.talus) morceaux.push(`talus ${fmtTalus(p.talus)}`);
  }
  if (['oa', 'oaJum', 'carrefour'].includes(p.zone)) morceaux.push(p.traficPL === 'fort' ? 'fort trafic PL' : 'trafic PL moyen ou faible');
  if (p.zone === 'abords' && p.angle !== null) morceaux.push(`angle des axes ${fmt(p.angle, 0)}°`);
  const cas = res.plage ? `${res.titre} (${res.plage})` : res.titre;
  return `${morceaux.join(', ')} : ${cas}.`;
}

export function libelleProjete(p0) {
  const p = normaliser(p0);
  if (p.zone === 'carrefour') return p.amenagement ? AMENAGEMENTS_CARREFOUR[p.amenagement] : 'Non renseigné';
  if (!p.projet) return 'Non renseigné';
  const pj = PROJETS[p.projet];
  const niveau = p.niveauProjete || pj.niveau;
  const phys = p.physProjete === 'aucun' ? null : p.physProjete || pj.phys;
  const h = p.hauteur ?? pj.h;
  const det = [];
  if (niveau) det.push(`niveau ${niveau}`);
  if (phys && h !== null) det.push(`${phys === 'fosse' ? 'profondeur' : 'hauteur'} ${fmtM(h)}`);
  if (p.zone === 'abords' && p.longueurProjetee !== null) det.push(`prolongement ${fmtM(p.longueurProjetee, 1)}`);
  return det.length ? `${pj.label} (${det.join(', ')})` : pj.label;
}

export function libelleExigence(res) {
  const e = res.exigence;
  const parts = [];
  if (e.niveauMin) parts.push(`${e.niveauMin} min.`);
  if (e.phys) parts.push(e.phys.type === 'ecran' ? `écran ${fmt(e.phys.hMin)} m` : e.phys.type === 'merlon' ? `merlon ${fmt(e.phys.hMin)} m` : `fossé ${fmt(e.phys.hMin)} m`);
  if (e.longueurMin) parts.push(`${fmt(e.longueurMin, 1)} m le long de la route`);
  if (e.amenagement) parts.push(e.amenagement.includes('decale') ? 'décalage 5–10° ou musoir' : 'débouché reporté');
  if (!parts.length) return res.statut === 'incomplet' ? 'À compléter' : res.statut === 'casParCas' ? 'Analyse au cas par cas' : 'Aucun dispositif a priori';
  return parts.join(' + ');
}
