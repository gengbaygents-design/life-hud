import type {
  ComponentProps,
  HTMLAttributes,
  ReactElement,
  ReactNode,
} from 'react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

function cx(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

type ShellSectionProps = HTMLAttributes<HTMLElement>;

export function GlassCard({ className, ...props }: ShellSectionProps) {
  return <section className={cx('glass-card', className)} {...props} />;
}

export function HUDCard({ className, ...props }: ShellSectionProps) {
  return <section className={cx('hud-card', className)} {...props} />;
}

export function FocusCard({ className, ...props }: ShellSectionProps) {
  return <section className={cx('focus-card', className)} {...props} />;
}

export function QuietCard({ className, ...props }: ShellSectionProps) {
  return <section className={cx('quiet-card', className)} {...props} />;
}

export function AlertCard({ className, ...props }: ShellSectionProps) {
  return <section className={cx('alert-card', className)} {...props} />;
}

export function LoadingState({ label = '正在读取…' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="shell-skeleton">
      <span />
      <span />
      <span />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="section-header">
      {eyebrow && eyebrow !== 'LIFE HUD' ? (
        <p className="section-eyebrow">{eyebrow}</p>
      ) : null}
      <h1 className="section-title">{title}</h1>
      {description ? (
        <p className="section-description">{description}</p>
      ) : null}
      {children}
    </header>
  );
}

type StatusTone = 'quiet' | 'success' | 'warning';

export function StatusChip({
  tone = 'quiet',
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: StatusTone }) {
  return (
    <span className={cx('status-chip', className)} data-tone={tone} {...props}>
      {children}
    </span>
  );
}

export function ActionButton({
  className,
  type = 'button',
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button type={type} className={cx('action-button', className)} {...props} />
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <h3 className="empty-state-title">{title}</h3>
      {description ? (
        <p className="empty-state-description">{description}</p>
      ) : null}
    </div>
  );
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) return;
    const remember = () => {
      const element = document.activeElement;
      if (
        element instanceof HTMLElement &&
        element !== document.body &&
        !element.closest('[role="dialog"]')
      )
        returnFocus.current = element;
    };
    remember();
    document.addEventListener('focusin', remember);
    return () => document.removeEventListener('focusin', remember);
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="shell-modal"
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const element = returnFocus.current;
          if (element?.isConnected && element.getClientRects().length)
            element.focus();
          else document.getElementById('hud-main')?.focus();
        }}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description ?? title}</DialogDescription>
        {children}
        <DialogClose asChild>
          <Button type="button" className="action-button shell-modal-close">
            关闭
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export function ShellPopover({
  trigger,
  children,
}: {
  trigger: ReactElement;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="shell-popover">{children}</PopoverContent>
    </Popover>
  );
}
