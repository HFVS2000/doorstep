import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

export function SectionHead({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 border-b-[3px] border-ink pb-2">
      <h3 className="font-display font-extrabold uppercase text-[26px] tracking-wide leading-none">{children}</h3>
      {aside}
    </div>
  );
}

export function Label({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-[15px] font-bold uppercase tracking-[.08em] mb-1.5">
      <span>{children}</span>
      {hint && <span className="normal-case tracking-normal font-normal text-[15px] text-[#4A4E52]">{hint}</span>}
    </label>
  );
}

export function Chip({ active, onClick, children, className = '' }: { active: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`min-h-[60px] px-4 rounded-[10px] border-[3px] border-ink text-[20px] font-bold tnum transition-colors ${active ? 'bg-ink text-white' : 'bg-white text-ink active:bg-accent-soft'} ${className}`}>
      {children}
    </button>
  );
}

export function Tick({ id, on, onToggle, title, children, required, onRead }: {
  id: string; on: boolean; onToggle: () => void; title: ReactNode; children?: ReactNode; required?: boolean; onRead?: () => void;
}) {
  return (
    <div className={`rounded-[14px] border-[4px] border-ink flex items-stretch ${on ? 'bg-go-soft' : 'bg-white'}`}>
      <button id={id} type="button" role="checkbox" aria-checked={on} onClick={onToggle} className="flex-1 text-left p-4 flex items-start gap-4">
        <span className={`w-14 h-14 shrink-0 rounded-[10px] border-[4px] border-ink grid place-items-center ${on ? 'bg-go text-white' : 'bg-white'}`}>
          {on && <Check size={36} strokeWidth={4} />}
        </span>
        <span>
          <span className="font-bold text-[20px] leading-tight flex items-center gap-2 flex-wrap">
            {title}
            {required && !on && <span className="text-[13px] font-bold uppercase tracking-[.08em] bg-brand text-white rounded-[6px] px-2 py-0.5">Required</span>}
          </span>
          {children && <span className="block text-[16px] mt-1 leading-snug">{children}</span>}
        </span>
      </button>
      {onRead && (
        <button type="button" onClick={onRead} className="shrink-0 px-4 border-l-[4px] border-ink font-bold text-[18px] underline underline-offset-4 min-w-[92px]">Read</button>
      )}
    </div>
  );
}
