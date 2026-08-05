# Correction de la logique des statistiques pour les Signatures libres

## Problème identifié

### Symptômes
- Les Signatures libres affichaient "6/6 signatures" dans le Dashboard au lieu de "6 signatures"
- Les statistiques de la page de détail et du Dashboard étaient différentes
- Les compteurs ne se mettaient pas toujours à jour correctement après une nouvelle signature

### Cause racine

**Deux sources de données différentes** :

1. **Sessions planifiées** : Utilisent la table `signing_group_member`
   - Contient une liste fixe de participants
   - Format "X/Y" approprié (X signés sur Y participants)

2. **Signatures libres (stations)** : Utilisent la table `submission`
   - Flux continu de signatures (pas de liste de participants prédéfinie)
   - Format "X signatures" approprié (pas de limite)

**Le problème** :
- La fonction SQL `dashboard_group_stats()` comptait uniquement les lignes dans `signing_group_member`
- Pour les stations, cette table est vide → retournait 0/0
- La page de détail comptait correctement depuis `submission`, mais le Dashboard non

## Solution appliquée

### 1. Migration SQL (0057_fix_station_stats.sql)

Modifié la fonction `dashboard_group_stats()` pour :
- Détecter le type de groupe (`kind = 'station'`)
- Pour les **stations** : compter les signatures dans `submission.represented_group_id`
- Pour les **sessions** : garder la logique actuelle (`signing_group_member`)

```sql
-- Pour les sessions
select sgm.group_id, count(*)::bigint as total, count(sgm.signed_submission_id)::bigint as signed
from signing_group_member sgm
where sg.kind is null or sg.kind != 'station'

UNION ALL

-- Pour les stations
select sg.id as group_id, count(s.id)::bigint as total, count(s.id)::bigint as signed
from signing_group sg
left join submission s on s.represented_group_id = sg.id
where sg.kind = 'station'
```

### 2. Fonction TypeScript (src/lib/groups/signing-state.ts)

Modifié `resolveGroupSigningState()` pour :
- Ajouter détection des stations via `kind`
- Pour les stations : retourner `statusLabel` de type "X signature(s)"
- Pas de barre de progression pour les stations (pas de notion de "complété")

```typescript
if (isStation) {
  return {
    isStation: true,
    statusLabel: totalSignatures === 0 
      ? "Aucune signature"
      : totalSignatures === 1
        ? "1 signature"
        : `${totalSignatures} signatures`,
    // ...
  };
}
```

### 3. Affichage Dashboard (src/app/dashboard/dashboard-groups-section.tsx)

Adapté l'affichage pour :
- Afficher `statusLabel` pour les stations (pas de barre de progression)
- Garder la barre de progression pour les sessions planifiées
- Ajouter mention "· Signature libre" pour différencier visuellement

```tsx
{sigState.isStation ? (
  <p>
    <span className="font-semibold text-[var(--color-brand)]">
      {sigState.statusLabel}
    </span>
    <span className="ml-1.5 text-[var(--color-muted)]/60">
      · Signature libre
    </span>
  </p>
) : /* barre de progression pour sessions */}
```

## Résultat

### Avant
- Dashboard : "6/6 signatures" ou "0/0"
- Page détail : "6 signatures" (correct)
- Sources de données différentes → incohérence

### Après
- Dashboard : "6 signatures"
- Page détail : "6 signatures"
- Même source de données → cohérence totale
- Mise à jour automatique dès qu'une nouvelle signature arrive

## Source unique de vérité

Toutes les vues utilisent maintenant `resolveGroupSigningState()` qui :
- Détecte automatiquement le type de groupe
- Applique la logique appropriée
- Retourne un format unifié

**Principe** : Un seul changement dans cette fonction se propage partout dans l'application.

## Migration de base de données

La migration SQL doit être appliquée à la base de données :

```bash
npx supabase migration up
```

Ou en production via le Dashboard Supabase.

---

**Date** : 6 août 2026
**Fichiers modifiés** :
- `supabase/migrations/0057_fix_station_stats.sql`
- `src/lib/groups/signing-state.ts`
- `src/app/dashboard/dashboard-groups-section.tsx`
