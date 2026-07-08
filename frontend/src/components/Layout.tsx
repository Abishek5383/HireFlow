import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Briefcase, 
  CalendarRange, 
  LogOut, 
  User as UserIcon,
  Menu,
  X
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Jobs & Requirements', href: '/jobs', icon: Briefcase },
    { name: 'Interviews Feed', href: '/interviews', icon: CalendarRange },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-background text-ink overflow-x-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-850 bg-slate-950 shadow-xl">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6 gap-3">
            <img src="/logo.png" alt="HireFlow Logo" className="h-9 w-9 object-contain rounded-lg shadow-md shadow-accent/20" />
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              HireFlow
            </span>
          </div>
          
          {/* Nav links */}
          <nav className="mt-8 flex-1 px-4 space-y-1">
            {navigation.map((item) => {
              const Active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    Active
                      ? 'bg-accent/20 text-white border-l-4 border-accent shadow-inner'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                    Active ? 'text-accent' : 'text-slate-400 group-hover:text-slate-300'
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        
        {/* User Profile Summary & Logout */}
        <div className="flex-shrink-0 flex border-t border-slate-800 p-4">
          <div className="flex items-center w-full justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                <UserIcon className="h-5 w-5" />
              </div>
              <div className="max-w-[120px]">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-all duration-200 active:scale-90"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 border-r border-slate-800 pt-5 pb-4">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            
            <div className="flex items-center flex-shrink-0 px-6 gap-3">
              <img src="/logo.png" alt="HireFlow Logo" className="h-9 w-9 object-contain rounded-lg shadow-md shadow-accent/20" />
              <span className="font-extrabold text-xl tracking-tight text-white">HireFlow</span>
            </div>
            
            <nav className="mt-8 flex-1 px-4 space-y-1">
              {navigation.map((item) => {
                const Active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                      Active
                        ? 'bg-accent/20 text-white border-l-4 border-accent'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            
            <div className="flex-shrink-0 flex border-t border-slate-800 p-4">
              <div className="flex items-center w-full justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{user?.name}</p>
                    <p className="text-[10px] text-slate-400">{user?.role}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 transition-all duration-200"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main body area */}
      <div className="flex flex-col flex-1 md:pl-64">
        {/* Mobile Header */}
        <header className="sticky top-0 z-10 md:hidden flex items-center justify-between h-16 bg-slate-950 border-b border-slate-850 px-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="HireFlow Logo" className="h-8 w-8 object-contain rounded-lg shadow-md shadow-accent/20" />
            <span className="font-extrabold tracking-tight text-white">HireFlow</span>
          </div>
          <button
            type="button"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto px-4 py-8 md:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
