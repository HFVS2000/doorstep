import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck, CloudUpload, LoaderCircle, Undo2, Wifi, WifiOff, ZoomIn } from 'lucide-react';
import { activeClient } from './config/client';
import { fetchDoors, type Bounds } from './lib/addresses';
import { useDoorstepStore, type DoorStatus } from './lib/store';
import { STATUS } from './lib/status';
import MapView, { MIN_DOOR_ZOOM } from './components/MapView';
import { NoAnswerSheet, QuickMenu, doorTitle } from './components/DoorSheets';
import PitchPanel, { blankForm, type SignupForm } from './components/PitchPanel';

type Toast = { text: string; sub?: string; tone: 'red' | 'yel' | 'grey' | 'green' | 'ink'; undo?: () => void };
const toneCls: Record<Toast['tone'], string> = {
  red: 'bg-brand text-white', yel: 'bg-accent text-ink', grey: 'bg-na text-ink', green: 'bg-go text-white', ink: 'bg-ink text-white',
};

const contains = (outer: Bounds, inner: Bounds) =>
  outer.south <= inner.south && outer.west <= inner.west && outer.north >= inner.north && outer.east >= inner.east;
const grow = (b: Bounds, f: number): Bounds => {
  const dy = (b.north - b.south) * f, dx = (b.east - b.west) * f;
  return { south: b.south - dy, north: b.north + dy, west: b.west - dx, east: b.east + dx };
};

export default function App() {
  const store = useDoorstepStore();
  const { doors, logs, logDoor, online } = store;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | 'menu' | 'na'>(null);
  const [pitchId, setPitchId] = useState<string | null>(null);
  const [form, setForm] = useState<SignupForm | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [loadingDoors, setLoadingDoors] = useState(false);
  const [zoom, setZoom] = useState(17);
  const toastTimer = useRef<number>();
  const loaded = useRef<Bounds[]>([]);
  const inflight = useRef<AbortController | null>(null);

  const showToast = useCallback((t: Toast) => {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(null), t.undo ? 5000 : 3200);
  }, []);

  // load real addresses for whatever part of the map is on screen
  const needDoors = useCallback(async (b: Bounds) => {
    if (loaded.current.some((l) => contains(l, b))) return;
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    const area = grow(b, 0.3);
    setLoadingDoors(true);
    try {
      const list = await fetchDoors(area, ctrl.signal);
      loaded.current.push(area);
      store.addDoors(list);
      if (!list.length) showToast({ text: 'No house numbers mapped here yet', sub: 'Try the next street', tone: 'ink' });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') showToast({ text: 'Couldn’t load addresses', sub: 'Check signal and move the map to retry', tone: 'ink' });
    } finally {
      if (inflight.current === ctrl) setLoadingDoors(false);
    }
  }, [store.addDoors, showToast]);

  // send anything waiting as soon as there is signal
  const { outbox, flush, syncing } = store;
  useEffect(() => {
    if (!online || syncing || !outbox.length) return;
    flush().then((signups) => {
      if (signups) showToast({ text: `${signups} sign-up${signups > 1 ? 's' : ''} sent to the office`, sub: 'Signal is back', tone: 'green' });
    });
  }, [online, outbox.length, syncing, flush, showToast]);

  const counts = useMemo(() => {
    const c: Record<DoorStatus, number> = { signed: 0, ni: 0, na: 0, cb: 0, none: 0 };
    Object.values(logs).forEach((l) => c[l.status]++);
    return c;
  }, [logs]);

  const selected = selectedId ? doors[selectedId] : null;
  const pitchDoor = pitchId ? doors[pitchId] : null;
  const savedMsg = online ? 'Saved to cloud' : 'Saved on tablet';

  const pick = (id: string) => { setSelectedId(id); setSheet('menu'); };
  const closeSheet = () => { setSheet(null); setSelectedId(null); };

  const notInterested = () => {
    if (!selected) return;
    const prev = logs[selected.id] ?? null;
    logDoor(selected.id, { status: 'ni' });
    closeSheet();
    showToast({
      text: `${doorTitle(selected)} · Not interested`, sub: savedMsg, tone: 'red',
      undo: () => { logDoor(selected.id, prev && { status: prev.status, note: prev.note, back: prev.back }); setToast(null); },
    });
  };
  const saveNoAnswer = (back: string, note: string) => {
    if (!selected) return;
    logDoor(selected.id, { status: back ? 'cb' : 'na', back, note });
    closeSheet();
    showToast({ text: `${doorTitle(selected)} · ${back ? `Callback ${back.toLowerCase()}` : 'No answer'}`, sub: savedMsg, tone: back ? 'yel' : 'grey' });
  };
  const startPitch = () => {
    if (!selected) return;
    setPitchId(selected.id);
    setForm(blankForm(selected));
    closeSheet();
  };
  const closePanel = () => { setPitchId(null); setForm(null); };

  const submitSignup = async (f: SignupForm, signature: string): Promise<'sent' | 'queued'> => {
    // NOTE: bank details and signature must be encrypted at rest and in transit before this goes live.
    store.enqueue('signup', { doorId: pitchId, form: f, signature });
    logDoor(pitchId!, { status: 'signed' });
    if (!online) return 'queued';
    await flush();
    return 'sent';
  };

  const panelOpen = !!(pitchDoor && form);

  return (
    <div className="min-h-full lg:h-full flex flex-col gap-3 px-4 py-3">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 shrink-0">
          {activeClient.logoUrl ? (
            <img src={activeClient.logoUrl} alt={activeClient.orgName} className="h-12 w-auto" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-brand border-[3px] border-accent grid place-items-center font-display font-extrabold text-white text-sm leading-none" aria-label="Logo placeholder">{activeClient.logoText}</div>
          )}
          <div className="leading-tight hidden sm:block">
            <div className="font-display font-extrabold text-[22px] tracking-wide text-white uppercase">{activeClient.appName}</div>
            <div className="text-[13px] text-accent font-bold uppercase tracking-[.12em]">{activeClient.orgName}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap tnum" aria-label="Today's doors">
          {([['signed', 'Signed'], ['cb', 'Callback'], ['na', 'No answer'], ['ni', 'Not int.']] as const).map(([k, l]) => (
            <div key={k} title={l} className="flex items-center gap-2 min-h-[48px] px-3 rounded-[10px] bg-[#1C1C1C] text-white">
              <span className="w-5 h-5 rounded-full border-2 border-white" style={{ background: STATUS[k].bg }} />
              <span className="font-display font-extrabold text-[26px] leading-none">{counts[k]}</span>
              <span className="text-[14px] font-bold uppercase tracking-[.06em] hidden 2xl:inline">{l}</span>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => store.setForcedOffline(!store.forcedOffline)} aria-pressed={!online}
          title="Tap to test offline mode"
          className={`min-h-[56px] px-4 rounded-[12px] border-[3px] flex items-center gap-2.5 font-bold text-[18px] ${online ? 'bg-white text-ink border-white' : 'bg-accent text-ink border-accent'}`}>
          {syncing ? <LoaderCircle size={26} className="animate-spin" /> : online ? <Wifi size={26} strokeWidth={2.5} /> : <WifiOff size={26} strokeWidth={2.5} />}
          <span className="leading-tight text-left">
            {syncing ? 'Sending…' : online ? (outbox.length ? `Online · ${outbox.length} to send` : 'Online · synced') : `Offline · ${outbox.length} saved on tablet`}
            <span className="block text-[12px] font-bold uppercase tracking-[.08em] opacity-70">{store.forcedOffline ? 'Test mode · tap to go online' : 'Tap to test offline'}</span>
          </span>
        </button>
      </header>

      <main className={`lg:flex-1 lg:min-h-0 grid gap-3 ${panelOpen ? 'grid-rows-[minmax(420px,55vh)_auto] lg:grid-rows-1 lg:grid-cols-[55fr_45fr]' : 'grid-cols-1 min-h-[70vh]'}`}>
        <section className="relative rounded-[18px] overflow-hidden border-[4px] border-white bg-[#EEF0EA] min-h-[420px]" aria-label="Territory map">
          <MapView doors={doors} logs={logs} selectedId={selectedId} pitchId={pitchId} hideControls={!!sheet}
            onPick={pick} onNeedDoors={needDoors} onZoomChange={setZoom} />

          <div className="absolute left-1/2 -translate-x-1/2 top-3 flex flex-col items-center gap-2 pointer-events-none">
            {zoom < MIN_DOOR_ZOOM && (
              <div className="rounded-[12px] bg-ink text-white px-4 py-2.5 font-bold text-[17px] flex items-center gap-2"><ZoomIn size={22} /> Zoom in to see doors</div>
            )}
            {loadingDoors && zoom >= MIN_DOOR_ZOOM && (
              <div className="rounded-[12px] bg-white border-[3px] border-ink px-4 py-2 font-bold text-[16px] flex items-center gap-2"><LoaderCircle size={20} className="animate-spin" /> Finding doors…</div>
            )}
          </div>

          {!sheet && (
            <div className="absolute left-3 bottom-8 rounded-[12px] bg-white border-[3px] border-ink px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 text-[15px] font-bold max-w-[calc(100%-110px)]">
              {(['signed', 'ni', 'na', 'cb', 'none'] as DoorStatus[]).map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <svg viewBox="0 0 56 70" width="16" height="20" aria-hidden="true"><path d="M28 68 C24 58 4 42 4 26 A24 24 0 1 1 52 26 C52 42 32 58 28 68Z" fill={STATUS[k].bg} stroke="#0A0A0A" strokeWidth="6" /></svg>
                  {STATUS[k].label}
                </span>
              ))}
            </div>
          )}

          {sheet === 'menu' && selected && (
            <QuickMenu door={selected} log={logs[selected.id]} onPitch={startPitch} onNoAnswer={() => setSheet('na')} onNotInterested={notInterested} onClose={closeSheet} />
          )}
          {sheet === 'na' && selected && <NoAnswerSheet door={selected} log={logs[selected.id]} onSave={saveNoAnswer} onClose={() => setSheet('menu')} />}

          {toast && (
            <div role="status" className={`pop absolute left-1/2 -translate-x-1/2 top-16 z-20 rounded-[14px] border-[3px] border-ink px-4 py-2.5 flex items-center gap-3 shadow-[0_5px_0_#0A0A0A] w-max max-w-[calc(100%-24px)] ${toneCls[toast.tone]}`}>
              <CircleCheck size={28} strokeWidth={2.5} className="shrink-0" />
              <div className="leading-tight">
                <div className="font-bold text-[18px]">{toast.text}</div>
                {toast.sub && <div className="text-[14px] font-bold uppercase tracking-[.08em] opacity-80 flex items-center gap-1">{online ? <CloudUpload size={14} /> : <WifiOff size={14} />} {toast.sub}</div>}
              </div>
              {toast.undo && (
                <button type="button" onClick={toast.undo} className="ml-2 min-h-[48px] px-3 rounded-[10px] bg-white text-ink border-[3px] border-ink font-bold flex items-center gap-1.5"><Undo2 size={20} /> Undo</button>
              )}
            </div>
          )}
        </section>

        {panelOpen && (
          <aside key={pitchId} className="slide-in rounded-[18px] overflow-hidden border-[4px] border-white h-[88vh] lg:h-auto lg:min-h-0" aria-label="Direct Debit sign-up">
            <PitchPanel door={pitchDoor!} form={form!} setForm={(fn) => setForm((f) => (f ? fn(f) : f))} online={online} onClose={closePanel} onSubmit={submitSignup} />
          </aside>
        )}
      </main>
    </div>
  );
}
