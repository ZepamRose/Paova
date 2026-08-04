# Déboguer l'Erreur React 418

## Erreur Rencontrée
```
Uncaught Error: Minified React error #418
```

## Qu'est-ce que cette erreur ?
L'erreur React 418 se produit quand il y a du **texte non échappé** dans le JSX, généralement des apostrophes (`'`) qui devraient être `&apos;` ou `{\"'\"}`.

## Ce que j'ai vérifié
✅ Tous les fichiers créés ont des apostrophes correctement échappées
✅ Le build de production réussit (0 erreurs)
✅ Les fichiers contiennent `&apos;` là où nécessaire

## Fichiers à Vérifier en Priorité

### 1. sessions-panel.tsx
```bash
# Vérifier les apostrophes
grep -n "'" src/app/dashboard/sessions-panel.tsx
```

Lignes à surveiller :
- Ligne 36 : `"Aujourd'hui"` (dans objet JS, OK)
- Ligne 113 : Messages d'état vide (dans objet JS, OK)

### 2. station-card.tsx
```bash
# Vérifier
grep -n "&apos;" src/app/dashboard/station-card.tsx
```
- Ligne 49 : `aujourd&apos;hui` ✅

### 3. station-detail-view.tsx
```bash
# Vérifier
grep -n "&apos;" src/app/dashboard/groupes/station-detail-view.tsx
```
- Ligne 107, 163 : `Aujourd&apos;hui` ✅

## Comment Déboguer

### Étape 1 : Démarrer en mode dev
```bash
# Tuer tous les processus node
taskkill //F //IM node.exe

# Attendre 2 secondes
sleep 2

# Démarrer le serveur
npm run dev
```

### Étape 2 : Ouvrir le navigateur
1. Aller sur http://localhost:3010
2. Ouvrir la console développeur (F12)
3. Noter quelle page provoque l'erreur

### Étape 3 : Identifier la Source
L'erreur 418 indique la ligne exacte dans la version non-minifiée.

Visitez : https://react.dev/errors/418

Avec les paramètres de l'erreur, vous verrez le message complet.

### Étape 4 : Solutions Possibles

#### Si c'est dans sessions-panel.tsx
Le problème vient probablement du rendu des labels. Modifier ligne 36 :

```typescript
const tabs: { id: TabId; label: string }[] = [
  { id: "today", label: "Aujourd\u2019hui" },  // Unicode apostrophe
  // OU
  { id: "today", label: <>Aujourd&apos;hui</> },
];
```

#### Si c'est dans un message d'état vide
Ligne 113, utiliser des template literals ou Unicode :

```typescript
const messages: Record<TabId, { title: string; sub: string }> = {
  today: { 
    title: "Aucune session aujourd\u2019hui", 
    sub: "Créez une session pour commencer la journée." 
  },
};
```

#### Si c'est ailleurs
Chercher tous les textes avec apostrophes :

```bash
# Trouver tous les textes avec apostrophe dans le JSX
grep -rn ">" src/app/dashboard/groupes/new/ | grep "'"
grep -rn ">" src/app/dashboard/station-card.tsx | grep "'"
```

## Vérification Rapide

```bash
# Build (doit réussir)
npm run build

# Si le build réussit mais runtime échoue,
# c'est probablement un problème de données manquantes
# ou de rendu conditionnel
```

## Alternative : Utiliser Unicode

Remplacer toutes les apostrophes par Unicode :
- `'` → `\u2019` (apostrophe typographique)
- Exemple : `"aujourd'hui"` → `"aujourd\u2019hui"`

## Test Isolé

Pour tester chaque composant isolément :

```typescript
// Créer src/app/test-station/page.tsx
export default function TestPage() {
  return (
    <div>
      <h1>Test Apostrophes</h1>
      <p>Aujourd&apos;hui</p>
      <p>{"Aujourd'hui"}</p>
    </div>
  );
}
```

Visiter http://localhost:3010/test-station

## Si Rien ne Fonctionne

1. **Rollback** : Revenir à avant les modifications
```bash
git stash
npm run dev
```

2. **Réintroduire un par un** :
```bash
git stash pop
# Tester chaque fichier modifié individuellement
```

## Logs à Vérifier

```bash
# Voir les erreurs complètes
npm run dev 2>&1 | tee dev-debug.log

# Dans le navigateur : Console > Preserve log
# Recharger la page et noter l'erreur exacte
```

## Contact

Si l'erreur persiste, noter :
1. Quelle page vous visitiez
2. Le message d'erreur complet de la console
3. Les paramètres dans l'URL de l'erreur React

---

*Document créé pour déboguer l'erreur React 418*
