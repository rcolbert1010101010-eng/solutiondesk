import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  Zap,
  Menu,
  X,
  BookOpen
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/issues', label: 'Issues', icon: ListChecks, exact: false },
  { to: '/resolution-library', label: 'Resolution Library', icon: BookOpen, exact: false },
  { to: '/new-issue', label: 'New Issue', icon: PlusCircle, exact: false }
];

export const Sidebar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-slate-200">
        <button
          onClick={() => { navigate('/'); setMobileOpen(false); }}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-white" fill="currentColor" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold text-slate-800">ResolutionDesk</span>
            <span className="text-xs text-slate-500">Support Intelligence</span>
          </div>
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">Navigation</p>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-amber-50 text-amber-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} className={isActive ? 'text-amber-500' : 'text-slate-400 group-hover:text-slate-600'} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-slate-200">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
            <span className="text-xs font-bold text-amber-600">IT</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-700">IT Support</span>
            <span className="text-xs text-slate-400">Admin</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-slate-200 rounded-lg text-slate-600 shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`lg:hidden fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 shadow-sm">
        <SidebarContent />
      </aside>
    </>
  );
};
