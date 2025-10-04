# פתרון בעיות - TradeMaster Pro

## 🔧 בעיות התקנה נפוצות

### שגיאה: `@radix-ui/react-button@^1.0.4` could not be found

**בעיה:** החבילה `@radix-ui/react-button` לא קיימת ב-npm.

**פתרון:**
1. החלף את `package.json` עם הגרסה המינימלית:
```bash
cp package-minimal.json package.json
```

2. התקן מחדש את התלויות:
```bash
rm -rf node_modules package-lock.json
npm install
```

### שגיאה: Cannot find module '@radix-ui/react-*'

**פתרון:**
1. בדוק שהחבילה קיימת ב-npm:
```bash
npm view @radix-ui/react-slot
```

2. אם החבילה לא קיימת, הסר אותה מ-package.json

3. התקן מחדש:
```bash
npm install
```

### שגיאה: Module not found 'react-icons'

**פתרון:** החלף את react-icons עם lucide-react:
```bash
npm uninstall react-icons
npm install lucide-react
```

## 🚀 הפעלה מהירה

### שלב 1: התקנה מינימלית
```bash
# נקה הכל
rm -rf node_modules package-lock.json

# השתמש בגרסה המינימלית
cp package-minimal.json package.json

# התקן
npm install
```

### שלב 2: הפעלה
```bash
npm run dev
```

### שלב 3: פתיחת דפדפן
נווט ל: http://localhost:3000

## 📦 חבילות מומלצות

### חבילות בסיסיות (חובה)
- `next` - Next.js framework
- `react` - React library
- `react-dom` - React DOM
- `typescript` - TypeScript support

### חבילות UI (מומלץ)
- `@radix-ui/react-slot` - Radix UI slot
- `@radix-ui/react-select` - Select component
- `@radix-ui/react-switch` - Switch component
- `@radix-ui/react-label` - Label component
- `@radix-ui/react-dialog` - Dialog component
- `lucide-react` - Icons

### חבילות עזר
- `clsx` - Class name utility
- `tailwind-merge` - Tailwind merge utility
- `class-variance-authority` - CVA for variants
- `tailwindcss-animate` - Tailwind animations

## 🔍 בדיקת תקינות

### בדוק שהחבילות מותקנות
```bash
npm list --depth=0
```

### בדוק שהפרויקט נבנה
```bash
npm run build
```

### בדוק linting
```bash
npm run lint
```

## 📝 עדכון package.json

אם אתה רוצה להוסיף חבילות נוספות:

1. **הוסף חבילה אחת בכל פעם:**
```bash
npm install package-name
```

2. **בדוק שהחבילה עובדת:**
```bash
npm run dev
```

3. **אם הכל עובד, המשך לחבילה הבאה**

## ⚠️ חבילות בעייתיות

### חבילות שלא קיימות:
- `@radix-ui/react-button` ❌
- `@radix-ui/react-card` ❌
- `@radix-ui/react-form` ❌
- `@radix-ui/react-icons` ❌
- `@radix-ui/react-table` ❌

### חבילות אלטרנטיביות:
- במקום `@radix-ui/react-icons` → `lucide-react` ✅
- במקום `@radix-ui/react-card` → צור רכיב משלך ✅
- במקום `@radix-ui/react-button` → צור רכיב משלך ✅

## 🆘 אם הכל נכשל

### התקנה מאפס:
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

### בדוק שהבסיס עובד:
1. פתח http://localhost:3000
2. אם אתה רואה את הדף - הכל תקין
3. הוסף חבילות אחת אחת לפי הצורך

---

**הערה:** אם אתה עדיין נתקל בבעיות, אנא שתף את הודעת השגיאה המלאה ואני אעזור לפתור את הבעיה הספציפית.
