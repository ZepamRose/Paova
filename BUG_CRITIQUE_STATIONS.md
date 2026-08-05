# BUG CRITIQUE : Signatures des Stations non comptabilisées

## 🚨 Gravité : CRITIQUE

**Impact** : Toutes les signatures créées via les Signatures libres (stations) depuis leur lancement ne sont PAS liées aux stations dans la base de données.

## 📊 Symptômes

- Dashboard affiche "0 signatures" pour les stations
- Les signatures existent dans la table `submission` (visibles dans "Activité récente")
- Mais elles n'apparaissent pas dans les statistiques des stations
- Le champ `represented_group_id` est NULL dans toutes les submissions de stations

## 🔍 Cause racine

**Fichier** : `src/app/w/[slug]/actions.ts` ligne 373-386

Lors de l'insertion d'une submission (signature), le champ `represented_group_id` n'était **pas inclus**.

```typescript
// ❌ AVANT (BUGUÉ)
const { data: inserted, error } = await supabase
  .from("submission")
  .insert({
    id: submissionId,
    template_id: template.id,
    business_id: template.business_id,
    signer_name: signerName,
    signer_email: signerEmail || null,
    answers: answers as unknown as Json,
    signature_url: signatureUrl,
    ip_address: ip,
    // ❌ represented_group_id manquant !
  })
```

## ✅ Correction appliquée

```typescript
// ✅ APRÈS (CORRIGÉ)
const { data: inserted, error } = await supabase
  .from("submission")
  .insert({
    id: submissionId,
    template_id: template.id,
    business_id: template.business_id,
    signer_name: signerName,
    signer_email: signerEmail || null,
    answers: answers as unknown as Json,
    signature_url: signatureUrl,
    ip_address: ip,
    represented_group_id: verifiedGroupId, // ✅ Ajouté !
  })
```

## 🔧 Corrections complètes appliquées

### 1. Migration SQL (0057_fix_station_stats.sql) ✅
- Fonction `dashboard_group_stats()` mise à jour
- Compte les submissions avec `represented_group_id` pour les stations
- Compte les members avec `signing_group_member` pour les sessions

### 2. Logique TypeScript (src/lib/groups/signing-state.ts) ✅
- Détection des stations via `kind = 'station'`
- Affichage "X signatures" au lieu de "X/Y"
- Nouveau champ `isStation` dans le type

### 3. Affichage Dashboard (src/app/dashboard/dashboard-groups-section.tsx) ✅
- Affiche le format adapté selon le type (station vs session)

### 4. **Action de signature (src/app/w/[slug]/actions.ts) ✅ CRITIQUE**
- **Ajout de `represented_group_id` dans l'insert de submission**
- Les nouvelles signatures seront correctement liées

## ⚠️ Impact sur les données existantes

**Les signatures créées AVANT ce fix ne sont PAS liées aux stations.**

### Script de réparation des données (à exécuter en SQL)

```sql
-- ATTENTION : À exécuter avec précaution après vérification

-- 1. Identifier les submissions orphelines (stations uniquement)
SELECT 
  s.id,
  s.signer_name,
  s.signed_at,
  s.answers->>'__group_id' as stored_group_id
FROM submission s
WHERE s.represented_group_id IS NULL
  AND s.answers->>'__group_id' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM signing_group sg 
    WHERE sg.id::text = s.answers->>'__group_id'
    AND sg.kind = 'station'
  );

-- 2. Réparer les liens (TESTER D'ABORD sur une copie !)
-- DÉCOMMENTER UNIQUEMENT SI VOUS ÊTES SÛR
-- UPDATE submission s
-- SET represented_group_id = (s.answers->>'__group_id')::uuid
-- WHERE s.represented_group_id IS NULL
--   AND s.answers->>'__group_id' IS NOT NULL
--   AND EXISTS (
--     SELECT 1 FROM signing_group sg 
--     WHERE sg.id::text = s.answers->>'__group_id'
--     AND sg.kind = 'station'
--   );
```

## 📝 Checklist de déploiement

- [x] Migration SQL appliquée (0057)
- [x] Code TypeScript corrigé
- [x] Build réussi
- [ ] **DÉPLOYER L'APPLICATION EN PRODUCTION**
- [ ] Tester avec une nouvelle signature de station
- [ ] Vérifier que `represented_group_id` est bien renseigné
- [ ] (Optionnel) Exécuter le script de réparation pour les anciennes signatures

## 🧪 Test de validation

**Après déploiement :**

1. Créez une nouvelle signature via une station (scannez le QR)
2. Dans Supabase SQL Editor :
```sql
SELECT 
  id,
  signer_name,
  represented_group_id,
  signed_at
FROM submission
ORDER BY signed_at DESC
LIMIT 1;
```
3. Vérifiez que `represented_group_id` n'est PAS NULL
4. Rechargez le Dashboard, les statistiques doivent s'afficher

## 📅 Historique

- **6 août 2026 00:45** - Migration 0057 créée et appliquée
- **6 août 2026 01:30** - Bug identifié dans actions.ts
- **6 août 2026 01:35** - Correction appliquée, build réussi

---

**Note** : Ce bug affecte UNIQUEMENT les stations (Signatures libres). Les sessions planifiées fonctionnent correctement car elles utilisent `signing_group_member`, pas `represented_group_id`.
