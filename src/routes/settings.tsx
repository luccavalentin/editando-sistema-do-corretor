import { createFileRoute } from '@tanstack/react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UsersPage from '@/features/users/routes/UsersPage';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className='p-8 space-y-8'>
      <h1 className='text-3xl font-bold font-heading text-navy'>Configurações</h1>
      <Tabs defaultValue="integracoes">
        <TabsList>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
        </TabsList>
        <TabsContent value="integracoes">
          {/* Mover conteúdo antigo de settings.tsx aqui */}
        </TabsContent>
        <TabsContent value="usuarios">
          <UsersPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
