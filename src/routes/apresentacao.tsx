import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/apresentacao')({
  component: () => (
    <div className='p-5'>
      <h1 className='text-xl font-bold font-heading text-navy capitalize'>apresentacao</h1>
      <div className='mt-8 p-12 border-2 border-dashed border-navy/10 rounded-lg flex items-center justify-center text-muted-foreground'>
        Módulo em desenvolvimento ligado ao Supabase.
      </div>
    </div>
  ),
});
