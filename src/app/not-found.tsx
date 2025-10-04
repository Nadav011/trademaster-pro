import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 text-center">
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-4xl">404</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              הדף לא נמצא
            </h1>
            <p className="text-slate-600 mb-6">
              נראה שהגעת לדף שלא קיים. בוא נחזור לדף הראשי ונמשיך משם.
            </p>
          </div>
          
          <div className="space-y-3">
            <Link 
              href="/"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl block"
            >
              חזרה לדף הראשי
            </Link>
            
            <Link 
              href="/trades"
              className="w-full bg-white/50 text-slate-700 font-medium py-3 px-6 rounded-xl hover:bg-white/70 transition-all duration-200 border border-slate-200 hover:border-slate-300 block"
            >
              עסקאות
            </Link>
            
            <Link 
              href="/add-trade"
              className="w-full bg-white/50 text-slate-700 font-medium py-3 px-6 rounded-xl hover:bg-white/70 transition-all duration-200 border border-slate-200 hover:border-slate-300 block"
            >
              הוסף עסקה
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
