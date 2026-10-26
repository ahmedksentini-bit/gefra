/*
 * GÉFRA — abréviations employées dans l'application et le guide.
 * Les niveaux de retenue sont ceux de la NF EN 1317-2 (essais de choc de référence).
 */

export const GLOSSAIRE = [
  { sigle: 'L1', sens: 'Distance entre le bord de la BAU (ou BDD) et l’entrée en terre ferroviaire', groupe: 'Géométrie' },
  { sigle: 'Δh', sens: 'Dénivelé entre la plate-forme routière et la plate-forme ferroviaire', groupe: 'Géométrie' },
  { sigle: 'BAU', sens: 'Bande d’arrêt d’urgence', groupe: 'Géométrie' },
  { sigle: 'BDD', sens: 'Bande dérasée de droite (accotement revêtu, en l’absence de BAU)', groupe: 'Géométrie' },
  { sigle: 'TN', sens: 'Terrain naturel', groupe: 'Géométrie' },
  { sigle: 'PK', sens: 'Point kilométrique', groupe: 'Géométrie' },

  { sigle: 'N2', sens: 'Niveau de retenue normal : voiture de 1,5 t à 110 km/h sous 20°', groupe: 'Niveaux de retenue' },
  { sigle: 'H1', sens: 'Niveau de retenue haut : camion de 10 t à 70 km/h sous 15°', groupe: 'Niveaux de retenue' },
  { sigle: 'H2', sens: 'Niveau de retenue haut : autocar de 13 t à 70 km/h sous 20°', groupe: 'Niveaux de retenue' },
  { sigle: 'H3', sens: 'Niveau de retenue haut : camion de 16 t à 80 km/h sous 20°', groupe: 'Niveaux de retenue' },
  { sigle: 'H4', sens: 'Niveau de retenue très haut : camion de 30 à 38 t à 65 km/h sous 20°', groupe: 'Niveaux de retenue' },

  { sigle: 'GS2', sens: 'Glissière métallique simple, supports tous les 2 m (N2)', groupe: 'Dispositifs' },
  { sigle: 'GS4', sens: 'Glissière métallique simple, supports tous les 4 m (N2)', groupe: 'Dispositifs' },
  { sigle: 'GRC', sens: 'Glissière renforcée, supports C125 tous les 2 m (N2)', groupe: 'Dispositifs' },
  { sigle: 'GCU', sens: 'Glissière de niveau N2 citée par le guide (supports C125 et C100 ou U100 tous les 2 m)', groupe: 'Dispositifs' },
  { sigle: 'GBA', sens: 'Glissière en béton adhérent, coulée en place (H2)', groupe: 'Dispositifs' },
  { sigle: 'DBA', sens: 'Double glissière en béton adhérent, pour terre-plein central (H2)', groupe: 'Dispositifs' },
  { sigle: 'BHO', sens: 'Barrière métallique « hors ouvrage », pour accotement (H2)', groupe: 'Dispositifs' },
  { sigle: 'BHE', sens: 'Ensemble BHO surmontée d’un écran de retenue de chargement', groupe: 'Dispositifs' },
  { sigle: 'BN4-16', sens: 'Version renforcée de la BN4, pour ponts (H3)', groupe: 'Dispositifs' },
  { sigle: 'BN4', sens: 'Barrière métallique « normale » pour ponts (H2)', groupe: 'Dispositifs' },
  { sigle: 'BN1-2', sens: 'Barrière normale de pont en béton armé et métal (H2)', groupe: 'Dispositifs' },
  { sigle: 'BLE', sens: 'Ensemble BN4 surmontée d’un écran de retenue de chargement, sur ouvrage', groupe: 'Dispositifs' },
  { sigle: 'LBA', sens: 'Séparateur spécial en béton, très lourd (H3 à H4)', groupe: 'Dispositifs' },
  { sigle: 'LBE', sens: 'Ensemble LBA surmontée d’un écran de retenue de chargement, 3,50 m de haut', groupe: 'Dispositifs' },
  { sigle: 'BHAB', sens: 'Barrière à habillage, pour ponts (H3)', groupe: 'Dispositifs' },
  { sigle: 'TETRA S13', sens: 'Barrière métallique de pont, modèle commercial (H2)', groupe: 'Dispositifs' },
  { sigle: 'TETRA S16', sens: 'Barrière métallique de pont, modèle commercial (H3)', groupe: 'Dispositifs' },
  { sigle: 'DCV', sens: 'Détecteur de chute de véhicules', groupe: 'Dispositifs' },

  { sigle: 'BA', sens: 'Béton armé', groupe: 'Divers' },
  { sigle: 'FA', sens: 'Force horizontale de choc (500 kN pour le mur du 1er cas)', groupe: 'Divers' },
  { sigle: 'OA', sens: 'Ouvrage d’art (pont)', groupe: 'Divers' },
  { sigle: 'PL', sens: 'Poids lourds', groupe: 'Divers' },
  { sigle: 'VL', sens: 'Véhicules légers', groupe: 'Divers' },
  { sigle: 'LGV', sens: 'Ligne à grande vitesse', groupe: 'Divers' },
  { sigle: 'CEM', sens: 'Compatibilité électromagnétique', groupe: 'Divers' },
];

const PAR_SIGLE = new Map(GLOSSAIRE.map((g) => [g.sigle, g]));
const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MOTIF = new RegExp(
  `(?<![\\p{L}\\p{N}])(${[...PAR_SIGLE.keys()].sort((a, b) => b.length - a.length).map(echapper).join('|')})(?![\\p{L}\\p{N}])`,
  'gu',
);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Texte échappé, abréviations balisées avec leur signification (infobulle). */
export function abbr(texte) {
  return esc(texte).replace(MOTIF, (m) => `<abbr title="${esc(PAR_SIGLE.get(m).sens)}">${m}</abbr>`);
}

/** Abréviations présentes dans un texte, dans l'ordre du glossaire. */
export function siglesDe(texte) {
  const vus = new Set(String(texte ?? '').match(MOTIF) || []);
  const composants = { LBE: 'LBA', BHE: 'BHO', BLE: 'BN4' };
  Object.entries(composants).forEach(([ensemble, base]) => { if (vus.has(ensemble)) vus.add(base); });
  return GLOSSAIRE.filter((g) => vus.has(g.sigle));
}

/** Liste compacte « sigle : signification ». */
export function htmlSigles(liste) {
  if (!liste.length) return '';
  return `<dl class="sigles">${liste.map((g) => `<div><dt>${esc(g.sigle)}</dt><dd>${esc(g.sens)}</dd></div>`).join('')}</dl>`;
}
