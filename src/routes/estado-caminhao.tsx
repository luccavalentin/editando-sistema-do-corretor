import { createFileRoute } from '@tanstack/react-router'
import { EstadoCaminhaoPage } from '@/features/checklist/routes/EstadoCaminhaoPage'

export const Route = createFileRoute('/estado-caminhao')({
  component: EstadoCaminhaoPage
})
