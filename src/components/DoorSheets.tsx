import { useEffect, useRef, useState } from 'react';
import { Ban, Clock, DoorClosed, DoorOpen, StickyNote, X } from 'lucide-react';
import type { Door } from '../lib/addresses';
import type { DoorLog } from '../lib/store';
import { STATUS } from '../lib/status';
import { Chip } from './ui';

const sheet = 'pop absolute left-3 right-3 bottom-3 z-10 rounded-[16px] bg-white border-[4px] border-ink p-4 shadow-[0_6px_0_#0A0A0A]';
export const doorTitle = (d: Door) => `${d.number} ${d.street}`.trim() || 'House (finding address…)';

export function QuickMenu({ door, log, onPitch, onNoAnswer, onNotInterested, onClose }: {
  door: Door; log?: DoorLog; onPitch: () => void; onNoAnswer: () => void; onNotInterested: () => void; onClose: () => void;
}) {
  const s = STATUS[log?.status ?? 'none'];
  const big = 'min-h-[92px] rounded-[12px] border-[3px] border-ink font-display font-extrabold uppercase text-[26px] leading-none flex flex-col items-center justify-center gap-1 active:translate-y-[2px]';
  return (
    <div className={sheet}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="font-display font-extrabold text-[30px] leading-none uppercase truncate">{doorTitle(door)}</div>
          <div className="text-[16px] mt-1 flex items-center gap-2 flex-wrap">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-ink" style={{ background: s.bg }} />
            {s.label}{log?.back ? ` · back ${log.back}` : ''}{log?.note ? ` · “${log.note}”` : ''}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="w-14 h-14 shrink-0 grid place-items-center rounded-[10px] border-[3px] border-ink"><X size={28} strokeWidth={3} /></button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <button type="button" onClick={onPitch} className={`${big} bg-go text-white`}><DoorOpen size={30} strokeWidth={2.5} /> Pitching</button>
        <button type="button" onClick={onNoAnswer} className={`${big} bg-na text-ink`}><DoorClosed size={30} strokeWidth={2.5} /> No Answer</button>
        <button type="button" onClick={onNotInterested} className={`${big} bg-brand text-white`}><Ban size={30} strokeWidth={2.5} /> Not Interested</button>
      </div>
    </div>
  );
}

const BACK_TIMES = ['This evening', 'Tomorrow 6pm', 'Saturday 11am', 'In 2 weeks'];

export function NoAnswerSheet({ door, log, onSave, onClose }: {
  door: Door; log?: DoorLog; onSave: (back: string, note: string) => void; onClose: () => void;
}) {
  const [back, setBack] = useState('');
  const [note, setNote] = useState(log?.note ?? '');
  const noteRef = useRef<HTMLInputElement>(null);
  useEffect(() => noteRef.current?.focus({ preventScroll: true }), []);
  return (
    <div className={sheet}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="font-display font-extrabold text-[30px] leading-none uppercase truncate">No answer · {doorTitle(door)}</div>
        <button type="button" onClick={onClose} aria-label="Back" className="w-14 h-14 shrink-0 grid place-items-center rounded-[10px] border-[3px] border-ink"><X size={28} strokeWidth={3} /></button>
      </div>
      <div className="text-[15px] font-bold uppercase tracking-[.08em] mb-1.5 flex items-center gap-2"><Clock size={18} /> Come back</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {BACK_TIMES.map((t) => <Chip key={t} active={back === t} onClick={() => setBack(back === t ? '' : t)} className="text-[18px] px-2">{t}</Chip>)}
      </div>
      <label htmlFor="qnote" className="text-[15px] font-bold uppercase tracking-[.08em] mb-1.5 flex items-center gap-2"><StickyNote size={18} /> Quick note</label>
      <div className="flex gap-3">
        <input id="qnote" ref={noteRef} className="field flex-1" value={note} maxLength={40} onChange={(e) => setNote(e.target.value)} placeholder="Red door, blue car" autoComplete="off" />
        <button type="button" onClick={() => onSave(back, note)}
          className={`min-h-[64px] px-6 rounded-[10px] border-[3px] border-ink font-display font-extrabold uppercase text-[24px] shrink-0 ${back ? 'bg-accent text-ink' : 'bg-na text-ink'}`}>
          {back ? 'Set callback' : 'Log it'}
        </button>
      </div>
    </div>
  );
}
