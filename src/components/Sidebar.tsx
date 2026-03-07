import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  Zap,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/issues', label: 'Issues', icon: ListChecks, exact: false },
  { to: '/new-issue', label: 'New Issue', icon: PlusCircle, exact: false }
];

export const Sidebar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-zinc-800">
        <button
          onClick={() => { navigate('/'); setMobileOpen(false); }}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-zinc-900" fill="currentColor" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold text-zinc-100">ResolutionDesk</span>
            <span className="text-xs text-zinc-500">Support Platform</span>
          </div>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider px-2 mb-2">Navigation</p>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-amber-400/10 text-amber-400'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={16} className={isActive ? 'text-amber-400' : 'text-zinc-500 group-hover:text-zinc-300'} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight size={14} className="text-amber-400/60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs font-bold text-zinc-900 flex-shrink-0">
            T
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xs font-medium text-zinc-300">Technician</span>
            <span className="text-xs text-zinc-600">Support Team</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-100"
      >
        <Menu size={18} />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-zinc-950 border-r border-zinc-800 z-50 transform transition-transform duration-200 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-zinc-100"
        >
          <X size={16} />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-zinc-950 border-r border-zinc-800 h-screen sticky top-0 flex-shrink-0">
        <SidebarContent />
      </aside>
    </>
  );
};
