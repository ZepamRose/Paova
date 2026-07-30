import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accessibleAccent,
  button,
  buttonColors,
  contrastOnWhite,
  escapeHtml,
  heading,
  hint,
  paragraph,
  renderEmail,
  signature,
} from "./email-layout.ts";

const base = {
  title: "Titre",
  businessName: "Escape Lyon",
  brandColor: "#5e926c",
  blocks: [heading("Bonjour"), paragraph("Texte", "Texte")],
};

// --------------------------------------------------------- colour safety
test("accessibleAccent laisse passer une couleur deja lisible", () => {
  const dark = "#1f2937";
  assert.equal(accessibleAccent(dark), dark);
  assert.ok(contrastOnWhite(dark) >= 4.5);
});

test("accessibleAccent fonce une couleur pale jusqu'au seuil AA", () => {
  for (const pale of ["#f5e960", "#ffd1dc", "#a8e6cf", "#ffffff"]) {
    const fixed = accessibleAccent(pale);
    assert.ok(
      contrastOnWhite(fixed) >= 4.5,
      `${pale} -> ${fixed} : ${contrastOnWhite(fixed).toFixed(2)}:1`,
    );
  }
});

test("accessibleAccent conserve la dominante de teinte", () => {
  // un jaune reste plus rouge+vert que bleu apres correction
  const fixed = accessibleAccent("#f5e960");
  const r = parseInt(fixed.slice(1, 3), 16);
  const b = parseInt(fixed.slice(5, 7), 16);
  assert.ok(r > b, `${fixed} devrait rester jaune`);
});

test("accessibleAccent rejette une entree invalide sans planter", () => {
  assert.equal(accessibleAccent("pas une couleur"), "#1f2937");
  assert.equal(accessibleAccent(""), "#1f2937");
});

// -------------------------------------------------------------- shell
test("le document porte les garde-fous des clients e-mail", () => {
  const { html } = renderEmail(base);
  assert.ok(html.startsWith("<!DOCTYPE html PUBLIC"), "doctype XHTML pour Word");
  assert.ok(html.includes('lang="fr"'));
  assert.ok(html.includes("charset=UTF-8"));
  assert.ok(html.includes("x-apple-disable-message-reformatting"));
  assert.ok(html.includes('name="color-scheme"'));
  assert.ok(html.includes("<!--[if mso]>"), "table de repli Outlook");
  assert.ok(html.includes("<title>"));
});

test("toutes les tables de mise en page sont masquees aux lecteurs d'ecran", () => {
  const { html } = renderEmail({
    ...base,
    blocks: [...base.blocks, button({ href: "https://x.test", label: "Ok", color: "#5e926c" })],
  });
  const tables = html.match(/<table/g) ?? [];
  const presentation = html.match(/<table role="presentation"/g) ?? [];
  assert.equal(tables.length, presentation.length, "chaque <table> doit etre role=presentation");
});

test("le preheader est present et rembourre", () => {
  const { html } = renderEmail({ ...base, preheader: "Aperçu boîte de réception" });
  assert.ok(html.includes("Aperçu boîte de réception"));
  assert.ok(html.includes("mso-hide:all"));
  // le rembourrage empeche Gmail de tirer le corps dans l apercu
  assert.ok(html.includes("&#8199;&#65279;&#847;"));
});

test("le preheader retombe sur le titre", () => {
  const { html } = renderEmail(base);
  assert.ok(html.includes("Titre"));
});

// -------------------------------------------------------------- header
test("sans logo client, l'en-tete porte le symbole Paova officiel", () => {
  const { html } = renderEmail(base);
  assert.ok(html.includes("<svg"), "le symbole doit etre en ligne");
  assert.ok(html.includes("M35.16 86.9C"), "geometrie officielle du bol");
  assert.ok(html.includes("M39.63 46.82C"), "geometrie officielle du fut");
  assert.ok(html.includes('aria-label="Paova"'));
});

test("le mot paova est du vrai texte, pas seulement le SVG", () => {
  // Gmail et Outlook suppriment <svg> : le mot doit survivre sans lui
  const { html } = renderEmail(base);
  const withoutSvg = html.replace(/<svg[\s\S]*?<\/svg>/g, "");
  assert.ok(withoutSvg.includes(">paova<"), "repli lisible sans SVG");
  assert.ok(withoutSvg.includes("Escape Lyon"));
});

test("un logo client remplace le symbole Paova", () => {
  const { html } = renderEmail({ ...base, logoUrl: "https://x.test/a.png" });
  assert.ok(!html.includes("<svg"), "pas de co-marquage impose");
  assert.ok(html.includes("https://x.test/a.png"));
});

test("le symbole n'embarque ni degrade ni clipPath", () => {
  // le fichier officiel en compte 9 et 2 : illisibles en e-mail et lourds
  const { html } = renderEmail(base);
  assert.ok(!html.includes("linearGradient"));
  assert.ok(!html.includes("clipPath"));
});

// ---------------------------------------------------------- escaping
test("le nom de l'etablissement est echappe dans l'en-tete", () => {
  const { html } = renderEmail({ ...base, businessName: '<script>alert(1)</script>' });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("l'URL du logo et son alt sont echappes", () => {
  const { html } = renderEmail({
    ...base,
    businessName: 'Bar "Le Coin"',
    logoUrl: 'https://x.test/a.png?a=1&b=2',
  });
  assert.ok(html.includes("a=1&amp;b=2"));
  assert.ok(html.includes("&quot;Le Coin&quot;"));
  assert.ok(!/alt=""/.test(html), "le logo doit porter le nom, pas un alt vide");
});

test("le href du bouton est echappe", () => {
  const b = button({ href: 'https://x.test/?a="><script>', label: "Ok", color: "#5e926c" });
  assert.ok(!b.html.includes('"><script>'));
  assert.ok(b.html.includes("&quot;&gt;&lt;script&gt;"));
});

test("la note de pied de page du client est echappee", () => {
  const { html } = renderEmail({ ...base, footerNote: "<b>gras</b>" });
  assert.ok(!html.includes("<b>gras</b>"));
  assert.ok(html.includes("&lt;b&gt;gras&lt;/b&gt;"));
});

// ------------------------------------------------------------ button
test("le bouton met son padding sur le td, pas sur le lien", () => {
  const b = button({ href: "https://x.test", label: "Signer", color: "#5e926c" });
  // Word ignore le padding sur un <a> : il doit vivre sur la cellule
  assert.match(b.html, /<td[^>]*padding:14px 24px/);
  assert.ok(b.html.includes('bgcolor="'), "repli bgcolor pour Outlook");
});

test("le bouton garde la couleur du client quand elle est deja lisible", () => {
  const { bg, fg } = buttonColors("#c2410c");
  assert.equal(bg, "#c2410c", "une couleur foncee ne doit pas etre touchee");
  assert.equal(fg, "#ffffff");
});

test("une couleur pale garde sa teinte exacte et prend un texte sombre", () => {
  // plutot que virer au olive pour supporter du blanc, on inverse le libelle
  const { bg, fg } = buttonColors("#f5e960");
  assert.equal(bg, "#f5e960", "la couleur du client doit rester intacte");
  assert.notEqual(fg, "#ffffff");
});

test("seules les valeurs intermediaires sont assombries", () => {
  const { bg, fg } = buttonColors("#5e926c");
  assert.notEqual(bg, "#5e926c");
  assert.equal(fg, "#ffffff");
});

test("tout couple bouton atteint AA, quelle que soit la couleur", () => {
  const lum = (h: string) => {
    const ch = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return (
      0.2126 * ch(parseInt(h.slice(1, 3), 16)) +
      0.7152 * ch(parseInt(h.slice(3, 5), 16)) +
      0.0722 * ch(parseInt(h.slice(5, 7), 16))
    );
  };
  for (const c of [
    "#f5e960", "#ffffff", "#000000", "#5e926c", "#c2410c",
    "#a8e6cf", "#7f7f7f", "#1d4ed8", "#fde68a", "#111827",
  ]) {
    const { bg, fg } = buttonColors(c);
    const [hi, lo] = [lum(bg), lum(fg)].sort((a, b) => b - a);
    const ratio = (hi + 0.05) / (lo + 0.05);
    assert.ok(ratio >= 4.5, `${c} -> fond ${bg} / texte ${fg} : ${ratio.toFixed(2)}:1`);
  }
});

// -------------------------------------------------------- plain text
test("chaque bloc produit son equivalent texte", () => {
  const { text } = renderEmail({
    ...base,
    blocks: [
      heading("Titre"),
      paragraph("<strong>gras</strong>", "gras"),
      button({ href: "https://x.test/aller", label: "Aller", color: "#5e926c" }),
      hint("aide", "aide"),
      signature("— L'équipe"),
    ],
  });
  assert.ok(!text.includes("<"), "le texte brut ne doit contenir aucun balisage");
  assert.ok(text.includes("https://x.test/aller"), "l'URL du CTA doit rester atteignable");
  assert.ok(text.includes("Escape Lyon"));
  assert.ok(text.includes("Envoyé via Paova."));
});

test("le texte brut ne laisse pas de trous de lignes vides", () => {
  const { text } = renderEmail(base);
  assert.ok(!/\n{3,}/.test(text));
  assert.equal(text, text.trim());
});

// ----------------------------------------------------------- footer
test("la note du client precede la mention Paova", () => {
  const { html } = renderEmail({ ...base, footerNote: "Ma mention légale" });
  assert.ok(html.indexOf("Ma mention légale") < html.indexOf("Envoyé via"));
});

test("sans note du client, la mention Paova reste seule", () => {
  const { html } = renderEmail(base);
  assert.ok(html.includes("Envoyé via"));
});

// ------------------------------------------------------------ utils
test("escapeHtml couvre les cinq caracteres sensibles", () => {
  assert.equal(escapeHtml(`<>&"'`), "&lt;&gt;&amp;&quot;&#39;");
});
