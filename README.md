# CTU Student Account Management System - InfoSec

> A web application that helps students look up account information, submit account management requests, and communicate with administrators. This project was developed for course CT005D05 during Semester 1 of the 2026-2027 academic year.

## Overview

The application includes a public account lookup page, a student email verification process, and an administration page. The interface is built with plain HTML, CSS, and JavaScript; Supabase provides authentication and data functions through RPC.

## Features

- **Account lookup:** Look up accounts by an `@student.ctu.edu.vn` email address and account password; display the account name and status.
- **Registration requests:** Verify email with OTP and submit an account name and request for administrator approval.
- **Submit feedback:** Students can submit requests, view request statuses and administrator feedback, or delete their own feedback. The interface limits each user to a maximum of three visible feedback entries.
- **Administration:** Moderator login with an OTP step; view, search, filter, add, update, or delete accounts and process feedback.
- **Introduction interface:** Includes project introduction, images, videos, and a frequently asked questions section.

## Technologies

- Plain HTML, CSS, and JavaScript
- Supabase Auth
- Supabase PostgREST RPC and PostgreSQL

## Project Structure

```text
.
├── index.html       # Home page and account lookup
├── index.css
├── index.js
├── user.html        # Email verification, registration, and feedback
├── user.css
├── user.js
├── moderator.html   # Administration page
├── moderator.css
├── moderator.js
├── images/          # Logo and interface images
└── documents/       # Doctuments of the project
```

## Supabase Configuration

The browser reads the project URL and anon key from `index.js`. When running a copy of the project, replace those values with the URL and publishable/anon key of your Supabase project. Do not put a service-role key, database password, or secret token in frontend code.

The backend must be created and configured separately in Supabase. The frontend currently calls several RPC functions, including:

- Students: `lookup_user_by_email`, `get_my_registration_status`, `submit_registration_request`, `list_my_feedback`, `submit_my_feedback`, `delete_my_feedback`.
- Moderators: `list_managed_users`, `create_user_with_password`, `update_user_details`, `set_user_password`, `delete_managed_user`, `list_feedback_for_moderator`, `update_feedback_for_moderator`, `delete_feedback_for_moderator`.

Moderator session functions and additional data constraints must also be configured in Supabase. **The SQL schema and complete RPC function definitions are not currently included in this repository**, so configuring only the frontend is not enough to build a new backend. Do not run the demo with real data before setting up and testing access permissions, RLS, and the RPC functions.

To grant moderator privileges, the account must have `role: moderator` in `app_metadata`. Project moderators can set or remove the role in the Supabase SQL Editor by replacing the sample email below:

```sql
-- Grant moderator privileges
UPDATE auth.users
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb)
  || '{"role":"moderator"}'::jsonb
WHERE lower(email) = lower('moderator@example.com');
```

```sql
-- Remove moderator privileges
UPDATE auth.users
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb) - 'role'
WHERE lower(email) = lower('moderator@example.com')
  AND raw_app_meta_data ->> 'role' = 'moderator';
```

Only project managers with SQL Editor access should perform these operations. Do not put moderator login information or secret keys in the repository.

## Security Notes

This is a learning/demonstration project, not a system ready to process real authentication information. The current workflow allows account passwords to be submitted for administrator review and includes an interface that displays passwords. Do not use real passwords or personal data during demonstrations. A production system should allow users to authenticate and set passwords through an identity provider rather than storing passwords in a recoverable form.

Anon/publishable keys are used in the browser but should only be exposed after RLS policies and RPC execution permissions have been tested and verified. Never expose a service-role key. Before making the repository public, review Git history and remove or revoke any secrets or real data that may have been committed.

## Development Team

- **Pham Minh Thong (B2605470), Can Tho University:** Researched and developed scripts and core functions.
- **Pham Duy Thai (B2605464), Can Tho University:** Designed the interface and prepared the report and product introduction.

## Links

- Project result source repository: https://github.com/GH-Courses/26-27hk1-ct005d05-labs-valguypmt/tree/master/project
- Project's private source repository: https://github.com/valguypmt/Project-26-27HK1-CT005D05
- Project introduction video on YouTube: https://www.youtube.com/watch?v=jGaZyjvvN3Y
- Live project deployment: https://valguypmt.github.io/Project-26-27HK1-CT005D05/
