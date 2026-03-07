import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIssue } from '../lib/db';
import { Severity, Status } from '../types';
import { ArrowLeft, AlertTriangle, Save, X } from 'lucide-react';

const SYSTEMS = [
  'Network / VPN',
  'Email / Exchange',
  'Active Directory / Identity',
  'Microsoft 365 / Licensing',
  'ERP / SAP',
  'Web / Customer Portal',
  'Printing / Hardware',
  'Backup / Storage',
  'Security / Firewall',
  'Database / SQL',
  'Cloud Infrastructure',
  'Endpoint / Workstation',
  'Other'
];

export const NewIssue: React.FC = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    systemAffected: '',
    severity: 'Medium' as Severity,
    status: 'Open' as Status,
    assignee: '',
    resolution: ''
  });

  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const validate = (): boolean => {
    const newErrors: Partial<typeof form> = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (form.title.trim().length < 5) newErrors.title = 'Title must be at least 5 characters';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (form.description.trim().length < 10) newErrors.description = 'Description must be at least 10 characters';
    if (!form.systemAffected) newErrors.systemAffected = 'Please select a system';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const issue = createIssue({
      title: form.title.trim(),
      description: form.description.trim(),
      systemAffected: form.systemAffected,
      severity: form.severity,
      status: form.status,
      assignee: form.assignee.trim() || undefined,
      resolution: form.resolution.trim()
    });
    setSubmitted(true);
    setTimeout(() => navigate(`/issues/${issue.id}`), 800);
  };

  const severityOptions: Severity[] = ['Low', 'Medium', 'High', 'Critical'];
  const statusOptions: Status[] = ['Open', 'Investigating', 'Resolved', 'Closed'];

  const severityColors: Record<Severity, string> = {
    Low: 'border-zinc-500/30 data-[active=true]:border-zinc-400 data-[active=true]:bg-zinc-400/10 data-[active=true]:text-zinc-300',
    Medium: 'border-sky-500/30 data-[active=true]:border-sky-400 data-[active=true]:bg-sky-400/10 data-[active=true]:text-sky-300',
    High: 'border-orange-500/30 data-[active=true]:border-orange-400 data-[active=true]:bg-orange-400/10 data-[active=true]:text-orange-300',
    Critical: 'border-red-500/30 data-[active=true]:border-red-400 data-[active=true]:bg-red-400/10 data-[active=true]:text-red-300'
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">New Issue</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Log a new technical issue for the team</p>
          </div>
        </div>

        {submitted ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Save size={20} className="text-emerald-400" />
            </div>
            <p className="text-base font-semibold text-emerald-400">Issue created successfully!</p>
            <p className="text-sm text-zinc-400 mt-1">Redirecting to issue detail...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-6">
              {/* Title */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 bg-amber-400/10 rounded text-amber-400 text-xs flex items-center justify-center font-bold">1</span>
                  Basic Information
                </h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      Issue Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VPN connection dropping intermittently"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      className={`w-full bg-zinc-800 border rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
                        errors.title
                          ? 'border-red-500/50 focus:border-red-400/70'
                          : 'border-zinc-700 focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20'
                      }`}
                    />
                    {errors.title && (
                      <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                        <AlertTriangle size={11} /> {errors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      Description <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Describe the issue in detail — when it started, who is affected, any error messages..."
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className={`w-full bg-zinc-800 border rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors resize-none ${
                        errors.description
                          ? 'border-red-500/50 focus:border-red-400/70'
                          : 'border-zinc-700 focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20'
                      }`}
                    />
                    {errors.description && (
                      <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                        <AlertTriangle size={11} /> {errors.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Classification */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 bg-amber-400/10 rounded text-amber-400 text-xs flex items-center justify-center font-bold">2</span>
                  Classification
                </h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      System Affected <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={form.systemAffected}
                      onChange={e => setForm(f => ({ ...f, systemAffected: e.target.value }))}
                      className={`w-full bg-zinc-800 border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition-colors appearance-none ${
                        errors.systemAffected
                          ? 'border-red-500/50 text-zinc-100 focus:border-red-400/70'
                          : 'border-zinc-700 focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20'
                      } ${form.systemAffected ? 'text-zinc-100' : 'text-zinc-600'}`}
                    >
                      <option value="" disabled>Select a system...</option>
                      {SYSTEMS.map(s => (
                        <option key={s} value={s} className="bg-zinc-800 text-zinc-100">{s}</option>
                      ))}
                    </select>
                    {errors.systemAffected && (
                      <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                        <AlertTriangle size={11} /> {errors.systemAffected}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">Severity</label>
                    <div className="grid grid-cols-4 gap-2">
                      {severityOptions.map(s => (
                        <button
                          key={s}
                          type="button"
                          data-active={form.severity === s}
                          onClick={() => setForm(f => ({ ...f, severity: s }))}
                          className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                            form.severity === s
                              ? s === 'Low' ? 'border-zinc-400 bg-zinc-400/10 text-zinc-300'
                              : s === 'Medium' ? 'border-sky-400 bg-sky-400/10 text-sky-300'
                              : s === 'High' ? 'border-orange-400 bg-orange-400/10 text-orange-300'
                              : 'border-red-400 bg-red-400/10 text-red-300'
                              : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">Initial Status</label>
                    <div className="grid grid-cols-4 gap-2">
                      {statusOptions.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, status: s }))}
                          className={`py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                            form.status === s
                              ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
                              : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignment */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 bg-amber-400/10 rounded text-amber-400 text-xs flex items-center justify-center font-bold">3</span>
                  Assignment & Resolution
                  <span className="text-xs font-normal text-zinc-600">(optional)</span>
                </h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Assignee</label>
                    <input
                      type="text"
                      placeholder="e.g. Alex Rivera"
                      value={form.assignee}
                      onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Resolution Notes</label>
                    <textarea
                      rows={3}
                      placeholder="If already resolved, describe the fix here..."
                      value={form.resolution}
                      onChange={e => setForm(f => ({ ...f, resolution: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
                >
                  <X size={15} /> Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-zinc-900 text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
                >
                  <Save size={15} /> Create Issue
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
