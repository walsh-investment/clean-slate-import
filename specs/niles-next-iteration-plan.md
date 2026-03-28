# Technical Implementation Plan: Niles Next Iteration

**Branch**: `niles-next-iteration` | **Date**: September 11, 2025 | **Spec**: [niles-next-iteration-spec.md](./niles-next-iteration-spec.md)

**Input**: Feature specification from `/specs/niles-next-iteration-spec.md`

---

## 1. Data Model Changes
- Review existing Supabase schema and front-end models before making changes.
- Extend `members` table for interaction profiles (age, role, preferences, tone, detail level, etc.) only if not already present.
- Add column-level comments for all new fields.
- Add table for email ingestion logs (raw email, parsed events, status) if not already implemented.

## 2. API & Edge Function Definitions
- Audit existing Edge Functions and APIs (e.g., ai-chat, Telegram integration) to avoid duplication.
- **Chat API**: Extend or refactor existing endpoints for unified Telegram/web chat, ensuring messages link to member/household.
- **Email Parsing Edge Function**: Implement only if not present; otherwise, extend for event extraction and approval workflow.
- **Profile Loader**: Integrate with current personalization logic, loading member profiles for each interaction.

## 3. Web Chat Client
- Review existing chat UI components (e.g., PersistentChat) and extend rather than rebuild.
- Integrate with backend chat API, ensuring no duplicate logic.
- Authenticate users and associate messages with member/household.

## 4. Email Parsing Workflow
- Check for any existing email ingestion logic before implementing new workflows.
- Accept emails via Edge Function (extend if partial implementation exists).
- Use OpenAI/GPT to extract event details.
- Store parsed events in Supabase.
- Send summary to user for approval before committing.

## 5. Personalization Engine
- Review and extend current admin/profile UI (see AiProfileSettings and related components).
- Backend logic to apply profile rules to Niles responses (extend existing logic).
- Store and retrieve profiles from Supabase.

## 6. Security & Compliance
- Ensure all Edge Functions use Supabase service role securely.
- No bot token leaks in Telegram integration.
- Document schema changes with column-level comments.
- Review existing security practices before adding new ones.

## 7. Testing & Deployment
- Audit existing tests and coverage before writing new ones.
- Unit and integration tests for Edge Functions and APIs.
- End-to-end tests for chat and email parsing workflows.
- Deploy updated schema, Edge Functions, and web client.

---

## [NEEDS CLARIFICATION]
- Preferred tech stack for web chat client? (Current: React + Vite, shadcn-ui)
- Supported email providers for parsing? (Current: Gmail, Outlook)
- Minimum required info for member profile? (See front-end code and Supabase schema)
- Multi-language support for Niles responses? (Scaffolding only, rollout low priority)

---

## 8. Prioritized Front-End Completion & Integration

Before building new features, prioritize finishing and connecting the following started but incomplete front-end elements:

1. **Buttons and Quick Actions**
	- Many buttons (e.g., Add Event, Add Task, Request Ride, Compose, Add Reminder) open modals but do not trigger backend actions or save data.
	- Connect these buttons to backend APIs and ensure they perform the intended actions.

2. **Pop-up Modals**
	- TaskModal, EventModal, RideRequestModal, MessageModal, and other modals often lack full submission logic or backend integration.
	- Complete form validation, submission, and backend connection for each modal.

3. **Chat UI (PersistentChat)**
	- The chat interface is present but may not be fully connected to backend chat APIs or conversation context.
	- Ensure chat messages are sent, received, and stored via backend, and context is maintained across channels.

4. **Admin/Profile UI (AiProfileSettings, SystemPromptsTab)**
	- Admin and profile settings screens have UI for editing prompts and preferences but may not persist changes to Supabase.
	- Connect all settings and profile changes to backend storage and retrieval.

5. **Ride Requests and Driver Assignment**
	- RideRequests screen and related modals show placeholders and lack backend data connection.
	- Finish backend integration for ride requests and driver assignment workflows.

6. **Task Board and Checklist Features**
	- TasksBoard and TaskModal have UI for tasks and checklists but may not save or update data in Supabase.
	- Ensure all task actions (create, update, checklist) are fully functional and connected.

7. **General UI Feedback**
	- Add loading, error, and success feedback to all major actions and modals.

**Recommendation:**
Finish and connect all above elements to the backend before starting new features. Review each for missing logic, incomplete submission, or lack of backend integration.

## Status
Plan updated to avoid duplication, ensure extension of existing features, and prioritize completion/integration of started UI elements. Ready for task breakdown.
