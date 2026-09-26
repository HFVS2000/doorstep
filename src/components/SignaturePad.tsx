import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent } from 'react';
import { Eraser } from 'lucide-react';

interface Props {
  onChange: (dataUrl: string | null) => void;
}

export default function SignaturePad({ onChange }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const inked = useRef(false);

  const size = useCallback(() => {
    const c = ref.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#0A0A0A';
    inked.current = false;
    onChange(null);
  }, [onChange]);

  useEffect(() => {
    size();
    window.addEventListener('resize', size);
    return () => window.removeEventListener('resize', size);
  }, [size]);

  const pt = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    ref.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pt(e);
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const p = pt(e);
    const ctx = ref.current!.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    inked.current = true;
  };
  const up = () => {
    if (drawing.current && inked.current) onChange(ref.current!.toDataURL('image/png'));
    drawing.current = false;
  };
  const clear = () => {
    const c = ref.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    inked.current = false;
    onChange(null);
  };

  return (
    <div className="relative">
      <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        aria-label="Signature pad. Sign with your finger."
        className="sig block w-full h-[190px] rounded-[12px] border-[3px] border-ink bg-white"
        style={{ backgroundImage: 'linear-gradient(transparent 138px, #0A0A0A 138px, #0A0A0A 140px, transparent 140px)' }} />
      <div className="pointer-events-none absolute left-5 top-[112px] font-display font-bold text-[26px] text-[#B8BCC0]">✕ Sign here</div>
      <button type="button" onClick={clear} className="absolute right-3 top-3 min-h-[52px] px-4 rounded-[10px] border-[3px] border-ink bg-white font-bold flex items-center gap-2 active:bg-accent-soft">
        <Eraser size={22} /> Clear
      </button>
    </div>
  );
}
