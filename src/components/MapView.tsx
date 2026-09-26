import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
type MLMap = maplibregl.Map;
type Marker = maplibregl.Marker;
import 'maplibre-gl/dist/maplibre-gl.css';
// Bundle MapLibre's web worker with Vite so it loads from our own assets.
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { Layers, LocateFixed, Minus, Plus } from 'lucide-react';
import type { Bounds, Door } from '../lib/addresses';
import type { DoorLog } from '../lib/store';
import { STATUS } from '../lib/status';
import { activeClient } from '../config/client';

// Street map: free OpenStreetMap vector tiles, no API key.
const STREET_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

// Satellite: Esri World Imagery with Esri's road and place-name overlays on top.
// Free to use with attribution; for heavy commercial use, create a free
// ArcGIS Location Platform account, or swap in Mapbox / Google satellite tiles.
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const raster = (path: string, maxzoom = 19) => ({
  type: 'raster' as const,
  tiles: [`${ESRI}/${path}/MapServer/tile/{z}/{y}/{x}`],
  tileSize: 256,
  maxzoom,
});
const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    imagery: { ...raster('World_Imagery'), attribution: 'Imagery © Esri, Maxar, Earthstar Geographics' },
    roads: raster('Reference/World_Transportation'),
    places: raster('Reference/World_Boundaries_and_Places'),
  },
  layers: [
    { id: 'imagery', type: 'raster', source: 'imagery' },
    { id: 'roads', type: 'raster', source: 'roads', paint: { 'raster-opacity': 0.85 } },
    { id: 'places', type: 'raster', source: 'places' },
  ],
};
export type MapLook = 'satellite' | 'street';
export const MIN_DOOR_ZOOM = 16;
maplibregl.setWorkerUrl(mapWorkerUrl);

const PIN_PATH = 'M28 68 C24 58 4 42 4 26 A24 24 0 1 1 52 26 C52 42 32 58 28 68Z';

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function paintPin(el: HTMLElement, door: Door, log: DoorLog | undefined, selected: boolean, pitching: boolean) {
  const s = STATUS[log?.status ?? 'none'];
  const ring = pitching ? activeClient.colours.accent : selected ? '#FFFFFF' : '';
  const big = selected || pitching;
  const w = big ? 58 : 50;
  const h = Math.round(w * 1.25);
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.zIndex = big ? '5' : '1';
  el.setAttribute('aria-label', `${`${door.number} ${door.street}`.trim() || 'House'}, ${s.label}`);
  const num = door.number ? esc(door.number.slice(0, 4)) : '';
  el.innerHTML = `
    <svg viewBox="0 0 56 70" width="${w}" height="${h}" style="position:absolute;inset:0;overflow:visible">
      ${ring ? `<circle cx="28" cy="26" r="31" fill="${ring}" stroke="#0A0A0A" stroke-width="3"/>` : ''}
      <path d="${PIN_PATH}" fill="${s.bg}" stroke="#0A0A0A" stroke-width="3.5" stroke-linejoin="round"/>
    </svg>
    <span style="position:absolute;left:0;right:0;top:0;height:${w * 0.93}px;display:grid;place-items:center;
      font:800 ${num.length > 2 ? 19 : big ? 27 : 24}px 'Barlow Condensed','Arial Narrow',sans-serif;color:${s.fg}">${num}</span>
    ${log?.status === 'cb' ? `<span style="position:absolute;top:-8px;right:-8px;width:26px;height:26px;border-radius:99px;background:#0A0A0A;color:${activeClient.colours.accent};border:2px solid #fff;display:grid;place-items:center;font:700 14px system-ui">⏱</span>` : ''}
  `;
}

interface Props {
  doors: Record<string, Door>;
  logs: Record<string, DoorLog>;
  selectedId: string | null;
  pitchId: string | null;
  hideControls: boolean;
  onPick: (id: string) => void;
  onNeedDoors: (b: Bounds) => void;
  onZoomChange: (z: number) => void;
  onAddDoor: (lng: number, lat: number) => void;
}

export default function MapView({ doors, logs, selectedId, pitchId, hideControls, onPick, onNeedDoors, onZoomChange, onAddDoor }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; el: HTMLButtonElement }>());
  const me = useRef<Marker | null>(null);
  const myPos = useRef<[number, number] | null>(null);
  const [zoom, setZoom] = useState(17);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const addRef = useRef(onAddDoor);
  addRef.current = onAddDoor;
  const [look, setLook] = useState<MapLook>(() => {
    try { return (localStorage.getItem('doorstep.look') as MapLook) || 'satellite'; } catch { return 'satellite'; }
  });

  // create the map once
  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({
      container: box.current,
      style: look === 'satellite' ? SATELLITE_STYLE : STREET_STYLE,
      center: activeClient.defaultCentre,
      zoom: 17,
      maxZoom: 20,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    m.touchZoomRotate.disableRotation();
    map.current = m;

    const report = () => {
      const z = m.getZoom();
      setZoom(z);
      onZoomChange(z);
      if (z >= MIN_DOOR_ZOOM) {
        const b = m.getBounds();
        onNeedDoors({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() });
      }
    };
    // with no signal, map tiles fail to load; the map keeps what it has, so don't flood the console
    m.on('error', (e) => { if (navigator.onLine) console.warn('[map]', e.error?.message ?? e); });
    m.on('load', report);
    m.on('moveend', report);
    // tapping the map itself (not a pin) drops a new pin on that house
    m.on('click', (e) => {
      if ((e.originalEvent.target as HTMLElement | null)?.closest?.('.door-pin')) return;
      if (m.getZoom() < MIN_DOOR_ZOOM - 0.5) return;
      addRef.current(e.lngLat.lng, e.lngLat.lat);
    });

    // live GPS position
    const dot = document.createElement('div');
    dot.className = 'me-dot';
    me.current = new maplibregl.Marker({ element: dot });
    let first = true;
    const watch = navigator.geolocation?.watchPosition(
      (p) => {
        const ll: [number, number] = [p.coords.longitude, p.coords.latitude];
        myPos.current = ll;
        setGpsError(null);
        me.current!.setLngLat(ll).addTo(m);
        if (first) {
          first = false;
          m.jumpTo({ center: ll, zoom: 17.5 });
        }
      },
      () => setGpsError('Location is off. Showing the default patch.'),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );

    return () => {
      if (watch != null) navigator.geolocation.clearWatch(watch);
      m.remove();
      map.current = null;
      markers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep door pins in step with data
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const live = markers.current;
    for (const door of Object.values(doors)) {
      let entry = live.get(door.id);
      if (!entry) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'door-pin';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          pickRef.current(door.id);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([door.lng, door.lat]).addTo(m);
        entry = { marker, el };
        live.set(door.id, entry);
      }
      paintPin(entry.el, door, logs[door.id], door.id === selectedId, door.id === pitchId);
    }
  }, [doors, logs, selectedId, pitchId]);

  // pins get too crowded when zoomed out, so hide them
  useEffect(() => {
    const hidden = zoom < MIN_DOOR_ZOOM - 0.5;
    markers.current.forEach(({ el }) => (el.style.visibility = hidden ? 'hidden' : 'visible'));
  }, [zoom, doors]);

  const switchLook = () => {
    const next: MapLook = look === 'satellite' ? 'street' : 'satellite';
    setLook(next);
    try { localStorage.setItem('doorstep.look', next); } catch { /* ignore */ }
    map.current?.setStyle(next === 'satellite' ? SATELLITE_STYLE : STREET_STYLE);
  };

  const zoomBy = (d: number) => map.current?.easeTo({ zoom: map.current.getZoom() + d, duration: 250 });
  const locate = () => {
    if (myPos.current) map.current?.easeTo({ center: myPos.current, zoom: Math.max(17, map.current.getZoom()) });
    else setGpsError('Waiting for GPS. Check location is allowed for this app.');
  };

  return (
    <>
      <div ref={box} className="absolute inset-0" />
      {gpsError && (
        <div className="absolute left-3 top-3 z-10 rounded-[10px] bg-ink text-white px-3 py-2 text-[15px] font-bold max-w-[70%]">{gpsError}</div>
      )}
      {!hideControls && (
        <div className="absolute right-3 bottom-8 z-10 flex flex-col gap-2">
          <button type="button" onClick={switchLook} aria-label={look === 'satellite' ? 'Show street map' : 'Show satellite'}
            className="w-16 h-16 rounded-[14px] bg-white border-[3px] border-ink flex flex-col items-center justify-center shadow-[0_4px_0_#0A0A0A] text-[12px] font-bold uppercase leading-none gap-1">
            <Layers size={24} strokeWidth={2.5} />{look === 'satellite' ? 'Map' : 'Aerial'}
          </button>
          <div className="flex flex-col rounded-[14px] bg-white border-[3px] border-ink overflow-hidden shadow-[0_4px_0_#0A0A0A]">
            <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1)} className="w-16 h-16 grid place-items-center active:bg-accent-soft"><Plus size={32} strokeWidth={3} /></button>
            <div className="h-[3px] bg-ink" />
            <button type="button" aria-label="Zoom out" onClick={() => zoomBy(-1)} className="w-16 h-16 grid place-items-center active:bg-accent-soft"><Minus size={32} strokeWidth={3} /></button>
          </div>
          <button type="button" aria-label="Centre on me" onClick={locate} className="w-16 h-16 rounded-[14px] bg-white border-[3px] border-ink grid place-items-center shadow-[0_4px_0_#0A0A0A] text-[#1D4ED8]">
            <LocateFixed size={30} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </>
  );
}
