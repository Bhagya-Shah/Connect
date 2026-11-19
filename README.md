# Connect

One app for a nutritionist's practice. The nutritionist signs in with Google, keeps their client database, gives each
client a login, shares diet plans and reports, and meets clients on Google Meet. Clients log in with their mobile
number and see their plan, files, sessions and progress. Works on phones and laptops, and can be added to the home screen.

- `src/`: the app (Next.js + Supabase).
- `supabase/migrations/`: the database: tables, security rules, file storage, built-in diet plan templates.

## What it does

| Area | Nutritionist | Client |
| --- | --- | --- |
| Sign in | Google ("Continue with Google"); first sign-in sets up the practice | Mobile number (or email) + password from the nutritionist; Google too if their Gmail was added |
| Clients | Add a client in one form: a login is made at once, sent on WhatsApp in one tap. Instant search, goals, weight, health notes, past clients | |
| Logins | "Send login again" makes a new password | Change password in Me |
| Files | Upload diet plans (PDF, Word, Excel, photos, up to 20 MB) to a client | See files from the nutritionist, upload blood reports and prescriptions |
| Sessions | Schedule with a Google Meet link (saved default or per session), Add to Google Calendar, send on WhatsApp, cancel, mark done | Next session on Today with "Join Google Meet" |
| Dashboard | Today's sessions, counts, meal photos to review, clients waiting for a reply or quiet for 3 days, new client uploads | |
| Diet plans | 5 ready-made templates, plan builder, own templates, send to a client | Today's plan, meal by meal |
| Meal photos | Review feed: on plan / off plan, quick replies, missing-photo list, reminders, 7-day grid | Snap each meal (photo shrunk on the phone), see replies |
| Progress and chat | Weight chart, BMI, check-ins, private notes, live chat | Log weight, weekly check-in, chat |

Files are private: only the nutritionist and that client can open them (checked by the database, not just the app).
Links to files last one hour.

**Why Google Meet links and not automatic Meet creation:** creating Meet rooms through Google's API needs a Google
Calendar permission that Google must review before the public can use it (weeks). Pasting a link works today, and a
fixed room (one Calendar event with Meet added) can be reused for every session.

The marketplace version (public profiles, search, booking and payments, therapists, clinics, LiveKit calls) is kept in
git history on `app-mvp` up to commit `f155a2b`. Its old tables stay in the database, unused.

## Run it on your computer

Needs Node 20+ and Docker.

```bash
npm install
npx supabase start          # local database
cp .env.example .env.local  # paste the anon and service_role keys that `supabase start` printed
npm run dev                 # http://localhost:3000, then tap "Nutritionist demo" on the login page
```

## Put it online

1. **Supabase**: in the SQL Editor run `supabase/migrations/20261119000000_nutritionist_app.sql` (new projects: run
   every file in `supabase/migrations/` in order, or `npx supabase db push`).
2. **Google sign-in**:
   - Google Cloud Console > APIs & Services > OAuth consent screen: External, app name "Connect", your email. Add
     `supabase.co` as an authorised domain.
   - Credentials > Create credentials > OAuth client ID > Web application. Authorised redirect URI:
     `https://<project-ref>.supabase.co/auth/v1/callback`.
   - Supabase > Authentication > Sign In / Providers > Google: switch on, paste the Client ID and Client secret.
   - Supabase > Authentication > URL Configuration: Site URL = your web address; add `https://<your-site>/auth/callback`
     to Redirect URLs.
3. **Vercel**: import this repo, add the variables from `.env.example`, deploy.

Clients never need email, so Supabase's email limits don't matter for them.
