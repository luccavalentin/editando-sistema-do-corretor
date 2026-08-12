import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import { SidebarProvider, SidebarContainer } from "@/components/ui/sidebar";
import { RequireRole } from "@/core/RequireRole";
import { AuthProvider } from "@/core/AuthProvider";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Pátio Inteligente Tecnoar" },
      { name: "description", content: "Sistema de gestão interna Tecnoar Freios" },
      { name: "author", content: "Tecnoar Freios" },
      { property: "og:title", content: "Pátio Inteligente Tecnoar" },
      { property: "og:description", content: "Sistema de gestão interna Tecnoar Freios" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body className="selection:bg-orange/20 selection:text-navy">
        Analise completamente todo o projeto e identifique TODOS os bugs, erros, falhas, comportamentos inesperados e possíveis problemas existentes na aplicação.
        {"\n\n"}
        Seu objetivo é realizar uma auditoria técnica profunda no sistema inteiro, corrigindo problemas de lógica, frontend, backend, integração, renderização, estado, banco de dados, responsividade e performance.
        {"\n\n"}
        Antes de modificar qualquer coisa:
        - Analise toda a estrutura do projeto
        - Analise rotas
        - Analise componentes
        - Analise hooks
        - Analise estados globais
        - Analise integrações
        - Analise Supabase
        - Analise APIs
        - Analise banco de dados
        - Analise autenticação
        - Analise permissões
        - Analise carregamentos
        - Analise console errors
        - Analise warnings
        - Analise logs
        - Analise comportamento da interface
        - Analise responsividade
        - Analise possíveis falhas silenciosas
        - Analise segurança básica
        - Analise fluxos completos do sistema
        {"\n\n"}
        Identifique e corrija:
        - Bugs visuais
        - Bugs de navegação
        - Erros de console
        - Warnings
        - Loops infinitos
        - Problemas de renderização
        - Re-renderizações desnecessárias
        - Falhas de autenticação
        - Problemas de sessão
        - Problemas de permissões
        - Problemas de loading
        - Problemas de estado
        - Problemas de sincronização
        - Problemas de responsividade
        - Problemas de formulários
        - Problemas de validação
        - Problemas em chamadas API
        - Problemas em queries Supabase
        - Problemas de realtime
        - Problemas de cache
        - Problemas de tipagem
        - Problemas de imports
        - Problemas de dependências
        - Problemas de performance
        - Problemas de UX
        - Problemas mobile
        - Problemas de acessibilidade
        - Memory leaks
        - Requests duplicados
        - Condições de corrida
        - Falhas silenciosas
        - Tratamento incorreto de erros
        - Quebras em edge cases
        {"\n\n"}
        Verifique especialmente:
        - Fluxos de login/logout
        - Persistência de sessão
        - Proteção de rotas
        - Navegação entre páginas
        - CRUDs completos
        - Uploads
        - Modais
        - Estados assíncronos
        - Atualizações em tempo real
        - Compatibilidade mobile
        - Responsividade geral
        - Componentes reutilizáveis
        - Integrações externas
        - Webhooks
        - Fluxos críticos do sistema
        {"\n\n"}
        Durante a análise:
        1. Liste os problemas encontrados
        2. Explique a causa de cada problema
        3. Explique o impacto no sistema
        4. Corrija utilizando boas práticas modernas
        5. Garanta que a correção não quebre funcionalidades existentes
        {"\n\n"}
        Regras importantes:
        - NÃO remover funcionalidades sem necessidade
        - NÃO alterar design sem motivo
        - NÃO criar soluções temporárias ou gambiarra
        - Sempre aplicar soluções profissionais
        - Priorizar estabilidade, segurança e confiabilidade
        - Garantir código limpo e sustentável
        - Melhorar tratamento de erros em toda aplicação
        - Validar edge cases importantes
        - Garantir compatibilidade mobile e desktop
        {"\n\n"}
        Após finalizar:
        - Faça uma nova varredura completa
        - Verifique se ainda existem erros
        - Verifique possíveis regressões
        - Garanta estabilidade geral do sistema
        {"\n\n"}
        O resultado final deve deixar a aplicação:
        - Estável
        - Confiável
        - Sem erros visíveis
        - Sem warnings desnecessários
        - Sem bugs críticos
        - Fluida
        - Responsiva
        - Profissional
        - Pronta para produção
        <Toaster position="top-right" closeButton richColors />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SidebarProvider>
          {!isHydrated ? (
            <div className="flex h-screen w-full items-center justify-center bg-background">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy/10 border-t-orange" />
            </div>
          ) : isLoginPage ? (
            <Outlet />
          ) : (
            <RequireRole>
              <SidebarContainer>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ 
                      duration: 0.25, 
                      ease: [0.2, 0, 0, 1] 
                    }}
                    className="flex-1"
                  >
                    <Outlet />
                  </motion.div>
                </AnimatePresence>
              </SidebarContainer>
            </RequireRole>
          )}
        </SidebarProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
