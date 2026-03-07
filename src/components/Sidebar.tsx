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
  const toggleBg = isDark
    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100'
    : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`px-5 py-5 border-b ${border}`}>
        <button
          onClick={() => { navigate('/'); setMobileOpen(false); }}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-zinc-900" fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <span className={`text-sm font-bold leading-tight ${textBase}`}>IssueTrack</span>
            <span className={`text-xs ${textMuted}`}>Ops Console</span>
          </div>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className={`text-xs font-semibold uppercase tracking-wider px-2 mb-2 ${sectionLabel}`}>Navigation</p>
        <ul className="flex flex-col gap-0.5">
          {navItems.map(item => (
            <li key={item.to}>
              <NavLink
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
                    <item.icon
                      size={16}
                      className={isActive ? navIconActive : navIconInactive}
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom section */}
      <div className={`px-3 py-4 border-t ${border} flex flex-col gap-3`}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${toggleBg}`}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>

        {/* User */}
        <div className={`flex items-center gap-3 px-2 py-1`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${userBg} ${userText}`}>
            OP
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`text-xs font-semibold truncate ${userTitle}`}>Ops Admin</span>
            <span className={`text-xs truncate ${userSubtext}`}>ops@company.com</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col w-56 flex-shrink-0 border-r ${bg} ${border} h-screen sticky top-0`}>
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <div className={`md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-b ${bg} ${border}`}>
        <button
          onClick={() => { navigate('/'); }}
          className="flex items-center gap-2"
        >
          <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center">
            <Zap size={13} className="text-zinc-900" fill="currentColor" />
          </div>
          <span className={`text-sm font-bold ${textBase}`}>IssueTrack</span>
        </button>
        <button
          onClick={() => setMobileOpen(v => !v)}
          className={`p-2 rounded-lg ${toggleBg}`}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className={`relative w-64 h-full flex flex-col ${bg} border-r ${border}`}>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
};
