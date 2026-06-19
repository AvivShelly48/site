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
  "external_id": "{{record.id}}",        // מזהה הפרויקט אצלכם — מפתח ההתאמה
  "title":       "{{record.title}}",
  "location":    "{{record.city}}",
  "cat":         "build|renewal|sale",   // ראו טבלת המיפוי
  "sale":        "{{record.marketing_status}}",
  "stage":       1,                       // 1=רישוי 2=ביצוע 3=אכלוס
  "image":       "{{record.image_url}}",
  "description": "{{record.description}}",
  "facts":       [ {"k":"units","v":"202","l":"יח״ד חדשות"} ],
  "featured":    false,
  "order":       10
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

## 3. טבלת מיפוי שדות (ניהול → אתר)
מלאו את עמודת "השדה אצלכם" לפי המבנה האמיתי באפליקציית הניהול:

| שדה באתר (יעד) | סוג | משמעות | השדה אצלכם |
|---|---|---|---|
| `external_id` | string | מזהה ייחודי של הפרויקט/דירה אצלכם (**חובה** – מפתח התאמה) | … |
| `title` | string | שם הפרויקט | … |
| `location` | string | עיר/מיקום | … |
| `cat` | enum | `renewal`=התחדשות · `sale`=מחיר למשתכן · `build`=בנייה למגורים | … |
| `sale` | string | תווית שיווק (בשיווק/בביצוע/בתכנון) | … |
| `stage` | 1/2/3 | רישוי / ביצוע / אכלוס | … |
| `image` | URL | תמונת הפרויקט (URL ציבורי) | … |
| `description` | string | תיאור | … |
| `facts` | array | עד 3 נתונים `{k,v,l}` (k∈units/floors/renew/build/park/key) | … |
| **Unit** `status` | enum | `available` / `reserved` / `sold` | … |
| **Unit** `project` | string | לאיזה פרויקט שייכת הדירה | … |

---

## 4. אבטחה
- `WEBSITE_API_KEY` נשמר **רק** בצד אפליקציית הניהול (בתוך האוטומציה). לא לחשוף אותו בשום מקום ציבורי.
- מומלץ מפתח ייעודי עם הרשאת כתיבה ל‑`Project` ו‑`Unit` בלבד.

---

## 5. ⬅️ מה אני צריך מכם בחזרה (כדי לסיים את הצד שלי)
1. **שמות ה‑entities והשדות** באפליקציית הניהול עבור פרויקט ודירה (צילום מסך של ה‑Data model או ייצוא סכמה) — כדי למלא את טבלת המיפוי במדויק.
2. **מהו השדה הייחודי** (id) של פרויקט ושל דירה אצלכם — זה ייכנס ל‑`external_id`.
3. **האם אפליקציית הניהול תומכת באוטומציה עם HTTP/Webhook יוצא** (קריאה ל‑API חיצוני)? אם כן — מצוין. אם לא — נתאם חלופה (Pull מתוזמן / גשר).
4. אישור הפורמט המדויק של ה‑REST API ל‑entities ב‑Base44 שלכם (כותרת האימות והנתיב) — לפי תיעוד ה‑Base44 של החשבון.

## 6. ⬅️ מה אני אספק לכם
- `WEBSITE_APP_ID` ו‑`WEBSITE_API_KEY` של אפליקציית האתר (לאחר שתוקם), להזנה באוטומציות.
- מבנה ה‑entities של האתר מוכן: ראו `Project.schema.json`, `Unit.schema.json`, `Lead.schema.json` ו‑`INTEGRATION.md` באותה תיקייה.

> בקצרה: אתם מקימים שתי אוטומציות שדוחפות `Project`/`Unit` לאתר לפי `external_id`. ברגע שתשלחו לי את שמות השדות + מזהה ייחודי — אסיים את צד האתר ונחבר.
