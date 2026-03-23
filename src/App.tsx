import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Issues } from './pages/Issues';
import { NewIssue } from './pages/NewIssue';
import { IssueDetail } from './pages/IssueDetail';
import { ResolutionDetail } from './pages/ResolutionDetail';
import { ResolutionLibrary } from './pages/ResolutionLibrary';
import { LoginPage } from './pages/LoginPage';
import { Tags } from './pages/Tags';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedApp: React.FC = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-[#0f0f10]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center animate-pulse">
            <span className="text-zinc-900 font-bold text-sm">I</span>
          </div>
          <p className="text-sm text-slate-400 dark:text-zinc-500">Loading...</p>
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
  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-[#0f0f10]">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/issues/:id" element={<IssueDetail />} />
          <Route path="/resolutions/:id" element={<ResolutionDetail />} />
          <Route path="/new-issue" element={<NewIssue />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/resolution-library" element={<ResolutionLibrary />} />
          <Route path="/admin/users" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
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
