# Dashboard Today Hero — V1

## Mission

Transformer le dashboard en centre de contrôle opérationnel.

**Objectif** : Quand un responsable ouvre Paova le matin, il doit comprendre en moins de 2 secondes si tout est sous contrôle.

---

## Ce qui a été fait

### 1. Nouveau Hero "Aujourd'hui"

Remplace le `DashboardBusinessHero` par un `DashboardTodayHero` focalisé sur l'activité du jour.

#### État global intelligent

Le hero analyse automatiquement les sessions et détermine l'état :

🟢 **Tout est prêt**
- Toutes les validations sont complètes
- Aucune action requise

🟡 **Attention requise**
- Des signatures manquent
- Pas d'urgence immédiate

🔴 **Action urgente requise**
- Sessions démarrant dans moins de 2 heures
- Signatures encore manquantes

#### Métriques clés

Grid responsive (2 colonnes mobile, 4 colonnes desktop) :

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Activités   │ Personnes   │ Validées    │ Restantes   │
│     3       │     24      │     21      │      3      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**Validées** = signatures effectuées aujourd'hui
**Restantes** = signatures manquantes (colorée selon urgence)

#### Message d'action contextuel

Phrase claire qui explique ce qui nécessite intervention :

- Si 1 activité : "Anniversaire Léa attend 3 signatures."
- Si plusieurs : "2 activités nécessitent encore votre intervention."
- Si tout OK : pas de message

---

## Design

### Hiérarchie visuelle

**Niveau 1** : État global (badge coloré, impossible à manquer)
**Niveau 2** : Date du jour (contexte temporel)
**Niveau 3** : Métriques chiffrées (scan rapide)
**Niveau 4** : Message d'action (détail contextuel)

### Couleurs sémantiques

- Vert (`#10b981`) : tout va bien, validation complète
- Orange (`#f59e0b`) : attention, action nécessaire
- Rouge (`#ef4444`) : urgent, risque de bloquer une activité
- Gris : aucune activité prévue

### Animations

- Entrance progressive (stagger) sur les métriques
- Duration : 0.22s avec easing premium
- Désactivée si `prefers-reduced-motion`

---

## Logique métier

### Filtrage "Aujourd'hui"

Une session est considérée "aujourd'hui" si :

1. Elle a un `start_time` défini ET il tombe aujourd'hui
2. OU elle a un `scheduled_at` (legacy) ET il tombe aujourd'hui  
3. OU elle est `open` et n'a pas de date (considérée active par défaut)

Les sessions `archived` sont exclues.

### Détection d'urgence

Une session est **urgente** si :
- Elle démarre dans moins de 2 heures
- ET des signatures manquent encore
- ET elle a un horaire défini (`start_time`)

Cela permet d'alerter en amont les responsables.

---

## Architecture technique

### Nouveau composant

```
src/app/dashboard/dashboard-today-hero.tsx
```

Client component avec :
- Logique de filtrage temporel
- Calcul d'état global
- Génération de message contextuel
- Animations Framer Motion

### Page dashboard modifiée

```
src/app/dashboard/page.tsx
```

- Import du `DashboardTodayHero`
- Retrait du `DashboardBusinessHero`
- Suppression des variables inutilisées (plan, quota, activity)
- Simplifie les requêtes (plus besoin du count mensuel)

---

## Ce qui n'a PAS été fait (volontairement)

❌ Pas de nouvelles routes backend
❌ Pas de nouvelles requêtes SQL
❌ Pas de modification des sections existantes (groupes, waivers)
❌ Pas de nouvelles fonctionnalités métier

**Principe** : Travailler uniquement avec les données déjà disponibles pour cette V1.

---

## Impact utilisateur

### Avant

```
┌────────────────────────────────────────┐
│ [Pro badge]          [Search button]  │
│                                        │
│ Mon Établissement                      │
│ • Rôle : Propriétaire                  │
│ • 2 formulaires ouverts, 5 sessions   │
│ • Dernière activité il y a 3 heures    │
│                                        │
│ [Équipe] [Signatures] [Archives]       │
└────────────────────────────────────────┘
```

**Problème** : Aucune notion de "maintenant". Pas d'indication d'urgence. Informations administratives mélangées à l'opérationnel.

### Après

```
┌────────────────────────────────────────┐
│ AUJOURD'HUI              [🟡 Attention]│
│ mardi 2 août 2026                      │
│                                        │
│ ┌────┬────┬────┬────┐                 │
│ │ 3  │ 24 │ 21 │ 3  │                 │
│ └────┴────┴────┴────┘                 │
│                                        │
│ Une activité nécessite encore votre   │
│ intervention.                          │
└────────────────────────────────────────┘
```

**Gain** : 
- État visible en 2 secondes
- Contexte temporel clair (aujourd'hui)
- Métriques actionnables
- Indication claire de ce qui nécessite attention

---

## Prochaines itérations possibles

### Court terme

1. **Actions rapides inline**
   - "Envoyer un rappel" directement dans le hero
   - "Voir les activités" → scroll vers section groupes

2. **Amélioration du filtrage**
   - Détecter les sessions "imminentes" (1h, 30 min)
   - Niveau d'urgence progressif

3. **Métriques additionnelles**
   - Taux de complétion (21/24 = 87%)
   - Barre de progression visuelle

### Moyen terme

4. **Vue temporelle**
   - Timeline horizontale des sessions du jour
   - Indicateur "maintenant" qui se déplace

5. **Notifications proactives**
   - Badge sur l'onglet navigateur si urgence
   - Son/vibration sur mobile

6. **Personnalisation**
   - Masquer le hero si aucune activité aujourd'hui
   - Préférences d'affichage (métriques visibles)

---

## Philosophie respectée

✅ **Garantir qu'aucune personne n'accède sans consentement**
- Le hero montre immédiatement combien de validations manquent

✅ **Produit horizontal**
- Fonctionne pour escape game, hôtel, école, karting, etc.
- Vocabulaire universel : "activités", "personnes", "validations"

✅ **Les personnes avant la structure**
- Focus sur les signatures manquantes, pas sur les "sessions incomplètes"

✅ **Le validé s'efface, le bloqué reste visible**
- État vert = discret
- États orange/rouge = impossible à manquer

✅ **Design sobre et premium**
- Pas de tape-à-l'œil
- Hiérarchie claire
- Animations subtiles

---

## Test de validation

**Question** : Un responsable ouvre Paova à 9h. Que voit-il en premier ?

❌ Avant : "Mon Établissement · 2 formulaires ouverts, 5 sessions"
✅ Après : "🟡 Attention requise · 3 activités · 3 validations restantes"

**Résultat** : Il sait immédiatement qu'il doit agir, combien de personnes sont concernées, et ce qui manque.

---

Cette V1 pose les fondations du dashboard opérationnel. Les prochaines itérations ajouteront des actions rapides et une meilleure granularité temporelle.
