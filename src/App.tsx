import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Issues } from './pages/Issues';
import { NewIssue } from './pages/NewIssue';
import { IssueDetail } from './pages/IssueDetail';
import { ResolutionLibrary } from './pages/ResolutionLibrary';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/issues" element={<Issues />} />
            <Route path="/issues/:id" element={<IssueDetail />} />
            <Route path="/new-issue" element={<NewIssue />} />
            <Route path="/resolution-library" element={<ResolutionLibrary />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
