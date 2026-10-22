export type Mode = 'EXECUTE' | 'ASSIST' | 'TALK';
export type Domain = 'QUEST' | 'STUDY' | 'STATUS' | 'GROWTH' | 'VOYAGE' | 'UI';
export type SourceRef = {
  type: 'TASK' | 'ASSIGNMENT' | 'COURSE' | 'LEARNING_RECORD' | 'STATUS_MOMENT';
  id: string;
};
export type ContextCandidate = {
  type: string;
  id: string;
  title?: string;
  version?: number;
  reason: string;
  [key: string]: unknown;
};
export type ContextPack = {
  asOf: string;
  timeZone: string;
  mode: Mode;
  domains: Domain[];
  current: SourceRef | null;
  focus?: SourceRef | null;
  candidates: ContextCandidate[];
  userHistory: string[];
};
export type ActionResult = {
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  createdEntities: { type: string; id: string }[];
  updatedEntities: { type: string; id: string }[];
  warnings: string[];
  undoToken: string | null;
};
export type LimTrace = {
  mode: Mode;
  intent: string;
  domains: Domain[];
  refs: SourceRef[];
  excluded: string[];
  proposedActions: string[];
  validation: string;
  risk: 'R0' | 'R1' | 'R2' | 'R3';
  execution: string;
};
