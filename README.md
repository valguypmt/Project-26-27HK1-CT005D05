# CTU Student Account Management System - InfoSec

> A course project for CT005D05 (Semester 1, 2026–2027). This independent student project is not affiliated with Can Tho University.

## Overview

A static web application for student email verification, account requests, password recovery, account-status lookup, and feedback. The frontend uses HTML, CSS, and JavaScript; Supabase provides authentication, PostgreSQL, Row Level Security (RLS), and database RPCs.

## Features

- **Account lookup:** Sign in with a student email and website password to view the account name and request status.
- **Registration:** Verify an `@student.ctu.edu.vn` email with an 8-digit OTP, then submit an account-name request for moderator review.
- **Password recovery:** Verify an email OTP and set a new website password through Supabase Auth.
- **Feedback:** Submit and track feedback, read moderator replies, or delete your own feedback. Each student can have up to three feedback items.
- **Moderator tools:** Sign in with a password and email OTP; review, search, filter, create, update, and remove account records; manage feedback.
- **Project information:** Browse the introduction, images, video, and FAQ.

## Built With

- HTML, CSS, and JavaScript
- Supabase Auth
- Supabase PostgreSQL, RLS, and PostgREST RPCs

## Project Structure

```text
.
├── index.html                         # Home page and account lookup
├── user.html                          # Student registration, recovery, and feedback
├── moderator.html                     # Moderator dashboard
├── public/                            # Media assets
├── src/
│   ├── index.css / index.js           # Home page styles and behavior
│   ├── user.css / user.js             # Student page styles and behavior
│   └── moderator.css / moderator.js   # Moderator page styles and behavior
└── supabase/
    ├── config.toml                    # Local Supabase Auth defaults
    └── migrations/
        └── 20261128150000_secure_account_workflow.sql
```

## Supabase Setup

Follow these steps to create a fresh backend for your own copy.

### 1. Create a Supabase project

Fork or clone this repository, then create a project in the [Supabase Dashboard](https://supabase.com/dashboard). Save the database password somewhere private.

### 2. Run the database migration and enable RLS

In the Dashboard, open **SQL Editor → New query**. Open [`supabase/migrations/20261128150000_secure_account_workflow.sql`](./supabase/migrations/20261128150000_secure_account_workflow.sql), copy the **entire file** into the query, and run it once. Confirm that it completes successfully.

The migration creates the account, feedback, and moderator-session tables; enables and forces RLS; removes direct browser access to those tables; and creates the RPC functions used by the site. The frontend accesses data through these RPCs. Do not disable RLS or grant `anon` direct access to the tables.

> **Existing database?** Back it up and review the migration before running it. The migration removes obsolete password-related functions, but does not drop `public.users` or delete legacy `password_ciphertext` values. It can stop if duplicate normalized emails or account names need to be resolved.

This guide uses the Dashboard SQL Editor. Manually running SQL there does not add the migration to Supabase CLI history. If you later use `supabase db push` or automated migration deployment, reconcile migration history first to avoid applying the same migration twice.

### 3. Configure Auth, OTP, and email

In **Authentication** settings:

1. Enable the **Email** provider, email sign-ups, and email confirmations.
2. Set email OTPs to **8 digits**, set a suitable expiry, and set the minimum password length to **8 characters**.
3. Configure SMTP if you need reliable email delivery.
4. In the **Confirm signup** and **Reset Password** email templates, make sure to include `{{ .Token }}`. The project expects an OTP.
5. Set the **Site URL** to your deployed site. Add your local and deployed URLs to the allowed redirect URLs. For the local server in step 6, add:

   ```text
   http://localhost:8000/**
   http://127.0.0.1:8000/**
   ```

   For GitHub Pages, add a pattern such as `https://<username>.github.io/<repository>/**`.

[`supabase/config.toml`](./supabase/config.toml) sets an 8-digit OTP for local Supabase development. Hosted Auth settings must still be configured in the Dashboard.

### 4. Add your project URL and public key

In **Project Settings → API**, copy your **Project URL** and **anon/public key** (also called a publishable key). Replace the values at the top of both:

- [`src/index.js`](./src/index.js)
- [`src/moderator.js`](./src/moderator.js)

The anon/publishable key is intended for browser use. Never put a **service-role key**, database password, or other secret in frontend code or GitHub. RLS and the migration's RPC checks protect the database.

### 5. Create a moderator

1. In **Authentication → Users**, create the moderator's Auth user and confirm its email.
2. In **SQL Editor**, grant that user the moderator role. Replace the sample email and run:

   ```sql
   UPDATE auth.users
   SET raw_app_meta_data =
     COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"moderator"}'::jsonb
   WHERE lower(email) = lower('moderator@example.com')
   RETURNING email;
   ```

   Check that the query returns the moderator's email. Moderator actions require this role and email OTP verification. Only trusted project managers should run this query; never assign the role from browser code.

### 6. Run the site locally

From the repository folder, start a static server:

```powershell
python -m http.server 8000
```

Open [http://localhost:8000/index.html](http://localhost:8000/index.html). Use HTTP instead of opening the HTML files with `file://` so Auth redirects work.

### 7. Test the main flows

Use test accounts and verify:

1. Register with a confirmed `@student.ctu.edu.vn` email and submit an account-name request.
2. Sign in on the home page to check the request status.
3. Sign in to the moderator page and approve the request.
4. Test password recovery with a new 8-digit OTP.
5. Send feedback and confirm it appears in the moderator dashboard.

## GitHub and Deployment

Push your copy to GitHub. Optionally connect the repository through Supabase's GitHub integration to work with the `supabase/migrations/` folder. Linking GitHub alone does not run SQL or configure Auth, SMTP, redirect URLs, or moderator roles.

The site is static and can be deployed with GitHub Pages or another static host. After deployment, add the site's URL to Supabase's allowed redirects. Review all files and Git history for secrets or personal data before making the repository public.

## Troubleshooting

- **OTP not received:** Check Spam, confirm the email templates include `{{ .Token }}`, and verify SMTP and redirect URL settings.
- **“Invalid login credentials”:** Check the email and website password. This is a Supabase Auth sign-in error, not an account-status lookup result. Use password recovery if needed.
- **“Could not find function” / schema-cache error:** Confirm the full migration ran successfully, wait for the API schema to refresh, then reload the site.
- **SQL migration reports duplicate email or account names:** Resolve the duplicates in the existing database before rerunning the migration.

## Security Notes

- The `public.users` table stores email, account name, and status. Supabase Auth manages passwords; the site cannot view or recover an old password.
- Password recovery uses a generic response so the site does not reveal whether an email has an account.
- The anon/publishable key is public; the service-role key and database password are secret.
- This is a learning project, not production identity management. Use test data and unique passwords; never reuse a CTU or other important password.
- Review student identifiers, documents, images, and usage rights before publishing.