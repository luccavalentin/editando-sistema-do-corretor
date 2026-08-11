import { createFileRoute } from '@tanstack/react-router'
import { TermoResponsabilidadePage } from '@/features/termos/routes/TermoResponsabilidadePage'

export const Route = createFileRoute('/termos-responsabilidade')({
  component: TermoResponsabilidadePage
})
