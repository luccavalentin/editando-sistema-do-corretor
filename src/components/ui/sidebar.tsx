import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  Settings, 
  BarChart3, 
  ShieldCheck, 
  FileWarning, 
  Truck, 
  Users, 
  Wrench, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Bot
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Link, useLocation } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { getCurrentUserRole } from "@/core/auth"
import { canAccessRoute, AppRole } from "@/core/access-matrix"

const SidebarContext = React.createContext<{
  expanded: boolean
  setExpanded: (expanded: boolean) => void
} | null>(null)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = React.useState(true)
  return (
    <SidebarContext.Provider value={{ expanded, setExpanded }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function SidebarContainer({ children }: { children: React.ReactNode }) {
  const context = React.useContext(SidebarContext)
  if (!context) throw new Error("SidebarContainer must be used within SidebarProvider")
  
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className={cn(
        "flex-1 transition-all duration-200 ease-in-out",
        context.expanded ? "pl-64" : "pl-20"
      )}>
        {children}
      </main>
    </div>
  )
}

function Sidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) return null
  const { expanded, setExpanded } = context
  const location = useLocation()
  const [userRole, setUserRole] = useState<AppRole | null>(null)

  useEffect(() => {
    getCurrentUserRole().then(setUserRole)
  }, [])

  const menuGroups = [
    {
      label: "Principal",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", href: "/" },
        { icon: Wrench, label: "Gestão", href: "/management" },
        { icon: ClipboardCheck, label: "Checklist", href: "/checklist" },
        { icon: BarChart3, label: "Tarefas", href: "/tasks" },
        { icon: ShieldCheck, label: "Ranking", href: "/ranking" },
      ].filter(item => canAccessRoute(item.href, userRole))
    },
    {
      label: "Operacional",
      items: [
        { icon: Truck, label: "Produção", href: "/production" },
        { icon: ShieldCheck, label: "Garantias", href: "/garantias" },
        { icon: FileWarning, label: "Termos", href: "/termos-responsabilidade" },
        { icon: Truck, label: "Estado Caminhão", href: "/estado-caminhao" },
        { icon: Bot, label: "IA Técnico", href: "/ia" },
        { icon: BarChart3, label: "Relatórios", href: "/reports" },
        { icon: Settings, label: "Configurações", href: "/settings" },
      ].filter(item => canAccessRoute(item.href, userRole))
    }
  ]

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full bg-navy text-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-40 flex flex-col border-r border-white/5 shadow-2xl shadow-navy/50",
      expanded ? "w-64" : "w-20"
    )}>
      {/* Header / Logo */}
      <div className="h-24 flex items-center px-6 border-b border-white/5 overflow-hidden">
        {expanded ? (
          <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
             <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-white/10 group-hover:scale-105 transition-transform">
               <span className="text-navy font-black text-sm">TF</span>
             </div>
             <div className="flex flex-col">
               <span className="font-heading font-black leading-none text-orange text-lg tracking-tighter">TECNOAR</span>
               <span className="text-[10px] font-black text-cyan tracking-[0.3em] uppercase opacity-80">FREIOS</span>
             </div>
          </div>
        ) : (
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mx-auto shrink-0 shadow-lg shadow-white/10 active:scale-95 transition-transform">
            <span className="text-navy font-black text-xs">TF</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-8 px-3 scrollbar-none">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="mb-8 last:mb-0">
            {expanded && (
              <h4 className="px-4 text-[10px] uppercase font-black tracking-[0.3em] text-white/10 mb-4 select-none">
                {group.label}
              </h4>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative",
                    location.pathname === item.href 
                      ? "bg-white/5 text-orange font-black shadow-inner" 
                      : "text-white/50 hover:bg-white/5 hover:text-white/80"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110",
                    location.pathname === item.href ? "text-orange" : "group-hover:text-cyan"
                  )} />
                  {expanded && <span className="text-[13px] tracking-wide">{item.label}</span>}
                  {location.pathname === item.href && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-orange rounded-full shadow-[0_0_10px_rgba(240,96,0,0.6)]" />
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Toggle */}
      <div className="p-3 border-t border-white/5 space-y-1.5 bg-white/[0.02]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/20 hover:bg-white/5 hover:text-white/60 transition-all active:scale-95"
        >
          {expanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5 mx-auto" />}
          {expanded && <span className="text-[11px] font-black uppercase tracking-[0.2em]">Recolher</span>}
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400/30 hover:bg-red-500/10 hover:text-red-400 transition-all active:scale-95">
          <LogOut className="w-5 h-5 shrink-0" />
          {expanded && <span className="text-[11px] font-black uppercase tracking-[0.2em]">Encerrar</span>}
        </button>
      </div>
    </aside>
  )
}
