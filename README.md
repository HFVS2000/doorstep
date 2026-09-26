# Doorstep

Tablet app for door-to-door charity canvassers: a live street map where every
house is a pin you can log in one tap, next to a Direct Debit sign-up form.
Built first for Essex & Herts Air Ambulance (EHAAT), and set up so other
charity clients can be added by config.

## Run it

```bash
npm install
npm run dev      # opens on your network too, so a tablet on the same Wi-Fi can load it
npm run build    # production build in dist/
```

Hosted on Vercel, which rebuilds and redeploys automatically on every push to `main`.
Vercel settings: framework Vite, build command `npm run build`, output folder `dist` (all detected automatically).

## How it fits together

| Part | File | Today | For production |
| --- | --- | --- | --- |
| Client branding, programmes, legal text | `src/config/client.ts` | EHAAT | Add a file per client |
| Map | `src/components/MapView.tsx` | OpenFreeMap (OpenStreetMap), free, no key | Keep, or swap the style URL for MapTiler / Mapbox / OS Maps |
| House pins | `src/lib/addresses.ts` | OpenStreetMap house numbers via Overpass | Ordnance Survey AddressBase or Ideal Postcodes for full coverage |
| Bank check | `src/lib/banks.ts` | Sort-code prefix stand-in | Loqate / Experian / your DD bureau, called from a server |
| Door log + offline queue | `src/lib/store.ts` | Saved on the tablet, sent when online | Point `sendToOffice` at the backend API |

## Before real supporter data goes through it

- Bank details and signatures are stored unencrypted on the device in this build. Encrypt at rest and send only over HTTPS to an authenticated backend.
- Canvasser login, territory assignment and the office backend are not built yet.
- Legal text in `client.ts` is placeholder and must be replaced with approved wording.
- Offline map tiles are not cached yet; door pins and sign-ups are.
