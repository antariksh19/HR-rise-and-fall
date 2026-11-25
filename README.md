This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Audience voting deployment

1. Apply `database/migrations/001_initial_schema.sql`, then
   `database/migrations/002_audience_voting.sql` in the Supabase SQL editor.
2. Set `VOTER_HASH_SALT` to a long random secret in every deployment environment. Keep
   it stable while votes exist; changing it invalidates attendee contact hashes.
3. Configure the trusted edge/reverse proxy to overwrite `X-Real-IP`. The vote API
   intentionally does not trust `X-Forwarded-For` for its cross-browser device lock.
4. Seed at least one row in `public.admin_users` for each administrator who needs
   Control Room access. Teams do not receive Supabase Auth accounts.

The migration keeps audience ballots private, updates the public vote counter through
database triggers, and provides an atomic admin-only event reset.

Run the production checks with:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
