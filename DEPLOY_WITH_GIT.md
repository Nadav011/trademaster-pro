# 🚀 פריסה מהירה עם Git

## 📋 שלבים מהירים

### 1. התקן Git (אם עדיין לא מותקן)
- לך ל-[git-scm.com](https://git-scm.com/download/win)
- הורד והתקן את Git
- השאר את כל ההגדרות ברירת המחדל

### 2. הגדר Git (פעם אחת בלבד)
```bash
git config --global user.name "השם שלך"
git config --global user.email "האימייל שלך"
git config --global core.autocrlf true
```

### 3. צור Repository ב-GitHub
1. לך ל-[GitHub.com](https://github.com)
2. לחץ "New repository"
3. תן שם: `trademaster-pro`
4. אל תסמן "Initialize with README"
5. לחץ "Create repository"

### 4. העלה את הקוד ל-GitHub
```bash
git init
git add .
git commit -m "TradeMaster Pro - Professional Trading Journal"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/trademaster-pro.git
git push -u origin main
```

**החלף `YOUR_USERNAME` בשם המשתמש שלך ב-GitHub**

### 5. חבר ל-Netlify
1. לך ל-[Netlify.com](https://netlify.com)
2. לחץ "New site from Git"
3. בחר GitHub ו-repository שלך
4. הגדרות:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
5. לחץ "Deploy site"

## ✅ סיימת!

האתר יבנה ויפרס אוטומטית תוך כמה דקות.

## 🔧 פתרון בעיות

### אם Git לא מזוהה:
- וודא שהתקנת את Git
- פתח Command Prompt חדש
- הרץ `git --version`

### אם יש שגיאות authentication:
- השתמש ב-HTTPS URL (לא SSH)
- או הגדר SSH key ב-GitHub

### אם Build נכשל ב-Netlify:
- וודא שה-Node version הוא 18
- בדוק שה-`package.json` נכון

---

**הכל מוכן לפריסה! 🎯**

