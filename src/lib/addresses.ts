// Real addresses for the area on screen, from OpenStreetMap via the Overpass API.
//
// OSM house-number coverage in the UK is good in some streets and patchy in
// others. For full coverage in production, replace `fetchDoors` with a licensed
// address source such as Ordnance Survey AddressBase or Ideal Postcodes; the
// rest of the app only depends on the `Door` shape.

export interface Door {
  id: string;
  number: string;
  street: string;
  postcode: string;
  town: string;
  lng: number;
  lat: number;
}

const OVERPASS = 'https://overpass-api.de/api/interpreter';

export type Bounds = { south: number; west: number; north: number; east: number };

export async function fetchDoors(b: Bounds, signal?: AbortSignal): Promise<Door[]> {
  const bbox = `${b.south},${b.west},${b.north},${b.east}`;
  const query = `[out:json][timeout:20];(node["addr:housenumber"](${bbox});way["addr:housenumber"](${bbox}););out center tags 800;`;
  const res = await fetch(OVERPASS, {
    method: 'POST',
    body: new URLSearchParams({ data: query }),
    signal,
  });
  if (!res.ok) throw new Error(`Address lookup failed (${res.status})`);
  const json = (await res.json()) as {
    elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[];
  };
  const doors: Door[] = [];
  for (const el of json.elements) {
    const t = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null || !t['addr:housenumber']) continue;
    // skip shops, offices and the like; canvassers knock on homes
    if (t.shop || t.amenity || t.office || t.tourism) continue;
    doors.push({
      id: `osm-${el.type}-${el.id}`,
      number: t['addr:housenumber'],
      street: t['addr:street'] ?? '',
      postcode: t['addr:postcode'] ?? '',
      town: t['addr:city'] ?? t['addr:town'] ?? '',
      lng,
      lat,
    });
  }
  return doors;
}
