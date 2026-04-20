# 🎯 TradeMaster Pro - יומן מסחר מקצועי

יומן מסחר מקיף ומקצועי לסוחרים עם ניתוח ביצועים, מעקב אחר עסקאות וניהול סיכונים.

## ✨ תכונות עיקריות

- 📊 **דאשבורד מסחר מקצועי** - סקירה כללית של ביצועי המסחר
- 📈 **ניהול עסקאות מלא** - הוספה, עריכה ומעקב אחר עסקאות
- 🎯 **ניתוח ביצועים** - חישוב win rate, R-multiples וניתוח סיכונים
- 📱 **עיצוב Apple-like** - ממשק מודרני ונקי עם תמיכה מלאה בעברית
- 🔄 **נתונים בזמן אמת** - אינטגרציה עם Finnhub API למחירים עדכניים
- 💾 **אחסון מקומי** - כל הנתונים נשמרים במחשב שלך

## 🚀 פריסה מהירה

### 1. העלאה ל-GitHub
```bash
git init
git add .
git commit -m "TradeMaster Pro - Ready for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/trademaster-pro.git
git push -u origin main
```

### 2. חיבור ל-Netlify
1. לך ל-[netlify.com](https://netlify.com)
2. לחץ "New site from Git"
3. בחר GitHub ו-repository שלך
4. הגדרות Build:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
5. לחץ "Deploy site"

## 🛠️ פיתוח מקומי

```bash
# התקנת תלויות
npm install

# הרצה בפיתוח
npm run dev

# Build לפריסה
npm run build

# הרצה מקומית
npm run start

# קבל קישור לתצוגה מקדימה
npm run preview-url
```

## 🚀 תצוגה מקדימה מהירה (Preview Deployments)

**עורך מה-iPad או מהטלפון? רוצה לראות שינויים מיד?**

כל ענף מקבל אוטומטית תצוגה מקדימה משלו ב-Netlify!

```bash
# 1. צור ענף חדש
git checkout -b feature/my-changes

# 2. ערוך את הקוד (גם מה-iPad!)
# ...

# 3. שמור ודחף
git add .
git commit -m "תיאור השינויים"
git push

# 4. קבל קישור תצוגה מקדימה תוך 2-3 דקות!
npm run preview-url
```

📖 **מידע מלא**: ראה את [QUICK_PREVIEW.md](./QUICK_PREVIEW.md) להסבר מפורט

## 📋 דרישות מערכת

- Node.js 18+
- npm או yarn
- דפדפן מודרני

## 🎨 טכנולוגיות

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Icons**: Lucide React
- **Database**: IndexedDB (client-side)
- **API**: Finnhub (מחירים בזמן אמת)

## 📁 מבנה הפרויקט

```
src/
├── app/                 # Next.js App Router
│   ├── page.tsx        # דאשבורד ראשי
│   ├── trades/         # ניהול עסקאות
│   ├── add-trade/      # הוספת עסקה
│   ├── settings/       # הגדרות
│   └── ...
├── components/         # רכיבי UI
│   ├── dashboard/      # רכיבי דאשבורד
│   ├── trades/         # רכיבי עסקאות
│   └── ui/            # רכיבי UI בסיסיים
├── lib/               # ספריות עזר
│   ├── database.ts    # ניהול מסד נתונים
│   ├── finnhub.ts     # API מחירים
│   └── utils.ts       # פונקציות עזר
└── types/             # הגדרות TypeScript
```

## 🔧 הגדרות

### משתני סביבה (אופציונלי)
צור קובץ `.env.local`:
```
FINNHUB_API_KEY=your_api_key_here
```

### הגדרות Netlify
האתר מוכן לפריסה עם:
- Node.js 18
- Build command: `npm run build`
- Publish directory: `.next`

## 📱 תמיכה במובייל

האתר מותאם לחלוטין למובייל עם:
- עיצוב responsive
- ממשק touch-friendly
- ביצועים מותאמים למובייל

## 🌐 תמיכה בעברית

- ממשק מלא בעברית
- תמיכה ב-RTL (מימין לשמאל)
- פונטים מותאמים לעברית
- תאריכים בפורמט ישראלי

## 📞 תמיכה

אם יש בעיות:
1. בדוק את ה-logs ב-Netlify
2. וודא שה-build עובד מקומית
3. בדוק את ה-`netlify.toml`

## 📄 רישיון

פרויקט זה הוא קוד פתוח וזמין תחת רישיון MIT.

---

**TradeMaster Pro** - יומן מסחר מקצועי ומודרני 🎯