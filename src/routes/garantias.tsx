import { createFileRoute } from '@tanstack/react-router'
import { GarantiasPage } from '@/features/garantias/routes/GarantiasPage'

export const Route = createFileRoute('/garantias')({
  component: GarantiasPage
})
