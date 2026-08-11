import { createFileRoute } from '@tanstack/react-router';
import { ProductionPage } from '@/features/production/routes/ProductionPage';

export const Route = createFileRoute('/production')({
  component: ProductionPage,
});