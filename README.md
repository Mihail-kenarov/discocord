# DiscoCord — Web Client

The front end of **DiscoCord**, a Discord-style chat and voice platform built on a Go microservice backend. This is the web app users actually see: servers ("guilds"), channels, real-time messaging, friends, and in-browser voice chat.

Built with **Next.js (App Router) + React + TypeScript**, authenticated with **Clerk**, and styled with **Tailwind** and **shadcn/ui** (Radix primitives).

## What it does

- **Guilds & channels** — create servers, browse channels, and switch between them from a Discord-like sidebar.
- **Real-time messaging** — send and read channel messages, backed by the chat microservice.
- **Voice channels** — join a voice room and talk in-browser over **WebRTC**, with signaling handled by the API gateway.
- **Friends** — friends tabs and social state.
- **Account & privacy** — profile editing, a personal-data view, and account deletion (which fans out through the backend to purge user data).

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router, Turbopack) |
| Language | TypeScript / React |
| Auth | Clerk (`@clerk/nextjs`), with a Clerk webhook route for user sync |
| UI | Tailwind CSS, shadcn/ui, Radix UI, `lucide-react`, `sonner` toasts |
| HTTP | Axios, talking to the API gateway |
| Testing | Cypress (end-to-end: auth, guilds, user flows) |
| CI/CD | GitLab CI, SonarQube static analysis |
| Delivery | Docker (multi-stage), Docker Compose |

## Where it sits in the system

```
Browser ──> discocord (this app)
                │  HTTP + WebSocket
                ▼
          API Gateway (discocordgw, NGINX + Go)
                │
     ┌──────────┼───────────────┐
     ▼          ▼               ▼
 User svc   Guild svc     Chat svc (discocordcs)
```

The client talks only to the gateway; the gateway authenticates the request and routes it to the right backend service.

## Getting started

```bash
bun install        # or npm install
bun dev            # next dev, runs on http://localhost:3000
```

You'll need environment variables for Clerk and the gateway URL:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8090          # API gateway
GATEWAY_URL=http://localhost:8090
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
CLERK_WEBHOOK_SIGNING_SECRET=...
```

### Run in Docker

```bash
docker compose up -d --build
```

### End-to-end tests

```bash
bun run test:e2e        # boots the app and runs the Cypress suite
```

## Project layout

- `app/` — routes and pages (App Router). `app/me/` holds the main authenticated app: sidebar, guild workspace, voice room, friends, and profile dialogs.
- `app/api/` — client-side API layer (`callsAPI.ts`, types) and the Clerk webhook route.
- `components/ui/` — shadcn/ui components.
- `cypress/` — end-to-end test suites.

---

*Part of the DiscoCord project: [web client](https://github.com/Mihail-kenarov/discocord) · [API gateway](https://github.com/Mihail-kenarov/discocordgw) · [chat service](https://github.com/Mihail-kenarov/discocordcs) · [user service](https://github.com/Mihail-kenarov/discocordus).*
