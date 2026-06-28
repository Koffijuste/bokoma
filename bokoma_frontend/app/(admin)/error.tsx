// app/(admin)/error.tsx
'use client';

export default function AdminError({ 
  error, 
  reset 
}: { 
  error: Error & { digest?: string }; 
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6 animate-in fade-in zoom-in duration-300">
        <h2 className="text-xl font-bold text-red-800 mb-2">❌ Erreur Dashboard</h2>
        <p className="text-red-600 mb-4">{error.message}</p>
        {process.env.NEXT_PUBLIC_DEBUG === 'true' && (
          <pre className="text-xs bg-red-100 p-3 rounded overflow-auto max-h-48">
            {error.stack}
          </pre>
        )}
        <button 
          onClick={reset}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}