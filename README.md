# IMS Frontend (Mobile PWA)

ReactJS mobile-first Progressive Web App for IMS admin operations.

## Features implemented

- Login with `loginId` + password
- Stores tenant token and uses `x-tenant-token` in all API calls
- Bottom tabs: `Orders`, `Items`, `Customers`, `Dashboard`
- Items page
  - Create, list, update, delete
  - Search/filter with `q`, `minStock`, `maxStock`
  - Low-stock threshold view
- Customers page
  - Create, list, update, delete
  - Location fields (address/city/state/country/postalCode)
  - Customer price list assignment (`PUT /customers/:id/prices`)
- PWA manifest + service worker registration via `vite-plugin-pwa`
- Mobile-only optimized layout

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Set your backend base URL in `.env`:

```bash
VITE_API_BASE_URL=https://your-api-base-url
```

## Notes

- Orders and Dashboard tabs are scaffolded with placeholders until API contracts are available.
