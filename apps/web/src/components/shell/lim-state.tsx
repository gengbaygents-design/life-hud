import { createContext, useContext, useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useLocation } from '@tanstack/react-router';

export type LimPresentation = 'sheet' | 'fullscreen' | 'bridge';
export type LimSourceEntity = { type: string; id: string; label?: string };
export interface LimUIState {
  isOpen: boolean;
  presentation: LimPresentation;
  sourceRoute: string;
  sourceEntity: LimSourceEntity | null;
  conversationId: string | null;
}
type OpenOptions = {
  presentation?: Exclude<LimPresentation, 'bridge'>;
  sourceEntity?: LimSourceEntity | null;
  conversationId?: string | null;
};
interface LimContextValue {
  state: LimUIState;
  openLim: (options?: OpenOptions) => void;
  closeLim: () => void;
  setPresentation: (presentation: Exclude<LimPresentation, 'bridge'>) => void;
  restoreFocus: () => void;
  setConversationId: (id: string | null) => void;
  setPageEntity: (entity: LimSourceEntity | null) => void;
}
const LimContext = createContext<LimContextValue | null>(null);
export function LimProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const trigger = useRef<HTMLElement | null>(null);
  const pageEntity = useRef<LimSourceEntity | null>(null);
  const setPageEntity = useCallback((entity: LimSourceEntity | null) => { pageEntity.current = entity; }, []);
  const [state, setState] = useState<LimUIState>({
    isOpen: false, presentation: 'sheet', sourceRoute: '', sourceEntity: null, conversationId: null,
  });
  const openLim = (options: OpenOptions = {}) => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setState(previous => ({
      isOpen: true, presentation: options.presentation ?? 'sheet',
      sourceRoute: location.pathname + location.searchStr + (location.hash ? '#' + location.hash : ''),
      sourceEntity: options.sourceEntity === undefined ? pageEntity.current : options.sourceEntity,
      conversationId: options.conversationId === undefined ? previous.conversationId : options.conversationId,
    }));
  };
  const restoreFocus = () => {
    const element = trigger.current;
    if (element?.isConnected && element.getClientRects().length) element.focus();
    else document.getElementById('hud-main')?.focus();
  };
  return <LimContext.Provider value={{ state, openLim,
    closeLim: () => setState(previous => ({ ...previous, isOpen: false })),
    setPresentation: presentation => setState(previous => ({ ...previous, presentation })), restoreFocus,
    setConversationId: conversationId => setState(previous => ({ ...previous, conversationId })), setPageEntity,
  }}>{children}</LimContext.Provider>;
}
export function useLimSource(entity: LimSourceEntity | null) {
  const { setPageEntity } = useLim();
  const type=entity?.type,id=entity?.id,label=entity?.label;
  useEffect(() => {setPageEntity(type&&id?{type,id,label}:null);return()=>setPageEntity(null);},[setPageEntity,type,id,label]);
}
export function useLim() {
  const context = useContext(LimContext);
  if (!context) throw new Error('LimProvider is required');
  return context;
}
