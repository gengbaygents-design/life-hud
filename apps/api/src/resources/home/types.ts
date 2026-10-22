export type SourceRef = {
  type: 'TASK' | 'ASSIGNMENT' | 'CLASS_SESSION';
  id: string;
  version: number;
};
export type AttentionItem = {
  type: 'TASK' | 'ASSIGNMENT' | 'CLASS';
  title: string;
  reason: string;
  sourceRef: SourceRef;
  state: string;
  suggestedAction: 'OPEN_TASK' | 'OPEN_COURSE' | 'SUBMIT_ASSIGNMENT';
  plannedStart: string | null;
  dueAt: string | null;
  endsAt: string | null;
  estimatedMinutes: number | null;
  courseId: string | null;
  projectTitle: string | null;
};
export type StatusSnapshot = {
  id: string;
  recordedAt: string;
  mood: string | null;
  customMood: string | null;
  energy: number | null;
  stress: number | null;
  focus: number | null;
};
export type WorkCandidate = AttentionItem & {
  importance: 'LOW' | 'NORMAL' | 'HIGH';
};
export type ClassCandidate = AttentionItem & {
  type: 'CLASS';
  plannedStart: string;
  endsAt: string;
};
export type HomeContext = {
  upcomingReminder?: {id:string;title:string;scheduledAt:string;priority:'P0'|'P1'} | null;
  work: WorkCandidate[];
  classes: ClassCandidate[];
  status: StatusSnapshot | null;
  voyage: { id: string; title: string; projectTitle: string | null } | null;
  alerts: { code: string; title: string; sourceRef: SourceRef | null }[];
};
export type HomeViewModel = {
  upcomingReminder: HomeContext['upcomingReminder'];
  asOf: string;
  timeZone: string;
  currentContext: AttentionItem | null;
  nextAction: AttentionItem | null;
  fallbackAction: AttentionItem | null;
  upcomingClass: AttentionItem | null;
  todayItems: AttentionItem[];
  statusSnapshot: StatusSnapshot | null;
  voyageSnapshot: HomeContext['voyage'];
  alerts: HomeContext['alerts'];
  emptyMessage: string | null;
  nextRefreshAt: string;
};
