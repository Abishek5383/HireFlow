import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { CalendarRange, Calendar, Clock, Video, MapPin, ExternalLink } from 'lucide-react';

interface InterviewInfo {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  job_title: string;
  date: string;
  time: string;
  mode: 'Online' | 'Offline';
  meeting_link?: string;
  notes?: string;
  scheduled_at: string;
}

const ScheduleInterview: React.FC = () => {
  const [interviews, setInterviews] = useState<InterviewInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const response = await api.get('/interviews');
      setInterviews(response.data);
    } catch (err) {
      setError('Failed to fetch interview schedules feed.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Interview Feed</h1>
        <p className="text-ink/65 mt-1">Track all active online video meetings and offline interviews.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {interviews.length === 0 ? (
        <div className="glassmorphism rounded-2xl p-12 text-center max-w-lg mx-auto mt-8">
          <CalendarRange className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-ink">No interviews scheduled yet</h3>
          <p className="text-ink/65 mt-2 text-sm">
            Navigate to a candidate's details profile page inside a job requirement to schedule their interview.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {interviews.map((item) => (
            <div
              key={item.id}
              className="glassmorphism rounded-2xl p-5 hover:border-accentSoft transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-base font-bold text-ink">{item.candidate_name}</h3>
                    <p className="text-xs text-ink/65 mt-0.5">{item.candidate_email}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    item.mode === 'Online' 
                      ? 'bg-accent/15 text-accent border border-accent/20' 
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  }`}>
                    {item.mode === 'Online' ? (
                      <span className="flex items-center gap-1"><Video className="h-3 w-3" /> Online</span>
                    ) : (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Offline</span>
                    )}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-ink/65">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span><strong>Date:</strong> {item.date}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span><strong>Time:</strong> {item.time}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-4 w-4 text-slate-400" />
                    <span><strong>Position:</strong> {item.job_title}</span>
                  </div>
                </div>

                {item.mode === 'Online' && item.meeting_link && (
                  <div className="mt-4 p-3 bg-surface border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                    <span className="text-[11px] text-ink/65 truncate max-w-[220px]">
                      {item.meeting_link}
                    </span>
                    <a
                      href={item.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs font-bold text-accent hover:text-accent-hover shrink-0 gap-1 hover:underline"
                    >
                      Join Link
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {item.notes && (
                  <div className="mt-4 text-xs text-ink/65 bg-accentSoft/5 p-3 rounded-xl border border-accentSoft/15">
                    <p className="font-semibold text-ink">Notes:</p>
                    <p className="mt-0.5 leading-relaxed">{item.notes}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-ink/65">
                Scheduled at: {new Date(item.scheduled_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduleInterview;
