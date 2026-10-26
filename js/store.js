/*
 * GÉFRA — stockage local des projets (localStorage du navigateur).
 * Aucune donnée ne quitte le poste : l'échange se fait par export / import JSON.
 */

const K = {
  index: 'gefra:index',
  courant: 'gefra:courant',
  theme: 'gefra:theme',
  projet: (id) => `gefra:p:${id}`,
};

function lire(cle) {
  try {
    const v = localStorage.getItem(cle);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

function ecrire(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
    return true;
  } catch {
    return false;
  }
}

export const Store = {
  disponible() {
    try {
      localStorage.setItem('gefra:test', '1');
      localStorage.removeItem('gefra:test');
      return true;
    } catch {
      return false;
    }
  },
  liste() {
    const l = lire(K.index);
    return Array.isArray(l) ? l.sort((a, b) => (b.maj ?? 0) - (a.maj ?? 0)) : [];
  },
  charger(id) {
    return lire(K.projet(id));
  },
  enregistrer(projet) {
    const ok = ecrire(K.projet(projet.id), projet);
    if (!ok) return false;
    const l = Store.liste().filter((e) => e.id !== projet.id);
    l.push({ id: projet.id, nom: projet.nom, maj: projet.maj });
    return ecrire(K.index, l);
  },
  supprimer(id) {
    try { localStorage.removeItem(K.projet(id)); } catch { /* stockage indisponible */ }
    ecrire(K.index, Store.liste().filter((e) => e.id !== id));
  },
  courant() {
    return lire(K.courant);
  },
  definirCourant(id) {
    ecrire(K.courant, id);
  },
  theme() {
    return lire(K.theme) || 'system';
  },
  definirTheme(t) {
    ecrire(K.theme, t);
  },
};
