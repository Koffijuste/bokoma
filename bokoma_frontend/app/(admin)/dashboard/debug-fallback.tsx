'use client';

export default function DebugFallback() {
  return (
    <div className="min-h-screen p-8 bg-red-50">
      <h1 className="text-2xl font-bold text-red-800 mb-4">🔍 Mode Debug Dashboard</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-white rounded border">
          <p><strong>Token cookie:</strong> {document.cookie.includes('bokoma_access_token') ? '✅' : '❌'}</p>
          <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL}</p>
        </div>
        
        <button 
          onClick={() => window.location.href = '/auth/login'}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Aller au login
        </button>
        
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-600 text-white rounded ml-2"
        >
          Recharger
        </button>
      </div>
    </div>
  );
}