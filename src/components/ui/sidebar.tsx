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
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <main className={cn(
        "flex-1 transition-all duration-300 ease-in-out",
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

  const menuGroups = [
    {
      label: "Principal",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", href: "/" },
        { icon: Wrench, label: "Gestão", href: "/management" },
        { icon: ClipboardCheck, label: "Checklist", href: "/checklist" },
        { icon: BarChart3, label: "Tarefas", href: "/tasks" },
        { icon: ShieldCheck, label: "Ranking", href: "/ranking" },
      ]
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

      ]
    }
  ]

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full bg-[#001830] text-white transition-all duration-300 ease-in-out z-40 flex flex-col",
      expanded ? "w-64" : "w-20"
    )}>
      {/* Header / Logo */}
      <div className="h-20 flex items-center px-6 border-b border-white/10 overflow-hidden">
        {expanded ? (
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0">
               <span className="text-[#001830] font-black">TF</span>
             </div>
             <div className="flex flex-col">
               <span className="font-space font-bold leading-none text-orange">TECNOAR</span>
               <span className="text-[10px] font-bold text-cyan">FREIOS</span>
             </div>
          </div>
        ) : (
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mx-auto shrink-0">
            <span className="text-[#001830] font-black text-xs">TF</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 space-y-8 px-3">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="space-y-2">
            {expanded && (
              <h4 className="px-3 text-[10px] uppercase font-bold tracking-widest text-white/30">
                {group.label}
              </h4>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-white/5",
                    location.pathname === item.href ? "bg-[#f06000] text-white shadow-lg shadow-[#f06000]/20" : "text-white/70"
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {expanded && <span className="text-sm font-medium">{item.label}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Toggle */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:bg-white/5 transition-all"
        >
          {expanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5 mx-auto" />}
          {expanded && <span className="text-sm font-medium">Recolher</span>}
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-400 hover:bg-red-400/5 transition-all">
          <LogOut className="w-5 h-5 shrink-0" />
          {expanded && <span className="text-sm font-medium">Sair</span>}
        </button>
      </div>
    </aside>
  )
}
