# Netlify Deployment Guide

## הכנת האתר לפרסום ב-Netlify

### 1. הכנות מקדימות

1. **וודא שיש לך חשבון Netlify** - הירשם ב-https://netlify.com
2. **העלה את הקוד ל-GitHub** - ודא שהקוד שלך נמצא ב-GitHub repository

### 2. הגדרת Netlify

1. **היכנס ל-Netlify Dashboard**
2. **לחץ על "New site from Git"**
3. **בחר את ה-repository שלך**
4. **הגדר את ההגדרות הבאות:**
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
   - **Node version:** `18`

### 3. משתני סביבה

הוסף את משתני הסביבה הבאים ב-Netlify Dashboard:

```
FINNHUB_API_KEY=your_finnhub_api_key_here
NODE_ENV=production
```

### 4. הגדרות נוספות

האתר מוכן לפרסום עם:
- ✅ Next.js build מוגדר
- ✅ תמונות לא מותאמות (unoptimized) לתמיכה ב-Netlify
- ✅ קובץ netlify.toml מוגדר
- ✅ Headers ו-redirects מוגדרים
- ✅ תמיכה ב-dynamic routes
- ✅ הגנה מפני server-side rendering issues

### 5. פרסום

לאחר ההגדרה, Netlify יבנה ויפרסם את האתר אוטומטית.

### 6. עדכונים

כל push ל-GitHub יעדכן את האתר אוטומטית.

## הערות חשובות

- האתר משתמש ב-localStorage לנתונים (לא דורש שרת)
- Finnhub API עובד מהצד הלקוח
- כל הנתונים נשמרים בדפדפן של המשתמש
