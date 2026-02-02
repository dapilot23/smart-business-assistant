# UX Simplification Spec (Dashboard, Inbox, Insights)

## Goals
- Make the product feel calm, fast, and obvious.
- Show only the next best actions by default.
- Keep the AI transparent: what it will do and why.
- Use short, plain language across all screens.

## Principles
- One-line status + time range at the top of every screen.
- Primary queue = top 3 actions with Approve / Decline.
- Secondary queue = next 5 tasks (optional).
- Insights = 2-3 signals + link to full report.
- Every action should require one click and show the outcome.

## Global Structure
- Top bar: status + range (single line).
- Left nav: Dashboard, Inbox, Insights, Settings.
- Command Center: dashboard-only.
- Language: short verbs (Approve, Decline, Send, Done).

## Dashboard
- Primary Queue: 3 actions max.
- Secondary Queue: 5 tasks max.
- Insights: 2-3 key signals + link to full report.
- Command Center: single input + 3 quick prompts.

Wireframe
```
[Status: 3 actions waiting | Range: Jan 27 - Feb 2]

Today
Approve the next steps and move on.

Primary Queue (3)
- Send invoice to Acme       [Approve] [Decline]
- Follow up lead: Jenna      [Approve] [Decline]
- Reschedule appt: Monday    [Approve] [Decline]

Secondary Queue (5)
- Review contractor hours    [Done] [Skip]
- Refill inventory: Model X  [Done] [Skip]

Insights
- Revenue: $12,400 (+8%)     [View report]
- Appointments: 28           [View report]
- Quotes waiting: 4          [View report]

Command Center
[ Ask the AI to run a task... ] [Run]
- Send overdue invoices
- Follow up new leads
- Close open tickets
```

## Inbox
- AI Summary at top.
- Thread list uses status badges (Needs reply / Waiting / Done / Urgent).
- Thread detail shows summary + next step.

Wireframe
```
[Status: 2 need reply | Range: Jan 27 - Feb 2]

AI Summary
- 2 need reply, 1 urgent, 4 waiting

Threads
- Acme Co      [Needs reply]
- Jenna L      [Urgent]
- Delta Inc    [Waiting]

Thread Detail
Summary: Customer asking about invoice terms.
Next: Reply to customer.

Message input: Write a reply...
```

## Insights
- 2-3 key signals at top.
- Link to full report below.
- Full report can include week selector, metrics, wins, attention, actions.

Wireframe
```
[Status: Report ready | Range: Jan 27 - Feb 2]

Key Signals
- Revenue: $12,400 (+8%)
- Jobs completed: 18
- NPS score: 56

Full Report (below)
- Week selector
- Metrics
- Wins / Attention
- Action items / Forecast
```

## States
- Loading: single line in each panel.
- Empty: short sentence ("No actions right now.").
- Error: clear retry action.

## Copy Style
- Use short sentences.
- Avoid jargon and acronyms.
- Prefer verbs: Approve, Decline, Send, Done, Ask.
