import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { DashboardStats } from '../types';
import { 
  FileText, 
  UserCheck, 
  Calendar, 
  AlertTriangle,
  History
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

const COLORS = ['#0284c7', '#16a34a', '#d97706', '#4f46e5', '#dc2626'];

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (err: any) {
      setError('Failed to fetch dashboard metrics.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-lg bg-red-950/50 border border-red-500/50 p-4 text-sm text-red-200 max-w-lg mx-auto">
        {error || 'An error occurred loading metrics.'}
      </div>
    );
  }

  const cards = [
    { name: 'Total Resumes', value: stats.summary.total_resumes, icon: FileText, color: 'text-ink bg-accentSoft/15 border-accentSoft/30' },
    { name: 'Shortlisted', value: stats.summary.shortlisted, icon: UserCheck, color: 'text-accent bg-accent/10 border-accent/20' },
    { name: 'Interviews Scheduled', value: stats.summary.interviews_scheduled, icon: Calendar, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { name: 'Rejected Resumes', value: stats.summary.rejected, icon: AlertTriangle, color: 'text-red-600 bg-red-50 border-red-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Recruitment Overview</h1>
        <p className="text-ink/65 mt-1">Real-time stats, AI resume screening details, and interview pipelines.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.name}
              className="glassmorphism rounded-2xl p-5 hover:border-slate-300 transition-all duration-200 flex items-center justify-between"
            >
              <div className="space-y-1">
                <p className="text-xs font-semibold text-ink/65 uppercase tracking-wider">{card.name}</p>
                <p className="text-2xl font-black text-ink">{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl border ${card.color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart: Candidates per Job */}
        <div className="lg:col-span-2 glassmorphism rounded-2xl p-6 flex flex-col justify-between min-h-[350px]">
          <div>
            <h2 className="text-base font-bold text-ink">Candidates & Skills Match by Job</h2>
            <p className="text-xs text-ink/65 mt-0.5">Average match percentage vs. total resumes uploaded.</p>
          </div>
          
          <div className="flex-1 w-full min-h-[220px] mt-4">
            {stats.job_stats.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-400 text-xs">
                No active jobs.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.job_stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="job_title" stroke="#3C4044" fontSize={11} tickLine={false} />
                  <YAxis stroke="#3C4044" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: 'rgba(60,64,68,0.15)', borderRadius: '12px' }}
                    labelStyle={{ color: '#3C4044', fontWeight: 'bold' }}
                    itemStyle={{ color: '#3C4044' }}
                  />
                  <Bar dataKey="candidates_count" name="Resumes Uploaded" fill="#FD7B41" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avg_match_percentage" name="Avg Match %" fill="#EDBF9B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pie Chart: Status Breakdown */}
        <div className="glassmorphism rounded-2xl p-6 flex flex-col justify-between min-h-[350px]">
          <div>
            <h2 className="text-base font-bold text-ink">Candidate Distribution</h2>
            <p className="text-xs text-ink/65 mt-0.5">Breakdown of candidates by recruitment funnel status.</p>
          </div>
          
          <div className="flex-1 w-full min-h-[180px] mt-4 flex items-center justify-center">
            {stats.status_breakdown.every(s => s.value === 0) ? (
              <div className="text-slate-400 text-xs">No candidate statuses to show.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.status_breakdown.filter(s => s.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.status_breakdown.filter(s => s.value > 0).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: 'rgba(60,64,68,0.15)', borderRadius: '12px' }}
                    itemStyle={{ color: '#3C4044' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#3C4044' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Lower Section: Recent Candidates & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Candidates */}
        <div className="lg:col-span-2 glassmorphism rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">Recent Uploads</h2>
            <Link to="/jobs" className="text-xs font-semibold text-accent hover:text-accent-hover hover:underline">
              View vacancy requirements
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-ink/65 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Candidate</th>
                  <th className="pb-3 font-semibold">Job Posting</th>
                  <th className="pb-3 font-semibold text-center">Score</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recent_candidates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No candidate profiles uploaded yet.
                    </td>
                  </tr>
                ) : (
                  stats.recent_candidates.map((cand) => (
                    <tr key={cand.id} className="hover:bg-accentSoft/10 transition-colors group">
                      <td className="py-3 font-semibold text-ink group-hover:text-accent transition-colors">
                        <Link to={`/candidates/${cand.id}`}>{cand.name}</Link>
                      </td>
                      <td className="py-3 text-ink/65">{cand.job_title}</td>
                      <td className="py-3 text-center font-bold text-accent">{cand.match_percentage}%</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          cand.status === 'Shortlisted' ? 'bg-accent/10 text-accent border-accent/20' :
                          cand.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                          cand.status === 'Interview Scheduled' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                          'bg-sky-50 text-sky-600 border-sky-200'
                        }`}>
                          {cand.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="glassmorphism rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-accent" />
            <h2 className="text-base font-bold text-ink">System Logs</h2>
          </div>

          <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
            {stats.activities.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No activity logs recorded.</p>
            ) : (
              stats.activities.map((act) => (
                <div key={act.id} className="flex gap-3 text-xs leading-normal">
                  <div className="relative flex h-2 w-2 mt-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accentSoft opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                  </div>
                  
                  <div className="space-y-0.5">
                    <p className="text-ink">{act.details}</p>
                    <span className="text-[10px] text-ink/65 font-semibold uppercase">
                      {act.user_name} · {formatDate(act.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
