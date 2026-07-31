# Configuration de l'email Magic Link dans Supabase

## Contexte

Le template `email-magic-link.supabase.html` doit être configuré manuellement dans le tableau de bord Supabase car les emails Magic Link sont envoyés directement par Supabase Auth, pas par l'application.

## Instructions de configuration

### Étape 1 : Accéder aux templates email dans Supabase

1. Ouvrir le tableau de bord Supabase : https://supabase.com/dashboard
2. Sélectionner votre projet
3. Aller dans **Authentication** → **Email Templates**
4. Cliquer sur **Magic Link**

### Étape 2 : Copier le template

1. Ouvrir le fichier `branding/email-magic-link.supabase.html`
2. Copier tout le contenu (Ctrl+A, Ctrl+C)
3. Coller dans l'éditeur Supabase
4. Cliquer sur **Save** (Sauvegarder)

### Étape 3 : Vérifier le logo

Le template utilise l'URL : `https://paova.app/brand/paova-logotype@2x.png`

**Vérifications importantes :**

✓ Le fichier `public/brand/paova-logotype@2x.png` existe dans le projet  
✓ L'application est déployée sur https://paova.app (ou mettre à jour l'URL dans le template)  
✓ Next.js sert automatiquement les fichiers de `public/` à la racine

### Étape 4 : Tester

1. Se déconnecter de l'application
2. Demander un Magic Link via le formulaire de connexion
3. Vérifier l'email reçu :
   - Le logo Paova s'affiche correctement
   - Le bouton "Accéder à mon espace" fonctionne
   - Le message de support est présent
   - Aucun lien technique Supabase n'est visible

## Résolution des problèmes

### Le logo ne s'affiche pas

**Cause :** L'URL du logo n'est pas accessible publiquement.

**Solutions :**
1. Vérifier que l'application est déployée sur https://paova.app
2. Tester l'URL directement : https://paova.app/brand/paova-logotype@2x.png
3. Si l'URL est différente, mettre à jour la ligne 27 du template

### Le lien Magic Link ne fonctionne pas

**Cause :** La variable `{{ .ConfirmationURL }}` a été modifiée par erreur.

**Solution :** Vérifier que la ligne 36 contient bien `href="{{ .ConfirmationURL }}"`

### Le style ne s'affiche pas correctement

**Cause :** Certains clients email ont des limitations CSS.

**Testé et compatible avec :**
- Gmail (desktop et mobile)
- Apple Mail (macOS et iOS)
- Outlook (desktop)
- Yahoo Mail
- ProtonMail

## Pourquoi PNG plutôt que SVG ?

Les clients email bloquent les SVG inline pour des raisons de sécurité (risque d'injection de scripts). Le PNG garantit :

- Compatibilité maximale avec tous les clients email
- Affichage identique partout
- Aucun risque de blocage

Le logo utilisé est `paova-logotype@2x.png` (720×206px) affiché à 180×52px pour un rendu net sur écrans Retina.

## Notes techniques

- La variable Supabase `{{ .ConfirmationURL }}` est utilisée 1 seule fois (dans le bouton)
- Le lien technique Supabase n'est PLUS affiché (problème résolu)
- Le template utilise des tables HTML (compatibilité Outlook)
- Les SVG simples (icône shield) fonctionnent car ils sont inline et sans scripts
