/**
 * AUTO-GENERATED — DO NOT EDIT.
 * This is the shared API contract for this app, regenerated from the plan on
 * every build. Both the frontend (@/contract) and the backend (./contract)
 * import these types so the request/response shapes can never drift.
 */


// ── feature: auth — Sign in & Accounts ──

export interface User {
  /** Unique user identifier */
  id: string;
  /** User email address */
  email: string;
  /** Bcrypt-hashed password */
  passwordHash: string;
  /** User's chosen display name */
  displayName?: string;
  /** Profile avatar URL */
  avatarUrl?: string | null;
  /** Short personal bio */
  bio?: string | null;
  /** ISO timestamp of account creation */
  createdAt: string;
}

// ── feature: wellness-tracker — Personal Self-Care Tracker ──

export interface WellnessLog {
  /** Unique log entry ID */
  id: string;
  /** Owner user ID */
  userId: string;
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Daily mood rating */
  mood?: 'great' | 'good' | 'okay' | 'low' | 'rough';
  /** Free-text wellness diary entry */
  diaryEntry?: string | null;
  /** Array of completed habit IDs for that day */
  habits: string[];
  /** ISO timestamp when entry was created */
  createdAt: string;
  /** ISO timestamp when entry was last updated */
  updatedAt: string;
}

export interface Habit {
  /** Unique habit ID */
  id: string;
  /** Owner user ID */
  userId: string;
  /** Habit name (e.g. Drink water, Meditate) */
  label: string;
  /** Emoji or icon string for the habit */
  icon?: string | null;
  /** Optional color hex for the habit chip */
  color?: string | null;
  /** ISO timestamp when habit was created */
  createdAt: string;
}

// ── feature: spots-map — My Private Spots Map ──

export interface Spot {
  /** Unique spot ID */
  id: string;
  /** Owner user ID */
  userId: string;
  /** Name of the spot */
  name: string;
  /** Personal notes about this place */
  notes?: string | null;
  /** Vibe tag for the spot */
  vibe?: 'calm' | 'cozy' | 'energizing' | 'social' | 'nature' | 'focus';
  /** Latitude of the spot */
  lat: number;
  /** Longitude of the spot */
  lng: number;
  /** Optional readable address */
  address?: string | null;
  /** Emoji marker for the map pin */
  emoji?: string | null;
  /** ISO timestamp when spot was added */
  createdAt: string;
}

// ── feature: mindfulness — Mindfulness Timer & Resource Library ──

export interface MindfulnessResource {
  /** Unique resource ID */
  id: string;
  /** Resource title */
  title: string;
  /** Type of resource */
  type: 'playlist' | 'guide' | 'breathing' | 'meditation';
  /** Short description */
  description?: string | null;
  /** External link to resource */
  url?: string | null;
  /** Duration in minutes if applicable */
  durationMinutes?: number | null;
  /** Searchable tags */
  tags: string[];
  /** ISO timestamp */
  createdAt: string;
}

export interface MindfulnessSession {
  /** Unique session ID */
  id: string;
  /** Owner user ID */
  userId: string;
  /** Length of the session in seconds */
  durationSeconds: number;
  /** Free timer or guided resource session */
  type: 'timer' | 'guided';
  /** Linked resource if guided */
  resourceId?: string | null;
  /** Personal reflection notes after session */
  notes?: string | null;
  /** ISO timestamp when session was completed */
  completedAt: string;
}

export interface SavedResource {
  /** Unique saved record ID */
  id: string;
  /** Owner user ID */
  userId: string;
  /** The saved resource's ID */
  resourceId: string;
  /** ISO timestamp when resource was saved */
  savedAt: string;
}

// ── feature: contact — Contact & Support Space ──

export interface ContactMessage {
  id: string;
  userId?: string | null;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

export interface ApiContract {
  "auth-signup": { method: "POST"; path: "/api/auth/signup"; request: { email: string; password: string; displayName?: string }; response: { token: string; user: User } };
  "auth-login": { method: "POST"; path: "/api/auth/login"; request: { email: string; password: string }; response: { token: string; user: User } };
  "auth-me": { method: "GET"; path: "/api/auth/me"; request: void; response: User };
  "auth-update-profile": { method: "PATCH"; path: "/api/auth/me"; request: { displayName?: string; bio?: string | null; avatarUrl?: string | null }; response: User };
  "list-wellness-logs": { method: "GET"; path: "/api/wellness/logs"; request: void; response: WellnessLog[] };
  "get-wellness-log": { method: "GET"; path: "/api/wellness/logs/:date"; request: void; response: WellnessLog };
  "upsert-wellness-log": { method: "PUT"; path: "/api/wellness/logs/:date"; request: { mood?: 'great' | 'good' | 'okay' | 'low' | 'rough'; diaryEntry?: string | null; habits?: string[] }; response: WellnessLog };
  "list-habits": { method: "GET"; path: "/api/habits"; request: void; response: Habit[] };
  "create-habit": { method: "POST"; path: "/api/habits"; request: Omit<Habit, 'id' | 'userId' | 'createdAt'>; response: Habit };
  "delete-habit": { method: "DELETE"; path: "/api/habits/:id"; request: void; response: void };
  "list-spots": { method: "GET"; path: "/api/spots"; request: void; response: Spot[] };
  "create-spot": { method: "POST"; path: "/api/spots"; request: Omit<Spot, 'id' | 'userId' | 'createdAt'>; response: Spot };
  "update-spot": { method: "PATCH"; path: "/api/spots/:id"; request: { name?: string; notes?: string | null; vibe?: 'calm' | 'cozy' | 'energizing' | 'social' | 'nature' | 'focus'; emoji?: string | null; address?: string | null }; response: Spot };
  "delete-spot": { method: "DELETE"; path: "/api/spots/:id"; request: void; response: void };
  "list-resources": { method: "GET"; path: "/api/mindfulness/resources"; request: void; response: MindfulnessResource[] };
  "list-sessions": { method: "GET"; path: "/api/mindfulness/sessions"; request: void; response: MindfulnessSession[] };
  "log-session": { method: "POST"; path: "/api/mindfulness/sessions"; request: Omit<MindfulnessSession, 'id' | 'userId' | 'completedAt'>; response: MindfulnessSession };
  "list-saved-resources": { method: "GET"; path: "/api/mindfulness/saved"; request: void; response: SavedResource[] };
  "save-resource": { method: "POST"; path: "/api/mindfulness/saved"; request: { resourceId: string }; response: SavedResource };
  "unsave-resource": { method: "DELETE"; path: "/api/mindfulness/saved/:resourceId"; request: void; response: void };
  "send-contact-message": { method: "POST"; path: "/api/contact"; request: { name: string, email: string, message: string }; response: { success: boolean } };
  "get-contact-messages": { method: "GET"; path: "/api/contact/messages"; request: void; response: ContactMessage[] };
}

export const API_ROUTES = {
  "auth-signup": { method: "POST", path: "/api/auth/signup" },
  "auth-login": { method: "POST", path: "/api/auth/login" },
  "auth-me": { method: "GET", path: "/api/auth/me" },
  "auth-update-profile": { method: "PATCH", path: "/api/auth/me" },
  "list-wellness-logs": { method: "GET", path: "/api/wellness/logs" },
  "get-wellness-log": { method: "GET", path: "/api/wellness/logs/:date" },
  "upsert-wellness-log": { method: "PUT", path: "/api/wellness/logs/:date" },
  "list-habits": { method: "GET", path: "/api/habits" },
  "create-habit": { method: "POST", path: "/api/habits" },
  "delete-habit": { method: "DELETE", path: "/api/habits/:id" },
  "list-spots": { method: "GET", path: "/api/spots" },
  "create-spot": { method: "POST", path: "/api/spots" },
  "update-spot": { method: "PATCH", path: "/api/spots/:id" },
  "delete-spot": { method: "DELETE", path: "/api/spots/:id" },
  "list-resources": { method: "GET", path: "/api/mindfulness/resources" },
  "list-sessions": { method: "GET", path: "/api/mindfulness/sessions" },
  "log-session": { method: "POST", path: "/api/mindfulness/sessions" },
  "list-saved-resources": { method: "GET", path: "/api/mindfulness/saved" },
  "save-resource": { method: "POST", path: "/api/mindfulness/saved" },
  "unsave-resource": { method: "DELETE", path: "/api/mindfulness/saved/:resourceId" },
  "send-contact-message": { method: "POST", path: "/api/contact" },
  "get-contact-messages": { method: "GET", path: "/api/contact/messages" },
} as const;
