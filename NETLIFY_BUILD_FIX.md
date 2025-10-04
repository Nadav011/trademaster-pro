# 🔧 תיקון בעיית Build ב-Netlify

## ❌ הבעיה
```
sh: 1: next: not found
```

## ✅ הפתרון

### 1. עדכנתי את `netlify.toml`
שיניתי את ה-build command מ:
```toml
command = "npm run build"
```

ל:
```toml
command = "npm ci && npm run build"
```

### 2. מה זה `npm ci`?
- `npm ci` מתקין תלויות מהיר יותר מ-`npm install`
- הוא משתמש ב-`package-lock.json` להתקנה מדויקת
- זה הפתרון המומלץ לפריסה ב-production

### 3. מה לעשות עכשיו?

#### אופציה A: עדכן את ה-Repository
```bash
git add .
git commit -m "Fix Netlify build - add npm ci to install dependencies"
git push
```

#### אופציה B: עדכן ב-Netlify Dashboard
1. לך ל-Netlify Dashboard
2. לך ל-Site settings > Build & deploy
3. שנה את ה-Build command ל:
   ```
   npm ci && npm run build
   ```
4. לחץ "Save"
5. לחץ "Trigger deploy"

## 🔍 למה זה קרה?

Netlify לא התקין את התלויות לפני הרצת ה-build. `npm ci` מבטיח שהתלויות מותקנות לפני ה-build.

## ✅ אחרי התיקון

ה-build אמור לעבוד בהצלחה ו-Next.js יימצא.

## 🚀 אם עדיין יש בעיות

1. **בדוק את ה-logs** ב-Netlify Dashboard
2. **וודא שה-Node version הוא 18**
3. **בדוק שה-package-lock.json קיים**

---

**התיקון מוכן! עדכן את ה-Repository או את ההגדרות ב-Netlify! 🎯**

