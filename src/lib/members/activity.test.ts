import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMemberActivity, isDormantActivity } from "./activity.ts";

const NOW = new Date("2025-10-14T16:00:00");
const at = (iso: string) => ({ status: "active", lastSignInAt: iso });

test("une invitation ne parle jamais de connexion", () => {
  assert.equal(
    formatMemberActivity({ status: "invited", lastSignInAt: null }, NOW),
    "Invitation en attente",
  );
  // même si un last_sign_in traîne, l'état d'invitation prime
  assert.equal(
    formatMemberActivity(
      { status: "invited", lastSignInAt: "2025-10-14T09:00:00" },
      NOW,
    ),
    "Invitation en attente",
  );
});

test("un accès désactivé le dit plutôt que d'afficher une date", () => {
  assert.equal(
    formatMemberActivity({ status: "disabled", lastSignInAt: "2025-10-01T09:00:00" }, NOW),
    "Accès désactivé",
  );
});

test("un compte actif sans connexion est distingué d'une invitation", () => {
  assert.equal(
    formatMemberActivity({ status: "active", lastSignInAt: null }, NOW),
    "Jamais connecté",
  );
  assert.equal(
    formatMemberActivity({ status: "active", lastSignInAt: "   " }, NOW),
    "Jamais connecté",
  );
});

test("aujourd'hui porte l'heure, pas le jour", () => {
  assert.equal(
    formatMemberActivity(at("2025-10-14T14:22:00"), NOW),
    "Aujourd'hui à 14:22",
  );
});

test("hier reste hier même à une heure d'écart", () => {
  // 23h50 la veille : moins de 24 h, mais un autre jour calendaire
  assert.equal(formatMemberActivity(at("2025-10-13T23:50:00"), NOW), "Hier");
  assert.equal(formatMemberActivity(at("2025-10-13T00:10:00"), NOW), "Hier");
});

test("les jours proches se comptent en jours", () => {
  assert.equal(formatMemberActivity(at("2025-10-11T09:00:00"), NOW), "Il y a 3 jours");
  assert.equal(formatMemberActivity(at("2025-10-08T09:00:00"), NOW), "Il y a 6 jours");
});

test("au-delà d'une semaine on change d'unité", () => {
  assert.equal(formatMemberActivity(at("2025-10-06T09:00:00"), NOW), "Il y a une semaine");
  assert.equal(formatMemberActivity(at("2025-09-25T09:00:00"), NOW), "Il y a 2 semaines");
});

test("au-delà d'un mois on donne la date", () => {
  const out = formatMemberActivity(at("2025-06-02T09:00:00"), NOW);
  assert.match(out, /2025/);
  assert.ok(!out.includes("Il y a"), out);
});

test("une date future n'affiche jamais un décalage négatif", () => {
  // dérive d'horloge ou connexion en cours de requête
  const out = formatMemberActivity(at("2025-10-14T16:00:01"), NOW);
  assert.ok(out.startsWith("Aujourd'hui"), out);
});

test("une date illisible retombe sur Jamais connecté", () => {
  assert.equal(formatMemberActivity(at("pas une date"), NOW), "Jamais connecté");
});

test("isDormantActivity distingue les lignes vivantes des autres", () => {
  assert.equal(isDormantActivity(at("2025-10-14T14:00:00")), false);
  assert.equal(isDormantActivity({ status: "active", lastSignInAt: null }), true);
  assert.equal(isDormantActivity({ status: "invited", lastSignInAt: null }), true);
});
