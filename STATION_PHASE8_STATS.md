# Phase 8: Statistiques & Raffinements

## Objectif
Améliorer les statistiques des stations pour afficher les signatures réellement collectées aujourd'hui, et non le total.

## Problème Actuel
- Le composant `StationCard` et `StationDetailView` affichent `signaturesToday = total`
- Pas de filtrage par date dans les requêtes
- Les statistiques ne reflètent pas l'activité du jour

## Solution Proposée

### 1. Créer une Vue SQL pour les Stats Stations

```sql
-- Migration: Ajouter une fonction pour les stats de station par jour
CREATE OR REPLACE FUNCTION dashboard_station_stats(p_business_id UUID)
RETURNS TABLE (
  station_id UUID,
  total_signatures BIGINT,
  signatures_today BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sg.id as station_id,
    COUNT(DISTINCT sgm.id) as total_signatures,
    COUNT(DISTINCT sgm.id) FILTER (
      WHERE sgm.signed_at >= CURRENT_DATE 
      AND sgm.signed_at < CURRENT_DATE + INTERVAL '1 day'
    ) as signatures_today
  FROM signing_group sg
  LEFT JOIN signing_group_member sgm ON sgm.group_id = sg.id
  WHERE sg.business_id = p_business_id
    AND sg.kind = 'station'
    AND sg.status != 'archived'
  GROUP BY sg.id;
END;
$$;
```

### 2. Modifier la Page Dashboard

Dans `src/app/dashboard/page.tsx`, ajouter après la requête des groupes :

```typescript
// Fetch station-specific stats (today + total)
const { data: stationStatsRows } = await supabase.rpc("dashboard_station_stats", {
  p_business_id: business.id,
});

const stationStats = new Map<string, { total: number; today: number }>();
for (const row of stationStatsRows ?? []) {
  stationStats.set(row.station_id, {
    total: Number(row.total_signatures),
    today: Number(row.signatures_today),
  });
}
```

### 3. Passer les Stats aux Composants

Modifier `DashboardGroupRow` pour inclure les stats séparées :

```typescript
// Dans le mapping des groupes
const allDashboardGroups = (signingGroups ?? []).map((g) => {
  const s = groupStats.get(g.id) ?? { total: 0, signed: 0 };
  const stationStat = g.kind === "station" ? stationStats.get(g.id) : null;
  
  return {
    id: g.id,
    name: g.name,
    // ... autres champs ...
    total: s.total,
    signed: s.signed,
    kind: g.kind ?? "roster",
    // Nouveaux champs pour stations
    signatures_today: stationStat?.today ?? 0,
    total_signatures: stationStat?.total ?? s.total,
  };
});
```

### 4. Mettre à Jour le Type

Dans `src/lib/dashboard/types.ts` :

```typescript
export type DashboardGroupRow = {
  // ... champs existants ...
  kind?: string | null;
  /** Station only: signatures collected today */
  signatures_today?: number;
  /** Station only: total signatures since creation */
  total_signatures?: number;
};
```

### 5. Utiliser dans StationCard

```typescript
export function StationCard({ station }: StationCardProps) {
  const signaturesToday = station.signatures_today ?? station.total;
  const totalSignatures = station.total_signatures ?? station.total;
  
  // ... reste du composant
}
```

### 6. Utiliser dans StationDetailView

```typescript
// Dans page.tsx, passer les bonnes valeurs
<StationDetailView
  stationId={group.id}
  stationName={group.name}
  templateTitle={template?.title ?? "Formulaire"}
  publicUrl={publicUrl}
  qrDataUrl={qrDataUrl}
  signaturesToday={station.signatures_today ?? total}
  totalSignatures={station.total_signatures ?? total}
/>
```

## Alternative Plus Simple (Sans Migration SQL)

Si vous ne voulez pas créer de fonction SQL, filtrer côté application :

```typescript
// Dans page.tsx du dashboard
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

// Pour chaque station, compter les signatures du jour
const stationStats = new Map<string, { today: number }>();
for (const station of signingGroups?.filter(g => g.kind === "station") ?? []) {
  const { count } = await supabase
    .from("signing_group_member")
    .select("id", { count: "exact", head: true })
    .eq("group_id", station.id)
    .gte("signed_at", today.toISOString())
    .lt("signed_at", tomorrow.toISOString());
  
  stationStats.set(station.id, { today: count ?? 0 });
}
```

## Recommandation

**Option 1 (SQL Function)** : Plus performant, une seule requête pour toutes les stations
**Option 2 (Application)** : Plus simple à implémenter, mais N+1 requêtes si beaucoup de stations

Pour un MVP, l'Option 2 suffit. Pour la production avec potentiellement des dizaines de stations, l'Option 1 est préférable.

## Raffinements Additionnels (Optionnel)

### Live Refresh en Mode Kiosk
```typescript
// Dans StationDetailView, ajouter un intervalle de rafraîchissement
useEffect(() => {
  if (!kioskMode) return;
  
  const interval = setInterval(() => {
    // Recharger les stats via un endpoint API
    fetch(`/api/stations/${stationId}/stats`)
      .then(r => r.json())
      .then(data => {
        setSignaturesToday(data.today);
        setTotalSignatures(data.total);
      });
  }, 30000); // Toutes les 30 secondes
  
  return () => clearInterval(interval);
}, [kioskMode, stationId]);
```

### Graphiques d'Activité
- Chart.js ou Recharts pour afficher signatures par heure
- Graphique des 7 derniers jours
- Heure de pointe de la journée

### Archivage des Stations
- Bouton "Fermer définitivement" dans la page détail
- Confirmation modale
- Status archivé filtre des onglets actifs

## Priorité d'Implémentation

1. **P0** : Stats aujourd'hui vs total (Option 2 simple)
2. **P1** : Live refresh mode kiosk (améliore UX)
3. **P2** : Optimisation SQL (Option 1, si beaucoup de stations)
4. **P3** : Graphiques d'activité (nice-to-have)
5. **P4** : Archivage stations (gestion long terme)

## État Actuel
- ❌ Non implémenté (par défaut, on affiche total comme aujourd'hui)
- Documentation créée pour implémentation future
- Les composants sont déjà structurés pour recevoir ces données

