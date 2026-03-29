export interface User {
  id: number;
  name: string;
  roll_no: string | null;
  leetcode_handle: string | null;
  codeforces_handle: string | null;
  codechef_handle: string | null;
}

export interface Problem {
  id: number;
  platform: 'leetcode' | 'codeforces';
  problem_id: string;
  title: string;
  url: string;
  difficulty: string | null;
  assigned_date: string | null;
}

export type SolveStatusType = 'solved' | 'attempted' | 'unsolved';

export interface SolveStatus {
  id: number;
  user_id: number;
  problem_id: number;
  status: SolveStatusType;
  solved_at: string | null;
  updated_at: string;
}

export interface DashboardCell {
  userId: number;
  problemId: number;
  status: SolveStatusType;
}

export interface DashboardData {
  users: User[];
  problems: Problem[];
  grid: Record<string, SolveStatusType>; // key: `${userId}-${problemId}`
  lastSynced: string | null;
}
