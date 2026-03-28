# Feature Specification: Niles Next Iteration

## Project Context
We are building a family assistant named **Niles**. The assistant currently has:
- Supabase backend with robust SQL schema for events, tasks, rides, members, and messages.
- Supabase Edge Functions for integrations (Telegram, email, Google Calendar, etc.).
- Telegram webhook + send function for chat.
- Initial AI-chat functionality.
- Synchronization workflow between Supabase Studio and GitHub.

Niles is a personal assistant for families, integrating chat, calendar, and reminders.

---

## Goals for Next Iteration

### 1. Chat with Niles (multi-channel)
- Family members can chat via Telegram and a web chat client.
- Consistent conversation context across channels.
- Messages associated with correct household and member.

### 2. Email Parsing for Events
- Members can forward emails with `/parse-events`.
- Niles extracts structured events (date, time, description, location).
- Events added to shared calendar in Supabase (linked to Google Calendar).
- Niles confirms parsed events and requests approval before committing.

### 3. Personalized Interaction Profiles
- Admins can seed instructions (system prompts) for each member.
- Profiles include age, role, preferences, tone, detail level, etc.
- Example: child gets short, encouraging answers; parents get detailed summaries.
- Profiles stored in Supabase, editable by admins.
- Niles loads and applies profiles automatically.

---

## Non-Negotiables
- Supabase is the single source of truth.
- Edge Functions use Supabase service role securely.
- No bot token leaks in Telegram integration.
- Schema updates include column-level comments.

---

## Deliverables
- Updated specs for:
  - Data model changes (member profiles, email ingestion).
  - API and Edge Function definitions (chat, email parsing, personalization).
- Technical plan for email parsing (Edge Function + OpenAI/GPT extraction).
- Task breakdowns for build, test, deploy for each goal.

---


## Status
## Implementation Notes (Clarifications)

- **Web Chat Client Tech Stack:** Use the existing front-end code base (React + Vite) for the browser-based chat client.
- **Supported Email Providers:** Gmail and Outlook will be supported for event parsing.
- **Member Profile Minimum Info:** Minimum required info is already documented in the front-end code; use existing schema and extend as needed for personalization.
- **Multi-language/Currency Support:** Include scaffolding for future multi-lingual and multi-currency support, but rollout is low priority.

## Status
Spec ready for planning.
