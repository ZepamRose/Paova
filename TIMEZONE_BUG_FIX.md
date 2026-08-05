# Correction du Bug de Timezone - Session Detail Page

## Problème Initial

**Symptôme :** Incohérence d'affichage de l'heure de début de session
- Dashboard (carte) → 02:45 ✅
- Modal d'aperçu → 02:45 ✅  
- Page "Voir l'activité" (detail) → 00:45 ❌ (décalage de 2 heures)

## Analyse de la Cause Racine

### Où la donnée devient incorrecte
Dans le rendu côté serveur de `src/app/dashboard/groupes/[id]/page.tsx` (lignes 231-238)

### Fichier responsable
`src/app/dashboard/groupes/[id]/page.tsx`

### Pourquoi uniquement cette page affichait une heure différente

**Le problème : Server-side vs Client-side rendering**

1. **Dashboard (CORRECT)** - `src/app/dashboard/dashboard-sessions-view.tsx`
   - Directive `"use client"` en première ligne
   - Composant CLIENT exécuté dans le navigateur
   - `toLocaleTimeString("fr-FR")` s'exécute côté client → utilise le **timezone du navigateur (UTC+2)**
   - Résultat : 02:45 ✅

2. **Page Detail (INCORRECT - AVANT FIX)** - `src/app/dashboard/groupes/[id]/page.tsx`
   - AUCUNE directive `"use client"` 
   - Composant SERVER exécuté sur Node.js
   - `formatTimeRange()` → `formatSessionTime()` → `toLocaleTimeString("fr-FR")` s'exécute **côté serveur**
   - Le serveur tourne en **timezone UTC (UTC+0)**
   - Base de données : "2026-08-04T00:45:00.000Z" (qui représente 02:45 en UTC+2, mais 00:45 en UTC)
   - Le serveur formate la date en UTC → 00:45 ❌

### Principe technique

`toLocaleTimeString()` utilise le timezone de l'environnement d'exécution :
- Dans le navigateur (composant client) → timezone de l'utilisateur
- Sur le serveur (composant serveur) → timezone du serveur (généralement UTC)

## Solution Appliquée

### Changements effectués

1. **Création de `src/app/dashboard/groupes/[id]/session-time-display.tsx`**
   - Nouveau composant CLIENT (`"use client"`)
   - Extrait la logique de formatage de l'heure
   - S'exécute toujours dans le navigateur → utilise le timezone de l'utilisateur
   - Encapsule la logique `sessionDateLabel` + `formatTimeRange`

2. **Modification de `src/app/dashboard/groupes/[id]/page.tsx`**
   - Import du nouveau composant `SessionTimeDisplay`
   - Suppression de la fonction locale `sessionDateLabel`
   - Suppression de l'import inutilisé `formatTimeRange`
   - Remplacement du calcul serveur de `timeLabel` par le composant client
   - Ligne 242 : `<SessionTimeDisplay startTime={startTime} endTime={endTime} />`

## Résultat

✅ L'heure de session est maintenant affichée correctement sur TOUTES les pages :
- Dashboard → 02:45
- Modal → 02:45
- Page detail → 02:45

Le timezone de l'utilisateur est maintenant respecté partout grâce au rendu côté client.

## Principe Architectural

**Règle :** Toute donnée temporelle affichée à l'utilisateur doit être formatée côté CLIENT pour respecter son timezone local, pas celui du serveur.

Les composants serveur peuvent :
- Lire et transmettre les timestamps ISO bruts
- Faire des calculs de comparaison/différence
- Passer les données aux composants clients

Les composants clients doivent :
- Formater les dates/heures pour l'affichage
- Interpréter les entrées utilisateur de date/heure
