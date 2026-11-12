# Putting Training Hub online

You need three free accounts: **GitHub** (stores the code), **Supabase** (logins and the database) and **Vercel** (hosts the website). It takes about 20 minutes, and nothing here costs money at small scale.

## 1. Supabase: database and logins

1. Go to **supabase.com** and sign up (you can sign in with GitHub).
2. Click **New project**. Name it `traininghub`, create a database password (save it somewhere), pick the region closest to you, and click **Create**. Setup takes a minute or two.
3. In the left sidebar, open **SQL Editor** and click **New query**.
4. Open `supabase/schema.sql` from this repo, copy the whole file, paste it in, and click **Run**. It should say "Success. No rows returned."
5. In the left sidebar, open **Project Settings → API** (it may be labeled "Data API" or "API Keys"). Keep this page open. You need two values from it:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - **anon / public key** (a long string). Use the *anon* or *publishable* key, **never** the `service_role` or secret key.

## 2. Vercel: the website

1. Go to **vercel.com** and sign up with your GitHub account.
2. Click **Add New → Project**, find **TrainingHubApp** and click **Import**.
3. Vercel detects "Vite" by itself. Open **Environment Variables** and add two:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. Click **Deploy**. When it finishes you'll get a link like `traininghubapp.vercel.app`.

## 3. Connect the two

Back in Supabase, open **Authentication → URL Configuration**:

- **Site URL**: your Vercel link, e.g. `https://traininghubapp.vercel.app`
- **Redirect URLs**: add the same link

Without this step, sign-in emails link to the wrong place.

## 4. Try it

Open your Vercel link on your phone, enter your email, tap the link in the email, and fill in the questionnaire. To add it to your home screen:
- **iPhone:** Share → Add to Home Screen
- **Android:** ⋮ menu → Add to Home screen

## Good to know

- **Sign-in emails:** Supabase's built-in email sender only sends a few emails per hour. That's fine for a handful of testers. For more, connect an email service under Authentication → Emails → SMTP Settings (Resend has a free tier).
- **Free-tier pause:** Supabase pauses free projects after about a week with no activity. Signing in to supabase.com and clicking **Restore** brings it back, and no data is lost.
- **Updates:** every change pushed to GitHub's `main` branch redeploys the site automatically.
- **Invite-only later:** in Supabase, Authentication → Sign In / Providers lets you turn off "Allow new users to sign up" and invite people from Authentication → Users instead.
