# 📥 התקנת Git עבור Windows

## 🚀 הורדה והתקנה

### שלב 1: הורדת Git
1. לך ל-[git-scm.com](https://git-scm.com/download/win)
2. לחץ על "Download for Windows"
3. הקובץ יורד אוטומטית

### שלב 2: התקנה
1. הרץ את הקובץ שהורדת (`Git-2.x.x-64-bit.exe`)
2. לחץ "Next" בכל השלבים
3. **חשוב**: השאר את כל ההגדרות ברירת המחדל
4. לחץ "Install"
5. לחץ "Finish"

### שלב 3: בדיקה
פתח Command Prompt חדש והרץ:
```bash
git --version
```

אם אתה רואה מספר גרסה, Git מותקן בהצלחה!

## ⚙️ הגדרות ראשוניות

לאחר ההתקנה, הרץ את הפקודות הבאות:

```bash
git config --global user.name "השם שלך"
git config --global user.email "האימייל שלך"
git config --global core.autocrlf true
```

## 🔧 פתרון בעיית Line Endings

למניעת האזהרות על LF/CRLF, הרץ:

```bash
git config --global core.autocrlf true
```

או צור קובץ `.gitattributes` בתיקיית הפרויקט:

```
* text=auto
*.js text eol=lf
*.ts text eol=lf
*.tsx text eol=lf
*.json text eol=lf
*.md text eol=lf
*.css text eol=lf
```

## 🚀 לאחר ההתקנה

לאחר התקנת Git, תוכל להמשיך עם הפריסה:

```bash
git init
git add .
git commit -m "TradeMaster Pro - Ready for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/trademaster-pro.git
git push -u origin main
```

---

**התקן את Git ואז המשך עם הפריסה! 🎯**

