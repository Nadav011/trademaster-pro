# 🚀 TradeMaster Pro - הוראות פריסה

## 📋 דרישות מוקדמות

- Node.js 18 או גרסה חדשה יותר
- npm או yarn
- חשבון GitHub
- חשבון Netlify

## 🔧 הכנה מקומית

### 1. התקנת תלויות
```bash
npm install
```

### 2. בדיקת Build מקומי
```bash
npm run build
```

### 3. הרצה מקומית
```bash
npm run dev
```

## 🌐 פריסה ל-Netlify דרך GitHub

### שלב 1: העלאה ל-GitHub

1. **צור Repository חדש ב-GitHub**
   - לך ל-GitHub.com
   - לחץ על "New repository"
   - תן שם: `trademaster-pro`
   - בחר Public או Private
   - אל תסמן "Initialize with README"

2. **העלה את הקבצים**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - TradeMaster Pro"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/trademaster-pro.git
   git push -u origin main
   ```

### שלב 2: חיבור ל-Netlify

1. **התחבר ל-Netlify**
   - לך ל-netlify.com
   - התחבר עם חשבון GitHub שלך

2. **צור Site חדש**
   - לחץ על "New site from Git"
   - בחר "GitHub"
   - בחר את ה-repository `trademaster-pro`

3. **הגדר Build Settings**
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Node version**: 18

4. **Deploy**
   - לחץ על "Deploy site"
   - Netlify יתחיל לבנות את האתר אוטומטית

## ⚙️ הגדרות Netlify

### Environment Variables (אופציונלי)
אם יש לך משתני סביבה, הוסף אותם ב-Netlify:
- לך ל-Site settings > Environment variables
- הוסף משתנים כמו:
  - `NEXT_PUBLIC_API_URL`
  - `FINNHUB_API_KEY`

### Custom Domain (אופציונלי)
- לך ל-Domain settings
- הוסף domain מותאם אישית
- הגדר DNS records לפי ההוראות

## 🔍 פתרון בעיות

### בעיה: 404 Error
**פתרון**: וודא שה-`netlify.toml` מכיל:
```toml
[build]
  publish = ".next"
  command = "npm run build"
```

### בעיה: Build Fails
**פתרון**: 
1. בדוק שה-Node version הוא 18
2. וודא שכל התלויות מותקנות
3. בדוק את ה-logs ב-Netlify

### בעיה: Routing לא עובד
**פתרון**: וודא שאין redirects ב-`netlify.toml` שמפריעים ל-App Router

## 📱 תכונות האתר

- ✅ דאשבורד מסחר מקצועי
- ✅ ניהול עסקאות
- ✅ מעקב אחר ביצועים
- ✅ ניתוח סיכונים
- ✅ ממשק בעברית עם RTL
- ✅ עיצוב Apple-like מודרני
- ✅ תמיכה במובייל

## 🔄 עדכונים

לעדכן את האתר:
1. בצע שינויים בקוד
2. Commit ו-Push ל-GitHub
3. Netlify יבנה ויפרס אוטומטית

## 📞 תמיכה

אם יש בעיות:
1. בדוק את ה-logs ב-Netlify
2. וודא שה-build עובד מקומית
3. בדוק שה-`netlify.toml` נכון

---

**TradeMaster Pro** - יומן מסחר מקצועי ומודרני 🎯
