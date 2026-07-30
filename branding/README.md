# Paova Branding

## Référence officielle

Le fichier `reference-finale.png` est la direction artistique officielle de Paova.

Cette image ne doit pas être utilisée directement dans l'application.

Elle sert uniquement de référence pour créer :

- le logo SVG
- l'icône de l'application
- le favicon
- les couleurs
- la typographie

## Objectif

Créer une identité visuelle premium, moderne et intemporelle.

Toute évolution devra rester fidèle à cette direction artistique.

## Assets de production

Tous générés depuis les deux SVG officiels — aucun redessin, aucune retouche de
couleur. Régénérables à l'identique.

**Icônes** (dans `public/`) : `favicon.ico` (16+32+48, charges PNG),
`favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180),
`android-chrome-192x192.png`, `android-chrome-512x512.png`,
`icon-maskable-192x192.png`, `icon-maskable-512x512.png`, `site.webmanifest`.

**Exports** (dans `branding/exports/`) : symbole en 1x/2x/4x (256/512/1024 px de
haut), logotype et sa variante claire en 1x/2x/4x (360/720/1440 px de large).
Tous en PNG à fond transparent, rognés sur la boîte d'encre exacte — le viewBox
du symbole porte ~2 unités de marge asymétrique qu'il ne faut pas cuire dans
chaque asset.

### Deux décisions qui n'existent pas dans les fichiers sources

Le symbole est transparent et au format 0,786 : 1. Une icône est carrée et
opaque : il a donc fallu trancher un fond et un cadrage.

**Fond `#0F172A`**, la valeur sombre de la palette officielle — et non une
pipette sur le dégradé de la maquette, qui donnerait `#101818`.

**Cadrage** : le symbole occupe 70 % de la hauteur du carré (proportion relevée
sur la planche), 56 % pour les icônes *maskable* afin de tenir dans la zone sûre
d'Android. Vérifié : rayon d'encre 0,331 côté pour une limite de 0,400.
Aux petites tailles la marge se resserre — 86 % à 32 px, **94 % à 16 px** — car
un favicon n'a que 16 pixels et le chrome du navigateur fournit déjà la
séparation. Testé contre 86 / 94 / 100 % : à 100 % la forme touche le bord.

Le débordement d'`android-chrome-512` hors du cercle des 80 % est normal : les
icônes `purpose: any` sont affichées telles quelles, jamais masquées.

### Limite connue

À 16 px, le symbole ne peut pas montrer la structure de son ruban : il lui reste
15 pixels de haut. Il lit comme une silhouette verte, correctement — c'est une
propriété de la complexité du symbole, pas un défaut de génération, et aucun
réglage d'échelle n'y change quoi que ce soit.

### Régénérer

Le générateur vit hors dépôt. Pour reproduire : rendre les SVG via `sharp`,
rogner sur la boîte d'encre `(0.638, 0.658, 97.212, 123.712)` du viewBox
`100 × 128.3`, composer sur `#0F172A` aux fractions ci-dessus. Le `.ico` est un
conteneur ICONDIR + charges PNG.

## Intégration dans l'application

| Emplacement | Fichier | Usage |
|---|---|---|
| `public/brand/paova-mark.svg` | copie servie du symbole | chrome applicatif + favicon vectoriel |
| `public/*.png`, `favicon.ico` | icônes générées | favicons, Apple Touch, Android, PWA |
| `public/site.webmanifest` | manifeste | déclaré via `metadata.manifest` |

`src/components/brand-logo.tsx` compose **le symbole + le nom du produit dans la
police d'interface**, pas le logotype officiel. C'est délibéré : le composant
rend entre 22 et 30 px de haut, or le mot en Newsreader exige 96 px de large au
minimum (voir plus bas). Le logotype officiel reste la signature de marque —
marketing, e-mails, documents — le chrome applicatif utilise le symbole.

**Le symbole est portrait (0,7794 : 1), pas carré.** L'ancien placeholder l'était,
et tous les usages posaient `width === height`. Chaque `<img>` fixe désormais la
hauteur et laisse `w-auto` déduire la largeur : le rapport ne peut plus être
écrasé par un futur changement de taille. Vérifié au rendu : 0,779 partout.

Les logotypes ne sont **pas** copiés dans `public/` : rien ne les sert
aujourd'hui (les e-mails affichent le logo du client, pas celui de Paova). Les
copier depuis `branding/` le jour où une page marketing ou une image Open Graph
en aura besoin.

### Favicon : SVG ou PNG

Les deux sont déclarés, le SVG en dernier — les navigateurs modernes le
préfèrent, les anciens retombent sur le PNG. Le SVG est transparent, les PNG
portent le fond `#0F172A` incrusté.

Contre-intuitivement, **le SVG transparent est le meilleur des deux sur fond
sombre** : les barres d'onglets sombres (Chrome `#202124`, Firefox `#2b2a33`)
sont plus claires que `#0F172A`, donc le symbole y contraste davantage sans le
pavé bleu nuit du PNG. Testé sur les trois fonds avant d'arbitrer.

## Logotype horizontal

`paova-logotype.svg` — version principale, fonds sombres.
`paova-logotype-light.svg` — fonds clairs, mot en `#0F172A`.

Les deux sont identiques hors la couleur du mot. Le symbole y est embarqué tel
quel (mêmes tracés, mêmes dégradés, ids préfixés `lg-`), et le mot est
**vectorisé en tracés** : aucune dépendance à une police installée, aucun risque
de repli typographique.

### Typographie

**Newsreader**, instance **wght 400 / opsz 72**, SIL Open Font License —
fichier et licence dans `fonts/`. Retenue après mesure comparative de 14 serifs
libres contre la direction artistique : elle reproduit à la fois le contraste
(4,15 contre 4,00 visé), la graisse de fût (18,6 % de la hauteur d'x contre
18,9 %) et surtout la profondeur de jambage (0,392 contre 0,394), qui gouverne
l'assise du mot sous la ligne de base. `opsz 72` n'est pas cosmétique : c'est
cette valeur qui affine les filets et cale le jambage.

### Proportions

Toutes les mesures sont exprimées en **XREF** = hauteur d'encre du mot au-dessus
de la ligne de base (haut de la panse du `p`), soit 1055 unités de police.
C'est la seule unité qui reste vraie à toutes les échelles.

| Grandeur | Valeur | En unités viewBox |
|---|---|---|
| viewBox | — | `0 0 348.7 100` |
| Rapport largeur / hauteur | **3,487 : 1** | — |
| XREF (hauteur d'x du mot) | 1055 u | 47,42 |
| Hauteur du symbole | **2,109 × XREF** | 100 |
| Largeur du symbole | 1,657 × XREF | 78,58 |
| Écart symbole → mot | **0,641 × XREF** | 30,39 |
| Largeur du mot | 5,056 × XREF | 239,73 |
| Jambage du `p` | 0,422 × XREF | 20,00 |

Taille et écart sont relevés sur `reference-finale.png` (2,109 et 0,641 mesurés
sur la planche). L'écart a été validé indépendamment : le blanc entre symbole et
mot vaut **2,39 fois le blanc inter-lettres**, soit une chasse de mot — le
symbole et le mot lisent comme une unité sans se coller.

### Alignement vertical

Le symbole est **centré sur la bande de hauteur d'x**, pas sur le bloc complet
du mot ni sur la ligne de base. Concrètement son encre descend 0,175 × XREF
sous le jambage du `p`.

La planche plaçait le symbole 0,094 × XREF plus haut. Corrigé après comparaison
de quatre calages : aligné sur le jambage, le symbole flotte au-dessus du mot ;
centré sur le bloc complet, il sombre. Le centrage sur la hauteur d'x est aussi
ce que confirme la mesure — le barycentre d'encre du symbole tombe à 49,3 % de
sa hauteur, donc centrer sa boîte le centre optiquement.

### Crénage

Crénage **optique**, obtenu en égalisant l'aire de blanc entre paires. La
contribution de chaque ligne est bornée à 0,42 × hauteur d'x : sans cette borne,
le grand coin de blanc d'une paire ouverte comme `va` domine l'intégrale et
referme la paire, tandis que `ao`, qui n'offre qu'un couloir étroit, s'écarte
exagérément.

| Paire | Natif | Retenu | Écart (/1000 em) |
|---|---|---|---|
| `pa` | 0 | **+30** | +15 |
| `ao` | −15 | **+28** | +21 |
| `ov` | −47 | **−70** | −12 |
| `va` | −50 | **−142** | −46 |

Dispersion des blancs ramenée de **24 % à 0 %**. Écart minimal le plus serré :
124 unités sur `va`, soit 12 % de la hauteur d'x — vérifié sans collision.
Aucun interlettrage global n'est appliqué.

### Tailles minimales

La hauteur d'x vaut 0,136 × la largeur du logotype. Newsreader tient jusqu'à
13 px de hauteur d'x (mesuré : 17 % de filets fantômes), d'où :

- **plancher absolu : 96 px de large**
- **usage courant : 120 px minimum**
- en dessous, utiliser le symbole seul

### Zone de protection

Réserver **0,3 × la hauteur du logotype** sur les quatre côtés, soit 30 unités
viewBox — la valeur de l'écart symbole-mot. La respiration extérieure suit ainsi
le rythme interne du logotype.

### Reproduire ou modifier

Le mot est vectorisé : il n'est plus éditable comme du texte. Pour changer une
proportion, regénérer depuis `fonts/Newsreader[opsz,wght].ttf` avec les valeurs
ci-dessus plutôt que déplacer des tracés à la main. Le symbole ne doit jamais
être édité dans le logotype : éditer `paova-mark.svg` et regénérer.

## `paova-mark.svg` — symbole

Géométrie **validée et figée**. Les deux contours `#pbowl` et `#pstem` sont
déclarés une seule fois dans `<defs>` et réutilisés par chaque calque via
`<use>` : il n'existe qu'une source de vérité pour la forme. Modifier le dessin
= éditer ces deux `d`, nulle part ailleurs.

Aucun filtre SVG (`feGaussianBlur`…) ni mode de fusion (`mix-blend-mode`) :
ils coûtent cher, rendent différemment selon les moteurs et se dégradent à
l'impression — or le symbole finit dans les PDF de décharge générés par
l'application. Tout tient en dégradés, `clipPath` et transparences, que tous
les moteurs interprètent de la même façon.

### Structure des calques

Le rendu a été relevé sur `reference-finale.png`, pas inventé. Le ruban y est en
verre dépoli, translucide, éclairé **par la tranche depuis le haut-gauche** :
ses bords sont clairs et son cœur sombre, l'inverse d'un aplat. Chaque forme
empile, du bas vers le haut :

| # | Calque | Rôle |
|---|---|---|
| 1 | `paovaBowl` / `paovaStem` | dégradé de base, à `fill-opacity .94` — le fond transparaît un peu. Pas plus bas : chaque point d'opacité cédé ici est du contraste perdu à 24 px, où seule la silhouette porte la marque. |
| 2 | `frost` | le voile laiteux du dépoli. Un verre dépoli diffuse la lumière au lieu de la réfléchir ; sans ce voile le ruban lit comme de l'acrylique teinté. |
| 3 | `coreBowl` / `coreStem` | voile sombre qui creuse le cœur du ruban. |
| 4 | `depthBowl` / `depthStem` | la profondeur au croisement. Les deux formes **ne se chevauchent jamais** (mesuré : 0 px, écart minimal 4,79 unités) : le passage devant/derrière est entièrement peint. |
| 5 | `facetDark` | les plis. Un ruban plié lit comme des plans se rencontrant sur une arête ; sans eux il lit comme un tube. Chaque facette = l'arête mesurée sur la référence, plus un balayage largement hors forme que le `clipPath` efface — d'où des chemins très courts. Les contours qui doublent chaque facette étalent sa couleur de part et d'autre : un pli dans du verre dépoli n'est pas une arête de couteau. |
| 6 | `rimSoft` / `rimHot` | halo interne et reflet de bord : 11 contours fins emboîtés dont le clip ne garde que la moitié intérieure, les plus étroits nettement plus lumineux. Beaucoup de couches faibles plutôt que quelques-unes marquées, sinon un vrai moteur affiche des bandes concentriques façon courbes de niveau. |

Les dégradés des calques 2 à 6 sont orientés haut-gauche → bas-droite, la
lumière de la référence. C'est ce qui évite au halo de cerner la forme comme un
autocollant.

### Calage tonal mesuré

Luminance dans la silhouette, symbole contre référence :

| | p2 | p50 | p98 | étendue p10–p90 |
|---|---|---|---|---|
| Référence | 44 | 80 | 172 | 83 |
| Symbole | 45 | 76 | 162 | 80 |

Contraste forme/fond : **65 à 48 px**, **63 à 24 px**.

### Limites connues

- Sur **fond blanc**, le haut-gauche du bol pâlit : le halo et le voile sont
  conçus pour un fond sombre. Reste lisible jusqu'à 24 px. Pour un usage courant
  sur fond clair, prévoir une variante à aplat plus dense.
- Le symbole **ne se croise pas réellement** : les deux formes sont séparées de
  4,79 unités et aucun contour ne s'auto-intersecte. Un vrai entrelacs
  demanderait de rouvrir la géométrie.

### Optimisation

Le fichier est optimisé pour la production : 9,1 Ko (2,2 Ko gzip), aucune
définition inutilisée, aucun tracé dupliqué. L'**ordre de peinture compte** —
les facettes se recouvrent, donc regrouper les remplissages avant les contours
changerait le résultat. Toute retouche doit être vérifiée en rendu pixel à
pixel sur plusieurs tailles et sur deux moteurs au moins (librsvg pour le PDF,
un navigateur pour le web).