# Changements Visuels — Vue d'Ensemble

## 1. HERO NARRATIF

### États Visuels

**🔴 URGENT**
```
┌────────────────────────────────────────────────────┐
│  [Icône]  ● Une session se termine dans moins de  │
│            30 minutes                              │
│                                                    │
│            8 validations encore nécessaires avant  │
│            la fin.                                 │
│                                                    │
│            3 sessions actives · 8 en attente      │
└────────────────────────────────────────────────────┘
[Gradient rouge subtil, bordure rouge claire]
```

**🟡 ATTENTION**
```
┌────────────────────────────────────────────────────┐
│  [Icône]  ● 8 validations restent en attente      │
│                                                    │
│            2 sessions nécessitent votre           │
│            intervention.                          │
│                                                    │
│            3 sessions actives · 8 en attente      │
└────────────────────────────────────────────────────┘
[Gradient orange, bordure orange]
```

**✓ COMPLET**
```
┌────────────────────────────────────────────────────┐
│  [Icône]  ● Toutes les validations sont réunies   │
│                                                    │
│            3 sessions actives — tout est prêt.    │
│                                                    │
│            3 sessions actives                     │
└────────────────────────────────────────────────────┘
[Gradient vert brand, bordure brand]
```

**Impact** : L'utilisateur sait immédiatement s'il doit agir.

---

## 2. CARTES SESSIONS

### AVANT (hauteur 100%)
```
┌────────────────────────────────────┐
│                                    │
│  Cours de Yoga                     │
│  Décharge sportive             [●] │
│                                    │
│  🕐 14:00 - 15:30 · ⏱ 1h30        │
│                                    │
│  👥 15 participants                │
│  3 en attente                      │
│                                    │
│  ████████░░░░ 80%                 │
│                                    │
└────────────────────────────────────┘
```

### APRÈS (hauteur 75% — réduction 25%)
```
┌────────────────────────────────────┐ ← Bordure ROUGE si urgent
│ 🔴 3 personnes attendent encore    │ ← PROBLÈME EN AVANT
│    leur validation                 │
│                                    │
│ Cours de Yoga                      │
│ Décharge sportive                  │
│                                    │
│ 🕐 14:00 - 15:30 · 1h30           │ ← Plus compact
│ 👥 12 / 15  ·  80%                │ ← Stats condensées
│ ████████░░░░                      │
└────────────────────────────────────┘
```

### Hiérarchie Couleur

**URGENT** (< 30 min) — Bordure ROUGE
**COMPLETING** (30 min - 2h) — Bordure ORANGE  
**ACTIVE** (normal) — Bordure VERT
**COMPLETED** (terminé) — GRIS discret, opacité 65%

**Gain** : +30% de sessions visibles, urgence immédiate.

---

## 3. MODÈLES — DISCRETS

### AVANT (proéminent)
```
🗎 Modèles de formulaire
   3 modèles disponibles

┌──────────────────────────────┐
│                              │
│ Décharge Sportive        [📄]│
│                              │
│ [Active]                     │
│                              │
│ 🔄 Utilisé dans 3 sessions  │
│ 📅 Dernière utilisation :   │
│    il y a 2 jours           │
│ 12 signatures au total      │
│                              │
└──────────────────────────────┘
```

### APRÈS (secondaire)
```
🗎 Modèles de formulaire      ← Texte gris, petit
   3 modèles disponibles

┌────────────────────────┐
│ Décharge Sportive  [📄]│   ← Compact
│ [Active]               │
│ 3 sessions · 12 sign.  │   ← Une ligne
└────────────────────────┘
```

**Changements** :
- Hauteur : -40%
- Titre section : gris au lieu de noir
- Info : une ligne au lieu de 3-4
- Grid : 4 colonnes au lieu de 3
- Pas de hover lift

**Gain** : Les modèles ne volent plus l'attention.

---

## 4. COULEURS SÉMANTIQUES

```
🔴 URGENT      #dc2626  Bordure 28%  Fond 5%
🟡 ATTENTION   #d97706  Bordure 25%  Fond 4%
🟢 ACTIF       brand    Bordure 22%  Fond 4%
⚪ TERMINÉ     border   Bordure 50%  Opacité 65%
```

**Usage** :
- Rouge : < 30 minutes restantes
- Orange : 30 min - 2h restantes
- Vert : En cours normal
- Gris : Terminé

**Principe** : La couleur communique l'urgence.

---

## 5. UNE ACTION DOMINANTE

### Écran Dashboard

```
┌────────────────────────────────────────┐
│ [HERO] ← Guide narratif (pas de CTA)   │
├────────────────────────────────────────┤
│ Sessions en cours                      │
│ ┌────────────────┐ ← ROUGE = urgent   │
│ │ 🔴 3 attendent │   (action évidente) │
│ │ [Session 1]    │                     │
│ └────────────────┘                     │
│ ┌────────────────┐                     │
│ │ [Session 2]    │ ← Vert = ok        │
│ └────────────────┘                     │
├────────────────────────────────────────┤
│ Modèles (discrets, secondaires)       │
└────────────────────────────────────────┘
```

**L'œil est attiré naturellement vers** :
1. Le Hero (comprendre)
2. La carte rouge (agir)

**Pas de confusion**. Pas de fatigue décisionnelle.

---

## RÉSUMÉ VISUEL

### Avant
```
Tout a le même poids visuel
Cartes uniformes
Stats sans contexte
Modèles = Sessions
Beaucoup d'espace perdu
```

### Après
```
HERO (raconte histoire)
↓
🔴 URGENT     Sessions  ← DOMINANTE
🟡 Attention
🟢 OK
↓
─────────────────
↓
Modèles (discrets)     ← SECONDAIRE
```

**Transformation** : Données → Histoire → Action

---

## GAINS

✅ +30% de sessions visibles  
✅ < 3 secondes pour comprendre  
✅ Hiérarchie immédiate (couleurs)  
✅ Action évidente (pas de confusion)  
✅ Émotion (raconte une histoire)  

---

*Design appliqué le 2026-08-01*
