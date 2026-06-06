// app/(public)/layout.tsx
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ✅ Header fixe */}
      <Header />
      
      {/* ✅ Main avec padding pour header + flex-1 pour pousser footer */}
      <main className="flex-1 pt-16">
        {children}
      </main>
      
      {/* ✅ Ton Footer personnalisé */}
      <Footer />
    </div>
  );
}