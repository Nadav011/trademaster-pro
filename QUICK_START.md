# הפעלה מהירה - TradeMaster Pro

## 🚀 פתרון בעיית החבילות

אם נתקלת בשגיאה עם `@radix-ui/react-button`, בצע את השלבים הבאים:

### שלב 1: נקה הכל
```bash
rm -rf node_modules package-lock.json
```

### שלב 2: התקן עם הגרסה המתוקנת
```bash
npm install
```

### שלב 3: הפעל
```bash
npm run dev
```

## 📋 אם עדיין יש בעיות

### פתרון חלופי - התקנה מינימלית:
```bash
# מחק הכל
rm -rf node_modules package-lock.json

# צור package.json פשוט
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
    "next": "14.0.0",
    "react": "18.0.0",
    "react-dom": "18.0.0"
  },
  "devDependencies": {
    "@types/node": "20.0.0",
    "@types/react": "18.0.0",
    "@types/react-dom": "18.0.0",
    "typescript": "5.0.0"
  }
}
EOF

# התקן
npm install

# הפעל
npm run dev
```

### הוסף חבילות לפי הצורך:
```bash
# UI Components
npm install @radix-ui/react-slot @radix-ui/react-select @radix-ui/react-switch
npm install @radix-ui/react-label @radix-ui/react-dialog

# Icons and Utilities
npm install lucide-react clsx tailwind-merge class-variance-authority

# Styling
npm install tailwindcss-animate date-fns

# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
```

## 🎯 בדיקה מהירה

1. **פתח דפדפן:** http://localhost:3000
2. **אם אתה רואה דף Next.js** - הכל תקין!
3. **אם יש שגיאה** - בדוק את הטרמינל לפרטים

## 📞 אם הכל נכשל

אנא שתף:
1. הודעת השגיאה המלאה
2. גרסת Node.js (`node --version`)
3. גרסת npm (`npm --version`)

ואני אעזור לפתור את הבעיה הספציפית!
