// components/layouts/admin-layout.tsx
'use client';

import React from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar avec key sur les éléments mappés */}
      <AdminSidebar />
      
      {/* Contenu principal */}
      <main className="sm:ml-64 transition-all duration-300">
        {React.Children.toArray(children)}
      </main>
    </div>
  );
}