import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/ranking')({
  component: () => <div className="p-8"><h1>Ranking (Em Breve)</h1></div>
})
