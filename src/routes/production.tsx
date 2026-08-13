import { createFileRoute } from '@tanstack/react-router';
import { ProductionPage } from '@/features/production/routes/ProductionPage';

export const Route = createFileRoute('/production')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search['tab'] as string | undefined,
  }),
  component: ProductionPage,
});