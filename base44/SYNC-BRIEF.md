# בריף לאינטגרציה — סנכרון תוכנת הניהול ⇄ אתר (Base44)

מסמך זה מיועד **לסוכן/המפתח שמנהל את תוכנת הניהול** (אפליקציית Base44 `ShellyUrban`).
המטרה: שינויים בתוכנת הניהול ישתקפו אוטומטית באתר — **בלי עבודה ידנית כפולה**.

---

## 1. התמונה הכללית
- יש **שתי אפליקציות Base44 נפרדות**:
  - **A — ניהול** (`ShellyUrban`): מקור האמת. כאן נפתחים פרויקטים ומסומנות דירות כנמכרות.
  - **B — אתר** (אפליקציית התצוגה הציבורית): מציגה פרויקטים וזמינות לגולשים.
- **כיוון הסנכרון: A → B (push).** תוכנת הניהול **דוחפת** עדכונים לאתר דרך ה‑REST API של אפליקציית האתר.
- האתר הציבורי **לא מחזיק מפתחות API** — מטעמי אבטחה. כל המפתחות יושבים בצד הניהול בלבד.

```
[A: ניהול ShellyUrban]  ──(אוטומציה: REST)──▶  [B: אתר]  ──▶  גולשים
   Project / Unit (אמת)                          Project / Unit (תצוגה)
```

---

## 2. מה צריך להקים בצד הניהול (אפליקציה A)
שתי אוטומציות (Automations / Workflows ב‑Base44):

### אוטומציה 1 — פרויקט נוצר/עודכן
**Trigger:** On `Project` (או הישות המקבילה אצלכם) **create OR update**
**Action:** HTTP request אל אפליקציית האתר:
```
POST  https://app.base44.com/api/apps/{WEBSITE_APP_ID}/entities/Project
Headers:
  Authorization: Bearer {WEBSITE_API_KEY}
  Content-Type: application/json
Body (JSON):
{
  "external_id": "{{record.id}}",                    // מזהה הפרויקט אצלכם (UUID)
  "title":       "{{record.name}}",
  "location":    "{{record.address}}",               // כתובת מלאה (אין שדה עיר נפרד)
  "cat":         "<המרה מ-category>",                // ראו טבלת המרה §3א
  "sale":        "<המרה מ-status → תווית>",          // ראו טבלת המרה §3ב
  "stage":       "<המרה מ-status → 1/2/3>",          // ראו טבלת המרה §3ב
  "image":       "{{record.project_simulation_url}}",
  "description": "{{record.description}}",
  "facts":       [ { "k":"units", "v":"{{record.total_units}}", "l":"יח״ד" } ]
}
```
> **Upsert:** אם כבר קיימת באתר רשומה עם אותו `external_id` — לעדכן אותה (PATCH) במקום ליצור חדשה. אם ה‑API שלכם לא תומך ב‑upsert אוטומטי, בצעו GET לפי `external_id` ואז POST/PATCH בהתאם.

### אוטומציה 2 — דירה שונתה (נמכרה/שוחררה)
**Trigger:** On `Unit` (דירה) **update** של שדה הסטטוס
**Action:**
```
PATCH https://app.base44.com/api/apps/{WEBSITE_APP_ID}/entities/Unit/{matched_id}
Headers: Authorization: Bearer {WEBSITE_API_KEY}  · Content-Type: application/json
Body: { "external_id": "{{record.id}}", "status": "sold|reserved|available" }
```
(אם אין `Unit` תואם באתר — ליצור אותו; מפתח ההתאמה הוא `external_id`.)

### (אופציונלי) אוטומציה 3 — לידים מהאתר אל ה‑CRM
אם תרצו שכל ליד מהאתר יגיע גם לתוכנת הניהול — נגדיר בכיוון ההפוך (אתר → ניהול). תיאום בהמשך.

---

## 3. טבלת מיפוי שדות (ניהול → אתר) — ✅ אושר
| שדה באתר (יעד) | השדה אצלכם | סוג | הערה |
|---|---|---|---|
| `external_id` | `id` | UUID | מזהה ייחודי אוטומטי (מפתח התאמה) |
| `title` | `name` | string | שם הפרויקט |
| `location` | `address` | string | כתובת מלאה (אין שדה עיר נפרד) — יוצג כפי שהוא |
| `cat` | `category` | enum | **המרה — §3א** |
| `sale` + `stage` | `status` | enum | **המרה — §3ב** (שדה אחד → שני שדות) |
| `image` | `project_simulation_url` | URL | |
| `description` | `description` | string | |
| `facts[0]` (units) | `total_units` | number | `{ "k":"units", "v":"<total_units>", "l":"יח״ד" }` |
| **Unit** `status` | (שדה הסטטוס בדירה) | enum | `available`/`reserved`/`sold` |
| **Unit** `external_id` | `id` של הדירה | UUID | מפתח התאמה לדירה |

### 3א. המרת `category` → `cat`  ✅ אושר
`cat` באתר מקבל **אחד מ-3**: `renewal` (התחדשות) · `sale` (מחיר למשתכן) · `build` (בנייה למגורים).

| הערך אצלכם ב-`category` | → `cat` באתר |
|---|---|
| `התחדשות עירונית` | `renewal` |
| `מחיר למשתכן` | `sale` |
| `שוק חופשי` | `build` |
| `מסחרי` | `commercial` ✅ |
| `ביצוע` | `build` |

> ✅ **בוצע:** נוספה לאתר קטגוריה ייעודית `commercial` (=מסחרי) עם תווית וסגנון משלה. `מסחרי` ממופה אליה.

### 3ב. המרת `status` → `sale` (תווית) + `stage` (1/2/3)  ✅ אושר
שדה `status` אחד מזין שני שדות באתר: תווית שיווק טקסטואלית (`sale`) ושלב בנייה מספרי (`stage`: 1=רישוי, 2=ביצוע, 3=אכלוס).

| הערך אצלכם ב-`status` | → `sale` (תווית) | → `stage` |
|---|---|---|
| `בביצוע` | בביצוע | 2 |
| `אוכלס` | אוכלס | 3 |

> אם בעתיד יתווספו סטטוסים (למשל "בתכנון"/"בשיווק") — נוסיף שורות: בתכנון→`stage` 1, בשיווק→`stage` 2.

---

## 4. אבטחה
- `WEBSITE_API_KEY` נשמר **רק** בצד אפליקציית הניהול (בתוך האוטומציה). לא לחשוף אותו בשום מקום ציבורי.
- מומלץ מפתח ייעודי עם הרשאת כתיבה ל‑`Project` ו‑`Unit` בלבד.

---

## 5. ⬅️ סטטוס וסעיפים פתוחים
✅ **מיפוי שדות** (§3) · ✅ **`category`→`cat`** (§3א, כולל קטגוריית `commercial` חדשה) · ✅ **`status`→`sale`/`stage`** (§3ב).
מיפוי הפרויקטים **מוכן לביצוע מלא.** נותר רק לסגירת ההקמה:
1. **`WEBSITE_APP_ID` + `WEBSITE_API_KEY`** — אספק לאחר הקמת אפליקציית האתר ב-Base44.
2. **דירות (Unit):** הנתונים קיימים אצלכם ב**דף המכירות**. כדי לסנכרן זמינות (פנוי/נמכר) לאתר — שלחו את שם ה-entity של הדירה, שם שדה הסטטוס וערכיו (נמכר/פנוי), ומזהה הפרויקט שאליו היא משויכת.
3. **האם אפליקציית הניהול תומכת באוטומציה עם HTTP/Webhook יוצא**? אם לא — נתאם חלופה (Pull מתוזמן / גשר).
4. אישור פורמט ה‑REST API של Base44 בחשבונכם (כותרת אימות + נתיב).

## 6. ⬅️ מה אני אספק לכם
- `WEBSITE_APP_ID` ו‑`WEBSITE_API_KEY` של אפליקציית האתר (לאחר שתוקם), להזנה באוטומציות.
- מבנה ה‑entities של האתר מוכן: ראו `Project.schema.json`, `Unit.schema.json`, `Lead.schema.json` ו‑`INTEGRATION.md` באותה תיקייה.

> בקצרה: אתם מקימים שתי אוטומציות שדוחפות `Project`/`Unit` לאתר לפי `external_id`. ברגע שתשלחו לי את שמות השדות + מזהה ייחודי — אסיים את צד האתר ונחבר.
