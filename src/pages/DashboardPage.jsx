import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function DashboardPage() {
  return (
    <section className="page">
      <EmptyState
        icon={LayoutDashboard}
        title="Dashboard is coming soon"
        description="We're building powerful analytics to help you track your business performance. Stay tuned for updates!"
      />
    </section>
  );
}
