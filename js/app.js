/*
 * GÉFRA — interface.
 */
import * as E from './engine.js';
import * as S from './schemas.js';
import * as M from './modele.js';
import * as X from './exports.js';
import { Store } from './store.js';
import { LIGNES_EXEMPLE, META_EXEMPLE } from './exemple.js';
import { htmlComprendre } from './comprendre.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl2br = (s) => esc(s).replace(/\n/g, '<br>');

let projet = null;
const ui = { vue: 'assistant', ouverts: new Set(), filtre: 'tous', rendues: new Set() };

/* ================================================================ messages et dialogues */

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.textContent = ''; }, 3500);
}

function dialogue({ titre, texte = '', corps = '', ok = 'Valider', annuler = 'Annuler', danger = false, large = false }) {
  const dlg = $('#dlg');
  dlg.classList.toggle('large', large);
  dlg.innerHTML = `<form method="dialog"><div class="dlg-body"><h2>${esc(titre)}</h2>${texte ? `<p>${esc(texte)}</p>` : ''}${corps}</div><div class="dlg-actions"><button class="btn ${danger ? 'danger' : 'primary'}" value="ok" type="submit">${esc(ok)}</button><button class="btn" value="annuler" type="submit" formnovalidate>${esc(annuler)}</button></div></form>`;
  dlg.returnValue = '';
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok' ? dlg : null), { once: true });
    dlg.showModal();
    const f = dlg.querySelector('input, textarea');
    if (f) f.focus();
  });
}

async function confirmer(titre, texte, ok, danger = true) {
  return !!(await dialogue({ titre, texte, ok, danger }));
}

async function saisir(titre, label, valeur = '') {
  const d = await dialogue({ titre, corps: `<div class="field"><label for="dlg-in" class="flabel">${esc(label)}</label><div class="inp"><input id="dlg-in" value="${esc(valeur)}" required></div></div>` });
  return d ? d.querySelector('#dlg-in').value.trim() || null : null;
}

/* ================================================================ champs de saisie */

const POS_COURT = { meme: 'Même niveau', ferBas: 'Fer en contrebas', ferHaut: 'Fer au-dessus' };
const OPT = {
  zone: Object.entries(E.ZONES).map(([k, z]) => [k, z.label]),
  zoneCourt: Object.entries(E.ZONES).map(([k, z]) => [k, z.court]),
  position: Object.entries(POS_COURT),
  traficPL: [['moyen', 'Moyen ou faible'], ['fort', 'Important, notamment PL']],
  niveauOA: [['H2', 'H2'], ['H3', 'H3'], ['H4', 'H4']],
  niveau: [['', 'Selon le dispositif'], ...E.NIVEAUX.map((n) => [n, n])],
  projet: [['', '— Non renseigné —'], ...Object.entries(E.PROJETS).map(([k, p]) => [k, p.label])],
  phys: [['', 'Selon le dispositif'], ...Object.entries(E.PHYS)],
  amenagement: [['', '— Non renseigné —'], ...Object.entries(E.AMENAGEMENTS_CARREFOUR)],
  cote: [['D', 'Droit'], ['G', 'Gauche'], ['', '—']],
  ligne: [['classique', 'Ligne classique'], ['lgv', 'Ligne à grande vitesse']],
};
const zoneL1 = (p) => ['sc', 'lat', 'oaJum', 'echangeur'].includes(p.zone);
const zonePos = (p) => ['sc', 'lat', 'echangeur'].includes(p.zone);
const avecProjet = (p) => p.zone !== 'carrefour' && p.projet && p.projet !== 'aucun';
const defaut = (v) => (v === null || v === undefined ? '' : E.fmt(v));

const CHAMPS = [
  { g: 'site', name: 'zone', label: 'Zone', type: 'select', opts: OPT.zone },
  { g: 'site', name: 'L1', label: 'Distance L1', type: 'num', unit: 'm', show: zoneL1, help: 'De la limite roulable (bord extérieur BAU/BDD) à l’entrée en terre ferroviaire.' },
  { g: 'site', name: 'position', label: 'Niveaux relatifs des plates-formes', type: 'seg', opts: OPT.position, show: zonePos },
  { g: 'site', name: 'denivele', label: 'Dénivelé entre plates-formes', type: 'num', unit: 'm', show: (p) => zonePos(p) && p.position !== 'meme' },
  { g: 'site', name: 'talus', label: 'Pente du talus de raccordement', type: 'text', unit: 'H/V', ph: '3/2', show: (p) => zonePos(p) && p.position === 'ferHaut', help: '3/2 = 3 de base pour 2 de hauteur ; 2/1 est plus doux.' },
  { g: 'site', name: 'traficPL', label: 'Trafic poids lourds', type: 'select', opts: OPT.traficPL, show: (p) => ['oa', 'oaJum', 'carrefour'].includes(p.zone) },
  { g: 'site', name: 'angle', label: 'Angle entre axes routier et ferroviaire', type: 'num', unit: '°', ph: '90', show: (p) => ['oa', 'abords'].includes(p.zone) },
  { g: 'site', name: 'niveauOA', label: 'Niveau du dispositif sur l’ouvrage', type: 'select', opts: OPT.niveauOA, show: (p) => p.zone === 'abords' },
  { g: 'site', name: 'ecartOA', label: 'Écart horizontal rive routière / plate-forme ferroviaire', type: 'num', unit: 'm', ph: '= L1', show: (p) => p.zone === 'oaJum' },
  { g: 'site', name: 'deniveleOA', label: 'Dénivelé tablier routier / plate-forme ferroviaire', type: 'num', unit: 'm', show: (p) => p.zone === 'oaJum', help: 'Positif si la plate-forme ferroviaire est plus basse.' },
  { g: 'site', name: 'acces', label: 'Accès de service routier prévu sur le tronçon', type: 'check', show: (p) => ['sc', 'lat'].includes(p.zone) },
  { g: 'projet', name: 'projet', label: 'Dispositif projeté', type: 'select', opts: OPT.projet, show: (p) => p.zone !== 'carrefour' },
  { g: 'projet', name: 'hauteur', label: 'Hauteur (écran, mur, merlon) ou profondeur (fossé)', type: 'num', unit: 'm', ph: (p) => defaut(E.PROJETS[p.projet]?.h), show: avecProjet },
  { g: 'projet', name: 'niveauProjete', label: 'Niveau de retenue projeté', type: 'select', opts: OPT.niveau, show: avecProjet },
  { g: 'projet', name: 'physProjete', label: 'Élément anti-pénétration', type: 'select', opts: OPT.phys, show: avecProjet },
  { g: 'projet', name: 'merlonTalusRoute', label: 'Talus du merlon côté route', type: 'text', unit: 'H/V', ph: '3/2', show: (p) => p.projet === 'merlon' || p.physProjete === 'merlon' },
  { g: 'projet', name: 'longueurProjetee', label: 'Prolongement hors ouvrage, le long de la route', type: 'num', unit: 'm', show: (p) => p.zone === 'abords' },
  { g: 'projet', name: 'amenagement', label: 'Aménagement du débouché', type: 'select', opts: OPT.amenagement, show: (p) => p.zone === 'carrefour' },
  { g: 'projet', name: 'decalageAngle', label: 'Angle de décalage des dispositifs', type: 'num', unit: '°', show: (p) => p.zone === 'carrefour' && p.amenagement === 'decale' },
];
const CH_LIGNE = { name: 'ligne', label: 'Type de ligne ferroviaire', type: 'select', opts: OPT.ligne, show: (p) => ['sc', 'lat'].includes(p.zone), help: 'Ligne classique : la gêne optique pour les conducteurs de train est à évaluer en jumelage étroit.' };
const CH_LOC = [
  { name: 'pkDebut', label: 'PK début', type: 'text', ph: '0+000' },
  { name: 'pkFin', label: 'PK fin', type: 'text', ph: '0+250' },
  { name: 'cote', label: 'Côté', type: 'select', opts: OPT.cote },
];
const CH_REM = { name: 'remarques', label: 'Remarques', type: 'textarea' };
const tousChamps = [...CHAMPS, CH_LIGNE, ...CH_LOC, CH_REM];
const defChamp = (n) => tousChamps.find((c) => c.name === n);

function htmlChamp(c, obj, prefixe) {
  const id = `${prefixe}-${c.name}`;
  const v = obj[c.name] ?? '';
  const cache = c.show && !c.show(obj) ? ' hidden' : '';
  const ph = typeof c.ph === 'function' ? c.ph(obj) : c.ph ?? '';
  const help = c.help ? `<span class="help">${esc(c.help)}</span>` : '';
  if (c.type === 'check') {
    return `<div class="field" data-name="${c.name}"${cache}><label class="check"><input type="checkbox" id="${id}" data-f="${c.name}"${v ? ' checked' : ''}> ${esc(c.label)}</label>${help}</div>`;
  }
  let ctrl;
  if (c.type === 'select') {
    ctrl = `<div class="inp"><select id="${id}" data-f="${c.name}">${c.opts.map(([k, l]) => `<option value="${esc(k)}"${String(v) === String(k) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
  } else if (c.type === 'seg') {
    ctrl = `<div class="seg" role="radiogroup" aria-labelledby="${id}-l">${c.opts.map(([k, l]) => `<label><input type="radio" name="${id}" value="${esc(k)}" data-f="${c.name}"${String(v) === k ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>`;
  } else if (c.type === 'textarea') {
    ctrl = `<div class="inp"><textarea id="${id}" data-f="${c.name}" rows="3">${esc(v)}</textarea></div>`;
  } else {
    ctrl = `<div class="inp"><input id="${id}" data-f="${c.name}" type="text"${c.type === 'num' ? ' inputmode="decimal"' : ''} value="${esc(v)}" placeholder="${esc(ph)}" autocomplete="off">${c.unit ? `<span class="unit">${esc(c.unit)}</span>` : ''}</div>`;
  }
  const lab = c.type === 'seg' ? `<span class="flabel" id="${id}-l">${esc(c.label)}</span>` : `<label for="${id}" class="flabel">${esc(c.label)}</label>`;
  return `<div class="field" data-name="${c.name}"${cache}>${lab}${ctrl}${help}</div>`;
}

function majChamps(conteneur, obj) {
  $$('.field[data-name]', conteneur).forEach((el) => {
    const c = defChamp(el.dataset.name);
    if (!c) return;
    el.hidden = !!(c.show && !c.show(obj));
    if (typeof c.ph === 'function') {
      const inp = $('input[data-f]', el);
      if (inp) inp.placeholder = c.ph(obj);
    }
  });
}

function valeurChamp(t) {
  return t.type === 'checkbox' ? t.checked : t.value;
}

/* ================================================================ projet : chargement et sauvegarde */

let timerSave;
function setEtat(texte, ex = false) {
  const el = $('#save-state');
  el.textContent = texte;
  el.classList.toggle('ex', ex);
}

function modifie() {
  projet.maj = Date.now();
  setEtat('Enregistrement…');
  clearTimeout(timerSave);
  timerSave = setTimeout(sauver, 500);
  majBadges();
}

function sauver() {
  const ok = Store.enregistrer(projet);
  if (ok) setEtat(projet.exemple ? 'Projet d’exemple · enregistré' : 'Enregistré dans ce navigateur', projet.exemple);
  else setEtat('Stockage indisponible : exportez en .json', true);
  remplirSelectProjets();
}

function projetExemple() {
  const p = M.nouveauProjet('Exemple – RN le long d’une ligne classique');
  p.meta = { ...p.meta, ...META_EXEMPLE };
  p.lignes = LIGNES_EXEMPLE.map((l) => M.nouvelleLigne(l));
  p.exemple = true;
  return p;
}

function ouvrirProjet(p) {
  projet = M.completerProjet(p);
  Store.definirCourant(projet.id);
  Store.enregistrer(projet);
  ui.ouverts.clear();
  ui.rendues.clear();
  setEtat(projet.exemple ? 'Projet d’exemple' : 'Enregistré dans ce navigateur', projet.exemple);
  remplirSelectProjets();
  construireFormAssistant();
  rendreVue(ui.vue, true);
  majBadges();
}

function remplirSelectProjets() {
  const sel = $('#proj-select');
  const liste = Store.liste();
  if (!liste.some((e) => e.id === projet.id)) liste.unshift({ id: projet.id, nom: projet.nom });
  sel.innerHTML = liste.map((e) => `<option value="${esc(e.id)}"${e.id === projet.id ? ' selected' : ''}>${esc(e.id === projet.id ? projet.nom : e.nom)}</option>`).join('');
}

function majBadges() {
  const b1 = $('#badge-lin');
  b1.textContent = String(projet.lignes.length);
  const cs = M.constats(projet).filter((c) => !c.exclu);
  const p0 = cs.filter((c) => c.priorite === 'P0').length;
  const b2 = $('#badge-constats');
  b2.textContent = String(cs.length);
  b2.classList.toggle('zero', p0 === 0);
  b2.title = `${cs.length} constat(s), dont ${p0} P0`;
}

/* ================================================================ navigation */

const VUES = ['comprendre', 'assistant', 'lineaire', 'constats', 'rapport', 'calculs', 'referentiel'];
let vueParDefaut = 'assistant';

function routeur() {
  const v = location.hash.replace('#', '');
  afficherVue(VUES.includes(v) ? v : vueParDefaut);
}

function afficherVue(v) {
  ui.vue = v;
  $$('main > section').forEach((s) => { s.hidden = s.dataset.vue !== v; });
  $$('.tab').forEach((t) => {
    if (t.dataset.vue === v) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  });
  rendreVue(v);
}

function rendreVue(v, force = false) {
  if (v === 'comprendre') $('#g-contenu').innerHTML = htmlComprendre(projet);
  else if (v === 'assistant') rendreResultatAssistant();
  else if (v === 'lineaire') rendreLineaire();
  else if (v === 'constats') rendreConstats();
  else if (v === 'rapport') rendreRapport();
  else if (v === 'calculs') rendreCalculs(force);
  else if (v === 'referentiel' && (!ui.rendues.has('ref') || force)) rendreReferentiel();
}

/* ================================================================ résultat d'évaluation */

const ROLES = { 'préconisée': ['Préconisée par le guide', 'info'], 'indiquée': ['Indiquée pour cette configuration', 'info'], alternative: ['Alternative', 'neutre'] };

function libellePhys(phys) {
  if (!phys) return ['Non requis', ''];
  if (phys.type === 'ecran') return [`Écran ${E.fmt(phys.hMin)} m`, 'Écran de retenue de chargement ou mur, hauteur au-dessus de la chaussée'];
  if (phys.type === 'merlon') return [`Merlon ${E.fmt(phys.hMin)} m`, 'Hauteur minimale, talus à 3/2 côté route, clôture en crête'];
  return [`Fossé ${E.fmt(phys.hMin)} m`, 'Profondeur, 3,50 m en pied, talus 3/2, à 10 m de la BAU/BDD'];
}

function htmlResultat(ligne, { compact = false } = {}) {
  const { p, res, ctl } = M.evaluerLigne(ligne, projet.ligne);
  const n = E.normaliser(p);
  const pl = M.plaque(res);
  const [stLabel, stCls] = M.libelleStatutRes(res);
  const ex = res.exigence;
  let h = '<div class="res">';

  h += `<div class="panel"><div class="res-head"><div class="plaque">${esc(pl.grand)}<small>${esc(pl.petit)}</small></div><div>`;
  h += `<div class="eyebrow">Géfra ${esc(res.ref)}${res.plage ? ` · ${esc(res.plage)}` : ''}</div>`;
  h += `<h2>${esc(res.titre)}</h2><p class="resume">${esc(res.resume)}</p>`;
  h += `<div class="tags"><span class="pill ${stCls}">${esc(stLabel)}</span><span class="pill neutre">${esc(E.ZONES[n.zone].label)}</span>${zonePos(n) && n.position !== 'meme' ? `<span class="pill neutre">${esc(E.POSITIONS[n.position])}</span>` : ''}</div>`;
  h += '</div></div>';
  const fhSup = n.position === 'ferHaut' && (n.denivele ?? 0) >= 3 && zonePos(n);
  if (zoneL1(n) && n.L1 !== null && !fhSup) h += `<div class="regle">${S.svgRegleL1(n.L1)}</div>`;
  h += '</div>';

  if (res.statut !== 'incomplet') {
    const [vPhys, dPhys] = libellePhys(ex.phys);
    let t3;
    if (n.zone === 'abords') t3 = ['Longueur hors ouvrage', `${E.fmt(ex.longueurMin, 1)} m`, 'Le long de la route, de chaque côté, au-delà de l’entrée en terre'];
    else if (n.zone === 'carrefour') t3 = ['Aménagement attendu', n.traficPL === 'fort' ? 'Débouché reporté' : 'Décalage ou musoir', n.traficPL === 'fort' ? 'Raccordement au-delà des dispositifs de retenue' : 'Alignement décalé de 5 à 10°, ou musoir intégré'];
    else t3 = ['Barrière en bord de BAU/BDD', ex.barriereBAU || '—', ''];
    h += '<div class="tiles">';
    if (n.zone !== 'carrefour') {
      h += `<div class="panel tile"><span class="k">Niveau de retenue minimal</span><span class="v">${esc(ex.niveauMin || (res.statut === 'aucune' ? 'Aucun' : '—'))}</span><span class="d">Au sens de la NF EN 1317-2</span></div>`;
      h += `<div class="panel tile"><span class="k">Élément anti-pénétration</span><span class="v">${esc(vPhys)}</span><span class="d">${esc(dPhys)}</span></div>`;
    }
    h += `<div class="panel tile"><span class="k">${esc(t3[0])}</span><span class="v${t3[1].length > 18 ? ' sm' : ''}">${esc(t3[1])}</span>${t3[2] ? `<span class="d">${esc(t3[2])}</span>` : ''}</div>`;
    h += '</div>';
  }

  if (res.alertes.length) {
    h += `<ul class="alertes">${res.alertes.map((a) => `<li class="alerte ${a.p.toLowerCase()}"><span class="pill ${a.p.toLowerCase()}">${esc(a.p)}</span><span>${esc(a.t)}</span></li>`).join('')}</ul>`;
  }

  const renseigne = n.zone === 'carrefour' ? n.amenagement : n.projet;
  if (renseigne && res.statut !== 'incomplet') {
    const st = M.statutLigne({ res, ctl });
    h += `<div class="panel controle"><div class="controle-head"><h3>Contrôle du dispositif projeté</h3><span class="pill ${st.cls}">${esc(st.label)}</span></div>`;
    h += `<p class="help">${esc(E.libelleProjete(p))}</p>`;
    if (ctl.ecarts.length) {
      h += `<ul class="ecarts">${ctl.ecarts.map((e) => `<li class="ecart"><span class="pill ${e.priorite.toLowerCase()}">${e.priorite}</span><div><p>${esc(e.ecart)}</p><p class="reco">${esc(e.reco)}</p></div></li>`).join('')}</ul>`;
    } else {
      h += '<p>Le dispositif projeté répond aux exigences du guide pour cette configuration.</p>';
    }
    h += '</div>';
  }

  if (res.solutions.length) {
    h += `<h3 class="section-title">Solutions du guide <small>${res.solutions.length} solution${res.solutions.length > 1 ? 's' : ''}</small></h3><div class="solutions">`;
    let figure = false;
    for (const s of res.solutions) {
      const [role, cls] = ROLES[s.role] || [s.role, 'neutre'];
      const montrer = !compact || (!figure && s.role !== 'alternative');
      const svg = montrer ? S.schemaSVG(s.schema) : '';
      if (svg) figure = true;
      h += `<article class="panel sol${s.role === 'indiquée' ? ' indiquee' : ''}"><div class="sol-head"><h4>${esc(s.nom)}</h4><span class="pill ${cls}">${esc(role)}</span></div><div class="sol-body"><ul>${s.texte.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
      if (svg) h += `<figure class="figure">${svg}<figcaption>Coupe de principe générée pour la configuration saisie (cotes en mètres, en rouge les valeurs sous le minimum).</figcaption></figure>`;
      h += '</div></article>';
    }
    h += '</div>';
  }

  if (res.chute) {
    h += `<figure class="figure panel">${S.svgChute({ d: res.chute.d, h: res.chute.h, k: res.chute.k })}<figcaption>Courbe de chute du chargement y = ${E.fmt(res.chute.k, 3)} x² (§3.1) : ${res.chute.atteint ? 'le chargement atteint la plate-forme ferroviaire.' : 'le chargement n’atteint pas la plate-forme ferroviaire.'}</figcaption></figure>`;
  }

  if (res.calculs.length) {
    h += `<div class="panel"><table class="calc-table"><tbody>${res.calculs.map((c) => `<tr><td>${esc(c.label)}<div class="d">${esc(c.detail)}</div></td><td class="val">${esc(c.valeur)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  if (res.notes.length) h += `<ul class="notes">${res.notes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
  if (res.verifs.length) {
    h += `<details class="panel verifs"><summary>Points de vérification (${res.verifs.length})</summary><ul>${res.verifs.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></details>`;
  }
  h += '</div>';
  return h;
}

/* ================================================================ assistant */

function construireFormAssistant() {
  const a = projet.assistant;
  const obj = { ...a, ligne: projet.ligne };
  const f = $('#f-assistant');
  f.innerHTML = `
    <fieldset class="fgroup"><legend class="eyebrow">Configuration</legend>
      ${CHAMPS.filter((c) => c.g === 'site').map((c) => htmlChamp(c, obj, 'a')).join('')}
      ${htmlChamp(CH_LIGNE, obj, 'a')}
    </fieldset>
    <fieldset class="fgroup"><legend class="eyebrow">Dispositif projeté</legend>
      <p class="help">Facultatif : renseignez le dispositif du dossier pour en contrôler la conformité.</p>
      ${CHAMPS.filter((c) => c.g === 'projet').map((c) => htmlChamp(c, obj, 'a')).join('')}
    </fieldset>
    <fieldset class="fgroup"><legend class="eyebrow">Ajouter au linéaire</legend>
      <div class="grid2">${htmlChamp(CH_LOC[0], obj, 'a')}${htmlChamp(CH_LOC[1], obj, 'a')}</div>
      ${htmlChamp(CH_LOC[2], obj, 'a')}
      <button class="btn" type="button" data-action="assistant-vers-lineaire">Ajouter ce tronçon au linéaire</button>
    </fieldset>`;
}

function rendreResultatAssistant() {
  $('#a-resultat').innerHTML = htmlResultat(projet.assistant);
}

function surSaisieAssistant(e) {
  const t = e.target.closest('[data-f]');
  if (!t) return;
  if (e.type === 'input' && (t.type === 'radio' || t.type === 'checkbox' || t.tagName === 'SELECT')) return;
  const f = t.dataset.f;
  if (f === 'ligne') projet.ligne = t.value;
  else projet.assistant[f] = valeurChamp(t);
  majChamps($('#f-assistant'), { ...projet.assistant, ligne: projet.ligne });
  rendreResultatAssistant();
  modifie();
}

function assistantVersLineaire() {
  const { id, ...a } = projet.assistant;
  void id;
  const l = M.nouvelleLigne({ ...a });
  projet.lignes.push(l);
  modifie();
  toast(`Tronçon ajouté au linéaire (n° ${projet.lignes.length}).`);
}

/* ================================================================ linéaire */

const COLS = [
  ['#', 34], ['PK début', 84], ['PK fin', 84], ['Côté', 74], ['Zone', 150], ['L1 (m)', 72], ['Niveaux', 140],
  ['Δh (m)', 66], ['Talus', 64], ['Dispositif projeté', 240], ['H (m)', 62], ['Cas Géfra', 120], ['Exigence', 160], ['Contrôle', 118], ['', 128],
];

function rendreLineaire() {
  const conteneur = $('#lin-table');
  if (!projet.lignes.length) {
    conteneur.innerHTML = '<div class="empty"><p><strong>Aucun tronçon.</strong></p><p>Ajoutez un tronçon, collez un tableau copié depuis Excel ou importez un fichier CSV/XLSX (le modèle .xlsx indique les colonnes reconnues).</p></div>';
  } else {
    conteneur.innerHTML = `<table class="lin"><colgroup>${COLS.map(([, w]) => `<col style="width:${w}px">`).join('')}</colgroup><thead><tr>${COLS.map(([t]) => `<th scope="col">${esc(t)}</th>`).join('')}</tr></thead><tbody>${projet.lignes.map((l, i) => htmlLigne(l, i)).join('')}</tbody></table>`;
  }
  rendreResume();
}

function actif(l, name) {
  const c = defChamp(name);
  return !c?.show || c.show(l);
}

function htmlLigne(l, i) {
  const ev = M.evaluerLigne(l, projet.ligne);
  const inp = (name, cls = '', lab = name) => `<input data-f="${name}" class="${cls}" value="${esc(l[name])}"${actif(l, name) ? '' : ' disabled'} aria-label="${esc(lab)} – tronçon ${i + 1}" autocomplete="off"${cls === 'num' ? ' inputmode="decimal"' : ''}>`;
  const sel = (name, opts, lab = name) => `<select data-f="${name}"${actif(l, name) ? '' : ' disabled'} aria-label="${esc(lab)} – tronçon ${i + 1}">${opts.map(([k, t]) => `<option value="${esc(k)}"${String(l[name] ?? '') === k ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  const disp = l.zone === 'carrefour' ? sel('amenagement', OPT.amenagement, 'Aménagement') : sel('projet', OPT.projet, 'Dispositif projeté');
  const ouvert = ui.ouverts.has(l.id);
  return `<tr class="row${ouvert ? ' open' : ''}" data-id="${l.id}">
    <td class="c-idx">${i + 1}</td>
    <td>${inp('pkDebut', 'num', 'PK début')}</td>
    <td>${inp('pkFin', 'num', 'PK fin')}</td>
    <td>${sel('cote', OPT.cote, 'Côté')}</td>
    <td>${sel('zone', OPT.zoneCourt, 'Zone')}</td>
    <td>${inp('L1', 'num', 'L1')}</td>
    <td>${sel('position', OPT.position, 'Niveaux relatifs')}</td>
    <td>${inp('denivele', 'num', 'Dénivelé')}</td>
    <td>${inp('talus', 'num', 'Talus')}</td>
    <td>${disp}</td>
    <td>${l.zone === 'carrefour' ? '' : inp('hauteur', 'num', 'Hauteur')}</td>
    ${htmlCellules(ev)}
    <td class="c-act"><button class="btn sm${ouvert ? ' primary' : ''}" type="button" data-action="detail" aria-expanded="${ouvert}">Détail</button> <button class="btn sm ghost" type="button" data-action="dupliquer-ligne" title="Dupliquer" aria-label="Dupliquer le tronçon ${i + 1}">⧉</button><button class="btn sm ghost danger" type="button" data-action="supprimer-ligne" title="Supprimer" aria-label="Supprimer le tronçon ${i + 1}">✕</button></td>
  </tr>${ouvert ? htmlDetail(l) : ''}`;
}

function htmlCellules(ev) {
  const pl = M.plaque(ev.res);
  const st = M.statutLigne(ev);
  return `<td class="c-cas">${esc(pl.grand)}<small>${esc(ev.res.ref)}</small></td><td class="c-exig">${esc(E.libelleExigence(ev.res))}</td><td class="c-ctl"><span class="pill ${st.cls}">${esc(st.label)}</span></td>`;
}

function htmlDetail(l) {
  const pref = `r-${l.id}`;
  const loc = `<div class="grid2">${htmlChamp(CH_LOC[0], l, pref)}${htmlChamp(CH_LOC[1], l, pref)}</div>`;
  return `<tr class="detail-row" data-id="${l.id}"><td colspan="${COLS.length}" class="detail"><div class="detail-grid">
    <div class="detail-form"><div class="eyebrow">Données du tronçon</div>${loc}${CHAMPS.map((c) => htmlChamp(c, l, pref)).join('')}${htmlChamp(CH_REM, l, pref)}</div>
    <div class="detail-res">${htmlResultat(l, { compact: true })}</div>
  </div></td></tr>`;
}

function trouverLigne(id) {
  return projet.lignes.find((l) => l.id === id);
}

function remplacerLigne(l) {
  const i = projet.lignes.indexOf(l);
  const tr = $(`#lin-table tr.row[data-id="${l.id}"]`);
  if (!tr) return rendreLineaire();
  const det = $(`#lin-table tr.detail-row[data-id="${l.id}"]`);
  if (det) det.remove();
  const tpl = document.createElement('template');
  tpl.innerHTML = `<table><tbody>${htmlLigne(l, i)}</tbody></table>`;
  const neufs = [...tpl.content.querySelectorAll('tr')];
  tr.replaceWith(...neufs);
  return null;
}

function majCalculsLigne(l) {
  const tr = $(`#lin-table tr.row[data-id="${l.id}"]`);
  if (!tr) return;
  const ev = M.evaluerLigne(l, projet.ligne);
  const tpl = document.createElement('template');
  tpl.innerHTML = `<table><tbody><tr>${htmlCellules(ev)}</tr></tbody></table>`;
  const neuves = [...tpl.content.querySelectorAll('td')];
  ['c-cas', 'c-exig', 'c-ctl'].forEach((cls, k) => tr.querySelector(`.${cls}`).replaceWith(neuves[k]));
  const det = $(`#lin-table tr.detail-row[data-id="${l.id}"]`);
  if (det) {
    $('.detail-res', det).innerHTML = htmlResultat(l, { compact: true });
    majChamps($('.detail-form', det), l);
  }
  rendreResume();
}

const STRUCTURANTS = ['zone', 'position', 'projet', 'amenagement', 'physProjete'];

function surSaisieLineaire(e) {
  const t = e.target.closest('[data-f]');
  if (!t) return;
  const tr = t.closest('tr[data-id]');
  const l = tr && trouverLigne(tr.dataset.id);
  if (!l) return;
  if (e.type === 'input' && (t.type === 'radio' || t.type === 'checkbox' || t.tagName === 'SELECT')) return;
  const f = t.dataset.f;
  l[f] = valeurChamp(t);
  const jumeau = $$(`#lin-table tr[data-id="${l.id}"] [data-f="${f}"]`).filter((x) => x !== t && x.type !== 'radio');
  jumeau.forEach((x) => {
    if (x.type === 'checkbox') x.checked = !!l[f];
    else x.value = l[f];
  });
  if (e.type === 'change' && STRUCTURANTS.includes(f)) {
    const focusId = t.id;
    remplacerLigne(l);
    rendreResume();
    if (focusId) document.getElementById(focusId)?.focus();
  } else {
    majCalculsLigne(l);
  }
  modifie();
}

function rendreResume() {
  const s = M.synthese(projet);
  const chip = (cls, v, t) => `<div class="chip ${cls}"><b>${v}</b><span>${esc(t)}</span></div>`;
  $('#lin-summary').innerHTML = [
    chip('', s.troncons, 'tronçons'),
    chip('', `${Math.round(s.longueur).toLocaleString('fr-FR')} m`, 'linéaire cumulé'),
    chip('ok', s.conforme, 'conformes'),
    chip('p0', s.P0, 'écarts P0'),
    chip('p1', s.P1, 'écarts P1'),
    chip('p2', s.P2, 'écarts P2'),
    s.nonRenseigne ? chip('', s.nonRenseigne, 'projet non renseigné') : '',
    s.incomplet ? chip('', s.incomplet, 'à compléter') : '',
  ].join('');
}

async function actionLigne(action, id) {
  const l = trouverLigne(id);
  if (!l) return;
  const i = projet.lignes.indexOf(l);
  if (action === 'detail') {
    if (ui.ouverts.has(id)) ui.ouverts.delete(id);
    else ui.ouverts.add(id);
    remplacerLigne(l);
  } else if (action === 'dupliquer-ligne') {
    const { id: _ancien, ...copie } = l;
    void _ancien;
    projet.lignes.splice(i + 1, 0, M.nouvelleLigne({ ...copie, pkDebut: l.pkFin, pkFin: '' }));
    rendreLineaire();
    modifie();
  } else if (action === 'supprimer-ligne') {
    if (!(await confirmer('Supprimer ce tronçon ?', `Tronçon ${i + 1} : ${M.localisation(l, i)}. Les reprises de constat associées seront perdues.`, 'Supprimer'))) return;
    projet.lignes.splice(i, 1);
    delete projet.constats[id];
    ui.ouverts.delete(id);
    rendreLineaire();
    modifie();
  }
}

function ajouterLigne() {
  const der = projet.lignes[projet.lignes.length - 1];
  const l = M.nouvelleLigne(der ? { pkDebut: der.pkFin, cote: der.cote } : {});
  projet.lignes.push(l);
  ui.ouverts.add(l.id);
  rendreLineaire();
  modifie();
  $(`#lin-table tr.row[data-id="${l.id}"] [data-f="pkDebut"]`)?.focus();
}

function trierLignes() {
  projet.lignes.sort((a, b) => (E.parsePK(a.pkDebut) ?? Infinity) - (E.parsePK(b.pkDebut) ?? Infinity) || String(a.cote).localeCompare(String(b.cote)));
  rendreLineaire();
  modifie();
  toast('Tronçons triés par PK.');
}

function ajouterImport(lignes, source) {
  if (!lignes.length) {
    toast('Aucune ligne exploitable trouvée.');
    return;
  }
  projet.lignes.push(...lignes);
  rendreLineaire();
  modifie();
  const incompletes = lignes.filter((l) => M.evaluerLigne(l, projet.ligne).res.statut === 'incomplet').length;
  toast(`${lignes.length} tronçon(s) importé(s) depuis ${source}${incompletes ? `, dont ${incompletes} à compléter` : ''}.`);
}

async function collerDepuisExcel() {
  const d = await dialogue({
    titre: 'Coller depuis Excel',
    large: true,
    ok: 'Importer',
    corps: `<p>Copiez des lignes dans Excel (avec ou sans la ligne d’en-têtes du modèle) puis collez-les ci-dessous. Sans en-têtes, les colonnes doivent suivre l’ordre du modèle .xlsx.</p><div class="inp"><textarea id="dlg-coller" rows="10" placeholder="PK début&#9;PK fin&#9;Côté&#9;Zone&#9;L1 (m)…"></textarea></div>`,
  });
  if (!d) return;
  const texte = d.querySelector('#dlg-coller').value;
  const { lignes } = X.lignesDepuisTableau(X.parseTSV(texte));
  ajouterImport(lignes, 'le presse-papiers');
}

async function importerTableau(fichier) {
  try {
    toast('Lecture du fichier…');
    const t = await X.lireFichierTableau(fichier);
    const { lignes } = X.lignesDepuisTableau(t);
    ajouterImport(lignes, fichier.name);
  } catch (err) {
    toast(err.message || 'Lecture du fichier impossible.');
  }
}

/* ================================================================ constats */

function rendreConstats() {
  const cs = M.constats(projet);
  const compte = (k) => (k === 'tous' ? cs.filter((c) => !c.exclu).length : k === 'exclus' ? cs.filter((c) => c.exclu).length : cs.filter((c) => !c.exclu && c.priorite === k).length);
  const filtres = [['tous', 'Tous'], ['P0', 'P0'], ['P1', 'P1'], ['P2', 'P2'], ['exclus', 'Exclus']];
  $('#c-filtres').innerHTML = filtres.map(([k, t]) => `<button type="button" data-filtre="${k}" aria-pressed="${ui.filtre === k}">${t} · ${compte(k)}</button>`).join('');
  const visibles = cs.filter((c) => (ui.filtre === 'tous' ? !c.exclu : ui.filtre === 'exclus' ? c.exclu : !c.exclu && c.priorite === ui.filtre));
  if (!cs.length) {
    $('#c-liste').innerHTML = `<div class="panel empty"><p><strong>Aucun constat.</strong></p><p>${projet.lignes.length ? 'Aucun tronçon du linéaire ne présente d’écart au guide, ou les dispositifs projetés ne sont pas renseignés.' : 'Renseignez le linéaire : chaque écart au guide produit un constat.'}</p></div>`;
    return;
  }
  $('#c-liste').innerHTML = visibles.length ? visibles.map(htmlConstat).join('') : '<div class="panel empty">Aucun constat pour ce filtre.</div>';
}

function htmlConstat(c) {
  const pr = (c.priorite || 'P2').toLowerCase();
  const libre = c.source === 'libre';
  const ta = (k, label) => `<div class="field"><label class="flabel" for="c-${c.id}-${k}">${label}</label><div class="inp"><textarea id="c-${c.id}-${k}" data-c="${k}" rows="6">${esc(c[k])}</textarea></div></div>`;
  return `<article class="panel constat ${pr}${c.exclu ? ' exclu' : ''}" data-cid="${c.id}" data-src="${c.source}">
    <div class="stripe"></div>
    <div class="constat-body">
      <div class="constat-head">
        <span class="num">${esc(c.num)}</span>
        ${libre ? `<div class="inp"><input data-c="localisation" value="${esc(c.localisation)}" placeholder="Localisation" aria-label="Localisation"></div>` : `<span class="loc">${esc(c.localisation)}</span>`}
        <span class="sp"></span>
        ${c.modifie ? '<span class="modif">Texte repris par l’auditeur</span><button class="btn sm ghost" type="button" data-action="constat-retablir">Rétablir la proposition</button>' : ''}
        <div class="inp"><select data-c="priorite" aria-label="Priorité">${['P0', 'P1', 'P2'].map((p) => `<option value="${p}"${c.priorite === p ? ' selected' : ''}>${p} – ${E.PRIORITES[p].titre}</option>`).join('')}</select></div>
        <label class="check"><input type="checkbox" data-c="exclu"${c.exclu ? ' checked' : ''}> Exclure du rapport</label>
        ${libre ? '<button class="btn sm danger" type="button" data-action="constat-supprimer">Supprimer</button>' : '<button class="btn sm" type="button" data-action="voir-troncon">Voir le tronçon</button>'}
      </div>
      <div class="constat-grid">${ta('constat', 'Constat')}${ta('risque', 'Risque')}${ta('recommandation', 'Recommandation')}</div>
      ${c.ref ? `<div class="help">${esc(c.ref)}</div>` : ''}
    </div>
  </article>`;
}

function surSaisieConstat(e) {
  const t = e.target.closest('[data-c]');
  if (!t) return;
  const art = t.closest('[data-cid]');
  const id = art.dataset.cid;
  const k = t.dataset.c;
  const v = t.type === 'checkbox' ? t.checked : t.value;
  if (art.dataset.src === 'libre') {
    const c = projet.constatsLibres.find((x) => x.id === id);
    if (c) c[k] = v;
  } else {
    const auto = M.constats(projet).find((c) => c.id === id && c.source === 'auto');
    if (!auto) return;
    const o = projet.constats[id]?.sig === auto.auto.sig ? projet.constats[id] : { sig: auto.auto.sig };
    o[k] = v;
    projet.constats[id] = o;
  }
  modifie();
  if (e.type === 'change' && (k === 'priorite' || k === 'exclu')) rendreConstats();
}

async function actionConstat(action, art) {
  const id = art.dataset.cid;
  if (action === 'constat-retablir') {
    const o = projet.constats[id];
    if (o) projet.constats[id] = { sig: o.sig, exclu: o.exclu };
    rendreConstats();
    modifie();
  } else if (action === 'constat-supprimer') {
    if (!(await confirmer('Supprimer ce constat libre ?', 'Cette action est définitive.', 'Supprimer'))) return;
    projet.constatsLibres = projet.constatsLibres.filter((c) => c.id !== id);
    rendreConstats();
    modifie();
  } else if (action === 'voir-troncon') {
    ui.ouverts.add(id);
    location.hash = '#lineaire';
    setTimeout(() => $(`#lin-table tr.row[data-id="${id}"]`)?.scrollIntoView({ block: 'center' }), 60);
  }
}

function ajouterConstatLibre() {
  projet.constatsLibres.push({ id: M.nouvelId('c'), localisation: '', priorite: 'P2', constat: '', risque: '', recommandation: '', ref: '' });
  ui.filtre = 'tous';
  rendreConstats();
  modifie();
  const cartes = $$('#c-liste [data-src="libre"]');
  cartes[cartes.length - 1]?.querySelector('input')?.focus();
}

/* ================================================================ rapport */

const CH_META = [
  { name: 'projet', label: 'Projet', type: 'text' },
  { name: 'maitreOuvrage', label: 'Maître d’ouvrage', type: 'text' },
  { name: 'dossier', label: 'Dossier / phase', type: 'text', ph: 'APD, DAO, PRO…' },
  { name: 'auditeur', label: 'Auditeur', type: 'text' },
  { name: 'date', label: 'Date', type: 'text', ph: 'AAAA-MM-JJ' },
  { name: 'indice', label: 'Indice', type: 'text' },
  { name: 'prefixe', label: 'Préfixe des constats', type: 'text', ph: 'GF' },
  { name: 'objet', label: 'Note d’introduction', type: 'textarea' },
];
const OPTIONS_RAPPORT = [
  ['lineaire', 'Tableau du linéaire'], ['constats', 'Constats'], ['fiche', 'Fiche de l’assistant (avec coupes)'],
  ['verifs', 'Points de vérification généraux'], ['catalogue', 'Annexe : modèles de dispositifs'],
];

function rendreRapport() {
  const f = $('#f-rapport');
  if (f.dataset.projet !== projet.id) {
    f.dataset.projet = projet.id;
    f.innerHTML = `<fieldset class="fgroup"><legend class="eyebrow">Cartouche</legend>
      <div class="field"><label class="flabel" for="m-nom">Nom du projet dans l’application</label><div class="inp"><input id="m-nom" data-m="nom" value="${esc(projet.nom)}"></div></div>
      ${CH_META.map((c) => htmlChamp(c, projet.meta, 'm').replace(/data-f=/g, 'data-m=')).join('')}</fieldset>
      <fieldset class="fgroup"><legend class="eyebrow">Contenu</legend>
      ${OPTIONS_RAPPORT.map(([k, t]) => `<label class="check"><input type="checkbox" data-o="${k}"${projet.rapport[k] ? ' checked' : ''}> ${esc(t)}</label>`).join('')}</fieldset>`;
  }
  $('#r-apercu').innerHTML = htmlRapport();
}

let timerApercu;
function surSaisieRapport(e) {
  const t = e.target;
  if (t.dataset.m) {
    if (t.dataset.m === 'nom') {
      projet.nom = t.value || 'Projet sans nom';
      remplirSelectProjets();
    } else projet.meta[t.dataset.m] = t.value;
  } else if (t.dataset.o) projet.rapport[t.dataset.o] = t.checked;
  else return;
  modifie();
  clearTimeout(timerApercu);
  timerApercu = setTimeout(() => { $('#r-apercu').innerHTML = htmlRapport(); }, 200);
}

function htmlRapport() {
  const m = projet.meta;
  const s = M.synthese(projet);
  const cs = M.constats(projet).filter((c) => !c.exclu);
  const prio = (p) => `<span class="prio ${p.toLowerCase()}">${p}</span>`;
  let h = '<div class="eyebrow">Contrôle Géfra</div><h1>Dispositifs de protection anti-pénétration – jumelage rail-route</h1>';
  h += `<div class="cartouche"><div>Projet</div><div>${esc(m.projet || projet.nom)}</div><div>Maître d’ouvrage</div><div>${esc(m.maitreOuvrage || '—')}</div><div>Dossier / phase</div><div>${esc(m.dossier || '—')}</div><div>Auditeur</div><div>${esc(m.auditeur || '—')}</div><div>Date</div><div>${esc(m.date || '—')}</div><div>Indice</div><div>${esc(m.indice || '—')}</div></div>`;
  if (m.objet) h += `<p class="mute pre"><em>${esc(m.objet)}</em></p>`;
  h += `<h2>1. Objet et référentiel</h2>${X.TEXTE_OBJET.map((t) => `<p>${esc(t)}</p>`).join('')}`;
  h += '<h2>2. Synthèse</h2><table><tbody>';
  h += `<tr><th>Tronçons analysés</th><td>${s.troncons}</td><th>Linéaire cumulé</th><td>${Math.round(s.longueur).toLocaleString('fr-FR')} m</td></tr>`;
  h += `<tr><th>Conformes</th><td><span class="prio ok">${s.conforme}</span></td><th>Écarts P0 / P1 / P2</th><td>${prio('P0')} ${s.P0} · ${prio('P1')} ${s.P1} · ${prio('P2')} ${s.P2}</td></tr>`;
  h += `<tr><th>Projet non renseigné</th><td>${s.nonRenseigne}</td><th>Données à compléter</th><td>${s.incomplet}</td></tr>`;
  h += `<tr><th>Constats retenus</th><td colspan="3">${s.constats.total} (P0 : ${s.constats.P0}, P1 : ${s.constats.P1}, P2 : ${s.constats.P2})</td></tr></tbody></table>`;
  let n = 3;
  if (projet.rapport.lineaire && projet.lignes.length) {
    h += `<h2>${n++}. Analyse du linéaire</h2><table><thead><tr><th>N°</th><th>Localisation</th><th>Situation</th><th>Cas Géfra</th><th>Exigence</th><th>Dispositif projeté</th><th>Avis</th></tr></thead><tbody>`;
    projet.lignes.forEach((l, i) => {
      const ev = M.evaluerLigne(l, projet.ligne);
      const st = M.statutLigne(ev);
      h += `<tr><td>${i + 1}</td><td>${esc(M.localisation(l, i))}</td><td>${esc(X.situationCourte(ev.p))}</td><td>${esc(ev.res.titre)}${ev.res.plage ? `<br><span class="mute">${esc(ev.res.plage)}</span>` : ''}<br><span class="mute">${esc(ev.res.ref)}</span></td><td>${esc(E.libelleExigence(ev.res))}</td><td>${esc(E.libelleProjete(ev.p))}</td><td><span class="prio ${st.cls}">${esc(st.label)}</span></td></tr>`;
    });
    h += '</tbody></table>';
  }
  if (projet.rapport.constats) {
    h += `<h2>${n++}. Constats</h2>`;
    if (!cs.length) h += '<p>Aucun écart relevé au regard du guide Géfra.</p>';
    else {
      h += '<table><thead><tr><th>N°</th><th>Localisation</th><th>Constat</th><th>Risque</th><th>Recommandation</th><th>Priorité</th></tr></thead><tbody>';
      cs.forEach((c) => {
        h += `<tr><td><strong>${esc(c.num)}</strong></td><td>${esc(c.localisation)}</td><td>${nl2br(c.constat)}</td><td>${nl2br(c.risque)}</td><td>${nl2br(c.recommandation)}${c.ref ? `<br><span class="mute">(${esc(c.ref)})</span>` : ''}</td><td>${prio(c.priorite)}</td></tr>`;
      });
      h += '</tbody></table>';
    }
  }
  if (projet.rapport.fiche) {
    const ev = M.evaluerLigne(projet.assistant, projet.ligne);
    h += `<h2>${n++}. Fiche de configuration (assistant)</h2><p><strong>${esc(E.libelleSituation(ev.p, ev.res))}</strong></p><p>${esc(ev.res.resume)}</p><p>Exigence : ${esc(E.libelleExigence(ev.res))} (Géfra ${esc(ev.res.ref)}).</p>`;
    ev.res.solutions.forEach((sol) => {
      h += `<h3>${esc(sol.nom)} – ${esc(sol.role)}</h3><ul>${sol.texte.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
      const svg = S.schemaSVG(sol.schema, S.PAL_EXPORT);
      if (svg) h += `<div class="fig">${svg}</div>`;
    });
  }
  if (projet.rapport.verifs) {
    h += `<h2>${n++}. Points de vérification généraux</h2><ul>${X.VERIFS_RAPPORT.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
  }
  if (projet.rapport.catalogue) {
    h += `<h2>${n++}. Annexe : modèles de dispositifs de retenue (guide Géfra, 2004)</h2><table><thead><tr><th>Modèle</th><th>Composition</th><th>Niveau de retenue</th><th>Matériau</th><th>Référence</th><th>Domaine d’emploi</th></tr></thead><tbody>${E.CATALOGUE.map((c) => `<tr><td><strong>${esc(c.nom)}</strong></td><td>${esc(c.compo || '—')}</td><td>${esc(c.niveau)}</td><td>${esc(c.materiau)}</td><td>${esc(c.ref)}</td><td>${esc(c.emploi)}</td></tr>`).join('')}</tbody></table>`;
  }
  return h;
}

/* ================================================================ calculs */

function rendreCalculs(force = false) {
  const k = $('#k-contenu');
  if (!k.dataset.projet || k.dataset.projet !== projet.id || force) {
    k.dataset.projet = projet.id;
    const c = projet.calculs;
    const champ = (grp, name, label, unit, ph = '') => `<div class="field"><label class="flabel" for="k-${grp}-${name}">${esc(label)}</label><div class="inp"><input id="k-${grp}-${name}" data-k="${grp}.${name}" value="${esc(c[grp][name])}" inputmode="decimal" placeholder="${esc(ph)}" autocomplete="off">${unit ? `<span class="unit">${esc(unit)}</span>` : ''}</div></div>`;
    k.innerHTML = `
      <section class="panel calc"><h2>Courbe de chute du chargement</h2>
        <p class="lead">Trajectoire théorique d’un chargement projeté hors de la route : y = g / (2 Vt²) · x², avec Vt la vitesse transversale (70 km/h sous 20° donnent Vt = 6,64 m/s et y = 0,111 x²). Sert à vérifier si un chargement atteint une plate-forme ferroviaire plus basse, notamment entre ouvrages jumelés (§5.1).</p>
        <div class="detail-form">${champ('chute', 'vitesse', 'Vitesse du véhicule', 'km/h')}${champ('chute', 'angle', 'Angle d’impact', '°')}${champ('chute', 'd', 'Écart horizontal jusqu’à la plate-forme ferroviaire', 'm')}${champ('chute', 'h', 'Dénivelé (plate-forme ferroviaire plus basse)', 'm')}${champ('chute', 'h0', 'Hauteur de départ au-dessus de la chaussée', 'm', '0')}</div>
        <div id="k-chute-out"></div></section>
      <section class="panel calc"><h2>Longueur de protection aux abords d’un ouvrage</h2>
        <p class="lead">Le dispositif de l’ouvrage est prolongé hors ouvrage jusqu’à 50 m depuis l’entrée en terre, mesurés perpendiculairement à l’axe ferroviaire (§5.2). Le long de la route, cela représente 50 / sin α de chaque côté, puis le dispositif d’extrémité.</p>
        <div class="detail-form">${champ('abords', 'angle', 'Angle α entre les axes routier et ferroviaire', '°')}</div>
        <div id="k-abords-out"></div></section>
      <section class="panel calc"><h2>Implantation du merlon (4e cas)</h2>
        <p class="lead">Répartition de la largeur L1 entre zone de BAU (3,00 m), banquette côté route (1,00 m), talus 3/2 côté route, crête, talus côté fer et banquette côté fer (1,00 m mini, 4,50 m souhaitables).</p>
        <div class="detail-form">${champ('merlon', 'L1', 'Distance L1', 'm')}${champ('merlon', 'h', 'Hauteur du merlon', 'm')}${champ('merlon', 'crete', 'Largeur de crête', 'm')}${champ('merlon', 'mFer', 'Talus côté fer', 'H/V')}</div>
        <div id="k-merlon-out"></div></section>`;
  }
  majCalculs();
}

function majCalculs() {
  const c = projet.calculs;
  const kpi = (k, v, cls = '') => `<div class="kpi ${cls}"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`;

  const ch = c.chute;
  const { vt, k } = E.coefChute(E.num(ch.vitesse) ?? 70, E.num(ch.angle) ?? 20);
  const d = E.num(ch.d);
  const h = E.num(ch.h);
  const h0 = E.num(ch.h0) ?? 0;
  const portee = E.porteeChute((h ?? 0) + h0, k);
  const atteint = d !== null && h !== null && h + h0 > 0 && portee > d;
  $('#k-chute-out').innerHTML = `<div class="kpis">${kpi('Vitesse transversale Vt', `${E.fmt(vt)} m/s`)}${kpi('Coefficient k', E.fmt(k, 4))}${kpi('Chute à l’écart d', d !== null ? `${E.fmt(k * d * d)} m` : '–')}${kpi('Portée de la chute', `${E.fmt(portee)} m`)}${d !== null && h !== null ? kpi('Plate-forme ferroviaire', atteint ? 'Atteinte' : 'Non atteinte', atteint ? 'bad' : 'good') : ''}</div><figure class="figure">${S.svgChute({ d, h, k, h0 })}</figure>`;

  const a = E.num(c.abords.angle);
  const L = E.longueurAbords(a);
  const lignes = [90, 75, 60, 45, 30, 20].map((x) => `<tr><td>${x}°</td><td class="val">${E.fmt(E.longueurAbords(x), 1)} m</td></tr>`).join('');
  $('#k-abords-out').innerHTML = `<div class="kpis">${kpi('Longueur le long de la route', L ? `${E.fmt(L, 1)} m` : '–')}${kpi('Distance perpendiculaire', '50,0 m')}</div>${L ? `<figure class="figure">${S.svgAbords({ angle: a, longueur: L })}</figure>` : ''}<table class="calc-table"><tbody>${lignes}</tbody></table>`;

  const mr = c.merlon;
  const L1 = E.num(mr.L1);
  const mh = E.num(mr.h) ?? 3;
  const cr = E.num(mr.crete) ?? 4;
  const mF = E.parseTalus(mr.mFer) ?? 1.5;
  let out = '';
  if (L1 !== null) {
    const empr = E.merlonEmprise({ h: mh, crete: cr, mFer: mF });
    const hmax = E.merlonHauteurMax(L1, { crete: cr, mFer: mF });
    const banq = L1 - E.merlonEmprise({ h: mh, crete: cr, mFer: mF, banqFer: 0 });
    const ok = banq >= 1 - 1e-9;
    out = `<div class="kpis">${kpi('Emprise nécessaire', `${E.fmt(empr)} m`)}${kpi('Banquette côté fer restante', `${E.fmt(banq)} m`, ok ? 'good' : 'bad')}${kpi('Hauteur maximale logeable', `${E.fmt(hmax)} m`, hmax >= 3 ? 'good' : 'bad')}${kpi('Merlon de 3 m', hmax >= 3 ? 'Faisable' : 'Impossible', hmax >= 3 ? 'good' : 'bad')}</div>`;
    if (mh < 3) out += '<ul class="alertes"><li class="alerte p1"><span class="pill p1">P1</span><span>Hauteur inférieure aux 3,00 m minimum du guide.</span></li></ul>';
    if (cr < 3) out += '<ul class="alertes"><li class="alerte p2"><span class="pill p2">P2</span><span>Crête inférieure à 3 m : la clôture et l’entretien deviennent difficiles (4 m souhaitables).</span></li></ul>';
    if (ok && L1 >= 2) out += `<figure class="figure">${S.svgCoupe({ kind: 'coupe', variante: 'SC4-S1', L1, merlon: { h: mh, crete: cr, mFer: mF } })}</figure>`;
  }
  $('#k-merlon-out').innerHTML = out;
}

function surSaisieCalcul(e) {
  const t = e.target.closest('[data-k]');
  if (!t) return;
  const [g, n] = t.dataset.k.split('.');
  projet.calculs[g][n] = t.value;
  majCalculs();
  modifie();
}

/* ================================================================ référentiel */

function rendreReferentiel() {
  ui.rendues.add('ref');
  const t = (entetes, lignes) => `<div class="table-wrap nu"><table class="ref-table"><thead><tr>${entetes.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${lignes.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  $('#ref-contenu').innerHTML = `
    <section class="panel ref-section"><h2>Section courante : plates-formes au même niveau ou voie ferrée en contrebas (§4.2, §4.3)</h2>
      ${t(['Cas', 'L1', 'Niveau minimal', 'Dispositif du guide', 'Points clés'], [
        ['Hors cas', '< 2 m', 'H3 (base)', 'Étude spécifique', 'Non traité par le guide : avis du groupe Géfra.'],
        ['1er cas', '2 à 6 m', 'H3', 'Sol. 1 : GRC + mur BA 3,50 m · Sol. 3 : barrière H2 + mur 1,50 m + écran à 3,50 m · Sol. 2 : LBE 3,50 m', 'Exceptionnel ; caniveau à fente ; aucun accès de service ; mur dimensionné à FA = 500 kN à 1,50 m.'],
        ['2e cas', '6 à 8 m', 'H3', 'LBE (LBA + écran) 3,50 m sur semelle', 'Bande d’entretien de 3,50 m mini jusqu’à la clôture.'],
        ['3e cas', '8 à 17 m', 'H2', 'Sol. 1 : GS4 + BHE 3,00 m · Sol. 2 : barrière H2 + écran 3,00 m sur massif', '1,50 + 5,00 mini + 1,50 mini (4,50 souhaitables) ; merlon possible près de 17 m.'],
        ['4e cas', '17 à 30 m', 'N2 (GS4)', 'Merlon de 3,00 m mini, clôture en crête', 'Talus côté route impérativement à 3/2 ; crête de 4 m souhaitable.'],
        ['5e cas', '30 à 50 m', 'N2 si nécessaire', 'Fossé à 10 m de la BAU/BDD : 1,50 m de profondeur, 3,50 m en pied, talus 3/2', 'Entretien permanent ; merlon possible si excédent de matériaux.'],
        ['Au-delà', '≥ 50 m', 'N2 si nécessaire', 'Pas de dispositif spécifique a priori', 'Analyse au cas par cas.'],
      ])}
      <p class="help">Voie ferrée en contrebas : ces dispositifs s’appliquent selon L1 quel que soit le dénivelé (§4.3, 1er cas).</p>
    </section>
    <section class="panel ref-section"><h2>Voie ferrée au-dessus de la route (§4.3, 2e cas)</h2>
      ${t(['Dénivelé', 'Talus de raccordement', 'Dispositif'], [
        ['< 3 m', 'Indifférent', 'Dispositifs du §4.2 selon L1'],
        ['3 à 6 m', '≥ 3/2 (au moins aussi raide)', 'Aucune protection a priori ; N2 possible en zone de transition proche de 3 m'],
        ['3 à 6 m', '< 3/2 (plus doux, franchissable)', 'Barrière N2 minimum en bord de BAU/BDD'],
        ['> 6 m', 'Indifférent', 'Aucun dispositif nécessaire'],
      ])}
      <p class="help">Configurations « route en déblai » ou « voie ferrée en remblai » : la position de la limite entre emprises est sans incidence sur le dispositif.</p>
    </section>
    <section class="panel ref-section"><h2>Zones particulières (§5)</h2>
      ${t(['Zone', 'Règle'], [
        ['Plates-formes jumelées sur ouvrage', 'Continuité de la protection entre plates-formes, de niveau équivalent à la section courante, déterminée avec la courbe de chute (§5.1).'],
        ['Ouvrage au-dessus de la voie ferrée', 'H2 minimum ; H3 avec ensemble BLE (BN4 + écran) de 3,00 m sur itinéraire à fort trafic PL ; LBE non implantable en rive d’ouvrage courant.'],
        ['Abords des ouvrages', 'Prolonger le dispositif jusqu’à 50 m de l’entrée en terre, perpendiculairement à l’axe ferroviaire ; même niveau sur toute la brèche si supérieur à H2 ; merlons ou DCV en complément.'],
        ['Voiries latérales d’accès de service', 'Protection traitée comme en section courante (§5.3).'],
        ['Carrefour surélevé contigu, trafic important', 'Débouché reporté au-delà des dispositifs de retenue, voie d’accès jumelée sur l’ouvrage ; écrans anti-éblouissement possibles.'],
        ['Carrefour surélevé contigu, trafic moyen', 'Alignement des dispositifs décalé de 5 à 10° maximum, ou musoir intégré (atténuateur si le trafic VL le justifie).'],
        ['Échangeur surélevé contigu', 'Analyse particulière ; dispositifs BLE, BHE ou LBE préconisés.'],
      ])}
    </section>
    <div class="ref-cols">
      <section class="panel ref-section"><h2>Autres interférences (§3)</h2><div class="prose">
        <p><strong>Gêne optique.</strong> Négligeable pour les usagers de la route. Pour les conducteurs de train : nulle sur LGV (signalisation en cabine), à évaluer sur ligne classique en jumelage étroit (dispositif anti-éblouissement éventuel).</p>
        <p><strong>Effet de souffle.</strong> Négligeable hors de la plate-forme ferroviaire, y compris pour les trains classiques jusqu’à 200 km/h.</p>
        <p><strong>Interférences électromagnétiques.</strong> À étudier au cas par cas (guide CEM RTE/Sétra).</p>
        <p><strong>Assainissement.</strong> Séparé pour chaque infrastructure et entretenu depuis chacune.</p>
        <p><strong>Sécurité du personnel.</strong> 3 m minimum aux conducteurs de moins de 50 kV ; alimentations ferroviaires en 25 kV alternatif ou 1,5 kV continu.</p>
      </div></section>
      <section class="panel ref-section"><h2>Priorités des constats</h2><div class="prose">
        ${Object.entries(E.PRIORITES).map(([k, v]) => `<p><span class="pill ${k.toLowerCase()}">${k}</span> <strong>${esc(v.titre)}.</strong> ${esc(v.desc)}</p>`).join('')}
        <p class="help">Les priorités sont proposées par l’application et restent modifiables dans l’onglet Constats.</p>
      </div></section>
    </div>
    <section class="panel ref-section"><h2>Modèles de dispositifs de retenue (annexe du guide, 2004)</h2>
      ${t(['Modèle', 'Composition', 'Niveau', 'Matériau', 'Référence', 'Domaine d’emploi'], E.CATALOGUE.map((c) => [c.nom, c.compo || '—', c.niveau, c.materiau, c.ref, c.emploi]))}
      <p class="help">Liste non exhaustive établie en 2004 : vérifier l’homologation ou le marquage CE des produits actuels.</p>
    </section>
    <section class="panel ref-section"><h2>Sigles</h2>
      ${t(['Sigle', 'Signification'], [['BAU', 'Bande d’arrêt d’urgence'], ['BDD', 'Bande dérasée de droite'], ['LBA', 'Séparateur lourd en béton'], ['LBE', 'LBA + écran de retenue de chargement'], ['BHO', 'Barrière hors ouvrage'], ['BHE', 'BHO + écran'], ['BN4', 'Barrière normale métallique'], ['BLE', 'BN4 + écran'], ['GS4 / GS2', 'Glissière métallique simple (supports tous les 4 m / 2 m)'], ['GRC', 'Glissière renforcée'], ['GBA', 'Glissière en béton adhérent'], ['DCV', 'Détecteur de chute de véhicules'], ['FA', 'Force horizontale de choc']])}
    </section>
    <p class="disclaimer">GÉFRA est un outil d’aide à la décision. Il transcrit les règles du guide technique Sétra « Géfra » (avril 2004, réf. 0401), qui reste le document de référence ; il ne le remplace pas et ne dispense pas de l’analyse de l’ingénieur. Les normes et homologations citées par le guide doivent être vérifiées dans leur version en vigueur.</p>`;
}

/* ================================================================ projets : actions */

async function actionProjet(action) {
  $('#proj-menu').hidden = true;
  $('#proj-menu-btn').setAttribute('aria-expanded', 'false');
  if (action === 'nouveau') {
    const nom = await saisir('Nouveau projet', 'Nom du projet', '');
    if (!nom) return;
    const p = M.nouveauProjet(nom);
    p.meta.projet = nom;
    ouvrirProjet(p);
    toast('Projet créé.');
  } else if (action === 'dupliquer') {
    const copie = JSON.parse(JSON.stringify(projet));
    copie.id = M.nouvelId('p');
    copie.nom = `${projet.nom} (copie)`;
    copie.exemple = false;
    ouvrirProjet(copie);
    toast('Projet dupliqué.');
  } else if (action === 'renommer') {
    const nom = await saisir('Renommer le projet', 'Nom du projet', projet.nom);
    if (!nom) return;
    projet.nom = nom;
    modifie();
    remplirSelectProjets();
  } else if (action === 'exporter-json') {
    X.telecharger(X.nomFichier(projet, 'projet', 'json'), JSON.stringify(projet, null, 2), 'application/json');
    toast('Projet exporté.');
  } else if (action === 'importer-json') {
    $('#file-json').click();
  } else if (action === 'theme') {
    const ordre = ['system', 'light', 'dark'];
    const t = ordre[(ordre.indexOf(Store.theme()) + 1) % 3];
    Store.definirTheme(t);
    appliquerTheme(t);
  } else if (action === 'supprimer') {
    if (!(await confirmer('Supprimer ce projet ?', `« ${projet.nom} » sera effacé de ce navigateur. Exportez-le d’abord en .json pour le conserver.`, 'Supprimer'))) return;
    Store.supprimer(projet.id);
    const reste = Store.liste();
    ouvrirProjet(reste.length ? Store.charger(reste[0].id) : projetExemple());
    toast('Projet supprimé.');
  }
}

async function importerJSON(fichier) {
  try {
    const p = JSON.parse(await fichier.text());
    if (!p || (p.format !== 'gefra-projet' && !Array.isArray(p.lignes))) throw new Error('format');
    p.id = M.nouvelId('p');
    p.exemple = false;
    ouvrirProjet(p);
    toast(`Projet « ${projet.nom} » importé.`);
  } catch {
    toast('Fichier non reconnu : choisissez un projet exporté par GÉFRA (.json).');
  }
}

function appliquerTheme(t) {
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const b = $('[data-action="theme"]');
  if (b) b.textContent = `Thème : ${{ system: 'système', light: 'clair', dark: 'sombre' }[t]}`;
}

async function executer(action, bouton) {
  try {
    if (action === 'ajouter-ligne') ajouterLigne();
    else if (action === 'coller') await collerDepuisExcel();
    else if (action === 'importer-tableau') $('#file-tableau').click();
    else if (action === 'modele') { await X.exporterModele(); toast('Modèle téléchargé.'); }
    else if (action === 'export-xlsx') { bouton.disabled = true; await X.exporterXlsx(projet); toast('Classeur Excel téléchargé.'); }
    else if (action === 'export-docx') { bouton.disabled = true; toast('Préparation du document Word…'); await X.exporterDocx(projet); toast('Document Word téléchargé.'); }
    else if (action === 'imprimer') { rendreRapport(); window.print(); }
    else if (action === 'trier') trierLignes();
    else if (action === 'constat-libre') ajouterConstatLibre();
    else if (action === 'assistant-vers-lineaire') assistantVersLineaire();
  } catch (err) {
    toast(err.message || 'L’opération a échoué.');
  } finally {
    if (bouton) bouton.disabled = false;
  }
}

/* ================================================================ initialisation */

function init() {
  appliquerTheme(Store.theme());
  if (!Store.disponible()) setEtat('Stockage local indisponible : exportez vos projets en .json', true);

  if (!Store.liste().length) vueParDefaut = 'comprendre';
  const id = Store.courant();
  let p = id ? Store.charger(id) : null;
  if (!p) {
    const l = Store.liste();
    p = l.length ? Store.charger(l[0].id) : null;
  }
  ouvrirProjet(p || projetExemple());

  $('#f-assistant').addEventListener('input', surSaisieAssistant);
  $('#f-assistant').addEventListener('change', surSaisieAssistant);
  $('#f-assistant').addEventListener('submit', (e) => e.preventDefault());
  $('#lin-table').addEventListener('input', surSaisieLineaire);
  $('#lin-table').addEventListener('change', surSaisieLineaire);
  $('#lin-table').addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    const tr = b?.closest('tr[data-id]');
    if (b && tr) actionLigne(b.dataset.action, tr.dataset.id);
  });
  $('#c-liste').addEventListener('input', surSaisieConstat);
  $('#c-liste').addEventListener('change', surSaisieConstat);
  $('#c-liste').addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (b) actionConstat(b.dataset.action, b.closest('[data-cid]'));
  });
  $('#c-filtres').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filtre]');
    if (!b) return;
    ui.filtre = b.dataset.filtre;
    rendreConstats();
  });
  $('#f-rapport').addEventListener('input', surSaisieRapport);
  $('#f-rapport').addEventListener('change', surSaisieRapport);
  $('#f-rapport').addEventListener('submit', (e) => e.preventDefault());
  $('#k-contenu').addEventListener('input', surSaisieCalcul);

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b || b.closest('#lin-table, #c-liste')) return;
    if (b.closest('#proj-menu')) actionProjet(b.dataset.action);
    else executer(b.dataset.action, b);
  });
  $('#proj-menu-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const m = $('#proj-menu');
    m.hidden = !m.hidden;
    $('#proj-menu-btn').setAttribute('aria-expanded', String(!m.hidden));
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu')) {
      $('#proj-menu').hidden = true;
      $('#proj-menu-btn').setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#proj-menu').hidden) {
      $('#proj-menu').hidden = true;
      $('#proj-menu-btn').focus();
    }
  });
  $('#proj-select').addEventListener('change', (e) => {
    const p2 = Store.charger(e.target.value);
    if (p2) ouvrirProjet(p2);
  });
  $('#file-json').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) importerJSON(f);
    e.target.value = '';
  });
  $('#file-tableau').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) importerTableau(f);
    e.target.value = '';
  });
  window.addEventListener('hashchange', routeur);
  window.addEventListener('beforeunload', () => {
    if (timerSave) { clearTimeout(timerSave); Store.enregistrer(projet); }
  });
  routeur();
}

init();
