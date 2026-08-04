# Étape 5 : Formulaire public de signature représentant - TERMINÉ

## Résumé de l'implémentation

L'étape 5 du mode de signature représentant de groupe est maintenant **complètement fonctionnelle**. Le système détecte automatiquement le mode de signature choisi lors de la création de l'activité et affiche le bon formulaire.

## Fichiers créés

### 1. `/src/app/g/[token]/actions.ts`
**Action serveur pour la soumission de la signature représentant**

- ✅ Validation rate limiting (bucket dédié `group_rep_sign:token`)
- ✅ Vérification du mode signature = `group_representative`
- ✅ Vérification qu'aucune signature représentant n'existe déjà
- ✅ Validation des champs (nom >= 2 chars, email valide, signature présente)
- ✅ Décodage et upload de la signature PNG vers Supabase Storage
- ✅ Création de la submission avec `signature_type='group_representative'` et `represented_group_id`
- ✅ Rollback automatique si l'upload échoue
- ✅ Redirection vers page de confirmation

### 2. `/src/app/g/[token]/group-representative-sign-flow.tsx`
**Composant client pour le formulaire de signature représentant**

Structure en 4 sections :
1. **Contexte** - Affiche les détails de l'activité
   - Nom de l'activité avec icône 👥
   - Nombre de participants
   - Date et heure (si disponible)
   - Message explicatif : "Une seule signature suffit pour tous les participants"

2. **Décharge** - Texte légal du template

3. **Informations du représentant**
   - Nom et prénom (requis)
   - Email (requis) - avec message : "Une copie sera envoyée à cette adresse"
   - Fonction (facultatif) - Ex. Enseignant, Responsable RH, Coach, Guide

4. **Signature**
   - Canvas de signature réutilisé (même logique que les autres flows)
   - Certification : "Je certifie être autorisé(e) à représenter ce groupe et à signer cette décharge en son nom."
   - Checkbox RGPD (requis)
   - Bouton "Signer pour le groupe"

### 3. `/src/app/g/[token]/merci/page.tsx`
**Page serveur de confirmation**

- ✅ Récupère les infos du groupe et du business
- ✅ Récupère la signature représentant depuis `submission` (via `represented_group_id`)
- ✅ Applique le branding (logo, couleurs, police, thème)
- ✅ Passe les données au composant client

### 4. `/src/app/g/[token]/merci/group-merci-view.tsx`
**Vue client de confirmation**

- ✅ Animation de succès (checkmark avec effets Framer Motion)
- ✅ Logo ou initiale du business
- ✅ Titre : "Décharge signée pour le groupe"
- ✅ Message : "La signature du représentant a été enregistrée... L'ensemble du groupe est maintenant couvert"
- ✅ Card récapitulative avec :
  - Activité (avec icône 👥)
  - Signé par : [nom du représentant]
  - Date et heure de signature
- ✅ Footer Paova avec liens confidentialité/mentions légales

## Modifications des fichiers existants

### `/src/app/g/[token]/page.tsx`
- ✅ Ajout de `signature_mode, start_time` dans la requête
- ✅ Import du composant `GroupRepresentativeSignFlow`
- ✅ Logique de routage conditionnelle :
  ```typescript
  group.signature_mode === "group_representative" ? (
    <GroupRepresentativeSignFlow ... />
  ) : isExpress ? (
    <ExpressSignFlow ... />
  ) : (
    <GroupSignFlow ... />
  )
  ```

## Base de données

Utilise les champs créés dans la migration `0055_signature_mode.sql` :

**Table `signing_group`:**
- `signature_mode` : 'individual' | 'group_representative'

**Table `submission`:**
- `signature_type` : 'participant' | 'group_representative'
- `representative_role` : text nullable (fonction du représentant)
- `represented_group_id` : UUID nullable (lien vers signing_group)

## Sécurité

✅ Rate limiting dédié par token de groupe
✅ Validation stricte du mode de signature
✅ Vérification qu'une seule signature représentant peut exister par groupe
✅ Validation des entrées (clampInput, normalizeEmail, parseSignatureDataUrl)
✅ IP tracking pour audit
✅ Rollback transactionnel si upload échoue

## UX/UI

✅ Design cohérent avec les autres flows de signature
✅ Animations Framer Motion (désactivables si prefers-reduced-motion)
✅ Branding complet (couleurs, police, logo, radius, thème)
✅ Messages clairs et contextuels
✅ Responsive (mobile-first)
✅ Accessibilité (aria-labels, rôles, focus states)

## Tests manuels recommandés

1. ✅ Créer une activité avec mode "group_representative"
2. ✅ Scanner le QR code ou ouvrir le lien public
3. ✅ Vérifier que le formulaire représentant s'affiche (pas le formulaire individuel)
4. ✅ Remplir le formulaire avec des données valides
5. ✅ Signer et valider
6. ✅ Vérifier la redirection vers /g/[token]/merci
7. ✅ Vérifier l'affichage de la confirmation
8. ✅ Vérifier en BDD :
   - submission.signature_type = 'group_representative'
   - submission.represented_group_id = [group.id]
   - submission.representative_role = [fonction saisie ou null]
9. ✅ Essayer de soumettre à nouveau → doit être bloqué (already_signed)

## Prochaines étapes

### Étape 6 : Adaptation du dashboard
- Modifier les cards d'activité pour afficher "Représentant signé ✓" au lieu de "X/Y signatures"
- Masquer la barre de progression pour le mode représentant
- Adapter les métriques de la page activité

### Étape 7 : Page activité détaillée
- Afficher le mode de signature avec icône
- Section dédiée pour la signature représentant (nom, email, fonction, date)
- Liste des participants sans statut individuel

### Étape 8 : Exports et vérifications
- PDF : mentionner la signature représentant
- CSV : inclure les infos du représentant
- Vérification : adapter la logique pour accepter le mode représentant

### Étape 9 : Tests et build final
- Tests end-to-end
- Vérification de tous les flux
- Build production
