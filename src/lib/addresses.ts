// Houses for the area on screen, from OpenStreetMap via the Overpass API.
//
// We load every house-shaped building, not just the ones with a mapped house
// number, because UK house-number coverage in OpenStreetMap is patchy. Houses
// without a number get their address looked up when the canvasser taps them
// (see `lookupAddress`). For guaranteed full coverage in production, replace
// `fetchDoors` with a licensed source such as Ordnance Survey AddressBase or
// Ideal Postcodes; the rest of the app only depends on the `Door` shape.

export interface Door {
  id: string;
  number: string;
  street: string;
  postcode: string;
  town: string;
  lng: number;
  lat: number;
}

export type Bounds = { south: number; west: number; north: number; east: number };

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const HOUSE_TYPES = 'house|residential|detached|semidetached_house|terrace|bungalow|yes';
const NOT_HOMES = ['shop', 'amenity', 'office', 'tourism', 'leisure', 'craft', 'industrial'];

type OsmEl = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
  tags?: Record<string, string>;
};

async function overpass(query: string, signal?: AbortSignal): Promise<OsmEl[]> {
  let lastError: unknown;
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }), signal });
      if (!res.ok) throw new Error(`Address lookup failed (${res.status})`);
      return ((await res.json()) as { elements: OsmEl[] }).elements;
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      lastError = e;
    }
  }
  throw lastError;
}

const metres = (lat: number, dLat: number, dLng: number) => {
  const y = dLat * 110540;
  const x = dLng * 111320 * Math.cos((lat * Math.PI) / 180);
  return { x, y };
};

export async function fetchDoors(b: Bounds, signal?: AbortSignal): Promise<Door[]> {
  const bbox = `${b.south},${b.west},${b.north},${b.east}`;
  const query = `[out:json][timeout:25];(
    node["addr:housenumber"](${bbox});
    way["addr:housenumber"](${bbox});
    way["building"~"^(${HOUSE_TYPES})$"](${bbox});
  );out tags bb 3000;`;
  const elements = await overpass(query, signal);

  const numbered: Door[] = [];
  const unnumbered: Door[] = [];
  for (const el of elements) {
    const t = el.tags ?? {};
    if (NOT_HOMES.some((k) => t[k])) continue;
    let lat = el.lat, lng = el.lon;
    if (el.bounds) {
      const bb = el.bounds;
      lat = (bb.minlat + bb.maxlat) / 2;
      lng = (bb.minlon + bb.maxlon) / 2;
      // "building=yes" also covers garages, sheds and big blocks: keep house-sized ones only
      if (t.building === 'yes' && !t['addr:housenumber']) {
        const { x, y } = metres(lat, bb.maxlat - bb.minlat, bb.maxlon - bb.minlon);
        const area = Math.abs(x * y);
        if (area < 35 || area > 450) continue;
      }
    }
    if (lat == null || lng == null) continue;
    const door: Door = {
      id: `osm-${el.type}-${el.id}`,
      number: t['addr:housenumber'] ?? '',
      street: t['addr:street'] ?? '',
      postcode: t['addr:postcode'] ?? '',
      town: t['addr:city'] ?? t['addr:town'] ?? '',
      lng,
      lat,
    };
    (door.number ? numbered : unnumbered).push(door);
  }

  // an address point usually sits inside its building outline: don't show both
  const near = (a: Door, c: Door) => {
    const { x, y } = metres(a.lat, a.lat - c.lat, a.lng - c.lng);
    return x * x + y * y < 9 * 9;
  };
  const extra = unnumbered.filter((u) => !numbered.some((n) => near(n, u)));
  return [...numbered, ...extra];
}

/** Fill in a house's number, street and postcode from its position (OpenStreetMap Nominatim). */
export async function lookupAddress(door: Door): Promise<Partial<Door>> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${door.lat}&lon=${door.lng}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en-GB' } });
  if (!res.ok) return {};
  const a = ((await res.json()) as { address?: Record<string, string> }).address ?? {};
  return {
    number: door.number || a.house_number || a.house_name || '',
    street: door.street || a.road || '',
    postcode: door.postcode || a.postcode || '',
    town: door.town || a.town || a.city || a.village || a.suburb || '',
  };
}
