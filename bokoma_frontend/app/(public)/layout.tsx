// app/(public)/layout.tsx
import RatingPromptHost from '@/components/features/RatingPromptHost';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <RatingPromptHost />
    </>
  );
}