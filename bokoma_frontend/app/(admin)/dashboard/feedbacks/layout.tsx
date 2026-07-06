import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feedbacks — modération',
  description: 'Modérez les avis et retours soumis par les clients.',
};

export default function AdminFeedbacksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
