import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, LogOut, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clientes", icon: Users },
];

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { user, signOut } = useAuth();

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-sidebar-border bg-sidebar-background transition-all duration-300 ease-in-out",
        isOpen ? "w-64" : "w-20"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {isOpen && (
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent truncate">
            BADS
          </span>
        )}
        <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={() => setIsOpen(!isOpen)}
        >
            {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={!isOpen ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group relative overflow-hidden",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !isOpen && "justify-center px-2"
              )
            }
          >
            <item.icon className={cn("h-5 w-5 shrink-0 transition-transform duration-200", !isOpen && "h-6 w-6")} />
            {isOpen && <span className="truncate">{item.label}</span>}
            
            {/* Active Indicator Strip */}
            {isOpen && (
                <span className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary-foreground opacity-0 transition-opacity",
                     // This strip only shows if active, but we handle active styling with bg-primary already.
                     // Maybe for hover? Let's keep it simple for now. 
                )} />
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div className="border-t border-sidebar-border p-3">
        {user && (
          <div className={cn("flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent", !isOpen && "justify-center")}>
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">
                    {user.email?.[0].toUpperCase()}
                </span>
            </div>
            
            {isOpen && (
                <div className="flex flex-1 flex-col overflow-hidden">
                    <span className="truncate text-sm font-medium text-sidebar-foreground">
                        {user.email?.split('@')[0]}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                        Admin
                    </span>
                </div>
            )}
            
            {isOpen && (
                <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 ml-auto hover:text-destructive">
                    <LogOut className="h-4 w-4" />
                </Button>
            )}
          </div>
        )}
        {!isOpen && user && (
            <div className="mt-2 flex justify-center">
                 <Button variant="ghost" size="icon" onClick={signOut} title="Cerrar Sesión" className="hover:text-destructive">
                    <LogOut className="h-4 w-4" />
                </Button>
            </div>
        )}
      </div>
    </aside>
  );
}
