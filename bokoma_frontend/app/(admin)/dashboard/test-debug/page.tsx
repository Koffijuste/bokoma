// app/(admin)/dashboard/test-debug/page.tsx
'use client';

export default function TestDebugPage() {
  return (
    <div style={{ 
      padding: '2rem', 
      backgroundColor: '#fee', 
      border: '3px solid red',
      minHeight: '100vh',
      color: '#000'
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        ✅ PAGE DE TEST - SI VOUS VOYEZ ÇA, LE RENDU FONCTIONNE
      </h1>
      
      <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <p><strong>🔐 Auth check:</strong> OK (page accessible)</p>
        <p><strong>🎨 CSS inline:</strong> OK (styles appliqués)</p>
        <p><strong>📦 React render:</strong> OK (JSX affiché)</p>
      </div>
      
      <button 
        onClick={() => alert('✅ JavaScript fonctionne !')}
        style={{ 
          padding: '0.75rem 1.5rem', 
          background: '#3b82f6', 
          color: 'white', 
          border: 'none', 
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '1rem'
        }}
      >
        Tester JavaScript
      </button>
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
        <p style={{ marginBottom: '0.5rem' }}><strong>🔍 Prochaine étape :</strong></p>
        <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
          <li>Si vous voyez cette page → problème de CSS Tailwind dans dashboard/page.tsx</li>
          <li>Si vous ne voyez PAS cette page → problème de routing ou middleware</li>
        </ol>
      </div>
    </div>
  );
}