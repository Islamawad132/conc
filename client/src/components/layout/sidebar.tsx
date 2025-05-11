import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { UserRole, roleNames } from "@/lib/utils";

type SidebarLink = {
  href: string;
  icon: string;
  label: string;
  allowedRoles: UserRole[];
};

const links: SidebarLink[] = [
  {
    href: "/",
    icon: "dashboard",
    label: "لوحة المتابعة",
    allowedRoles: ["admin", "secretary"],
  },
  {
    href: "/new-request",
    icon: "add_circle",
    label: "طلب اعتماد جديد",
    allowedRoles: ["admin", "secretary", "client"],
  },
  {
    href: "/approval-requests",
    icon: "fact_check",
    label: "طلبات الاعتماد",
    allowedRoles: ["admin", "secretary", "engineer"],
  },
  {
    href: "/visit-schedule",
    icon: "event",
    label: "جدول الزيارات",
    allowedRoles: ["admin", "secretary", "engineer"],
  },
  {
    href: "/payments",
    icon: "payments",
    label: "المدفوعات",
    allowedRoles: ["admin", "secretary"],
  },
  {
    href: "/stations",
    icon: "business",
    label: "المحطات",
    allowedRoles: ["admin", "secretary", "client"],
  },
  {
    href: "/settings",
    icon: "settings",
    label: "الإعدادات",
    allowedRoles: ["admin"],
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  if (!user) return null;
  
  const userRole = user.role;
  
  return (
    <aside className="bg-sidebar text-sidebar-foreground w-full md:w-64 flex-shrink-0 shadow-lg">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-xl font-heading font-bold">نظام محطات الخلط</h2>
      </div>
      
      <div className="p-4 border-b border-sidebar-border flex items-center space-x-4 space-x-reverse">
        <div className="bg-sidebar-primary rounded-full w-10 h-10 flex items-center justify-center">
          <span className="material-icons">person</span>
        </div>
        <div>
          <h3 className="font-medium">{user.name}</h3>
          <p className="text-sm text-sidebar-foreground/70">{roleNames[userRole]}</p>
        </div>
      </div>
      
      <nav className="p-2">
        <ul className="space-y-1">
          {links.map((link) => 
            link.allowedRoles.includes(userRole) && (
              <li key={link.href}>
                <Link href={link.href}>
                  <div className={cn(
                    "block py-2 px-4 rounded hover:bg-sidebar-accent transition-colors flex items-center",
                    location === link.href && "bg-sidebar-accent"
                  )}>
                    <span className="material-icons ml-2">{link.icon}</span>
                    <span>{link.label}</span>
                  </div>
                </Link>
              </li>
            )
          )}
          
          <li className="mt-8">
            <button 
              onClick={() => logoutMutation.mutate()}
              className="w-full text-right block py-2 px-4 rounded hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center"
            >
              <span className="material-icons ml-2">logout</span>
              <span>تسجيل الخروج</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
