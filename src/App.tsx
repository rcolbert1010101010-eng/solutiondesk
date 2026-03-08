import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Issues } from './pages/Issues';
import { NewIssue } from './pages/NewIssue';
import { IssueDetail } from './pages/IssueDetail';
import { ResolutionLibrary } from './pages/ResolutionLibrary';
import { UserManagement } from './pages/UserManagement';
import { LoginPage } from './pages/LoginPage';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedApp: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${
        theme === 'dark' ? 'bg-[#0f0f10]' : 'bg-slate-100'
      }`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center animate-pulse">
            <span className="text-zinc-900 font-bold text-sm">I</span>
          </div>
          <p className={`text-sm ${
            theme === 'dark' ? 'text-zinc-500' : 'text-slate-400'
          }`}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return <AppShell />;
};

const AppShell: React.FC = () => {
  const { theme } = useTheme();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div
      className={`${
        theme === 'dark' ? 'dark' : 'light'
      } ${
        theme === 'dark' ? 'flex min-h-screen bg-[#0f0f10]' : 'flex min-h-screen bg-slate-100'
      }`}
    >
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/issues/:id" element={<IssueDetail />} />
          <Route path="/new-issue" element={<NewIssue />} />
          <Route path="/resolution-library" element={<ResolutionLibrary />} />
          <Route
            path="/admin/users"
            element={
              isAdmin
                ? <UserManagement />
                : <AccessDenied />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const AccessDenied: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <div className={`flex-1 flex flex-col items-center justify-center gap-4 p-8 ${
      isDark ? 'text-zinc-400' : 'text-slate-500'
    }`}>
      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
        isDark ? 'bg-zinc-800' : 'bg-slate-100'
      }`}>
        <span className="text-2xl">🔒</span>
      </div>
      <h2 className={`text-xl font-semibold ${
        isDark ? 'text-zinc-200' : 'text-slate-700'
      }`}>Access Denied</h2>
      <p className="text-sm text-center max-w-xs">
        You don't have permission to access this page. Admin access is required.
      </p>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ProtectedApp />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
