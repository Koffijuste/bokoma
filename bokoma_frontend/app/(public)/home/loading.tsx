// app/(public)/home/loading.tsx
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-accent animate-spin" />
    </div>
  );
}
