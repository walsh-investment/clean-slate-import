Niles Family Organizer

Niles is a family-first digital assistant that helps households coordinate events, reminders, tasks, and communications.
It integrates with Supabase, Telegram, Email, and Google Calendar to provide a seamless, multi-channel experience for families.

🚀 Features

Shared Family Calendar
Centralized event management backed by Supabase with support for Google Calendar sync.

Multi-Channel Chat with Niles

Telegram integration (via Edge Functions & webhooks).

Planned web-based chat client for browser use.

Unified conversation context across channels.

Email-to-Calendar
Forward an email (e.g., “Soccer season schedule”) to Niles and automatically parse events into the family calendar.

Personalized Family Profiles

Admins can define instructions for each family member based on age, role, or preferences.

Example: children get short, encouraging responses, while parents receive detailed summaries.

Profiles stored in Supabase schema and applied at runtime.

Event, Task & Ride Tracking
Robust SQL schema (app schema in Supabase) supports household-level events, member tasks, rides, and messaging.

Edge Functions for Automation

telegram-webhook: receives Telegram updates and routes them through Niles.

telegram-send: sends messages back to family members.

notes-add, send-email, google-calendar-sync, and others for specialized workflows.

🛠️ Tech Stack

Backend: Supabase
 (Postgres, Auth, Edge Functions)

Database Schema: Custom app schema with full DDL and column-level comments

Frontend: React (Lovable.dev boilerplate, customizable web client)

Integrations:

Telegram Bot API (messaging)

Email ingestion + parsing (planned)

Google Calendar sync

Infrastructure: GitHub Actions for Supabase schema/function sync

📂 Project Structure
clean-slate-import/   # (to be renamed Niles Family Organizer)
├── supabase/         # Supabase Edge Functions, migrations, config
│   ├── functions/    # Edge functions (Telegram, Email, Calendar, Notes, AI Chat)
│   ├── migrations/   # Database schema migrations
│   └── config.toml
├── specs/            # Spec-Kit specs, plans, and tasks
├── guidelines/       # Spec-Kit guidelines for development
├── src/              # Frontend React app (Lovable.dev boilerplate)
└── ...

📖 Current Roadmap

Telegram + Web Chat Parity
Unified messaging experience across mobile and browser.

Email Parsing for Events
Forward schedules to Niles, parse, and add to family calendar.

Personalized Family Interactions
Profiles seeded by admin, applied in all Niles responses.

Expand Automation
Additional edge functions for reminders, notes, and external integrations.

🤝 Contributing

Contributions are welcome! This project uses Spec-Kit
 for spec-driven development:

Specs define what to build.

Plans define how to build it.

Tasks break work into actionable steps.

Check the specs/ and guidelines/ folders to see the current iteration.

🔐 Secrets & Environment

This project depends on environment variables managed in Supabase & GitHub Actions.

SUPABASE_DB_URL

SUPABASE_PROJECT_REF

SUPABASE_ACCESS_TOKEN

TELEGRAM_BOT_TOKEN

Ensure these are properly set before deploying functions.

📛 Project Naming

This repo (clean-slate-import) will be renamed to:
niles-family-organizer

📅 License

TBD (currently private development).
