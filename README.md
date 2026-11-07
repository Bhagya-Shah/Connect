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
| Plans | Starter (free, 5 clients, 5% fee), Growth ₹499, Pro ₹999, Clinic ₹2,499, limits enforced | Free |

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
4. **Email**: Supabase's built-in email is rate limited. Before launch, add an SMTP provider (Resend, Amazon SES) in Auth > SMTP.
