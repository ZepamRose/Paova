# Test de Création QR Permanent - Protocole

## ✅ Correction Appliquée

**Fichier modifié :** `src/app/dashboard/groupes/new/station/station-template-select.tsx`
- ❌ Avant : `<input type="hidden" name="template_id" value={selectedId} required />`
- ✅ Après : `<input type="hidden" name="template_id" value={selectedId} />`

**Logs ajoutés :** `src/app/dashboard/groupes/actions.ts` (fonction `createStation`)
- Console logs à chaque étape
- Émojis pour faciliter le suivi
- Détails des données et erreurs

## 🧪 Protocole de Test

### Préparation
```bash
# Démarrer le serveur en mode dev
npm run dev

# Ouvrir dans le navigateur
http://localhost:3010/dashboard

# Ouvrir la Console (F12)
# Onglet Console pour voir les logs
```

### Test 1 : Création Complète (Cas Normal)

**Étapes :**
1. Dashboard → Cliquer "Nouvelle activité"
2. Page de sélection → Cliquer "QR permanent" (carte bleue)
3. Formulaire station :
   - Nom : "Test Station Gym"
   - Décharge : Choisir une décharge existante
4. Cliquer "Créer le QR permanent"

**Résultat Attendu :**
```
Console :
  🚀 createStation: START
  📝 createStation: Données reçues { name: 'Test Station Gym', templateId: 'xxx' }
  🔍 createStation: Vérification du template...
  ✅ createStation: Template valide, génération token...
  🎫 createStation: Token généré { token: 'abc123...' }
  💾 createStation: Insertion dans Supabase...
  ✅ createStation: Station créée avec succès! { groupId: 'yyy' }
  🔄 createStation: Revalidation des paths...
  🎯 createStation: Redirection vers /dashboard/groupes/yyy

Navigateur :
  → Redirection automatique vers /dashboard/groupes/[id]
  → Page détail de la station s'affiche
  → QR code visible
  → Nom de la station affiché
  → Boutons "Mode kiosque" et "Imprimer A4" présents
```

**Base de Données (À vérifier) :**
```sql
SELECT id, name, kind, status, public_token, template_id, 
       requires_signature, signature_mode, created_at
FROM signing_group
WHERE kind = 'station'
ORDER BY created_at DESC
LIMIT 1;
```

**Doit retourner :**
- ✅ kind = 'station'
- ✅ status = 'open'
- ✅ public_token = chaîne générée
- ✅ template_id = ID du template choisi
- ✅ requires_signature = true
- ✅ signature_mode = 'individual'
- ✅ name = 'Test Station Gym'

---

### Test 2 : Validation - Nom Manquant

**Étapes :**
1. Formulaire station
2. **Ne pas** remplir le nom
3. Choisir une décharge
4. Cliquer "Créer le QR permanent"

**Résultat Attendu :**
```
Console :
  🚀 createStation: START
  📝 createStation: Données reçues { name: '', templateId: 'xxx' }
  ❌ createStation: Nom manquant

Navigateur :
  → Redirection vers /dashboard/groupes/new?error=name_required
  → (Idéalement, afficher un message d'erreur)
```

---

### Test 3 : Validation - Décharge Manquante

**Étapes :**
1. Formulaire station
2. Remplir le nom : "Test Sans Template"
3. **Ne pas** choisir de décharge
4. Cliquer "Créer le QR permanent"

**Résultat Attendu :**
```
Console :
  🚀 createStation: START
  📝 createStation: Données reçues { name: 'Test Sans Template', templateId: '' }
  ❌ createStation: Template manquant

Navigateur :
  → Redirection vers /dashboard/groupes/new?error=template_required
```

---

### Test 4 : Vérification QR Code Fonctionnel

**Après création réussie (Test 1) :**

1. Sur la page détail de la station
2. Noter l'URL du QR code (affichée sous le QR)
3. Ouvrir cette URL dans un nouvel onglet (ou scanner avec mobile)

**Résultat Attendu :**
```
→ Page /g/[token] s'ouvre
→ Formulaire de signature s'affiche (ExpressSignFlow)
→ Nom de la station visible en haut
→ Champs du template affichés
→ Bouton "Signer" présent
```

4. Remplir le formulaire et signer

**Résultat Attendu :**
```
→ Signature enregistrée
→ Redirection vers page de remerciement
→ Retour au dashboard → Onglet "Signature libre"
→ Compteur de la station a augmenté de 1
```

---

### Test 5 : Vérification Dashboard

**Étapes :**
1. Retourner au dashboard
2. Cliquer sur l'onglet "Signature libre"

**Résultat Attendu :**
```
→ La station créée apparaît dans la liste
→ Badge bleu "QR actif" visible
→ Icône Zap bleue
→ Statistique affichée (nombre de signatures)
→ Thème bleu cohérent
```

---

## 🔍 Cas d'Erreur à Observer

### Erreur Supabase
Si la console affiche :
```
❌ createStation: Erreur insertion { error: {...}, group: null }
```

**Causes possibles :**
1. Permissions Supabase insuffisantes
2. Contrainte de base de données violée
3. Champ manquant dans le schéma
4. business_id invalide

**Action :** Noter l'erreur complète et vérifier les logs Supabase.

---

### Pas de Redirection

Si après "Créer le QR permanent" :
- ✅ Console montre "✅ Station créée avec succès"
- ❌ Mais pas de redirection

**Cause possible :** Problème avec `redirect()` de Next.js

**Action :** 
1. Vérifier qu'aucun autre code n'intercepte la redirection
2. Vérifier les erreurs dans l'onglet Network (F12)

---

## 📊 Checklist de Validation Complète

Après Test 1 (Création Normale), vérifier :

### Backend
- [ ] Ligne créée dans `signing_group`
- [ ] `kind = 'station'`
- [ ] `status = 'open'`
- [ ] `public_token` généré (format : 8 caractères alphanumériques)
- [ ] `template_id` correspond au template choisi
- [ ] `requires_signature = true`
- [ ] `signature_mode = 'individual'`
- [ ] `business_id` correct

### Frontend - Page Détail
- [ ] Redirection automatique après création
- [ ] URL correcte : `/dashboard/groupes/[id]`
- [ ] Nom de la station affiché
- [ ] Template affiché
- [ ] QR code visible et de bonne taille
- [ ] URL publique affichée sous le QR
- [ ] 2 cartes de stats (Aujourd'hui / Total)
- [ ] Bouton "Mode kiosque" présent
- [ ] Bouton "Imprimer A4" présent

### Frontend - Dashboard
- [ ] Onglet "Signature libre" visible
- [ ] Station apparaît dans la liste
- [ ] Badge "QR actif" bleu
- [ ] Icône Zap avec fill bleu
- [ ] Statistiques affichées
- [ ] Clic sur la carte → redirection vers détail

### Flow de Signature
- [ ] URL `/g/[token]` accessible
- [ ] Formulaire ExpressSignFlow s'affiche
- [ ] Signature possible
- [ ] Compteur mis à jour après signature

### Mode Kiosk
- [ ] Bouton "Mode kiosque" fonctionne
- [ ] Plein écran activé
- [ ] QR code agrandi (400x400px)
- [ ] Contrôles visibles au départ
- [ ] Contrôles disparaissent après 3s
- [ ] Contrôles réapparaissent au mouvement souris
- [ ] Bouton "Quitter" fonctionne

### Impression
- [ ] Bouton "Imprimer A4" fonctionne
- [ ] Page `/dashboard/groupes/[id]/print` s'ouvre
- [ ] Dialogue d'impression s'ouvre automatiquement
- [ ] QR code grande taille (500x500px)
- [ ] Layout optimisé pour A4

---

## ✅ Critères de Succès

**Le bug est corrigé SI :**
1. ✅ Console affiche tous les logs de création
2. ✅ Aucune erreur dans la console
3. ✅ Redirection automatique vers page détail
4. ✅ Station visible dans "Signature libre"
5. ✅ QR code scannable et fonctionnel
6. ✅ Signature possible via le QR

**Le bug n'est PAS corrigé SI :**
- ❌ Clic sur "Créer" ne fait rien
- ❌ Pas de logs dans la console
- ❌ Erreur dans la console
- ❌ Pas de redirection
- ❌ Station non créée en base

---

## 🚨 Si le Test Échoue

1. **Noter exactement ce qui apparaît dans la console**
2. **Copier les erreurs complètes**
3. **Vérifier l'onglet Network (F12) pour les requêtes**
4. **Vérifier les logs du serveur (terminal npm run dev)**
5. **Checker la base de données (requête SQL ci-dessus)**

Ne pas passer au Problème 1 (Modal UX) tant que TOUS les tests ne passent pas.

---

*Document créé pour validation complète du fix*
