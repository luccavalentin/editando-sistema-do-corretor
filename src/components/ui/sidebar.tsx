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
      "fixed left-0 top-0 h-full bg-navy text-white transition-all duration-200 ease-in-out z-40 flex flex-col border-r border-white/5",
      expanded ? "w-64" : "w-20"
    )}>
      {/* Header / Logo */}
      <div className="h-20 flex items-center px-6 border-b border-white/10 overflow-hidden">
        {expanded ? (
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center shrink-0">
               <span className="text-navy font-black text-xs">TF</span>
             </div>
             <div className="flex flex-col">
               <span className="font-heading font-bold leading-none text-orange text-sm tracking-tight">TECNOAR</span>
               <span className="text-[9px] font-bold text-cyan tracking-widest uppercase">FREIOS</span>
             </div>
          </div>
        ) : (
          <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center mx-auto shrink-0">
            <span className="text-navy font-black text-[10px]">TF</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6 px-3">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {expanded && <h4 className="px-3 text-[9px] uppercase font-bold tracking-[0.2em] text-white/20 mb-2">{group.label}</h4>}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-sm transition-all hover:bg-white/5",
                    location.pathname === item.href ? "bg-white/10 text-orange border-l-2 border-orange font-semibold" : "text-white/60"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {expanded && <span className="text-[13px]">{item.label}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Toggle */}
      <div className="p-2 border-t border-white/5 space-y-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-white/40 hover:bg-white/5 transition-all"
        >
          {expanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 mx-auto" />}
          {expanded && <span className="text-[12px] font-medium uppercase tracking-wider">Recolher</span>}
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-red-400/60 hover:bg-red-400/5 transition-all">
          <LogOut className="w-4 h-4 shrink-0" />
          {expanded && <span className="text-[12px] font-medium uppercase tracking-wider">Sair</span>}
        </button>
      </div>
    </aside>
  )
}
