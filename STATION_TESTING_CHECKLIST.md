# Station Feature - Testing Checklist

## ✅ Phase 7: Intégration & Tests

### 1. Création de Station

#### Via Interface
- [ ] Naviguer vers `/dashboard/groupes/new`
- [ ] Vérifier que 2 cartes s'affichent (Session planifiée + QR permanent)
- [ ] Cliquer sur "QR permanent"
- [ ] Vérifier le thème bleu (#3b82f6)
- [ ] Remplir le formulaire (nom + template)
- [ ] Soumettre et vérifier la redirection vers la page détail

#### Validation
- [ ] Champ nom requis
- [ ] Template requis
- [ ] Erreurs affichées correctement

### 2. Dashboard - Onglet "Signature libre"

#### Affichage
- [ ] Ouvrir `/dashboard`
- [ ] Vérifier l'onglet "Signature libre" dans SessionsPanel
- [ ] Compteur de stations affiché correctement
- [ ] Cliquer sur l'onglet

#### Liste des Stations
- [ ] Les stations créées apparaissent
- [ ] Badge "QR actif" visible avec icône QrCode
- [ ] Icône Zap avec fill bleu
- [ ] Statistique "signatures aujourd'hui" affichée
- [ ] Thème bleu cohérent
- [ ] Hover effect fonctionne

#### État Vide
- [ ] Si aucune station : message "Aucune station active"
- [ ] Message d'encouragement approprié

### 3. Page Détail Station

#### Navigation
- [ ] Cliquer sur une StationCard
- [ ] Vérifier la redirection vers `/dashboard/groupes/[id]`
- [ ] Page détail s'affiche avec StationDetailView

#### Vue Normale
- [ ] En-tête : icône Zap + nom de la station + template
- [ ] Bouton "Mode kiosque" présent
- [ ] Bouton "Imprimer A4" présent
- [ ] 2 cartes de stats : "Aujourd'hui" (bleu) + "Total"
- [ ] Section QR Code visible
- [ ] QR code affiché (280x280px)
- [ ] URL cliquable et fonctionnelle
- [ ] Lien externe s'ouvre dans nouvel onglet

#### Mode Kiosque
- [ ] Cliquer sur "Mode kiosque"
- [ ] Plein écran activé (position fixed, z-index 50)
- [ ] QR code centré et agrandi (400x400px)
- [ ] Contrôles visibles initialement
- [ ] Bouger la souris : contrôles réapparaissent
- [ ] Attendre 3s sans bouger : contrôles disparaissent
- [ ] Stats en bas visibles avec les contrôles
- [ ] Bouton "Quitter le mode kiosque" fonctionne

### 4. Impression A4

#### Accès
- [ ] Depuis la page détail, cliquer "Imprimer A4"
- [ ] Navigation vers `/dashboard/groupes/[id]/print`

#### Affichage Écran
- [ ] Bouton "Imprimer" visible (bleu)
- [ ] Bouton fermer (X) visible
- [ ] Aperçu centré sur page blanche
- [ ] QR code grande taille visible
- [ ] Nom de la station en grand titre
- [ ] Template affiché
- [ ] Instructions claires
- [ ] URL lisible
- [ ] Notes de bas de page

#### Dialogue d'Impression
- [ ] Dialogue d'impression s'ouvre automatiquement après 500ms
- [ ] Layout optimisé pour A4 portrait
- [ ] Marges correctes (15mm)
- [ ] QR code encore plus grand (500x500px) en impression
- [ ] Texte lisible
- [ ] Couleurs préservées (print-color-adjust: exact)

### 5. Flow de Signature (Express)

#### Accès Public
- [ ] Scanner le QR code ou ouvrir l'URL `/g/[token]`
- [ ] Vérifier que ExpressSignFlow s'affiche
- [ ] Pas de liste de participants (comportement express)

#### Formulaire
- [ ] Tous les champs du template s'affichent
- [ ] Validation fonctionne
- [ ] Soumission du formulaire

#### Après Signature
- [ ] Redirection vers page de remerciement
- [ ] Nouveau membre créé dans signing_group_member
- [ ] Signature enregistrée dans submission
- [ ] Compteur sur dashboard incrémenté

### 6. Intégration Backend

#### Base de Données
- [ ] Vérifier que `kind = 'station'` est enregistré
- [ ] `status = 'open'` par défaut
- [ ] `requires_signature = true`
- [ ] `signature_mode = 'individual'`
- [ ] `public_token` généré correctement

#### Requêtes
- [ ] Dashboard récupère bien le champ `kind`
- [ ] Filtrage des stations fonctionne dans SessionsPanel
- [ ] LiveSessionManager n'inclut pas les stations
- [ ] Stats (total signatures) correctes

### 7. Régressions à Vérifier

#### Sessions Existantes
- [ ] Les sessions planifiées (kind = 'roster') fonctionnent toujours
- [ ] Onglets "Aujourd'hui", "Demain et après", "Récentes" OK
- [ ] Sessions express (kind = 'express') fonctionnent
- [ ] Aucune station n'apparaît dans les onglets de sessions

#### Navigation
- [ ] Breadcrumbs fonctionnent
- [ ] Retour arrière depuis pages stations
- [ ] Links internes corrects

### 8. Compatibilité Navigateurs

#### Desktop
- [ ] Chrome/Edge : mode kiosque + impression
- [ ] Firefox : mode kiosque + impression
- [ ] Safari : mode kiosque + impression

#### Mobile (si applicable)
- [ ] QR code scannable
- [ ] Formulaire de signature utilisable
- [ ] Pas de mode kiosque nécessaire sur mobile

### 9. Performance

- [ ] Chargement page dashboard rapide
- [ ] Génération QR code rapide (< 1s)
- [ ] Pas de flash de contenu non stylisé
- [ ] Transitions fluides (animations Framer Motion)

### 10. Accessibilité

- [ ] Navigation clavier fonctionne
- [ ] Focus visible sur tous les boutons
- [ ] Alt text sur images QR code
- [ ] Attributs ARIA appropriés
- [ ] Contraste des couleurs suffisant

## Bugs Connus / À Corriger

### Statistiques "Aujourd'hui"
- ⚠️ Actuellement, "signatures aujourd'hui" = total
- À implémenter : filtrage par date du jour dans la requête SQL
- Voir Phase 8 pour la solution

### Autres
- (Aucun bug connu pour l'instant)

## Résultat Attendu

✅ **Tous les tests passent** : La feature est prête pour production
⚠️ **Quelques tests échouent** : Corrections nécessaires
❌ **Beaucoup de tests échouent** : Révision de l'implémentation requise

---

*Document créé le 2026-08-04*
*À mettre à jour après chaque session de test*
