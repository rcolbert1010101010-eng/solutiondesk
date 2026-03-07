import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  Zap,
  Menu,
  X,
  BookOpen,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/issues', label: 'Issues', icon: ListChecks, exact: false },
  { to: '/resolution-library', label: 'Resolution Library', icon: BookOpen, exact: false },
  { to: '/new-issue', label: 'New Issue', icon: PlusCircle, exact: false }
];

export const Sidebar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';

  const bg = isDark ? 'bg-zinc-900' : 'bg-white';
  const border = isDark ? 'border-zinc-800' : 'border-slate-200';
  const textMuted = isDark ? 'text-zinc-500' : 'text-slate-400';
  const textBase = isDark ? 'text-zinc-100' : 'text-slate-800';
  const navHover = isDark ? 'hover:text-zinc-100 hover:bg-zinc-800' : 'hover:text-slate-900 hover:bg-slate-100';
  const navActive = isDark ? 'bg-amber-400/10 text-amber-500' : 'bg-amber-50 text-amber-600';
  const navInactive = isDark ? 'text-zinc-400' : 'text-slate-500';
  const navIconActive = isDark ? 'text-amber-400' : 'text-amber-500';
  const navIconInactive = isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-slate-400 group-hover:text-slate-600';
  const sectionLabel = isDark ? 'text-zinc-600' : 'text-slate-400';
  const userBg = isDark ? 'bg-amber-400/20' : 'bg-amber-100';
  const userText = isDark ? 'text-amber-400' : 'text-amber-600';
  const userSubtext = isDark ? 'text-zinc-500' : 'text-slate-400';
  const userTitle = isDark ? 'text-zinc-300' : 'text-slate-700';
  const toggleBg = isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className={`px-5 py-5 border-b ${border}`}>
        <button
          onClick={() => { navigate('/'); setMobileOpen(false); }}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-zinc-900" fill="currentColor" />
          </div>
          <div className="flex flex-col leading-none">
            <span className={`text-sm font-bold ${textBase}`}>ResolutionDesk</span>
            <span className={`text-xs ${textMuted}`}>Support Intelligence</span>
          </div>
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        <p className={`text-xs font-semibold ${sectionLabel} uppercase tracking-wider px-2 mb-2`}>Navigation</p>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? navActive
                  : `${navInactive} ${navHover}`
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} className={isActive ? navIconActive : navIconInactive} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={`px-3 py-4 border-t ${border} flex flex-col gap-3`}>
        {/* Theme toggle */}
        <div className="px-3">
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${toggleBg}`}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        <div className={`flex items-center gap-3 px-3 py-2`}>
          <div className={`w-7 h-7 rounded-full ${userBg} flex items-center justify-center`}>
            <span className={`text-xs font-bold ${userText}`}>IT</span>
          </div>
          <div className="flex flex-col">
            <span className={`text-xs font-semibold ${userTitle}`}>IT Support</span>
            <span className={`text-xs ${userSubtext}`}>Administrator</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className={`lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-white text-slate-600 shadow'}`}
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`lg:hidden fixed top-0 left-0 h-full w-64 z-50 transform transition-transform duration-200 ${isDark ? 'bg-zinc-900' : 'bg-white'} border-r ${border} ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <button
          onClick={() => setMobileOpen(false)}
          className={`absolute top-4 right-4 p-1.5 rounded-lg ${isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-400 hover:bg-slate-100'}`}
        >
          <X size={16} />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col w-56 border-r ${border} ${bg} flex-shrink-0`}>
        <SidebarContent />
      </aside>
    </>
  );
};
