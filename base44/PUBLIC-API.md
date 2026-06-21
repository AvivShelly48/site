# איך האתר לוקח נתונים מ-Base44 (Public API)

תשובה לשאלת הסוכן: **כן — התאימו את ה-JSON לפורמט שהאתר מצפה לו (מפורט כאן).** אין צורך בדף תצוגה מקדימה פנימי; האתר עצמו הוא התצוגה.

## איך זה עובד
האתר הוא **סטטי** (GitHub Pages). הוא קורא נתונים ב-`fetch()` משתי פונקציות ציבוריות (GET) ב-Base44:

| פונקציה | מחזירה | מזין באתר |
|---|---|---|
| `getPublicProjects` | מערך פרויקטים (JSON) | גריד הפרויקטים + המודאל |
| `getPublicUnits` | מערך דירות (JSON) | לוח "דירות זמינות" |

**הפעלה:** באתר, בקובץ `index.html`, מגדירים שורה אחת:
```html
<script>window.SHELLY_BASE44_API = "https://app.base44.com/api/apps/<APP_ID>/functions";</script>
```
(כרגע ריק → האתר משתמש בנתונים מוטמעים. ברגע שתמסרו את ה-URL, אכניס אותו והאתר יקרא חי.)

> **CORS:** הפונקציות צריכות לאפשר GET ציבורי ולהחזיר `Access-Control-Allow-Origin: *` (או את הדומיין `https://avivshelly48.github.io`). אין מפתחות באתר — קריאה ציבורית בלבד.

---

## 1. `GET getPublicProjects` → פורמט מדויק
מחזיר **מערך** של אובייקטי פרויקט (אפשר גם `{ "projects": [ ... ] }` — האתר תומך בשניהם):

```json
[
  {
    "title":       "עצמאות · פינוי-בינוי, יבנה",   // string (חובה)
    "location":    "יבנה",                          // string (חובה)
    "cat":         "renewal",                       // "renewal" | "sale" | "build" | "commercial" (חובה)
    "sale":        "בביצוע",                         // string — תווית שיווק (תצוגה)
    "stage":       2,                                // 1=רישוי · 2=ביצוע · 3=אכלוס
    "image":       "https://.../render.jpg",         // URL ציבורי לתמונה (חובה)
    "gallery":     ["https://.../1.jpg","https://.../2.jpg"], // אופציונלי — תמונות נוספות למודאל
    "description": "טקסט תיאור הפרויקט…",
    "facts":       [ { "k":"units", "v":"202", "l":"יח״ד חדשות" } ], // עד 3; k ∈ units/floors/renew/build/park/key
    "featured":    false,                            // true בפרויקט דגל אחד (כרטיס גדול)
    "order":       10,                               // מספר — סדר הצגה (קטן→ראשון)
    "external_id": "<id אצלכם>"                      // מזהה הפרויקט בניהול (לסנכרון)
  }
]
```
מיפוי השדות מהניהול (`name→title`, `address→location`, `category→cat`, `status→sale+stage`, `project_simulation_url→image`, `total_units→facts.units`) — ראו `SYNC-BRIEF.md`.

## 2. `GET getPublicUnits` → פורמט מדויק
מחזיר **מערך** של דירות (או `{ "units": [ ... ] }`):

```json
[
  {
    "project":     "עצמאות · פינוי-בינוי, יבנה",   // חייב להתאים ל-title של הפרויקט (לסינון)
    "unit":        "דירה 21",                       // טקסט מזהה הדירה
    "floor":       7,                               // קומה
    "rooms":       5,                               // חדרים
    "sqm":         132,                             // מ״ר
    "price":       2640000,                         // ₪ (מספר; אופציונלי בשוק החופשי)
    "status":      "available",                      // "available" | "reserved" | "sold"
    "image":       "https://.../unit.jpg",           // תמונה/תוכנית דירה (URL)
    "external_id": "<id הדירה אצלכם>"
  }
]
```
> רק דירות שרוצים להציג לציבור. דירות `sold` יוצגו מעומעמות (יוצר תחושת "נשארו מעט").

---

## למה זה עדיף על SDK
האתר תומך גם ב-SDK של Base44 (אם ירוץ בתוך האפליקציה), אבל מאחר שהוא סטטי וחיצוני — **הפונקציה הציבורית עם JSON היא הדרך הנקייה**: אין מפתחות, אין auth, קריאה אחת, מהיר ונשמר ב-CDN.

## מה צריך מכם
1. שתי פונקציות ציבוריות: `getPublicProjects`, `getPublicUnits` — בפורמט למעלה (כולל CORS).
2. ה-`APP_ID` (או ה-URL המלא של בסיס הפונקציות) — ואני מכניס אותו ל-`window.SHELLY_BASE44_API` והאתר עובר לקרוא חי.

---

## 3. `POST submitLead` → קליטת לידים מהטופס
האתר שולח כל פנייה מהטופס כ-`POST` עם גוף JSON. הפונקציה צריכה ליצור רשומת `Lead` (ולהפעיל את אוטומציית מייל האישור).

```
POST {SHELLY_BASE44_API}/submitLead
Content-Type: application/json

{
  "name":     "ישראל ישראלי",
  "phone":    "050-0000000",
  "email":    "name@example.com",          // אופציונלי — לאישור הממותג
  "project":  "עצמאות · פינוי-בינוי, יבנה",  // או "" לכללי
  "rooms":    "4 חדרים",
  "budget":   "1.5–2 מ׳ ₪",
  "timeline": "מיידי — מוכן/ה להתקדם",        // מדד 'ליד חם'
  "message":  "טקסט חופשי",
  "source":   "website"                      // או "mishtaken"
}
```
**תשובה:** סטטוס `200`/`201` (גוף לא חובה). אם לא 200 — האתר נופל אוטומטית ל-mailto (פתיחת תוכנת המייל). **CORS:** לאפשר POST + `Access-Control-Allow-Origin`.

> כך כל ליד נשמר ב-CRM (entity Lead) עם שדות הסינון (חדרים/תקציב/אופק) — ואוטומציית מייל האישור הממותג נשלחת לפונה.
