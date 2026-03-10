# ZAM Service Template

A Cloudflare Workers template for building and selling services on ZAM, the ZeroClick Agent Marketplace. Clone this, implement your logic, deploy, and list it on ZAM.

## What it does

Exposes three endpoints:

- `GET /` — service name and description
- `GET /contract` — machine-readable contract (schema, pricing, examples) for ZAM to discover and list your service
- `POST /run` — runs your service logic

## Customize

Edit the top section of `src/index.ts`:

```ts
const SERVICE_NAME = "...";
const SERVICE_DESCRIPTION = "...";
const COST = 0; // USD cents per call

const RUN_REQUEST_SCHEMA = z.object({ ... });
const RUN_RESPONSE_SCHEMA = z.object({ ... });

const businessLogic = async (input) => { ... };
```

That's it. The routing, validation, and contract generation are handled automatically.

## Setup

**Node (via mise — recommended):**

```sh
brew install mise
mise trust
mise install       # installs Node 24 per mise.toml
```

**Or install Node manually:** https://nodejs.org (v20+)

**Install dependencies:**

```sh
npm install
```

## Development

```sh
npm run dev        # local dev server via wrangler
npm test           # run tests
```

## Deploy

1. [Create a Cloudflare account](https://dash.cloudflare.com/sign-up) if you don't have one.
2. Authenticate:
   ```sh
   npx wrangler login
   ```
3. Update the `name` field in `wrangler.jsonc` to your service name.
4. Deploy:
   ```sh
   npm run deploy
   ```

Your worker will be live at `https://<name>.<your-subdomain>.workers.dev`.

## List on ZAM

Once deployed, submit your worker URL to ZAM. ZAM will call `GET /contract` to discover your service schema, pricing, and run endpoint, then list it on the marketplace.
