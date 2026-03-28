# Task Breakdown: Niles Next Iteration

**Branch**: `niles-next-iteration` | **Date**: September 11, 2025 | **Plan**: [niles-next-iteration-plan.md](./niles-next-iteration-plan.md)

**Input**: Technical plan from `/specs/niles-next-iteration-plan.md`

---

## 1. Prioritized Front-End Completion & Integration

### 1.1 Buttons and Quick Actions
- [ ] Audit all buttons and quick actions for missing backend logic
- [ ] Connect Add Event, Add Task, Request Ride, Compose, Add Reminder buttons to backend APIs
- [ ] Add loading, error, and success feedback for each action

### 1.2 Pop-up Modals
- [ ] Review TaskModal, EventModal, RideRequestModal, MessageModal, and others for incomplete submission logic
- [ ] Implement form validation and backend submission for each modal
- [ ] Ensure modals close and reset correctly after successful action

### 1.3 Chat UI (PersistentChat)
- [ ] Verify chat UI is connected to backend chat API
- [ ] Ensure messages are sent, received, and stored with correct context
- [ ] Add feedback for message send/receive status

### 1.4 Admin/Profile UI (AiProfileSettings, SystemPromptsTab)
- [ ] Connect all profile and prompt changes to Supabase backend
- [ ] Implement feedback for save/update actions

### 1.5 Ride Requests and Driver Assignment
- [ ] Connect RideRequests screen and modals to backend data
- [ ] Implement driver assignment workflow and backend updates

### 1.6 Task Board and Checklist Features
- [ ] Ensure TasksBoard and TaskModal save and update data in Supabase
- [ ] Implement checklist item add/remove/update logic

### 1.7 General UI Feedback
- [ ] Add loading, error, and success feedback to all major actions and modals

---

## 2. Data Model Changes
- [ ] Review and extend Supabase schema for member profiles and email ingestion logs
- [ ] Add column-level comments for new fields

## 3. API & Edge Function Updates
- [ ] Audit and extend existing Edge Functions and APIs for chat, email parsing, and personalization
- [ ] Implement/extend email parsing Edge Function with OpenAI/GPT extraction and approval workflow

## 4. Personalization Engine
- [ ] Extend backend logic to apply member profile rules to Niles responses
- [ ] Ensure admin UI changes persist to backend

## 5. Security & Compliance
- [ ] Review and update Edge Functions for secure service role usage
- [ ] Audit for bot token leaks and document schema changes

## 6. Testing & Deployment
- [ ] Audit existing tests and coverage
- [ ] Write unit/integration tests for new/updated features
- [ ] End-to-end tests for chat and email parsing workflows
- [ ] Deploy updated schema, Edge Functions, and web client

---

## Status
Task breakdown ready for implementation. Prioritize finishing and connecting started UI elements before new features.
