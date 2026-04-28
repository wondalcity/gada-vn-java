import { create } from 'zustand';
import type { JobWithSite } from '@gada-vn/core';

interface JobState {
  jobs: JobWithSite[];
  setJobs: (jobs: JobWithSite[]) => void;
}

export const useJobStore = create<JobState>((set) => ({
  jobs: [],
  setJobs: (jobs) => set({ jobs }),
}));
