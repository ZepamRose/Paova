# Refonte des largeurs du Dashboard — Premium Polish

## Philosophie

Passage d'un layout "article" étroit (768px) à une approche **premium respirante** inspirée de Linear et Vercel :

- Contenu toujours centré
- Largeurs progressives selon le type de contenu
- Exploitation optimale des écrans 13", 15/16", 24" et 27"
- Sensation de majesté et d'espace sans jamais tomber dans le pleine largeur

---

## Changements de largeurs

### Nouvelles variables CSS custom (globals.css)

```css
--width-dashboard: 1360px;       /* Dashboard principal - généreux et respirant */
--width-dashboard-wide: 1440px;  /* Variant extra-large pour vues data-heavy */
```

### Classes utilitaires ajoutées

```css
.max-w-dashboard { max-width: var(--width-dashboard); }
.max-w-dashboard-wide { max-w: var(--width-dashboard-wide); }
```

---

## Hiérarchie des largeurs par type de page

| Page / Section | Avant | Après | Justification |
|---|---|---|---|
| **Dashboard principal** (`page.tsx`) | `max-w-3xl` (768px) | `max-w-dashboard` (1360px) | Le Hero est la pièce maîtresse — il doit respirer |
| **Groupes** (`groupes/page.tsx`, `groupes/[id]/page.tsx`) | `max-w-3xl` (768px) | `max-w-7xl` (1280px) | Listes et tableaux de progression gagnent en lisibilité |
| **Signatures** (`signatures/page.tsx`) | `max-w-3xl` (768px) | `max-w-7xl` (1280px) | Recherche et résultats tabulaires exploitent mieux l'espace |
| **Billing** (`billing/page.tsx`) | `max-w-3xl` (768px) | `max-w-dashboard` (1360px) | Information critique mérite un traitement premium |
| **Settings** (`settings/page.tsx`) | `max-w-5xl` (1024px) | `max-w-6xl` (1152px) | Légère augmentation pour tableaux de configuration |
| **Membres** (`settings/membres/page.tsx`) | `max-w-5xl` (1024px) | `max-w-6xl` (1152px) | Roster d'équipe plus confortable |
| **Archives** (`archives/page.tsx`) | `max-w-5xl` (1024px) | `max-w-6xl` (1152px) | Listes d'archives gagnent en clarté |
| **Pages de création** (forms étroits) | `max-w-3xl` (768px) | **Inchangé** | Les formulaires restent à largeur "article" optimale |

---

## Ajustements d'espacements

### Dashboard Principal (`page.tsx`)

- **Padding horizontal** : `px-4` → `px-5` (mobile), `px-6` → `px-8` (sm), ajout `px-10` (lg)
- **Padding vertical** : `py-4` → `py-5` (mobile), `py-8` → `py-9` (sm)
- **Gap entre sections** : `gap-5` maintenu, ajout `sm:gap-6`
- **Gradient background** : hauteur `h-72` → `h-96` pour accompagner la largeur

### Hero (`dashboard-business-hero.tsx`)

**Conteneur principal :**
- Border radius : `rounded-[1.4rem]` → `rounded-[1.5rem]`
- Padding : `p-4` → `p-5`, `sm:p-5` → `sm:p-6`, ajout `lg:p-7`
- Gap interne : `gap-3` → `gap-4`, `sm:gap-[1.15rem]` → `sm:gap-[1.3rem]`

**Titre business :**
- Taille (Pro) : `text-[1.65rem]` → `text-[1.7rem]`, `sm:text-[2.2rem]` → `sm:text-[2.35rem]`, ajout `lg:text-[2.5rem]`
- Taille (Free) : `text-[1.6rem]` → `text-[1.65rem]`, `sm:text-[2.05rem]` → `sm:text-[2.15rem]`, ajout `lg:text-[2.3rem]`
- Gap vertical : `gap-[0.4rem]` → `gap-[0.45rem]`

**Badge rôle & nom :**
- Gap horizontal : `gap-x-2` → `gap-x-2.5`
- Gap vertical : `gap-y-1` → `gap-y-1.5`
- Padding top : `pt-0.5` → `pt-1`
- Taille texte : `text-[13px]` → `text-[13.5px]`

**Barre de quota :**
- Hauteur : `h-[3px]` → `h-[3.5px]`
- Max width : `max-w-[13rem]` → `max-w-[14rem]`
- Margin bottom : `mb-1` → `mb-1.5`
- Taille texte : `text-[11px]` → `text-[11.5px]`
- Padding top : `pt-0.5` → `pt-1`

**Navigation (ControlTiles) :**
- Gap entre tuiles : `gap-2` → `gap-2.5`, `sm:gap-2.5` → `sm:gap-3`, ajout `lg:gap-3.5`
- Padding top : `pt-3` → `pt-4`, `sm:pt-4` → `sm:pt-5`
- Padding interne tuile : `px-3.5` → `px-4`, `py-3` → `py-3.5`, ajout `lg:px-4.5 lg:py-4`
- Gap icône/texte : `gap-3` → `gap-3.5`
- Taille icône : `h-9 w-9` → `h-10 w-10`, ajout `lg:h-11 lg:w-11`
- Icon size : `size={17}` → `size={18}`
- Taille label : `text-[13.5px]` → `text-[14px]`, ajout `lg:text-[14.5px]`
- Taille hint : `text-[12px]` → `text-[12.5px]`, ajout `lg:text-[13px]`

### Sections Home (`dashboard-home.tsx`)

- **Gap principal** : `gap-5` → `gap-6`
- **Conteneur listes** : padding `p-2.5` → `p-3`, `sm:p-3` → `sm:p-3.5`, ajout `lg:p-4`
- **Gap interne** : `gap-2.5` → `gap-3`
- **Input recherche** : hauteur `h-[42px]` → `h-[44px]`, taille `text-[13.5px]` → `text-[14px]`

### Sections Waivers & Groups

- **Gap section** : `gap-4` → `gap-5`, `sm:gap-5` → `sm:gap-6`
- **Gap header** : `gap-3` → `gap-3.5`
- **Gap icône/titre** : `gap-2` → `gap-2.5`
- **Taille titre** : `text-[1.05rem]` → `text-[1.08rem]`, `sm:text-[1.1rem]` → `sm:text-[1.15rem]`

### Pages de listes (Groupes, Signatures, etc.)

- **Padding horizontal** : `px-5` maintenu, `px-6` → `px-8`, ajout `lg:px-10`
- **Padding vertical** : ajustements progressifs pour maintenir le rythme
- **Gap entre sections** : augmentation progressive selon le breakpoint

---

## Justifications UX

### Pourquoi 1360px pour le dashboard principal ?

- **Linear** utilise ~1280px, **Vercel** ~1400px
- 1360px est le sweet spot : assez généreux pour respirer, sans jamais paraître "pleine largeur"
- Sur un écran 24" (1920px), il reste ~280px de marge de chaque côté : confortable
- Sur un écran 13" (1440px), le contenu s'adapte naturellement sans compression

### Pourquoi différencier dashboard / listes / settings ?

- **Dashboard (1360px)** : centre névralgique, doit impressionner
- **Listes/données (1280px)** : tableaux et progressions ont besoin d'espace mais moins que le Hero
- **Settings (1152px)** : tables de configuration restent denses et scannables
- **Forms (768px)** : largeur "article" optimale pour la lecture et la saisie

### Progression des espacements

- **Mobile** : espacements compacts mais jamais étouffants
- **Tablet/Laptop (sm)** : respiration accrue, profite de l'espace
- **Desktop (lg)** : pleine expression du premium, espacements généreux

### Cohérence du rythme vertical

- Tous les gaps sont en multiples de 0.25rem (Tailwind scale)
- Progression harmonieuse : 3 → 4 → 5 → 6
- Le Hero suit sa propre échelle plus large pour se démarquer

---

## Breakpoints optimisés

| Écran | Largeur | Comportement |
|---|---|---|
| **13" laptop** | ~1440px | Dashboard à 1360px + marges confortables |
| **15/16" laptop** | ~1680-1920px | Pleine exploitation de la largeur dashboard |
| **24" monitor** | 1920px | Dashboard centré, larges marges latérales |
| **27" monitor** | 2560px | Dashboard centré, très larges marges |

---

## Vérifications effectuées

✅ **TypeScript** : `npm run typecheck` — aucune erreur  
✅ **ESLint** : `npm run lint` — aucune erreur (warnings nettoyés)  
✅ **Tests** : `npm run test` — 128 tests passés  
✅ **Build** : `npm run build` — compilation réussie  

---

## Impact visuel attendu

### Avant
- Hero coincé à 768px au centre d'un grand écran
- Sensation de compression et d'espace gaspillé
- Tableaux et listes à l'étroit
- Manque de respiration

### Après
- Hero majestueux exploitant 1360px
- Sensation premium, élégante et respirante
- Tableaux et listes confortables
- Hiérarchie visuelle claire entre types de contenu
- Progressivité harmonieuse selon la taille d'écran

---

## Prochaines étapes (non effectuées)

- [ ] Tester visuellement sur écrans 13", 15", 24", 27"
- [ ] Vérifier le rendu en mode clair et sombre
- [ ] Tester le responsive sur mobile/tablet
- [ ] Valider avec l'équipe design
- [ ] Commit des changements une fois validé

---

**Résumé** : Migration d'un layout "article" (768px) vers une approche premium progressive (1360px dashboard, 1280px listes, 1152px settings), avec espacements harmonieux et respiration accrue, inspirée de Linear et Vercel.
