# Audit : Création QR Permanent Bloquée

## Problème Identifié

### 1. Input Hidden avec Required
**Fichier :** `src/app/dashboard/groupes/new/station/station-template-select.tsx`
**Ligne 20 :** `<input type="hidden" name="template_id" value={selectedId} required />`

**Problème :**
- Un `<input type="hidden" required>` ne peut pas afficher d'erreur de validation
- Si `selectedId` est vide (""), la validation HTML5 peut bloquer silencieusement
- Le formulaire ne se soumet pas mais aucun feedback visuel

**Symptôme :**
Clic sur "Créer le QR permanent" → Rien ne se passe

### 2. Manque de Feedback Utilisateur

**Aucun indicateur :**
- Pas de spinner pendant la soumission
- Pas de message d'erreur si validation échoue
- Pas de toast si création échoue
- Pas de disabled sur le bouton pendant l'action

### 3. Validation Silencieuse

Si l'utilisateur :
1. Remplit le nom
2. **Oublie** de choisir une décharge
3. Clique "Créer"

→ `selectedId` = ""
→ `required` sur hidden input
→ Soumission bloquée silencieusement
→ Aucun feedback

## Solutions

### Solution 1 : Supprimer `required` du Hidden Input
```tsx
// station-template-select.tsx ligne 20
<input type="hidden" name="template_id" value={selectedId} />
```

La validation se fait déjà côté serveur dans `createStation()`.

### Solution 2 : Validation Côté Client Explicite
```tsx
// Ajouter dans StationTemplateSelect
{!selectedId && (
  <p className="text-sm text-red-600">Veuillez choisir une décharge</p>
)}
```

### Solution 3 : useFormStatus pour Feedback
```tsx
// Dans le formulaire
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Création..." : "Créer le QR permanent"}
    </button>
  );
}
```

### Solution 4 : Toast d'Erreur
```tsx
// Si la création échoue
if (error) {
  toast.error("Impossible de créer le QR permanent");
}
```

## Test de Confirmation

### Scénario 1 : Sans Décharge
1. Remplir le nom
2. **Ne pas** choisir de décharge
3. Cliquer "Créer"
4. **Attendu :** Message d'erreur visible
5. **Actuel :** Rien ne se passe

### Scénario 2 : Avec Décharge
1. Remplir le nom
2. Choisir une décharge
3. Cliquer "Créer"
4. **Attendu :** Redirection vers page détail
5. **Actuel :** À tester

## Corrections à Appliquer

### Priorité 1 : Supprimer le Bug
- [ ] Retirer `required` de l'input hidden
- [ ] Tester la création

### Priorité 2 : Améliorer UX
- [ ] Ajouter useFormStatus (spinner)
- [ ] Ajouter validation visuelle
- [ ] Ajouter toast d'erreur

### Priorité 3 : Logging
- [ ] Vérifier que logError fonctionne
- [ ] Ajouter console.log dans createStation
- [ ] Logger les redirects

## Vérifications Supplémentaires

### Base de Données
```sql
-- Vérifier si des stations sont créées
SELECT id, name, kind, status, public_token, template_id, created_at
FROM signing_group
WHERE kind = 'station'
ORDER BY created_at DESC
LIMIT 5;
```

### Logs Serveur
```bash
# Vérifier les erreurs
npm run dev 2>&1 | grep -i error

# Vérifier les redirects
npm run dev 2>&1 | grep -i redirect
```

### Console Navigateur
1. F12 → Console
2. Tenter de créer un QR permanent
3. Noter les erreurs/warnings

## Conclusion

**Root Cause :** `required` sur un `<input type="hidden">` bloque la soumission sans feedback.

**Fix Minimal :** Supprimer `required` de la ligne 20 de `station-template-select.tsx`.

**Fix Complet :** Voir solutions 1-4 ci-dessus.
