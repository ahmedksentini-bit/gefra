import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluer, controler, casSC, parseTalus, fmtTalus, parsePK, fmtPK, coefChute, porteeChute,
  atteinteChargement, longueurAbords, merlonEmprise, implantationMerlon, rang,
} from '../js/engine.js';

test('cas de section courante selon L1 (bornes incluses à gauche)', () => {
  assert.equal(casSC(1.99), 'SC0');
  assert.equal(casSC(2), 'SC1');
  assert.equal(casSC(5.99), 'SC1');
  assert.equal(casSC(6), 'SC2');
  assert.equal(casSC(8), 'SC3');
  assert.equal(casSC(16.99), 'SC3');
  assert.equal(casSC(17), 'SC4');
  assert.equal(casSC(30), 'SC5');
  assert.equal(casSC(49.9), 'SC5');
  assert.equal(casSC(50), 'SC6');
});

test('exigences de section courante', () => {
  const r1 = evaluer({ zone: 'sc', L1: 4 });
  assert.equal(r1.exigence.niveauMin, 'H3');
  assert.deepEqual(r1.exigence.phys, { type: 'ecran', hMin: 3.5 });
  assert.equal(r1.solutions.length, 3);
  assert.equal(r1.solutions.find((s) => s.role === 'indiquée').id, 'SC1-S3');
  assert.equal(evaluer({ L1: 2.2 }).solutions.find((s) => s.role === 'indiquée').id, 'SC1-S1');
  assert.equal(evaluer({ L1: 5.6 }).solutions.find((s) => s.role === 'indiquée').id, 'SC1-S2');

  const r3 = evaluer({ L1: 12 });
  assert.equal(r3.exigence.niveauMin, 'H2');
  assert.equal(r3.exigence.phys.hMin, 3);

  const r4 = evaluer({ L1: 20 });
  assert.equal(r4.exigence.phys.type, 'merlon');
  assert.equal(r4.exigence.niveauMin, 'N2');

  const r5 = evaluer({ L1: 35 });
  assert.equal(r5.exigence.phys.type, 'fosse');
  assert.equal(r5.exigence.niveauMin, null);

  assert.equal(evaluer({ L1: 60 }).statut, 'casParCas');
  assert.equal(evaluer({ L1: 1.5 }).statut, 'horsDomaine');
  assert.equal(evaluer({ L1: '' }).statut, 'incomplet');
});

test('voie ferrée en contrebas : §4.2 quel que soit le dénivelé', () => {
  const r = evaluer({ L1: 7, position: 'ferBas', denivele: 12 });
  assert.equal(r.code, 'SC2');
});

test('voie ferrée au-dessus : seuils de dénivelé et pente 3/2', () => {
  assert.equal(evaluer({ L1: 7, position: 'ferHaut', denivele: 2.9 }).code, 'SC2');
  const raide = evaluer({ position: 'ferHaut', denivele: 4, talus: '3/2' });
  assert.equal(raide.code, 'FH1');
  assert.equal(raide.statut, 'aucune');
  const doux = evaluer({ position: 'ferHaut', denivele: 4, talus: '2/1' });
  assert.equal(doux.exigence.niveauMin, 'N2');
  assert.equal(evaluer({ position: 'ferHaut', denivele: 6, talus: '2/1' }).code, 'FH1');
  assert.equal(evaluer({ position: 'ferHaut', denivele: 6.1, talus: '3/1' }).statut, 'aucune');
  assert.equal(evaluer({ position: 'ferHaut', denivele: 4 }).statut, 'incomplet');
  assert.ok(evaluer({ position: 'ferHaut', denivele: 3.2, talus: '1/1' }).alertes.some((a) => a.p === 'P2'));
});

test('ouvrages, abords, carrefours', () => {
  assert.equal(evaluer({ zone: 'oa' }).exigence.niveauMin, 'H2');
  const fort = evaluer({ zone: 'oa', traficPL: 'fort' });
  assert.equal(fort.exigence.niveauMin, 'H3');
  assert.equal(fort.exigence.phys.hMin, 3);

  const ab = evaluer({ zone: 'abords', angle: 30 });
  assert.ok(Math.abs(ab.exigence.longueurMin - 100) < 1e-9);
  assert.equal(evaluer({ zone: 'abords', angle: 90, niveauOA: 'H3' }).exigence.niveauMin, 'H3');

  assert.equal(evaluer({ zone: 'carrefour', traficPL: 'fort' }).code, 'CA1');
  assert.equal(evaluer({ zone: 'carrefour' }).code, 'CA2');
});

test('plates-formes jumelées sur ouvrage : courbe de chute', () => {
  const atteint = evaluer({ zone: 'oaJum', L1: 20, ecartOA: 4, deniveleOA: 3 });
  assert.equal(atteint.exigence.phys.type, 'ecran');
  assert.equal(atteint.exigence.niveauMin, 'H2');
  const pas = evaluer({ zone: 'oaJum', L1: 20, ecartOA: 8, deniveleOA: 2 });
  assert.equal(pas.exigence.phys, null);
});

test('courbe de chute : coefficient du guide ≈ 0,111', () => {
  const { vt, k } = coefChute(70, 20);
  assert.ok(Math.abs(vt - 6.65) < 0.01);
  assert.ok(Math.abs(k - 0.111) < 0.001);
  assert.ok(Math.abs(porteeChute(4, k) - 6) < 0.05);
  assert.equal(atteinteChargement(5, 4, k).atteint, true);
  assert.equal(atteinteChargement(7, 4, k).atteint, false);
  assert.equal(atteinteChargement(3, -1, k).atteint, false);
});

test('géométrie : abords et merlon', () => {
  assert.equal(longueurAbords(90), 50);
  assert.ok(Math.abs(longueurAbords(150) - 100) < 1e-9);
  assert.equal(longueurAbords(0), null);
  assert.equal(merlonEmprise({ h: 3, crete: 3 }), 17);
  const imp = implantationMerlon(17);
  assert.equal(imp.crete, 3);
  assert.ok(imp.faisable);
  assert.equal(implantationMerlon(25).crete, 4);
});

test('analyse des saisies', () => {
  assert.equal(parseTalus('3/2'), 1.5);
  assert.equal(parseTalus('3H/2V'), 1.5);
  assert.equal(parseTalus('1,5'), 1.5);
  assert.equal(parseTalus(''), null);
  assert.equal(fmtTalus(1.5), '3/2');
  assert.equal(fmtTalus(2), '2/1');
  assert.equal(parsePK('1+250'), 1250);
  assert.equal(parsePK('PK 12+345,5'), 12345.5);
  assert.equal(parsePK('980'), 980);
  assert.equal(fmtPK(1250), '1+250');
  assert.equal(fmtPK(980), '0+980');
  assert.equal(rang('H3/H4'), 4);
  assert.equal(rang(''), -1);
});

test('contrôle de conformité', () => {
  const ok = controler({ L1: 7, projet: 'lbe' });
  assert.equal(ok.statut, 'conforme');

  const n2 = controler({ L1: 7, projet: 'n2' });
  assert.equal(n2.priorite, 'P0');
  assert.ok(n2.ecarts.length >= 2);

  const bas = controler({ L1: 12, projet: 'bhe', hauteur: 2.5 });
  assert.equal(bas.priorite, 'P1');

  const merlonDoux = controler({ L1: 20, projet: 'merlon', hauteur: 3, merlonTalusRoute: '2/1' });
  assert.equal(merlonDoux.priorite, 'P1');

  const ecranAuLieuMerlon = controler({ L1: 20, projet: 'bhe', hauteur: 3 });
  assert.equal(ecranAuLieuMerlon.priorite, 'P2');

  const acces = controler({ L1: 4, projet: 'lbe', acces: 'oui' });
  assert.equal(acces.priorite, 'P0');

  const abords = controler({ zone: 'abords', angle: 45, projet: 'h2', longueurProjetee: 50 });
  assert.equal(abords.priorite, 'P1');

  const lbeOA = controler({ zone: 'oa', projet: 'lbe' });
  assert.ok(lbeOA.ecarts.some((e) => /rive/.test(e.ecart)));

  const carrefour = controler({ zone: 'carrefour', traficPL: 'fort', amenagement: 'aucun' });
  assert.equal(carrefour.priorite, 'P0');
  assert.equal(controler({ zone: 'carrefour', amenagement: 'decale', decalageAngle: 12 }).priorite, 'P1');

  assert.equal(controler({ L1: 7 }).statut, 'nonRenseigne');
  assert.equal(controler({ position: 'ferHaut', denivele: 8, projet: 'aucun' }).statut, 'conforme');
  assert.equal(controler({ L1: 1.5, projet: 'murBA' }).priorite, 'P0');
});
