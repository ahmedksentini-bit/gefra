/*
 * Projet d'exemple chargé au premier lancement. Données fictives destinées à montrer
 * chaque type de zone et chaque niveau de constat.
 */

const L = (pkDebut, pkFin, cote, zone, champs) => ({ pkDebut, pkFin, cote, zone, ...champs });

export const LIGNES_EXEMPLE = [
  L('0+000', '0+180', 'D', 'sc', { L1: '4,2', position: 'meme', projet: 'murEcran', hauteur: '3,5', remarques: 'Mur BA 1,50 m + écran' }),
  L('0+180', '0+420', 'D', 'sc', { L1: '7,1', position: 'meme', projet: 'n2', remarques: 'GS4 seule au plan de signalisation' }),
  L('0+420', '0+760', 'D', 'sc', { L1: '12,5', position: 'ferBas', denivele: '2,5', projet: 'bhe', hauteur: '2,5' }),
  L('0+760', '1+050', 'D', 'sc', { L1: '21', position: 'meme', projet: 'merlon', hauteur: '3', merlonTalusRoute: '2/1' }),
  L('1+050', '1+300', 'D', 'sc', { L1: '36', position: 'meme', projet: 'fosseGS4', hauteur: '1,5' }),
  L('1+300', '1+340', 'D', 'oa', { angle: '65', traficPL: 'fort', projet: 'h2', remarques: 'PS 1 : BN4 prévue' }),
  L('1+340', '1+420', 'D', 'abords', { angle: '65', niveauOA: 'H3', projet: 'h3', longueurProjetee: '40' }),
  L('1+420', '1+760', 'D', 'sc', { position: 'ferHaut', denivele: '4,5', talus: '2/1', projet: 'aucun' }),
  L('1+760', '1+800', 'D', 'carrefour', { traficPL: 'moyen', amenagement: 'decale', decalageAngle: '12' }),
  L('1+800', '2+150', 'D', 'sc', { L1: '5,9', position: 'meme', projet: 'lbe', hauteur: '3,5', acces: true, remarques: 'Accès de service SNCF prévu' }),
  L('2+150', '2+400', 'G', 'lat', { L1: '9', position: 'meme', projet: 'ecranMassif', hauteur: '3' }),
  L('2+400', '2+600', 'D', 'echangeur', { L1: '10', position: 'meme', projet: 'h2' }),
];

export const META_EXEMPLE = {
  projet: 'Exemple : doublement d’une route nationale le long d’une ligne classique',
  maitreOuvrage: 'Maître d’ouvrage (exemple)',
  dossier: 'Avant-projet détaillé',
  auditeur: '',
  indice: 'A',
  prefixe: 'GF',
  objet: 'Données fictives fournies pour découvrir l’application. Créez un nouveau projet pour vos études.',
};
