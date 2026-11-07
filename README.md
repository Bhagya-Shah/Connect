# Connect

Nutritionists run their whole practice here: bookings, payments, diet plans, daily meal photos, progress and chat.
People find the right nutritionist for their goal. Nutrition first; other fields come later.

- `src/`: the app (Next.js + Supabase).
- `supabase/migrations/`: the database: tables, security rules, photo storage, built-in diet plan templates.
- `demo/index.html`: the clickable demo with example data, for showing nutritionists.

## What works today

| Area | Nutritionist | Client |
| --- | --- | --- |
| Login | Email code, set up practice and booking link | Email code, join by invite link or by booking |
| Profile | Public page, goals, languages, food types, hours, services, prices | Find by goal boxes, search and filters |
| Booking | Weekly hours, no double booking, upcoming sessions | Pick a day and time, intake form, pay |
| Payments | Earnings after fees; Razorpay orders, split payouts (Route) and plan subscriptions | UPI, card, net banking via Razorpay |
| Diet plans | 5 ready-made templates, plan builder, own templates (Growth+), send to a client | Today's plan, meal by meal |
| Meal photos | Review feed: on plan / off plan, quick replies, missing-photo list, reminders, 7-day grid | Snap each meal (photo shrunk on the phone), see replies |
| Progress | Weight chart, BMI, check-ins, private notes | Log weight and waist, weekly check-in |
| Chat | Live chat per client (Growth+) | Live chat with their nutritionist |
| Video calls | In-app call per booking (LiveKit): Join opens 5 min before, screen share, in-call chat, private notes saved to the client | Join from the booking, waiting room until the nutritionist joins |
| Plans | Starter (free, 5 clients, 5% fee), Growth ₹499, Pro ₹999, Clinic ₹2,499, limits enforced | Free |

### Psychologists, therapists and counsellors

Therapists sign up with "I'm a therapist" and get their own version of the app. Bookings, payments, video calls, chat and
private notes are shared with the nutrition side; the rest is built for therapy:

| Area | Therapist | Client |
| --- | --- | --- |
| Find | Profile with concerns (anxiety, stress, relationships…), approaches (CBT, DBT…) | "Feel better" boxes, filters by approach and language |
| Consent | Own consent text (a sensible default is filled in) | Must agree before the first session; date is recorded |
| Mood | Mood strip, top feelings, notes; alert on very low or two low days | 10-second daily check-in (face, feelings, note) |
| Check-ups | Send PHQ-9 / GAD-7, score history charts, every answer; risk flag if PHQ-9 Q9 > 0 | Answer on the phone; crisis numbers shown at once if Q9 > 0 |
| Homework | Exercise library (thought record, breathing, grounding…) or own task, due date | Mark done with a short reply |
| Journal | Reads only entries the client shares | Private by default, share per entry |
| Session notes | Talked about / noticed / plan, private | Never visible |
| Safety | Home screen "Needs attention" list | "Get help now" page with Tele-MANAS 14416 and 112 |

Mood, journal and check-ups are visible only to the client's therapist, never to a nutritionist they also see.
Scores are calculated in the database, so they can't be edited by either side. Plans and prices are the same for
both fields; the plan list shows therapy features to therapists (check-ups, homework and journal need Growth).

Connect takes 10% only on clients who found the nutritionist through Connect search, never on their own clients.

**Not built yet:** WhatsApp reminders (reminders go to in-app chat for now), SMS/phone login, GST invoice PDFs,
group classes, clinic team accounts and custom domains, AI photo check, Android/iPhone apps
(the web app can be added to the home screen).

## Run it on your computer

Needs Node 20+ and Docker.

```bash
npm install
npx supabase start          # local database, login emails at http://127.0.0.1:54324
cp .env.example .env.local  # paste the anon and service_role keys that `supabase start` printed
npm run dev                 # http://localhost:3000
```

Without Razorpay keys the app runs in **test mode**: "Pay" and "Switch plan" work without real money.

## Put it online

1. **Supabase** (database, login, photo storage): create a project at supabase.com (Mumbai region).
   - Run `npx supabase link --project-ref <ref>` then `npx supabase db push` to create the tables.
   - Auth > Email Templates > Magic Link: paste `supabase/templates/magic_link.html` (it shows the 6-digit code).
   - Auth > URL Configuration: set Site URL to your web address.
2. **Vercel** (hosting): import this GitHub repo at vercel.com, add the variables from `.env.example`, deploy.
3. **Razorpay** (payments), once your account is approved:
   - Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in Vercel.
   - Create 3 subscription plans (₹499, ₹999, ₹2,499 monthly) and add their ids as `RAZORPAY_PLAN_GROWTH/PRO/CLINIC`.
   - Webhooks: URL `https://<your-site>/api/razorpay/webhook`, events `payment.captured`, `subscription.activated`,
     `subscription.charged`, `subscription.cancelled`, `subscription.halted`. Put its secret in `RAZORPAY_WEBHOOK_SECRET`.
   - Route (split payments): create a linked account for each nutritionist in the Razorpay dashboard and save its id
     in `nutritionists.razorpay_account_id`. Without it, the full payment lands in the Connect account.
4. **Video calls** (LiveKit). Pick one:
   - **LiveKit Cloud** (easiest): create a project at cloud.livekit.io, then add its URL (`wss://…livekit.cloud`)
     as `NEXT_PUBLIC_LIVEKIT_URL` and an API key/secret as `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` in Vercel.
   - **Your own server**: a Linux VM in Mumbai (2 CPU, 4 GB RAM is plenty for 1-to-1 calls) with Docker,
     a subdomain like `meet.yourdomain.com` pointing at it, and ports 80, 443, 7881/tcp and 50000-60000/udp open.
     Run LiveKit's generator (`docker run --rm -it -v $PWD:/output livekit/generate`), choose your domain,
     then start it with the files it creates. Put `wss://meet.yourdomain.com` and the generated key/secret in Vercel.
   - Without these settings the app works, but the call page says calls aren't switched on.
5. **Email**: Supabase's built-in email is rate limited. Before launch, add an SMTP provider (Resend, Amazon SES) in Auth > SMTP.
