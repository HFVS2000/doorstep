import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchDoors, lookupAddress, type Door } from '../../src/lib/addresses';

const bounds = { south: 51.72, west: 0.46, north: 51.722, east: 0.468 };
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('fetchDoors', () => {
  it('keeps homes, drops shops, sheds and duplicates', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({
      elements: [
        { type: 'node', id: 1, lat: 51.721, lon: 0.4645, tags: { 'addr:housenumber': '14', 'addr:street': 'Lime Walk', 'addr:postcode': 'CM2 9NQ' } },
        // building outline around that same address point: should not become a second pin
        { type: 'way', id: 2, bounds: { minlat: 51.72096, minlon: 0.46445, maxlat: 51.72104, maxlon: 0.46458 }, tags: { building: 'house' } },
        // a separate house with no number: kept
        { type: 'way', id: 3, bounds: { minlat: 51.7212, minlon: 0.4660, maxlat: 51.72128, maxlon: 0.46613 }, tags: { building: 'semidetached_house' } },
        // garden shed tagged building=yes: dropped
        { type: 'way', id: 4, bounds: { minlat: 51.7205, minlon: 0.4630, maxlat: 51.72052, maxlon: 0.46303 }, tags: { building: 'yes' } },
        // a shop with a number: dropped
        { type: 'node', id: 5, lat: 51.7208, lon: 0.4650, tags: { 'addr:housenumber': '2', shop: 'convenience' } },
      ],
    })));
    const doors = await fetchDoors(bounds);
    expect(doors.map((d) => d.id).sort()).toEqual(['osm-node-1', 'osm-way-3']);
    expect(doors.find((d) => d.id === 'osm-node-1')).toMatchObject({ number: '14', street: 'Lime Walk', postcode: 'CM2 9NQ' });
  });

  it('falls back to another server when the first is down', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response('busy', { status: 504 }))
      .mockResolvedValueOnce(ok({ elements: [{ type: 'node', id: 9, lat: 51.721, lon: 0.465, tags: { 'addr:housenumber': '9' } }] }));
    vi.stubGlobal('fetch', fetch);
    const doors = await fetchDoors(bounds);
    expect(doors).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('reports an error when every server fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
    await expect(fetchDoors(bounds)).rejects.toThrow();
  });
});

describe('lookupAddress', () => {
  const door: Door = { id: 'x', number: '', street: '', postcode: '', town: '', lng: 0.465, lat: 51.721 };
  it('fills in missing parts of the address', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ address: { house_number: '42', road: 'Lime Walk', postcode: 'CM2 9NQ', town: 'Chelmsford' } })));
    expect(await lookupAddress(door)).toEqual({ number: '42', street: 'Lime Walk', postcode: 'CM2 9NQ', town: 'Chelmsford' });
  });
  it('never overwrites what the house already has', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ address: { house_number: '99', road: 'Other Road' } })));
    const r = await lookupAddress({ ...door, number: '14', street: 'Lime Walk' });
    expect(r.number).toBe('14');
    expect(r.street).toBe('Lime Walk');
  });
});
