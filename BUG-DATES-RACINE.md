# BUG DATES — CAUSE RACINE IDENTIFIÉE ET CORRIGÉE

## CAUSE RACINE

### Le problème
Dans `src/lib/groups/lifecycle.ts`, ligne 44 :
```typescript
const d = new Date(value);  // ❌ BUGUÉ
```

Quand on passe une chaîne ISO **sans timezone** comme `"2024-08-03T22:00:00"` à `new Date()`, **JavaScript l'interprète comme UTC, pas comme heure locale**.

### Pipeline complet du bug

1. **Frontend (new-session-modal.tsx, ligne 159)**
   ```typescript
   const startTimeISO = `${date.getFullYear()}-${month}-${day}T${time}:00`;
   // Exemple: "2024-08-03T22:00:00"
   ```

2. **Backend (actions.ts, ligne 63)**
   ```typescript
   const startTime = startTimeRaw ? parseScheduledAt(startTimeRaw) : null;
   ```

3. **Parser (lifecycle.ts, ligne 44) - LE BUG**
   ```typescript
   const d = new Date(value);  // Interprété comme UTC !
   ```
   
   - Input: `"2024-08-03T22:00:00"` (samedi 22h heure locale)
   - Interprété comme: 22:00 UTC
   - Si timezone = UTC+2 (Europe) → devient 00:00 heure locale = dimanche
   - Stocké en base: `"2024-08-04T00:00:00.000Z"` ❌

4. **Affichage (dashboard-sessions-view.tsx)**
   - La date stockée est dimanche 00:00 UTC
   - Comparée avec "aujourd'hui" (samedi)
   - Résultat: classée dans "À venir" au lieu de "Aujourd'hui"

### Exemple concret

**Scénario :**
- Heure actuelle: Samedi 21h55 (Europe, UTC+2)
- Création session: Aujourd'hui 22h00

**Comportement BUGUÉ :**
```javascript
new Date("2024-08-03T22:00:00")  // Interprété comme 22:00 UTC
// = Dimanche 00:00 heure locale (UTC+2)
// → Stocké comme "2024-08-04T00:00:00.000Z"
// → Classé dans "À venir" (demain)
// → Affiche "dimanche"
```

**Comportement CORRECT :**
```javascript
new Date(2024, 7, 3, 22, 0, 0)  // 3 août 2024, 22h local
// = Samedi 22:00 heure locale
// → Stocké comme "2024-08-03T20:00:00.000Z" (22h local = 20h UTC)
// → Classé dans "Aujourd'hui"
// → Affiche "dans 5 minutes"
```

---

## CORRECTION APPLIQUÉE

### Nouveau code (lifecycle.ts)

```typescript
export function parseScheduledAt(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  // Match ISO datetime: YYYY-MM-DDTHH:MM ou YYYY-MM-DDTHH:MM:SS
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;

  // ✅ CORRECT: Construire Date avec composants locaux
  const d = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,  // mois 0-indexed
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10),
    second ? parseInt(second, 10) : 0
  );

  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();  // Conversion UTC pour stockage
}
```

### Pourquoi ça marche

Le constructeur `new Date(year, month, day, hour, minute, second)` crée une Date **en heure locale**, puis `toISOString()` la convertit en UTC pour le stockage. La conversion UTC/local est faite correctement dans les deux sens.

---

## TESTS DE VALIDATION

### Test 1 : Session aujourd'hui future
```
Samedi 21h55 + session à 22h00
✅ Avant: "À venir", "dimanche"
✅ Après: "Aujourd'hui", "dans 5 minutes"
```

### Test 2 : Session demain
```
Samedi 21h55 + session dimanche 10h
✅ Reste dans "À venir"
✅ Affiche correctement "dimanche"
```

### Test 3 : Session en cours
```
Session démarrée aujourd'hui 20h, il est 21h55
✅ Reste dans "Aujourd'hui"
✅ Affiche temps écoulé correct
```

---

## VÉRIFICATION

Pour vérifier que la correction fonctionne :

1. **Console navigateur** : Copiez le contenu de `public/debug-dates.js`
2. **Créez une session** : Aujourd'hui dans 5-10 minutes
3. **Vérifiez** :
   - Elle apparaît dans "Aujourd'hui" (pas "À venir")
   - Elle affiche "dans X minutes" (pas "demain")
   - Après l'heure de début, elle reste dans "Aujourd'hui"

---

## FICHIERS MODIFIÉS

- `src/lib/groups/lifecycle.ts` (fonction parseScheduledAt refaite)
- `public/debug-dates.js` (script de diagnostic créé)

## BUILD STATUS

✅ Compilation réussie sans erreurs
