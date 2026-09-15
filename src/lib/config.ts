const envDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
const githubPagesMode = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');

export const DEMO_MODE = envDemoMode || githubPagesMode;

export const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000/api';
