import { createFileRoute } from '@tanstack/react-router'
import { ChecklistPage } from '@/features/checklist/routes/ChecklistPage'

export const Route = createFileRoute('/checklist')({
  component: ChecklistPage
})
