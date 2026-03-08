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
  Moon,
  Users,
  LogOut,
  Shield
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { currentUser, logout } = useAuth();

  const isDark = theme === 'dark';
  const isAdmin = currentUser?.role === 'admin';

  const bg = isDark ? 'bg-zinc-900' : 'bg-white';
  const border = isDark ? 'border-zinc-800' : 'border-slate-200';
  const textMuted = isDark ? 'text-zinc-500' : 'text-slate-400';
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

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/issues', label: 'Issues', icon: ListChecks, exact: false },
    { to: '/resolution-library', label: 'Resolution Library', icon: BookOpen, exact: false },
    { to: '/new-issue', label: 'New Issue', icon: PlusCircle, exact: false },
  ];

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
  };

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
          <div className="min-w-0">
            <p className={`text-sm font-bold leading-tight truncate ${
              isDark ? 'text-zinc-100' : 'text-slate-800'
            }`}>IRM Platform</p>
            <p className={`text-xs truncate ${textMuted}`}>Incident Resolution</p>
          </div>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        <p className={`text-xs font-semibold uppercase tracking-wider px-3 mb-2 ${sectionLabel}`}>Navigation</p>
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group ${
                isActive ? navActive : `${navInactive} ${navHover}`
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? navIconActive : navIconInactive} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        {/* Admin-only section */}
        {isAdmin && (
          <>
            <p className={`text-xs font-semibold uppercase tracking-wider px-3 mt-4 mb-2 ${sectionLabel}`}>Admin</p>
            <NavLink
              to="/admin/users"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group ${
                  isActive ? navActive : `${navInactive} ${navHover}`
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Users size={16} className={isActive ? navIconActive : navIconInactive} />
                  User Management
                </>
              )}
            </NavLink>
          </>
        )}
      </nav>

      {/* Bottom: user info + theme toggle + logout */}
      <div className={`px-4 py-4 border-t ${border} flex flex-col gap-3`}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full ${toggleBg}`}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
          {isDark ? 'Light mode' : 'Dark mode'}
        </button>

        {/* User info */}
        {currentUser && (
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${
            isDark ? 'bg-zinc-800/60' : 'bg-slate-50'
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${userBg} ${userText}`}>
              {currentUser.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${userTitle}`}>{currentUser.email}</p>
              <p className={`text-xs truncate flex items-center gap-1 ${userSubtext}`}>
                {currentUser.role === 'admin' && <Shield size={9} />}
                {currentUser.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                isDark
                  ? 'text-zinc-500 hover:text-red-400 hover:bg-red-400/10'
                  : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
              }`}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col w-56 flex-shrink-0 border-r h-screen sticky top-0 ${bg} ${border}`}>
        <SidebarContent />
      </aside>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className={`md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg border ${
          isDark
            ? 'bg-zinc-900 border-zinc-700 text-zinc-400'
            : 'bg-white border-slate-200 text-slate-600'
        }`}
      >
        <Menu size={18} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className={`relative flex flex-col w-64 h-full ${bg} border-r ${border} shadow-xl z-10`}>
            <button
              onClick={() => setMobileOpen(false)}
              className={`absolute top-4 right-4 p-1.5 rounded-lg ${
                isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <X size={16} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
};
