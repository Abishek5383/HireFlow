import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import type { Job, Candidate } from '../types';
import { 
  ArrowLeft, 
  Upload, 
  Search, 
  SlidersHorizontal, 
  FileText, 
  X, 
  Check, 
  AlertTriangle,
  FileCode,
  Sparkles
} from 'lucide-react';

interface UploadFileState {
  file: File;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'failed';
  error?: string;
}

const JobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minMatch, setMinMatch] = useState<number>(0);
  const [minExp, setMinExp] = useState<number>(0);
  
  // Upload States
  const [uploadFiles, setUploadFiles] = useState<UploadFileState[]>([]);
  const [activeTab, setActiveTab] = useState<'candidates' | 'upload'>('candidates');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchJobDetails = async () => {
    try {
      const response = await api.get(`/jobs/${id}`);
      setJob(response.data);
    } catch (err) {
      setError('Failed to fetch job posting details.');
      console.error(err);
    }
  };

  const fetchCandidates = async () => {
    setCandidatesLoading(true);
    try {
      // Build query string
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter) params.status_filter = statusFilter;
      if (minMatch > 0) params.min_match = minMatch;
      if (minExp > 0) params.min_experience = minExp;

      const response = await api.get(`/candidates/job/${id}`, { params });
      setCandidates(response.data);
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    } finally {
      setCandidatesLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchJobDetails();
      await fetchCandidates();
      setLoading(false);
    };
    loadData();
  }, [id]);

  // Trigger candidates refetch when filters change
  useEffect(() => {
    if (job) {
      const delayDebounceFn = setTimeout(() => {
        fetchCandidates();
      }, 300); // Debounce search
      return () => clearTimeout(delayDebounceFn);
    }
  }, [search, statusFilter, minMatch, minExp]);

  // Dropzone Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (files: File[]) => {
    const validFiles: UploadFileState[] = [];
    const maxLimit = 10 * 1024 * 1024; // 10MB
    
    files.forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let fileError = '';
      
      if (ext !== 'pdf' && ext !== 'docx') {
        fileError = 'Invalid file type. Only PDF and DOCX files are allowed.';
      } else if (file.size > maxLimit) {
        fileError = 'File exceeds the maximum size limit of 10MB.';
      }
      
      validFiles.push({
        file,
        progress: fileError ? 0 : 0,
        status: fileError ? 'failed' : 'idle',
        error: fileError
      });
    });

    setUploadFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUploadSubmit = async () => {
    const filesToUpload = uploadFiles.filter(f => f.status === 'idle');
    if (filesToUpload.length === 0) return;

    setUploading(true);
    
    const formData = new FormData();
    formData.append('job_id', id || '');
    filesToUpload.forEach(f => {
      formData.append('files', f.file);
    });
    
    // Mark upload status
    setUploadFiles(prev => 
      prev.map(f => f.status === 'idle' ? { ...f, status: 'uploading', progress: 30 } : f)
    );

    try {
      // Direct call to endpoint
      await api.post('/candidates/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || progressEvent.loaded;
          const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
          setUploadFiles(prev => 
            prev.map(f => f.status === 'uploading' ? { ...f, progress: Math.min(percentCompleted, 95) } : f)
          );
        }
      });
      
      // Mark success
      setUploadFiles(prev => 
        prev.map(f => f.status === 'uploading' ? { ...f, status: 'success', progress: 100 } : f)
      );
      
      setTimeout(() => {
        setUploadFiles([]);
        setActiveTab('candidates');
        fetchCandidates();
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setUploadFiles(prev => 
        prev.map(f => f.status === 'uploading' ? { 
          ...f, 
          status: 'failed', 
          error: err.response?.data?.detail || 'Upload or parsing failed.' 
        } : f)
      );
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (candidateId: string, newStatus: string) => {
    try {
      await api.put(`/candidates/${candidateId}/status`, { status: newStatus });
      // Update locally
      setCandidates(prev => 
        prev.map(c => c.id === candidateId ? { ...c, status: newStatus as any } : c)
      );
    } catch (err) {
      console.error('Failed to update candidate status:', err);
    }
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

  if (!job) {
    return (
      <div className="text-center p-12 glassmorphism rounded-2xl max-w-lg mx-auto">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-ink">Job Requirement Not Found</h3>
        <p className="text-ink/65 mt-2">The posting you are looking for does not exist or was deleted.</p>
        <Link to="/jobs" className="mt-6 inline-flex items-center text-sm font-semibold text-accent gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div>
        <Link
          to="/jobs"
          className="inline-flex items-center text-xs font-semibold text-ink/65 hover:text-ink gap-1 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to vacancy requirements
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Job Info Banner */}
      <div className="glassmorphism rounded-2xl p-8 md:p-10 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent/5 blur-3xl"></div>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <span className="inline-flex items-center rounded bg-accentSoft/20 border border-accentSoft/30 px-2.5 py-0.5 text-xs font-semibold text-accent">
              {job.department}
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-ink mt-2">{job.title}</h1>
            <p className="text-sm font-semibold text-ink/65 mt-0.5">{job.company_name}</p>
          </div>
          
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-accent px-3.5 py-2 rounded-xl border border-accent/20 text-white font-bold shadow-sm">
              <strong>Experience:</strong> {job.minimum_experience} yr+
            </span>
            <span className="bg-accentSoft px-3.5 py-2 rounded-xl border border-accentSoft/30 text-ink font-bold shadow-sm">
              <strong>Education:</strong> {job.education}
            </span>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Required Skills</h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {job.required_skills.map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center rounded-lg bg-accent text-white border border-accent/20 px-3 py-1.5 text-xs font-bold shadow-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('candidates')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
            activeTab === 'candidates'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-ink/65 hover:text-ink'
          }`}
        >
          Candidates ({candidates.length})
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
            activeTab === 'upload'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-ink/65 hover:text-ink'
          }`}
        >
          Upload Resumes
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'candidates' ? (
        <div className="space-y-6">
          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidates by name..."
                className="w-full pl-10 pr-4 py-2 bg-surface border border-slate-200 rounded-xl text-sm text-ink placeholder-slate-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-slate-200 rounded-xl text-sm text-ink focus:outline-none focus:border-accent"
              >
                <option value="">All Statuses</option>
                <option value="New">New</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Rejected">Rejected</option>
                <option value="Interview Scheduled">Interview Scheduled</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <input
                type="number"
                value={minMatch || ''}
                onChange={(e) => setMinMatch(Number(e.target.value))}
                placeholder="Min Match %"
                min="0"
                max="100"
                className="w-full px-3 py-2 bg-surface border border-slate-200 rounded-xl text-sm text-ink placeholder-slate-400 focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <input
                type="number"
                value={minExp || ''}
                onChange={(e) => setMinExp(Number(e.target.value))}
                placeholder="Min Experience (yrs)"
                min="0"
                className="w-full px-3 py-2 bg-surface border border-slate-200 rounded-xl text-sm text-ink placeholder-slate-400 focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Candidates List/Grid */}
          {candidatesLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-accent border-t-transparent"></div>
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-12 glassmorphism rounded-2xl">
              <SlidersHorizontal className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-ink">No candidates match filters</h4>
              <p className="text-xs text-ink/65 mt-1">Try resetting search keywords or file parameters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  className="glassmorphism rounded-2xl p-8 md:p-9 hover:border-accentSoft transition-all duration-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-lg md:text-xl font-bold text-ink hover:text-accent transition-colors">
                        <Link to={`/candidates/${cand.id}`}>{cand.name}</Link>
                      </h3>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${getStatusColor(cand.status)}`}>
                        {cand.status}
                      </span>
                      {cand.match_percentage >= 70 && (
                        <span className="inline-flex items-center text-xs text-accent font-bold gap-0.5">
                          <Sparkles className="h-3 w-3 animate-pulse" /> Top Choice
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm font-semibold text-ink/65">{cand.email} · {cand.phone}</p>
                    <p className="text-sm font-semibold text-ink/65">Exp: {cand.experience_years} years · {cand.education}</p>
                    
                    {/* Matching / Missing Skills */}
                    <div className="pt-3 flex flex-wrap gap-2 items-center">
                      <span className="text-xs font-bold text-ink/80 uppercase mr-1">Matching:</span>
                      {cand.matching_skills.slice(0, 5).map((s, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded bg-emerald-600 text-white border border-emerald-700 font-bold shadow-sm">
                          {s}
                        </span>
                      ))}
                      {cand.matching_skills.length > 5 && (
                        <span className="text-xs font-bold text-ink/65">+{cand.matching_skills.length - 5}</span>
                      )}
                      
                      {cand.missing_skills.length > 0 && (
                        <>
                          <span className="text-xs font-bold text-ink/80 uppercase ml-2 mr-1">Missing:</span>
                          {cand.missing_skills.slice(0, 3).map((s, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded bg-red-600 text-white border border-red-700 font-bold shadow-sm">
                              {s}
                            </span>
                          ))}
                          {cand.missing_skills.length > 3 && (
                            <span className="text-xs font-bold text-ink/65">+{cand.missing_skills.length - 3}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full lg:w-auto gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold text-ink/65 uppercase tracking-wider">Skill Match</span>
                      <span className={`text-xl font-extrabold ${
                        cand.match_percentage >= 70 ? 'text-emerald-600' : cand.match_percentage >= 40 ? 'text-amber-600' : 'text-red-600'
                      }`}>{cand.match_percentage}%</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Inline Status Update Dropdown */}
                      <select
                        value={cand.status}
                        onChange={(e) => handleStatusChange(cand.id, e.target.value)}
                        className="bg-surface border border-slate-200 text-xs rounded-lg px-2 py-1.5 text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="New">New</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Interview Scheduled">Interview Scheduled</option>
                        <option value="Completed">Completed</option>
                        <option value="Rejected">Rejected</option>
                      </select>

                      <Link
                        to={`/candidates/${cand.id}`}
                        className="p-1.5 rounded-lg bg-accentSoft/20 hover:bg-accentSoft/35 text-ink hover:text-accent transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Upload Tab Dropzone */
        <div className="max-w-2xl mx-auto space-y-6">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="glassmorphism border-2 border-dashed border-slate-200 hover:border-accent/50 bg-accentSoft/5 hover:bg-accentSoft/15 transition-all rounded-2xl p-10 text-center cursor-pointer flex flex-col items-center justify-center min-h-[220px]"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept=".pdf,.docx"
              className="hidden"
            />
            
            <div className="p-3 bg-accentSoft/20 rounded-xl text-accent border border-accentSoft/30 mb-4">
              <Upload className="h-6 w-6" />
            </div>
            
            <h3 className="text-base font-bold text-ink">Drag & drop resume files</h3>
            <p className="text-xs text-ink/65 mt-1">Supports PDF or DOCX files up to 10MB each.</p>
            <button
              type="button"
              className="mt-4 px-4 py-2 bg-accentSoft/20 text-ink border border-accentSoft/30 rounded-lg text-xs font-semibold hover:bg-accentSoft/35 transition-colors"
            >
              Browse files
            </button>
          </div>

          {/* Selected Files & Progress */}
          {uploadFiles.length > 0 && (
            <div className="glassmorphism rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-ink/65 uppercase tracking-wider">Selected Files</h4>
              
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {uploadFiles.map((fileState, index) => (
                  <div key={index} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-medium text-ink truncate max-w-[280px]">
                          {fileState.file.name}
                        </span>
                        <span className="text-[10px] text-ink/65">
                          ({(fileState.file.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      {fileState.status === 'uploading' && (
                        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-accent h-full transition-all duration-300"
                            style={{ width: `${fileState.progress}%` }}
                          ></div>
                        </div>
                      )}
                      
                      {fileState.error && (
                        <p className="text-[10px] text-red-600 font-medium mt-1">{fileState.error}</p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {fileState.status === 'success' && (
                        <span className="p-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                      {fileState.status === 'failed' && (
                        <span className="p-1 rounded-full bg-red-50 text-red-600 border border-red-200">
                          <AlertTriangle className="h-3 w-3" />
                        </span>
                      )}
                      
                      <button
                        onClick={() => removeFile(index)}
                        disabled={uploading}
                        className="text-ink/65 hover:text-ink p-1 hover:bg-accentSoft/20 rounded transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => setUploadFiles([])}
                  disabled={uploading}
                  className="px-4 py-2 text-xs font-semibold text-ink/65 hover:text-ink disabled:opacity-50"
                >
                  Clear all
                </button>
                <button
                  onClick={handleUploadSubmit}
                  disabled={uploading || uploadFiles.some(f => f.status === 'failed' && f.error)}
                  className="px-5 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                >
                  {uploading ? 'Processing & Extracting...' : 'Extract & Parse Resumes'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JobDetail;
