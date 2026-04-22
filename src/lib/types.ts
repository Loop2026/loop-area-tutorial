// =====================================================
// Tipi condivisi app
// =====================================================

export type Role = "client" | "admin";
export type ProfileStatus = "active" | "disabled";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  role: Role;
  status: ProfileStatus;
  created_at: string;
  last_login_at: string | null;
  metadata: Record<string, unknown>;
}

export interface Chapter {
  time: number;      // secondi
  title: string;
}

export interface ResourceLink {
  type: "pdf" | "xlsx" | "link" | "checklist";
  title: string;
  url: string;
}

export interface ModuleRow {
  id: string;                 // 'm1'..'m6'
  order_index: number;
  title: string;
  description: string;
  duration: string;           // 'mm:ss'
  level: string;
  bunny_video_id: string | null;
  chapters: Chapter[];
  resources: ResourceLink[];
  published: boolean;
}

export interface ProgressRow {
  user_id: string;
  module_id: string;
  watched_pct: number;
  done: boolean;
  notes: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ChecklistItem {
  id: string;                 // 'c1'..'c5'
  order_index: number;
  title: string;
  subtitle: string;
}

export interface UserChecklistRow {
  user_id: string;
  item_id: string;
  done: boolean;
  updated_at: string;
  completed_at: string | null;
}

export type ModuleState = "locked" | "in_progress" | "completed" | "available";

export interface ModuleWithProgress extends ModuleRow {
  progress?: ProgressRow;
  state: ModuleState;
}
