# Test Création QR Permanent

## Corrections Appliquées

1. **station-template-select.tsx** : Retiré `required` du hidden input
2. **actions.ts** : Ajouté logs console détaillés dans `createStation()`

## Test Rapide

```bash
npm run dev
```

### Étapes
1. Dashboard → "Nouvelle activité"
2. Cliquer "QR permanent" (carte bleue)
3. Nom : "Test Station"
4. Choisir une décharge
5. Cliquer "Créer le QR permanent"

### Console Attendue
```
🚀 createStation: START
📝 createStation: Données reçues
✅ createStation: Station créée avec succès!
🎯 createStation: Redirection vers /dashboard/groupes/[id]
```

### Résultat Attendu
→ Redirection vers page détail station
→ QR code affiché
→ Boutons "Mode kiosque" et "Imprimer A4"

### Si Erreur
Noter les logs console complets et l'URL actuelle

## Validation DB
```sql
SELECT id, name, kind, status, public_token, template_id
FROM signing_group
WHERE kind = 'station'
ORDER BY created_at DESC
LIMIT 1;
```

Doit retourner la station créée avec kind='station'.
