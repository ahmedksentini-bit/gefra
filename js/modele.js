/*
 * GÉFRA — modèle de projet : lignes du linéaire, constats, synthèse.
 * Partagé par l'interface, l'aperçu du rapport et les exports.
 */
import * as E from './engine.js';

export const LIGNE_VIDE = {
  pkDebut: '', pkFin: '', cote: 'D', zone: 'sc', L1: '', position: 'meme', denivele: '', talus: '',
  traficPL: 'moyen', acces: false, angle: '', niveauOA: 'H2', ecartOA: '', deniveleOA: '',
  projet: '', hauteur: '', niveauProjete: '', physProjete: '', merlonTalusRoute: '', longueurProjetee: '',
  amenagement: '', decalageAngle: '', remarques: '',
};

export function nouvelId(prefixe = 'l') {
  return `${prefixe}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function nouvelleLigne(init = {}) {
  return { ...LIGNE_VIDE, ...init, id: init.id || nouvelId('l') };
}

export function aujourdhui() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function nouveauProjet(nom = 'Nouveau projet') {
  return {
    id: nouvelId('p'),
    nom,
    format: 'gefra-projet',
    version: 1,
    ligne: 'classique',
    meta: { projet: '', maitreOuvrage: '', dossier: '', auditeur: '', date: aujourdhui(), indice: 'A', prefixe: 'GF', objet: '' },
    assistant: { ...LIGNE_VIDE, L1: '7,2', pkDebut: '', pkFin: '' },
    lignes: [],
    constats: {},
    constatsLibres: [],
    calculs: {
      chute: { vitesse: '70', angle: '20', d: '4', h: '3', h0: '0' },
      abords: { angle: '60' },
      merlon: { L1: '20', h: '3', crete: '4', mFer: '3/2', banqFer: '1' },
    },
    rapport: { lineaire: true, constats: true, fiche: true, verifs: true, catalogue: false },
    exemple: false,
    maj: Date.now(),
  };
}

/** Complète un projet importé ou ancien avec les champs manquants. */
export function completerProjet(p) {
  const base = nouveauProjet(p.nom || 'Projet importé');
  const out = {
    ...base,
    ...p,
    meta: { ...base.meta, ...(p.meta || {}) },
    assistant: { ...base.assistant, ...(p.assistant || {}) },
    calculs: {
      chute: { ...base.calculs.chute, ...(p.calculs?.chute || {}) },
      abords: { ...base.calculs.abords, ...(p.calculs?.abords || {}) },
      merlon: { ...base.calculs.merlon, ...(p.calculs?.merlon || {}) },
    },
    rapport: { ...base.rapport, ...(p.rapport || {}) },
    constats: p.constats && typeof p.constats === 'object' ? p.constats : {},
    constatsLibres: Array.isArray(p.constatsLibres) ? p.constatsLibres : [],
  };
  out.lignes = (Array.isArray(p.lignes) ? p.lignes : []).map((l) => nouvelleLigne(l));
  return out;
}

export function evaluerLigne(ligne, typeLigne) {
  const p = { ...ligne, ligne: typeLigne };
  const res = E.evaluer(p);
  const ctl = E.controler(p, res);
  return { p, res, ctl };
}

export function statutLigne({ res, ctl }) {
  if (res.statut === 'incomplet' || ctl.statut === 'incomplet') return { cls: 'neutre', label: 'À compléter' };
  if (ctl.statut === 'nonRenseigne') return { cls: 'neutre', label: 'Projet non renseigné' };
  if (ctl.statut === 'ecart') return { cls: ctl.priorite.toLowerCase(), label: `Écart ${ctl.priorite}` };
  return { cls: 'ok', label: 'Conforme' };
}

export function plaque(res) {
  const m = {
    SC0: ['Hors cas', '< 2 m'], SC1: ['Cas 1', '2 – 6 m'], SC2: ['Cas 2', '6 – 8 m'], SC3: ['Cas 3', '8 – 17 m'],
    SC4: ['Cas 4', '17 – 30 m'], SC5: ['Cas 5', '30 – 50 m'], SC6: ['> 50 m', 'cas par cas'],
    FH1: ['§ 4.3', 'Δh 3 – 6 m'], FH2: ['§ 4.3', 'Δh > 6 m'], OA: ['Ouvrage', '§ 5.1'], OAJ: ['OA jum.', '§ 5.1'],
    AB: ['Abords', '§ 5.2'], CA1: ['Carref.', 'cas 1'], CA2: ['Carref.', 'cas 2'], EC: ['Échang.', '§ 5.5'],
  };
  const [grand, petit] = m[res.code] || ['—', ''];
  return { grand, petit };
}

export function libelleStatutRes(res) {
  return {
    protection: ['Protection requise', 'info'],
    aucune: ['Pas de protection a priori', 'ok'],
    casParCas: ['Analyse au cas par cas', 'p2'],
    horsDomaine: ['Hors des cas types', 'p0'],
    incomplet: ['Données à compléter', 'neutre'],
    analyse: ['Analyse particulière', 'p2'],
  }[res.statut] || ['—', 'neutre'];
}

export function localisation(l, i) {
  const d = E.parsePK(l.pkDebut);
  const f = E.parsePK(l.pkFin);
  const cote = l.cote === 'D' ? ', côté droit' : l.cote === 'G' ? ', côté gauche' : '';
  if (d !== null && f !== null) return `PK ${E.fmtPK(d)} à ${E.fmtPK(f)}${cote}`;
  if (d !== null) return `PK ${E.fmtPK(d)}${cote}`;
  return `Tronçon ${i + 1}${cote}`;
}

function uniques(liste) {
  return [...new Set(liste.filter(Boolean))];
}

/** Constat proposé automatiquement pour une ligne en écart. */
export function constatAuto(l, i, ev) {
  const { res, ctl } = ev;
  if (ctl.statut !== 'ecart') return null;
  const situation = E.libelleSituation(ev.p, res);
  const projete = E.libelleProjete(ev.p);
  const lignes = ctl.ecarts.map((e) => `– ${e.ecart}${ctl.ecarts.length > 1 ? ` (${e.priorite})` : ''}`);
  const constat = `${situation}\nDispositif projeté : ${projete}.\n${lignes.join('\n')}`;
  const risque = uniques(ctl.ecarts.map((e) => e.risque)).join('\n');
  const recommandation = uniques(ctl.ecarts.map((e) => e.reco)).join('\n');
  const sig = [res.code, ...ctl.ecarts.map((e) => `${e.priorite}:${e.ecart}`)].join('|');
  return {
    id: l.id,
    source: 'auto',
    index: i,
    pk: E.parsePK(l.pkDebut),
    localisation: localisation(l, i),
    priorite: ctl.priorite,
    constat,
    risque,
    recommandation,
    ref: `Géfra ${res.ref}`,
    sig,
  };
}

/** Constats finaux : automatiques (avec reprises de l'auditeur) + constats libres, numérotés. */
export function constats(projet) {
  const auto = [];
  projet.lignes.forEach((l, i) => {
    const c = constatAuto(l, i, evaluerLigne(l, projet.ligne));
    if (!c) return;
    const o = projet.constats[l.id];
    if (o && o.sig === c.sig) {
      const modifie = ['priorite', 'constat', 'risque', 'recommandation'].some((k) => o[k] !== undefined && o[k] !== c[k]);
      auto.push({ ...c, ...pickDef(o, ['priorite', 'constat', 'risque', 'recommandation']), exclu: !!o.exclu, modifie, auto: c });
    } else {
      auto.push({ ...c, exclu: false, modifie: false, auto: c });
    }
  });
  auto.sort((a, b) => (a.pk ?? Infinity) - (b.pk ?? Infinity) || a.index - b.index);
  const libres = projet.constatsLibres.map((c) => ({ ...c, source: 'libre', exclu: !!c.exclu, ref: c.ref || '' }));
  const tous = [...auto, ...libres];
  let n = 0;
  const prefixe = projet.meta.prefixe ?? 'GF';
  tous.forEach((c) => {
    c.num = c.exclu ? '—' : `${prefixe}${String(++n).padStart(2, '0')}`;
  });
  return tous;
}

function pickDef(o, cles) {
  const out = {};
  cles.forEach((k) => { if (o[k] !== undefined) out[k] = o[k]; });
  return out;
}

export function synthese(projet) {
  const s = { troncons: projet.lignes.length, longueur: 0, conforme: 0, P0: 0, P1: 0, P2: 0, nonRenseigne: 0, incomplet: 0, parCas: {} };
  projet.lignes.forEach((l) => {
    const ev = evaluerLigne(l, projet.ligne);
    const d = E.parsePK(l.pkDebut);
    const f = E.parsePK(l.pkFin);
    if (d !== null && f !== null) s.longueur += Math.abs(f - d);
    const st = statutLigne(ev);
    if (st.cls === 'ok') s.conforme++;
    else if (st.cls === 'p0') s.P0++;
    else if (st.cls === 'p1') s.P1++;
    else if (st.cls === 'p2') s.P2++;
    else if (ev.res.statut === 'incomplet' || ev.ctl.statut === 'incomplet') s.incomplet++;
    else s.nonRenseigne++;
    const cle = ev.res.code || '—';
    s.parCas[cle] = s.parCas[cle] || { n: 0, longueur: 0, titre: ev.res.titre };
    s.parCas[cle].n++;
    if (d !== null && f !== null) s.parCas[cle].longueur += Math.abs(f - d);
  });
  const cs = constats(projet).filter((c) => !c.exclu);
  s.constats = { total: cs.length, P0: cs.filter((c) => c.priorite === 'P0').length, P1: cs.filter((c) => c.priorite === 'P1').length, P2: cs.filter((c) => c.priorite === 'P2').length };
  return s;
}
