# Analyse des bugs - 2026-08-01

## BUG 1 : "Ouvrir ma session" reste sur la même page

### Reproduction
1. Nouveau compte
2. Créer première décharge ✓
3. Créer première session ✓
4. Étape "Collecter votre première signature"
5. Clic sur "Ouvrir ma session"
6. **Résultat** : page recharge, reste au même endroit

### Cause racine
**Boucle de redirection circulaire**

1. **Bouton pointant vers `/dashboard/groupes`**
   - Fichier : `src/app/dashboard/dashboard-onboarding-hero.tsx`
   - Ligne 73 : `ctaHref = "/dashboard/groupes";`
   - Ligne 131 : `<a href={ctaHref}>` (Link standard)

2. **Page qui redirige immédiatement**
   - Fichier : `src/app/dashboard/groupes/page.tsx`
   - Ligne 5 : `redirect("/dashboard");`

3. **Résultat**
   ```
   Utilisateur sur /dashboard
   → Clique "Ouvrir ma session"
   → Va vers /dashboard/groupes
   → Redirect vers /dashboard
   → Utilisateur toujours sur /dashboard
   ```

### Données disponibles
- `dashboardGroups` est défini ligne 119 de `dashboard/page.tsx`
- Contient toutes les sessions avec leur ID
- `hasSessions = dashboardGroups.length > 0` (ligne 200)
- Le hero ne reçoit que `hasSessions: boolean`, pas les données réelles

### Solution
Passer la première session au hero et créer un lien direct vers `/dashboard/groupes/[id]`

---

## BUG 2 : QR code coupé horizontalement

### Reproduction
1. Dashboard
2. Section "En cours"
3. Cliquer sur bouton QR d'une session
4. **Résultat** : modal s'affiche mais QR est coupé horizontalement

### Structure DOM actuelle

```tsx
<Link className="group block rounded-xl border ... overflow-[???]">  ← SessionCard
  <div>
    <CardQrButton />  ← Bouton QR
  </div>
</Link>
```

Le modal QR est rendu DANS le CardQrButton, qui est DANS le Link :

```tsx
{open && (
  <div className="fixed inset-0 z-[9999] ...">  ← Modal
    <div className="flex flex-col items-center gap-5 rounded-2xl bg-white p-6">
      <img src={qrDataUrl} width={280} height={280} />  ← QR Code
    </div>
  </div>
)}
```

### Hypothèse principale : overflow clipping

Le composant `<Link>` parent peut avoir :
- `overflow: hidden` (explicite ou via rounded-xl)
- Un contexte de stacking qui limite le rendu du modal
- Un clipping context créé par les transformations CSS

### Vérification nécessaire

Le modal utilise `position: fixed` et `z-index: 9999`, ce qui devrait normalement 
échapper au parent, MAIS :

**Si le parent Link a une transformation CSS active** (ex: `translateY` du hover),
cela crée un nouveau contexte de positionnement et `position: fixed` devient 
relatif à ce parent transformé, pas au viewport.

Ligne 177 du SessionCard :
```tsx
className="... hover:-translate-y-px ..."
```

Cette transformation pourrait créer le contexte de clipping.

### Solution
Utiliser un portail React pour rendre le modal en dehors de la hiérarchie DOM,
directement dans le body, avec `createPortal` de `react-dom`.
