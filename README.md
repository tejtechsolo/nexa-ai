# NexaAI

NexaAI is a secure, extensible AI-chatbot SaaS foundation for conversations, research, files, agents, integrations, and team workflows.

## Current milestone

Implemented:

- Next.js App Router foundation
- TypeScript and strict compiler settings
- Tailwind CSS/PostCSS setup
- SEO metadata foundation
- PWA web app manifest
- Cross-platform install prompt
- SVG app icon
- Environment variable template

Planned modules are intentionally delivered incrementally: authentication, database/RLS, chat providers, streaming, usage limits, billing, teams, admin/RBAC, files/RAG, agents, observability, and automated deployment.

## Tech stack

- Next.js + React + TypeScript
- Supabase Auth/PostgreSQL/RLS
- Provider adapters for OpenAI, Anthropic, Google, and OpenRouter
- Vercel deployment
- Vitest for unit tests

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Do not commit `.env.local`. Public variables may be exposed to the browser; service keys, provider keys, encryption keys, and webhook secrets must remain server-side.

## Environment variables

See `.env.example`. At minimum, configure:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `AUTH_SECRET`

Provider, email, billing, and integration variables are enabled only when their corresponding modules are implemented and configured.

## First-time user guide

1. Open the deployed NexaAI URL.
2. Select **Create account** when authentication is enabled.
3. Verify your email if email confirmation is enabled in Supabase.
4. Sign in and open the workspace.
5. Start a conversation, choose a model when model selection is available, and review usage before sending large requests.
6. Use the sidebar for conversations, files, agents, settings, and billing as those modules become available.
7. Install NexaAI:
   - Chrome/Edge desktop: select the install icon in the address bar or use the in-app **Install now** prompt.
   - Android Chrome: open the browser menu and choose **Install app** or **Add to Home screen**.
   - iPhone/iPad: open in Safari, tap **Share**, then **Add to Home Screen**.
   - If no install button appears, the browser may not support the custom prompt or the app may already be installed.

## PWA installation notes

The install experience uses the standard web app manifest and the Chromium `beforeinstallprompt` event. The custom prompt is not available on every browser; iOS uses the manual Share-menu flow. Production installation requires HTTPS and valid manifest/icon assets.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Security baseline

- Never expose Supabase service-role keys in client code.
- Validate all untrusted input with schemas at API boundaries.
- Enforce authorization in server code and PostgreSQL RLS; do not rely on hidden UI controls.
- Add rate limits before exposing public AI endpoints.
- Store provider keys only in encrypted server-side configuration.
- Record security-sensitive actions in an audit log.

## Repository workflow

Use short feature branches, pull requests, required checks, and reviewed migrations. Deploy previews from pull requests and production only from the protected default branch.
