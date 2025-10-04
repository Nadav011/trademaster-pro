# מדריך התקנה - TradeMaster Pro

## 🔧 פתרון בעיית ERESOLVE

אם קיבלת שגיאה `ERESOLVE unable to resolve dependency tree`, בצע את השלבים הבאים:

### פתרון 1: התקנה רגילה
```bash
# נקה הכל
rm -rf node_modules package-lock.json

# התקן מחדש
npm install
```

### פתרון 2: אם עדיין יש בעיות
```bash
# נקה הכל
rm -rf node_modules package-lock.json

# התקן עם --legacy-peer-deps
npm install --legacy-peer-deps
```

### פתרון 3: אם גם זה לא עובד
```bash
# נקה הכל
rm -rf node_modules package-lock.json

# התקן עם --force
npm install --force
```

## 🚀 הפעלה

לאחר ההתקנה:
```bash
npm run dev
```

פתח דפדפן: http://localhost:3000

## 📋 אם הכל נכשל

### התקנה מאפס עם גרסאות תואמות:
```bash
# מחק הכל
rm -rf node_modules package-lock.json package.json

# צור package.json חדש
cat > package.json << 'EOF'
{
  "name": "trademaster-pro",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0"
  }
}
EOF

# התקן
npm install

# הפעל
npm run dev
```

## 🎯 בדיקה

1. **פתח דפדפן:** http://localhost:3000
2. **אם אתה רואה דף Next.js** - הכל תקין!
3. **אם יש שגיאה** - בדוק את הטרמינל

## 🔍 מה שתוקן

- ✅ **React גרסה:** עודכן מ-18.0.0 ל-^18.2.0
- ✅ **React-DOM:** עודכן מ-18.0.0 ל-^18.2.0  
- ✅ **TypeScript types:** עודכן להתאים ל-React 18.2
- ✅ **תאימות Next.js:** עכשיו תואם ל-Next.js 14

## 📞 תמיכה

אם אתה עדיין נתקל בבעיות, אנא שתף:
1. הודעת השגיאה המלאה
2. גרסת Node.js (`node --version`)
3. גרסת npm (`npm --version`)
4. מערכת הפעלה

ואני אעזור לפתור את הבעיה הספציפית!
