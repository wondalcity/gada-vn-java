import { create } from 'zustand';
import type { JobCardItem } from '../components/jobs/JobCard';

interface JobState {
  jobs: JobCardItem[];
  setJobs: (jobs: JobCardItem[]) => void;
}

export const useJobStore = create<JobState>((set) => ({
  jobs: [],
  setJobs: (jobs) => set({ jobs }),
}));
