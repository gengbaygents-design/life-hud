import { useRef } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { ActionButton } from './primitives';
import { LimConversation } from '@/components/lim/lim-conversation';
import { useLim } from './lim-state';

export function LimOverlay() {
  const { state, closeLim, setPresentation, restoreFocus } = useLim();
  const closeRef = useRef<HTMLButtonElement>(null);
  const fullscreen = state.presentation === 'fullscreen';
  return (
    <Sheet
      open={state.isOpen}
      onOpenChange={(open) => {
        if (!open) closeLim();
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="lim-panel"
        data-presentation={state.presentation}
        data-source-route={state.sourceRoute}
        data-source-entity={state.sourceEntity?.id ?? ''}
        data-conversation-id={state.conversationId ?? ''}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          closeRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
      >
        <div className="lim-panel-header">
          <div>
            <p className="card-kicker">与你同行</p>
            <SheetTitle>Lim</SheetTitle>
          </div>
          <ActionButton
            ref={closeRef}
            variant="ghost"
            aria-label="关闭"
            onClick={closeLim}
          >
            <X aria-hidden="true" size={18} />
          </ActionButton>
        </div>
        <SheetDescription>留在当下，也可以换个角度看看。</SheetDescription>
        <p className="lim-source-label">
          {routeLabel(state.sourceRoute)}
          {state.sourceEntity?.label ? ' · ' + state.sourceEntity.label : ''}
        </p>
        {state.isOpen && <LimConversation />}
        <div className="lim-panel-actions">
          <ActionButton
            variant="outline"
            onClick={() => setPresentation(fullscreen ? 'sheet' : 'fullscreen')}
          >
            {fullscreen ? (
              <Minimize2 aria-hidden="true" size={16} />
            ) : (
              <Maximize2 aria-hidden="true" size={16} />
            )}
            {fullscreen ? '收起为面板' : '展开全屏'}
          </ActionButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
function routeLabel(route: string) {
  const path = route.split(/[?#]/)[0];
  if (path === '/' || path === '/app' || path === '/app/') return 'HOME';
  if (path.startsWith('/app/quest')) return 'QUEST';
  if (path.startsWith('/app/study')) return 'STUDY';
  return (
    'MORE / ' +
    (path.split('/').filter(Boolean).at(-1)?.toUpperCase() ?? 'LIFE HUD')
  );
}
