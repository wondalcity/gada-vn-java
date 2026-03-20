import { create } from 'zustand';
import type { JobWithSite } from '@gada-vn/core';

interface JobState {
  selectedDate: string;
  jobs: JobWithSite[];
  setSelectedDate: (date: string) => void;
  setJobs: (jobs: JobWithSite[]) => void;
}

const today = new Date().toISOString().split('T')[0];

export const useJobStore = create<JobState>((set) => ({
  selectedDate: today,
  jobs: [],
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setJobs: (jobs) => set({ jobs }),
}));
