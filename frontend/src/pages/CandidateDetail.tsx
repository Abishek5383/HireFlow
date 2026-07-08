import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import type { Candidate, Job } from '../types';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  BookOpen, 
  Sparkles, 
  Copy, 
  Check, 
  AlertCircle,
  HelpCircle,
  Award
} from 'lucide-react';

const CandidateDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // AI Questions states
  const [questions, setQuestions] = useState<any | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState('');
  const [activeQuestionTab, setActiveQuestionTab] = useState<'technical' | 'project_based' | 'scenario' | 'behavioral'>('technical');
  const [copiedQuestionIdx, setCopiedQuestionIdx] = useState<number | null>(null);

  const groupQuestions = (questionsList: any[]) => {
    const grouped = {
      technical: [] as any[],
      project_based: [] as any[],
      scenario: [] as any[],
      behavioral: [] as any[]
    };

    if (!questionsList || !Array.isArray(questionsList)) return grouped;

    questionsList.forEach((q) => {
      const src = (q.source || '').toLowerCase();
      const type = (q.type || '').toLowerCase();

      if (type === 'behavioral') {
        grouped.behavioral.push(q);
      } else if (type === 'applied' || type === 'scenario') {
        grouped.scenario.push(q);
      } else if (src.startsWith('project') || src.startsWith('experience')) {
        grouped.project_based.push(q);
      } else {
        grouped.technical.push(q);
      }
    });

    return grouped;
  };

  const categorizedQuestions = (() => {
    if (!questions) return null;
    if (Array.isArray(questions)) {
      return groupQuestions(questions);
    }
    return questions; // already categorized dict
  })();

  // Interview Scheduler states
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [mode, setMode] = useState<'Online' | 'Offline'>('Online');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);

  const fetchCandidateDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/candidates/${id}`);
      const candData = response.data;
      setCandidate(candData);
      
      if (candData.suggested_meeting_link) {
        setMeetingLink(candData.suggested_meeting_link);
      }
      if (candData.suggested_notes) {
        setNotes(candData.suggested_notes);
      }
      
      // Fetch associated Job details
      const jobResponse = await api.get(`/jobs/${candData.job_id}`);
      setJob(jobResponse.data);
    } catch (err: any) {
      setError('Failed to fetch candidate details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateGoogleMeetLink = (dateStr: string, timeStr: string) => {
    if (!dateStr) return '';
    const seed = `${dateStr}-${timeStr || 'no-time'}-${id}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let code = '';
    let tempHash = Math.abs(hash);
    for (let i = 0; i < 10; i++) {
      const index = (tempHash + i * 7) % chars.length;
      code += chars[index];
    }
    return `https://meet.google.com/${code.substring(0, 3)}-${code.substring(3, 7)}-${code.substring(7, 10)}`;
  };

  useEffect(() => {
    fetchCandidateDetails();
  }, [id]);

  useEffect(() => {
    if (date) {
      setMeetingLink(generateGoogleMeetLink(date, time));
    }
  }, [date, time]);

  const handleGenerateQuestions = async (force: boolean = false) => {
    setQuestionsLoading(true);
    setQuestionsError('');
    try {
      const response = await api.get(`/candidates/${id}/questions`, {
        params: { force }
      });
      setQuestions(response.data);
    } catch (err) {
      setQuestionsError('Failed to generate interview questions. Please try again.');
      console.error(err);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduling(true);
    setScheduleSuccess(null);
    setError('');

    try {
      await api.post(`/interviews?candidate_id=${id}`, {
        date,
        time,
        mode,
        meeting_link: mode === 'Online' ? meetingLink : undefined,
        notes: notes || undefined
      });
      
      setScheduleSuccess('Interview scheduled and invitation email sent successfully!');
      
      // Refresh candidate details to update status to "Interview Scheduled"
      fetchCandidateDetails();
      
      // Clear scheduler form
      setDate('');
      setTime('');
      setMeetingLink('');
      setNotes('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to schedule interview.');
      console.error(err);
    } finally {
      setScheduling(false);
    }
  };

  const handleCopyQuestion = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedQuestionIdx(idx);
    setTimeout(() => setCopiedQuestionIdx(null), 2000);
  };

  const getStatusColor = (statusVal: string) => {
    switch (statusVal) {
      case 'New': return 'bg-sky-50 text-sky-600 border border-sky-200';
      case 'Shortlisted': return 'bg-accent/15 text-accent border border-accent/20';
      case 'Rejected': return 'bg-red-50 text-red-600 border border-red-200';
      case 'Interview Scheduled': return 'bg-amber-50 text-amber-600 border border-amber-200';
      case 'Completed': return 'bg-indigo-50 text-indigo-600 border border-indigo-200';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
      </div>
    );
  }

  if (!candidate || !job) {
    return (
      <div className="text-center p-12 glassmorphism rounded-2xl max-w-lg mx-auto">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-ink">Candidate details not found</h3>
        <p className="text-ink/65 mt-2">The profile you are looking for does not exist or was deleted.</p>
        <Link to="/jobs" className="mt-6 inline-flex items-center text-sm font-semibold text-accent gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to={`/jobs/${candidate.job_id}`}
          className="inline-flex items-center text-xs font-semibold text-ink/65 hover:text-ink gap-1 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to candidates list
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Profile details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Card */}
          <div className="glassmorphism rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -top-20 -left-20 h-52 w-52 rounded-full bg-accent/5 blur-3xl"></div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-ink">{candidate.name}</h1>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${getStatusColor(candidate.status)}`}>
                    {candidate.status}
                  </span>
                </div>
                <p className="text-sm text-accent mt-1 font-semibold">Applying for {job.title} at {job.company_name}</p>
              </div>

              <div className="text-center p-3 bg-accentSoft/15 border border-accentSoft/20 rounded-xl min-w-[100px]">
                <p className="text-[10px] font-bold text-ink/65 uppercase tracking-wider">Skill Match</p>
                <p className="text-2xl font-black text-accent mt-0.5">{candidate.match_percentage}%</p>
              </div>
            </div>

            {/* Contacts Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-6 border-t border-slate-100 text-sm text-ink/65">
              <div className="flex items-center gap-2.5">
                <Mail className="h-4.5 w-4.5 text-slate-400" />
                <a href={`mailto:${candidate.email}`} className="hover:underline">{candidate.email || 'N/A'}</a>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4.5 w-4.5 text-slate-400" />
                <span>{candidate.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-4.5 w-4.5 text-slate-400" />
                <span>{candidate.education || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Award className="h-4.5 w-4.5 text-slate-400" />
                <span>{candidate.experience_years} Years Experience</span>
              </div>
            </div>
          </div>

          {/* AI Suitability Summary */}
          <div className="glassmorphism rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-accentSoft/5 blur-3xl"></div>
            
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-accentSoft/15 border border-accentSoft/35 text-accent">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-lg font-bold text-ink">AI Suitability Summary</h2>
            </div>
            
            <p className="text-ink/65 text-sm leading-relaxed whitespace-pre-line">
              {candidate.summary || 'Generating candidate summary...'}
            </p>
          </div>

          {/* Candidate Skills details */}
          <div className="glassmorphism rounded-2xl p-8">
            <h2 className="text-lg font-bold text-ink mb-4">Extracted Technical Skills</h2>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-lg bg-accent text-white border border-accent/20 px-3.5 py-2 text-xs font-bold shadow-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Experience Timeline */}
          {candidate.experience_details && (
            (() => {
              const isArr = Array.isArray(candidate.experience_details);
              const isStr = typeof candidate.experience_details === 'string';
              if (isArr && candidate.experience_details.length === 0) return null;
              if (isStr && candidate.experience_details.trim() === '') return null;
              
              return (
                <div className="glassmorphism rounded-2xl p-6">
                  <h2 className="text-lg font-bold text-ink mb-4">Work Experience</h2>
                  {isArr ? (
                    <div className="space-y-6 relative border-l-2 border-slate-200 pl-4 ml-2">
                      {candidate.experience_details.map((exp: any, index: number) => (
                        <div key={index} className="relative space-y-1">
                          {/* Circle marker */}
                          <div className="absolute -left-[25px] top-1.5 h-3 w-3 rounded-full bg-accent border-2 border-surface"></div>
                          <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                            {exp.duration || exp.dates}
                          </span>
                          <h4 className="text-sm font-bold text-ink pt-1">{exp.role || exp.title || exp.position}</h4>
                          <p className="text-xs text-ink/65 font-semibold">{exp.company || exp.organization}</p>
                          <p className="text-xs text-ink/65 pt-1 leading-relaxed">{exp.description || exp.responsibilities}</p>
                        </div>
                      ))}
                    </div>
                  ) : isStr ? (
                    <p className="text-xs text-ink/65 leading-relaxed whitespace-pre-line">{candidate.experience_details}</p>
                  ) : (
                    <p className="text-xs text-ink/65 leading-relaxed whitespace-pre-line">{JSON.stringify(candidate.experience_details, null, 2)}</p>
                  )}
                </div>
              );
            })()
          )}

          {/* Projects */}
          {candidate.projects && (
            (() => {
              const isArr = Array.isArray(candidate.projects);
              const isStr = typeof candidate.projects === 'string';
              if (isArr && candidate.projects.length === 0) return null;
              if (isStr && candidate.projects.trim() === '') return null;

              return (
                <div className="glassmorphism rounded-2xl p-6">
                  <h2 className="text-lg font-bold text-ink mb-4">Projects</h2>
                  {isArr ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {candidate.projects.map((proj: any, index: number) => (
                        <div key={index} className="p-4 rounded-xl bg-surface border border-slate-200">
                          <h4 className="text-sm font-bold text-ink">{proj.name || proj.title}</h4>
                          <p className="text-xs text-ink/65 mt-1 leading-relaxed">{proj.description || proj.details}</p>
                        </div>
                      ))}
                    </div>
                  ) : isStr ? (
                    <p className="text-xs text-ink/65 leading-relaxed whitespace-pre-line">{candidate.projects}</p>
                  ) : (
                    <p className="text-xs text-ink/65 leading-relaxed whitespace-pre-line">{JSON.stringify(candidate.projects, null, 2)}</p>
                  )}
                </div>
              );
            })()
          )}
        </div>

        {/* Right Column: Actions (Scheduler & Questions) */}
        <div className="space-y-6">
          {/* Interview Scheduler */}
          <div className="glassmorphism rounded-2xl p-6 border border-slate-200">
            <h2 className="text-base font-bold text-ink mb-4">Schedule Interview</h2>
            
            {scheduleSuccess && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-700 mb-4">
                {scheduleSuccess}
              </div>
            )}

            <form onSubmit={handleScheduleInterview} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-ink uppercase tracking-wider">Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink uppercase tracking-wider">Time *</label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink uppercase tracking-wider">Interview Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
                >
                  <option value="Online">Online Meeting</option>
                  <option value="Offline">In-Person Office</option>
                </select>
              </div>

              {mode === 'Online' && (
                <div>
                  <label className="block text-[10px] font-bold text-ink uppercase tracking-wider">Meeting Link</label>
                  <input
                    type="url"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-ink uppercase tracking-wider">Preparation Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Bring a copy of portfolio or coding samples..."
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={scheduling}
                className="w-full mt-2 inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 active:scale-95 shadow-lg shadow-accent/10"
              >
                {scheduling ? 'Scheduling & Emailing...' : 'Schedule & Send Invitation'}
              </button>
            </form>
          </div>

          {/* AI Interview Questions Generator */}
          <div className="glassmorphism rounded-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">AI Tailored Questions</h2>
              <HelpCircle className="h-4.5 w-4.5 text-slate-400" />
            </div>

            {questionsError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-[11px] text-red-700">
                {questionsError}
              </div>
            )}

            {!questions ? (
              <div className="text-center py-6">
                <p className="text-xs text-ink/65 mb-4">Generate custom interview questions parsed by Gemini based on skills gap.</p>
                <button
                  onClick={() => handleGenerateQuestions(false)}
                  disabled={questionsLoading}
                  className="inline-flex items-center justify-center rounded-xl bg-accentSoft/20 border border-accentSoft/30 px-4 py-2 text-xs font-semibold text-ink hover:bg-accentSoft/35 transition-colors disabled:opacity-50"
                >
                  {questionsLoading ? 'Generating via Gemini...' : 'Generate AI Questions'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Category Selector Tabs */}
                <div className="flex border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                  {(['technical', 'project_based', 'scenario', 'behavioral'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveQuestionTab(tab)}
                      className={`flex-1 py-1.5 text-center border-b-2 transition-all ${
                        activeQuestionTab === tab
                          ? 'border-accent text-accent'
                          : 'border-transparent text-ink/65 hover:text-ink'
                      }`}
                    >
                      {tab.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* Questions List */}
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {categorizedQuestions && categorizedQuestions[activeQuestionTab]?.map((q: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-surface border border-slate-200 text-xs text-ink/65 relative group/q flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <p className="pr-6 font-semibold text-ink leading-relaxed">{q.question}</p>
                        
                        <div className="flex flex-wrap gap-1 shrink-0">
                          {q.type && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              q.type === 'basic' ? 'bg-sky-50 text-sky-600 border border-sky-200' :
                              q.type === 'applied' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                              'bg-red-50 text-red-600 border border-red-200'
                            }`}>
                              {q.type}
                            </span>
                          )}
                          {q.source && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-accentSoft/10 text-ink border border-accentSoft/20 truncate max-w-[120px]" title={q.source}>
                              {q.source.split(':').pop()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <details className="text-[11px] text-ink/65">
                        <summary className="cursor-pointer font-semibold text-accent hover:text-accent-hover outline-none select-none">
                          Show Reference Answer
                        </summary>
                        <p className="mt-1.5 p-2 bg-accentSoft/5 border border-accentSoft/15 rounded-lg leading-relaxed text-ink/65 whitespace-pre-wrap">
                          {q.answer}
                        </p>
                      </details>
                      
                      <button
                        onClick={() => handleCopyQuestion(q.question, idx)}
                        className="absolute top-2 right-2 p-1 rounded hover:bg-accentSoft/20 text-ink/65 hover:text-ink opacity-0 group-hover/q:opacity-100 transition-opacity"
                        title="Copy Question"
                      >
                        {copiedQuestionIdx === idx ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleGenerateQuestions(true)}
                  className="w-full text-center text-[10px] font-semibold text-accent hover:text-accent-hover hover:underline pt-2"
                >
                  Regenerate Questions
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDetail;
