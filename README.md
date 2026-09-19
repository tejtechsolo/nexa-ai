# NexaAI

NexaAI is a secure, extensible AI-chatbot SaaS foundation for conversations, research, files, agents, integrations, and team workflows.

> Status: active development. The repository is not production-ready until all security, provider, billing, observability, and deployment checks are completed.

## Milestone status

### Implemented

- Next.js App Router foundation
- Persistent conversations and message history
- Streaming AI responses with resilient SSE parsing
- Daily AI usage quota and model allowlist
- Advanced chat UX: Markdown, GFM, syntax-highlighted code, copy actions, regenerate, edit/resend, stop generation, auto-scroll, timestamps, search, rename, keyboard shortcuts, prompt suggestions, and responsive mobile navigation
- Secure conversation rewind endpoint for editing history
- GitHub Actions quality workflow for typecheck, lint, tests, and build
- TypeScript strict configuration
- Tailwind CSS/PostCSS setup
- SEO metadata foundation
- PWA manifest and install metadata
- Cross-platform install prompt
- SVG app icon
- Supabase browser/server clients
- Supabase session-refresh middleware
- Login, signup, and password-recovery screens
- OAuth callback and sign-out route
- Protected `/app` workspace shell
- Initial profiles table with Row Level Security
- Vitest test foundation
- Environment variable template

### In progress / planned

- Password reset completion screen
- Additional provider adapters (Anthropic, Google, OpenRouter)
- Files, embeddings, and RAG
- Agents and workflow execution
- Teams, invitations, and granular RBAC
- Admin console
- Stripe billing and plan enforcement
- Audit logs, observability, and alerting
- End-to-end browser tests
- Production CI/CD and deployment hardening
- Files, embeddings, and RAG
- Agents and workflow execution
- Teams, invitations, and granular RBAC
- Admin console
- Stripe billing and plan enforcement
- Audit logs, observability, and alerting
- End-to-end browser tests
- Production CI/CD and deployment hardening

## Technology stack

- Next.js App Router, React, and TypeScript
- Supabase Auth, PostgreSQL, and Row Level Security
- Provider adapters for OpenAI, Anthropic, Google, and OpenRouter
- Vercel deployment target
- Vitest unit/contract tests
- PWA web installation support

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Run quality checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Environment configuration

Copy `.env.example` to `.env.local` and configure:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=NexaAI
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
AUTH_SECRET=generate_a_long_random_value
```

Additional provider, email, billing, and integration variables should only be populated when their corresponding modules are enabled.

Never commit `.env.local`. Only variables prefixed with `NEXT_PUBLIC_` are intended for browser exposure. Service-role keys, AI provider keys, encryption keys, payment secrets, and webhook secrets must remain server-side.

## Supabase setup

1. Create a Supabase project.
2. Copy the project URL and anon/publishable key into `.env.local`.
3. In Supabase Authentication settings, configure the site URL:
   - Local: `http://localhost:3000`
   - Production: your HTTPS application URL
4. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.example/auth/callback`
5. Apply the SQL migration in `supabase/migrations/0001_profiles.sql` using the Supabase SQL editor or Supabase CLI.
6. Test signup, email verification, login, and logout.

## First-time user guide

1. Open the NexaAI website.
2. Select **Create account**.
3. Enter an email and a password with at least eight characters.
4. Verify your email if confirmation is enabled in Supabase.
5. Return to the login page and sign in.
6. You will be redirected to `/app`, the protected workspace.
7. The current workspace shows the planned conversation, files, and agents areas. These are deliberately marked as coming soon until their backend services are implemented.
8. Use **Forgot password?** to request a recovery email.

### Installing NexaAI as a desktop or mobile app

NexaAI is designed as a Progressive Web App.

- **Chrome or Edge desktop:** open the deployed HTTPS site, select the install icon in the address bar, and confirm installation. If available, use the in-app install prompt.
- **Android Chrome:** open the browser menu and select **Install app** or **Add to Home screen**.
- **iPhone/iPad:** open NexaAI in Safari, tap **Share**, then choose **Add to Home Screen**.
- **If the install option is missing:** confirm that the site uses HTTPS, the manifest loads, required icons exist, and the browser supports installation. iOS does not expose the Chromium `beforeinstallprompt` event and therefore uses the manual Safari flow.

After installation, NexaAI opens in a standalone application window when the browser supports it.

## Architecture principles

- Keep secrets on the server.
- Use Supabase Auth for identity and PostgreSQL RLS for data isolation.
- Validate all external input at API boundaries.
- Enforce authorization in server code and database policies, not only in the UI.
- Add rate limiting before exposing AI-generation endpoints.
- Use provider adapters so AI vendors can be changed without rewriting product logic.
- Track usage, costs, failures, and security-sensitive actions.
- Prefer small feature modules with reusable UI and service layers.

## Testing strategy

Current tests are a foundation and do not replace browser or integration tests.

- Unit tests: validation, utility functions, provider adapters
- Integration tests: Supabase queries, RLS, auth flows, API routes
- End-to-end tests: signup, verification, login, chat, logout, installation UX
- Security tests: unauthorized access, tenant isolation, rate limits, secret exposure

Run tests with:

```bash
npm test
npm run test:watch
```

## Git workflow

1. Create a feature branch.
2. Implement one bounded feature.
3. Run typecheck, lint, tests, and build.
4. Open a pull request.
5. Review migrations and security-sensitive code.
6. Merge only after required checks pass.
7. Deploy production from the protected default branch.

## License

License terms will be added before the first public production release.
