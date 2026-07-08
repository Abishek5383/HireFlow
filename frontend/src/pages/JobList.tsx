import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { Job } from '../types';
import { 
  Plus, 
  Briefcase, 
  Trash2, 
  Edit3, 
  Eye,
  X
} from 'lucide-react';

const JobList: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [experience, setExperience] = useState<number>(0);
  const [education, setEducation] = useState('');
  const [description, setDescription] = useState('');
  const [skillsInput, setSkillsInput] = useState('');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/jobs');
      setJobs(response.data);
    } catch (err: any) {
      setError('Failed to fetch job requirements.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const resetForm = () => {
    setTitle('');
    setCompany('');
    setDepartment('');
    setExperience(0);
    setEducation('');
    setDescription('');
    setSkillsInput('');
    setEditingJob(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (job: Job) => {
    setEditingJob(job);
    setTitle(job.title);
    setCompany(job.company_name);
    setDepartment(job.department);
    setExperience(job.minimum_experience);
    setEducation(job.education);
    setDescription(job.job_description);
    setSkillsInput(job.required_skills.join(', '));
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Parse comma separated skills
    const skills = skillsInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const jobData = {
      title,
      company_name: company,
      department,
      required_skills: skills,
      minimum_experience: Number(experience),
      education,
      job_description: description
    };

    try {
      if (editingJob) {
        await api.put(`/jobs/${editingJob.id}`, jobData);
      } else {
        await api.post('/jobs', jobData);
      }
      setModalOpen(false);
      resetForm();
      fetchJobs();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save job posting.');
      console.error(err);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job requirement? All candidates associated will remain but the job posting will be deleted.')) {
      return;
    }
    
    try {
      await api.delete(`/jobs/${jobId}`);
      fetchJobs();
    } catch (err) {
      setError('Failed to delete job.');
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Job Requirements</h1>
          <p className="text-ink/65 mt-1">Manage active vacancies, skills requirements, and candidate postings.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-accent-hover transition-all duration-200 active:scale-95 gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Job Requirement
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Main List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="glassmorphism rounded-2xl p-12 text-center max-w-lg mx-auto mt-8">
          <Briefcase className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-ink">No job postings found</h3>
          <p className="text-ink/65 mt-2 text-sm">Get started by creating your first job requirement profile.</p>
          <button
            onClick={handleOpenCreate}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            Create Job Requirement
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="glassmorphism rounded-2xl p-8 md:p-9 hover:shadow-xl hover:shadow-accent/10 hover:border-accentSoft transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="inline-flex items-center rounded-md bg-accentSoft/20 border border-accentSoft/30 px-2 py-1 text-xs font-semibold text-accent">
                    {job.department}
                  </span>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(job)}
                      title="Edit"
                      className="p-1 rounded bg-accentSoft/25 text-ink hover:text-accent transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      title="Delete"
                      className="p-1 rounded bg-accentSoft/25 text-ink hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="mt-3 text-lg font-bold text-ink group-hover:text-accent transition-colors">
                  {job.title}
                </h3>
                <p className="text-sm font-medium text-ink/65 mt-0.5">{job.company_name}</p>
                
                <p className="text-xs text-ink/65 mt-3 line-clamp-3">
                  {job.job_description}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {job.required_skills.slice(0, 4).map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded px-2.5 py-1 text-[10px] font-bold bg-accent text-white border border-accent/20 shadow-sm"
                    >
                      {skill}
                    </span>
                  ))}
                  {job.required_skills.length > 4 && (
                    <span className="inline-flex items-center rounded px-2 py-1 text-[10px] font-bold bg-accentSoft text-ink border border-accentSoft/35">
                      +{job.required_skills.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="inline-flex items-center rounded-lg bg-accentSoft/35 border border-accentSoft/50 px-2.5 py-1 text-[11px] font-bold text-ink">
                  Exp: {job.minimum_experience} yr+ · {job.education}
                </span>
                
                <Link
                  to={`/jobs/${job.id}`}
                  className="inline-flex items-center text-xs font-semibold text-accent hover:text-accent-hover hover:underline gap-1 transition-all"
                >
                  View candidates
                  <Eye className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-surface border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-ink">
                {editingJob ? 'Edit Job Requirement' : 'Create Job Requirement'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-ink/65 hover:text-ink rounded-lg p-1.5 hover:bg-accentSoft/20 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Python Developer"
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ink placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Google DeepMind"
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ink placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider">Department *</label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Engineering, Sales"
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ink placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider">Minimum Experience (Years) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={experience}
                    onChange={(e) => setExperience(Number(e.target.value))}
                    placeholder="e.g. 3"
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ink placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider">Required Education *</label>
                <input
                  type="text"
                  required
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="e.g. Bachelor's Degree in CS, Master's Degree"
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ink placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider">Required Skills * (Comma separated)</label>
                <input
                  type="text"
                  required
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="e.g. Python, FastAPI, MongoDB, React, Docker"
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ink placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider">Job Description *</label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter detailed job description, duties, and qualifications..."
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ink placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg bg-accentSoft/20 px-4 py-2 text-sm font-semibold text-ink hover:bg-accentSoft/35 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-all duration-200 active:scale-95"
                >
                  {editingJob ? 'Save Changes' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobList;
