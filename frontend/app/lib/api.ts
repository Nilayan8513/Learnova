/**
 * Single source of truth for the backend API base URL.
 * Override at deploy time via NEXT_PUBLIC_API_URL env var.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
