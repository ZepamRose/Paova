# Instructions de diagnostic - Création d'activité

## Problème identifié et résolu

**Cause racine :** Les migrations 0054 et 0055 n'étaient pas appliquées à la base de données distante.

**Solution appliquée :** 
```bash
npx supabase db push
```

Les migrations suivantes ont été appliquées :
- **0054_session_closing_mode.sql** - Ajoute `closing_mode` et `closed_at` à `signing_group`
- **0055_signature_mode.sql** - Ajoute `signature_mode` à `signing_group` et `signature_type`, `representative_role`, `represented_group_id` à `submission`

## Vérification du statut

✅ Toutes les migrations sont maintenant appliquées (0001 à 0055)
✅ Le serveur de développement fonctionne sur http://localhost:3010

## Test de création d'activité

### 1. Logs détaillés activés

J'ai ajouté des logs dans `src/app/dashboard/groupes/actions.ts` (ligne ~131) :

```typescript
console.log("[createSigningGroup] Insert data:", JSON.stringify(insertData, null, 2));
// ... insert ...
console.error("[createSigningGroup] Insert failed:", error);
```

### 2. Comment tester

1. **Ouvre le dashboard** : http://localhost:3010/dashboard
2. **Crée une nouvelle activité** (avec ou sans décharge)
3. **Si ça échoue**, vérifie les logs dans la console du terminal où tu as lancé `npm run dev`

### 3. Vérifier les logs serveur

Dans le terminal où `npm run dev` tourne, tu devrais voir :
- `[createSigningGroup] Insert data: { ... }` - Les données envoyées à Supabase
- Si erreur : `[createSigningGroup] Insert failed: { ... }` - Le message d'erreur exact

### 4. Erreurs possibles et solutions

#### Erreur : `column "signature_mode" does not exist`
**Solution :** La migration n'est pas appliquée
```bash
npx supabase db push
```

#### Erreur : `column "closing_mode" does not exist`
**Solution :** La migration 0054 n'est pas appliquée
```bash
npx supabase db push
```

#### Erreur : `check constraint "signing_group_signature_mode_check" is violated`
**Cause :** Valeur invalide pour signature_mode (doit être 'individual' ou 'group_representative')
**Solution :** Vérifier le code du formulaire

#### Erreur : `check constraint "chk_signing_group_closing_mode" is violated`
**Cause :** Valeur invalide pour closing_mode (doit être 'duration', 'business_close', 'fixed_time' ou 'manual')
**Solution :** Vérifier le code du formulaire

## Vérification manuelle de la base de données

Si tu veux vérifier directement dans Supabase :

1. Va sur https://supabase.com/dashboard
2. Ouvre ton projet
3. Va dans "Table Editor" → `signing_group`
4. Vérifie que les colonnes existent :
   - `signature_mode` (text, NOT NULL, default 'individual')
   - `closing_mode` (text, NOT NULL, default 'manual')
   - `closed_at` (timestamptz, nullable)

## Test de création simple

Essaie de créer une activité **sans décharge** d'abord :
- Nom : "Test diagnostic"
- Date/heure : demain à 10h00
- Mode de fermeture : "Manuel"
- Pas de décharge requise

Si ça fonctionne, la migration est bien appliquée et le code fonctionne.

Ensuite teste **avec décharge** :
- Active "Décharge requise"
- Choisis "Chaque participant" (mode individual)
- Sélectionne un template

Si ça fonctionne aussi, essaie avec **"Un représentant du groupe"**.

## Commandes utiles

### Voir le statut des migrations
```bash
npx supabase migration list
```

### Voir les différences avec la DB distante
```bash
npx supabase db diff
```

### Réappliquer toutes les migrations (ATTENTION : destructif)
```bash
npx supabase db reset
```

### Logs en temps réel
Dans le terminal où tourne `npm run dev`, tous les `console.log` et `console.error` s'affichent.

## Nettoyage après diagnostic

Une fois le problème confirmé résolu, tu peux retirer les logs de debug :

Dans `src/app/dashboard/groupes/actions.ts`, supprimer les lignes :
- `console.log("[createSigningGroup] Insert data:", ...)`
- `console.error("[createSigningGroup] Insert failed:", ...)`

## Résumé

**Statut actuel :** 
- ✅ Migrations appliquées
- ✅ Serveur fonctionnel
- ✅ Logs de debug activés
- ⏳ Test manuel requis pour confirmer que la création fonctionne

**Action requise :** Teste la création d'une activité et regarde les logs dans le terminal.
