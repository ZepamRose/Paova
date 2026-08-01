// Script de diagnostic - À exécuter dans la console navigateur

console.log("=== DIAGNOSTIC DATES PAOVA ===\n");

const now = new Date();
console.log("1. Date actuelle locale:", now.toString());
console.log("   ISO:", now.toISOString());
console.log("   Timezone offset:", now.getTimezoneOffset(), "minutes");

const testDate = new Date(2024, 7, 3); // 3 août 2024 (mois 0-indexed)
const testTime = "22:00";
const testISO = `${testDate.getFullYear()}-${String(testDate.getMonth() + 1).padStart(2, "0")}-${String(testDate.getDate()).padStart(2, "0")}T${testTime}:00`;

console.log("\n2. Date créée par le frontend:");
console.log("   Input string:", testISO);

// Comportement ACTUEL (bugué)
const parsedUTC = new Date(testISO);
console.log("\n3. Parse ACTUEL (new Date sans timezone):");
console.log("   Résultat:", parsedUTC.toString());
console.log("   ISO:", parsedUTC.toISOString());
console.log("   ❌ PROBLÈME: Interprété comme UTC, pas local!");

// Comportement CORRECT
const parts = testISO.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
if (parts) {
  const [, year, month, day, hour, minute] = parts;
  const parsedLocal = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute)
  );
  console.log("\n4. Parse CORRECT (Date constructor avec composants):");
  console.log("   Résultat:", parsedLocal.toString());
  console.log("   ISO:", parsedLocal.toISOString());
  console.log("   ✅ CORRECT: Respecte le fuseau local");
}

console.log("\n5. Test comparaison:");
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const todayEnd = new Date(todayStart);
todayEnd.setDate(todayEnd.getDate() + 1);
console.log("   Today start:", todayStart.toISOString());
console.log("   Today end:", todayEnd.toISOString());
console.log("   parsedUTC >= todayEnd?", parsedUTC >= todayEnd, "(devrait être false)");
console.log("   parsedLocal >= todayEnd?", "voir résultat ci-dessus");
