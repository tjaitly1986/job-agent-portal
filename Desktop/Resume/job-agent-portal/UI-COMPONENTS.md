# UI Components & Wireframes — Job Agent Portal

## Design System

### Theme

```
Primary: #1a1a2e (Dark Navy)
Secondary: #16213e (Deep Blue)
Accent: #0f3460 (Royal Blue)
Highlight: #e94560 (Coral Red — for CTAs and alerts)
Success: #10b981 (Emerald Green)
Warning: #f59e0b (Amber)
Background: #f8fafc (Slate 50)
Surface: #ffffff (White)
Text Primary: #0f172a (Slate 900)
Text Secondary: #64748b (Slate 500)
Border: #e2e8f0 (Slate 200)
```

### Typography

```
Font Family: Inter (Google Fonts)
Headings: Inter, 600-700 weight
Body: Inter, 400 weight
Mono: JetBrains Mono (for code/IDs)
```

### Layout Grid

```
Sidebar: 280px (collapsible to 64px icon-only)
Content Area: remaining width
Max Content Width: 1400px
Card Grid: 1-3 columns responsive
Spacing Unit: 4px (Tailwind default)
```

## Page Layouts

### Dashboard Shell

```
┌────────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌────────────────────────────────────────┐  │
│  │           │  │  Topbar                               │  │
│  │           │  │  [Logo]  Search...  [🔔] [👤 Profile] │  │
│  │  Sidebar  │  ├────────────────────────────────────────┤  │
│  │           │  │                                        │  │
│  │  📋 Jobs  │  │  Main Content Area                     │  │
│  │  🎯 Prof. │  │                                        │  │
│  │  📊 Track │  │  (varies by page)                      │  │
│  │  📄 Resume│  │                                        │  │
│  │  💬 Chat  │  │                                        │  │
│  │  ⚙ Sett. │  │                                        │  │
│  │           │  │                                        │  │
│  │           │  │                                        │  │
│  └──────────┘  └────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Sidebar Component

```tsx
// src/components/layout/Sidebar.tsx
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// Navigation items:
const navItems = [
  { icon: Briefcase, label: "Jobs", href: "/jobs", badge: "23 new" },
  { icon: Target, label: "Profiles", href: "/profiles" },
  { icon: BarChart3, label: "Tracker", href: "/tracker" },
  { icon: FileText, label: "Resumes", href: "/resumes" },
  { icon: MessageSquare, label: "Chat", href: "/chat" },
  { icon: Settings, label: "Settings", href: "/settings" },
];
```

## Jobs Page

### Job Listing View

```
┌────────────────────────────────────────────────────────┐
│  Jobs                                          [🔍 Search Now]  │
│                                                                  │
│  ┌─── Filters ───┐  ┌─── Job Cards ──────────────────────────┐ │
│  │               │  │                                          │ │
│  │ Platform      │  │ ┌─────────────────────────────────────┐  │ │
│  │ ☑ Indeed      │  │ │ AI Solution Architect    🟢 New     │  │ │
│  │ ☑ Dice        │  │ │ Acme Corp • Remote • $85-95/hr     │  │ │
│  │ ☑ Glassdoor   │  │ │ Contract C2C • Posted 2h ago       │  │ │
│  │ ☑ ZipRecruiter│  │ │ Match: 92% AI Solution Architect   │  │ │
│  │ ☑ LinkedIn    │  │ │                                     │  │ │
│  │               │  │ │ Recruiter: Jane Smith 📧 📞 🔗      │  │ │
│  │ Posted Within │  │ │                                     │  │ │
│  │ ○ 1 hour      │  │ │ [Apply ↗] [Track] [Chat 💬]       │  │ │
│  │ ● 24 hours    │  │ └─────────────────────────────────────┘  │ │
│  │ ○ 3 days      │  │                                          │ │
│  │ ○ 7 days      │  │ ┌─────────────────────────────────────┐  │ │
│  │               │  │ │ EDI Specialist                      │  │ │
│  │ Location      │  │ │ Global Tech • Dallas, TX • $80/hr   │  │ │
│  │ ☑ Remote      │  │ │ Contract • Posted 5h ago            │  │ │
│  │ [City, State] │  │ │ Match: 87% EDI Specialist           │  │ │
│  │               │  │ │                                     │  │ │
│  │ Employment    │  │ │ Recruiter: Bob Jones 📧 🔗           │  │ │
│  │ ☑ Contract    │  │ │                                     │  │ │
│  │ ☑ C2C         │  │ │ [Apply ↗] [Track] [Chat 💬]       │  │ │
│  │ ☐ Full-time   │  │ └─────────────────────────────────────┘  │ │
│  │               │  │                                          │ │
│  │ Profile       │  │  ‹ 1 2 3 4 5 ... 8 ›  (pagination)     │ │
│  │ [All ▾]       │  │                                          │ │
│  │               │  └──────────────────────────────────────────┘ │
│  │ Salary Range  │                                               │
│  │ [$50]--[$200] │                                               │
│  │               │                                               │
│  │ [Clear All]   │                                               │
│  └───────────────┘                                               │
└──────────────────────────────────────────────────────────────────┘
```

### JobCard Component

```tsx
// src/components/jobs/JobCard.tsx
interface JobCardProps {
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    isRemote: boolean;
    salaryText: string | null;
    employmentType: string;
    platform: string;
    postedAt: string;
    postedAtRaw: string;
    applyUrl: string;
    matchScore?: number;
    matchedProfileName?: string;
    recruiter?: {
      name: string | null;
      email: string | null;
      phone: string | null;
      linkedinUrl: string | null;
    };
    applicationStatus?: string | null;
  };
  onTrack: (jobId: string) => void;
  onChat: (jobId: string) => void;
}
```

**Key behaviors:**
- "Apply" button → opens `applyUrl` in new tab (`target="_blank"`)
- Recruiter email icon → opens `mailto:` link
- Recruiter phone icon → opens `tel:` link
- Recruiter LinkedIn icon → opens LinkedIn profile in new tab
- "Track" button → opens tracker modal to set status
- "Chat" button → navigates to chat page with job context pre-loaded
- Platform badge shows source (Indeed, Dice, etc.) with platform color
- Match score shown as percentage bar if profile match exists
- "New" badge for jobs posted within the last 6 hours

### JobFilters Component

```tsx
// src/components/jobs/JobFilters.tsx
interface JobFiltersState {
  platforms: string[];        // Selected platforms
  postedWithin: string;       // "1h", "6h", "12h", "24h", "3d", "7d", "30d", "all"
  locations: string[];        // Free-text locations
  isRemote: boolean | null;   // null = both
  employmentTypes: string[];  // "contract", "c2c", "fulltime"
  profileId: string | null;   // Filter by specific profile
  salaryMin: number | null;
  salaryMax: number | null;
  search: string;             // Free-text search
  excludeApplied: boolean;
  excludeDismissed: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}
```

### Job Detail Panel

When a job card is clicked, show a detail panel (slide-in sheet or modal):

```
┌───────────────────────────────────────────┐
│  AI Solution Architect        [✕ Close]   │
│  Acme Corp • Remote • $85-95/hr          │
│  Posted 2 hours ago on Dice               │
│                                           │
│  ┌─ Recruiter ──────────────────────────┐ │
│  │ Jane Smith • Acme Staffing           │ │
│  │ 📧 jane@acme.com  📞 +1-555-0123    │ │
│  │ 🔗 linkedin.com/in/janesmith        │ │
│  └──────────────────────────────────────┘ │
│                                           │
│  ┌─ Match ──────────────────────────────┐ │
│  │ Profile: AI Solution Architect       │ │
│  │ Score: ████████░░ 92%                │ │
│  │ Reasons: title, skills, c2c          │ │
│  └──────────────────────────────────────┘ │
│                                           │
│  ── Description ──                        │
│  We are looking for an experienced AI     │
│  Solution Architect to lead our...        │
│  (full job description rendered as HTML)  │
│                                           │
│  ── Requirements ──                       │
│  • 8+ years in solution architecture     │
│  • Experience with cloud platforms       │
│  • Strong communication skills           │
│                                           │
│  ┌──────────────────────────────────────┐ │
│  │ [Apply on Dice ↗]  [Track] [Chat 💬]│ │
│  └──────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

## Profiles Page

### Profile Management

```
┌────────────────────────────────────────────────────────┐
│  Search Profiles                    [+ Add Profile]    │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🟢 AI Solution Architect            [Edit] [🔍]  │  │
│  │ Titles: AI Solution Architect, AI Architect       │  │
│  │ Skills: Python, TensorFlow, AWS, Solution Design  │  │
│  │ Location: United States • Remote                  │  │
│  │ Type: Contract, C2C                               │  │
│  │ Platforms: Indeed, Dice, LinkedIn, Glassdoor, Zip  │  │
│  │ Last searched: 2 hours ago • 23 matches found     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🟢 EDI Specialist                   [Edit] [🔍]  │  │
│  │ Titles: EDI Specialist, EDI Analyst               │  │
│  │ Skills: EDI, AS2, X12, EDIFACT, MuleSoft         │  │
│  │ Location: United States • Remote                  │  │
│  │ Type: Contract, C2C                               │  │
│  │ Platforms: Indeed, Dice, LinkedIn                  │  │
│  │ Last searched: 6 hours ago • 8 matches found      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🔴 ERP Program Manager (excluded)    [Edit] [🔍] │  │
│  │ Titles: ERP Program Manager, D365 PM              │  │
│  │ This profile is currently excluded from searches  │  │
│  │ [Enable]                                          │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Profile Form (Add/Edit)

```tsx
// src/components/profiles/ProfileForm.tsx
// Fields:
// - Name (text input)
// - Job Titles (tag input — add multiple titles)
// - Skills (tag input — add multiple skills)
// - Locations (tag input — default "United States")
// - Remote only (toggle)
// - Employment Types (multi-select: Contract, C2C, Full-time, Part-time)
// - Include Keywords (tag input — terms that MUST appear)
// - Exclude Keywords (tag input — terms that MUST NOT appear)
// - Platforms (multi-select checkboxes: Indeed, Dice, Glassdoor, ZipRecruiter, LinkedIn)
// - Domain (select: AI, EDI, ERP, Cross-Domain)
// - Salary Range (min/max sliders with type toggle: hourly/annual)
// - Active/Inactive toggle
```

## Application Tracker Page

### Dual View: Table + Kanban

```
┌────────────────────────────────────────────────────────┐
│  Application Tracker                [Table] [Kanban]   │
│                                                        │
│  Stats: 45 total • 20 applied • 4 interviewing • 1 offer│
│                                                        │
│  === TABLE VIEW ===                                    │
│  ┌────┬──────────┬─────────┬────────┬───────┬────────┐ │
│  │Date│ Title    │ Company │Platform│Status │Actions │ │
│  ├────┼──────────┼─────────┼────────┼───────┼────────┤ │
│  │2/12│ AI Arch  │ Acme    │ Dice   │Applied│[⋯]    │ │
│  │2/12│ EDI Spec │ GlobalT │ Indeed │Interview│[⋯]  │ │
│  │2/11│ AI PM    │ TechCo  │LinkedIn│Rejected│[⋯]   │ │
│  └────┴──────────┴─────────┴────────┴───────┴────────┘ │
│                                                        │
│  === KANBAN VIEW ===                                   │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Saved   │ │ Applied │ │Interview │ │   Offer    │  │
│  │ (10)    │ │ (20)    │ │  (4)     │ │   (1)      │  │
│  │┌───────┐│ │┌───────┐│ │┌────────┐│ │┌──────────┐│  │
│  ││AI Arch││ ││EDI Sp.││ ││AI PM   ││ ││Sr. Arch  ││  │
│  ││Acme   ││ ││Global ││ ││TechCo  ││ ││MegaCorp  ││  │
│  │└───────┘│ │└───────┘│ │└────────┘│ │└──────────┘│  │
│  │┌───────┐│ │┌───────┐│ │          │ │            │  │
│  ││ERP PM ││ ││AI Sol.││ │          │ │            │  │
│  ││DataCo ││ ││CloudX ││ │          │ │            │  │
│  │└───────┘│ │└───────┘│ │          │ │            │  │
│  └─────────┘ └─────────┘ └──────────┘ └────────────┘  │
│                                                        │
│  Drag cards between columns to update status           │
└────────────────────────────────────────────────────────┘
```

### Tracker Status Pipeline

```
Saved → Ready to Apply → Applied → Phone Screen → Interview → Technical → Offer
                                                                         ↘ Rejected
                                                          ↗ Withdrawn
```

Status colors:
- Saved: Gray
- Ready to Apply: Blue
- Applied: Indigo
- Phone Screen: Purple
- Interview: Amber
- Technical: Orange
- Offer: Emerald Green
- Rejected: Red
- Withdrawn: Slate
- Expired: Gray (dimmed)

## Resume Management Page

```
┌────────────────────────────────────────────────────────┐
│  Resumes & Cover Letters                               │
│                                                        │
│  ┌─── Upload Zone ───────────────────────────────────┐ │
│  │                                                    │ │
│  │   📄 Drag & drop your resume or cover letter      │ │
│  │      PDF or DOCX (max 10MB)                        │ │
│  │                                                    │ │
│  │   [Browse Files]                                   │ │
│  │                                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                        │
│  ── Resumes (4) ──                                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ⭐ TJ_AI_Solution_Architect.pdf     85KB  2/12  │  │
│  │    Label: AI Roles • Default resume              │  │
│  │    [View] [Download] [Delete]                    │  │
│  ├──────────────────────────────────────────────────┤  │
│  │    TJ_EDI_Specialist.pdf            72KB  2/11  │  │
│  │    Label: EDI Roles                              │  │
│  │    [View] [Download] [Set Default] [Delete]      │  │
│  ├──────────────────────────────────────────────────┤  │
│  │    TJ_ERP_Manager.docx              95KB  2/10  │  │
│  │    Label: ERP Roles                              │  │
│  │    [View] [Download] [Set Default] [Delete]      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ── Cover Letters (2) ──                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │    CL_AI_Acme_2026-02-12.pdf       5KB   2/12  │  │
│  │    [View] [Download] [Delete]                    │  │
│  ├──────────────────────────────────────────────────┤  │
│  │    CL_EDI_GlobalTech_2026-02-12.pdf 4KB  2/12  │  │
│  │    [View] [Download] [Delete]                    │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

## Chat Page

### AI Chatbot Interface

```
┌────────────────────────────────────────────────────────┐
│  AI Outreach Assistant                                 │
│                                                        │
│  ┌─── Context ─────────────────────────────────────┐  │
│  │ Job: AI Solution Architect at Acme Corp         │  │
│  │ Resume: TJ_AI_Solution_Architect.pdf            │  │
│  │ Recruiter: Jane Smith                            │  │
│  │ [Change Context]                                 │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─── Message Type ────────────────────────────────┐  │
│  │ ● LinkedIn Request  ○ LinkedIn InMail           │  │
│  │ ○ Cold Email        ○ Follow-Up Email           │  │
│  │ ○ Custom                                         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─── Chat ────────────────────────────────────────┐  │
│  │                                                  │  │
│  │  🤖 Assistant                                    │  │
│  │  ┌───────────────────────────────────────────┐  │  │
│  │  │ Hi Jane, I'm reaching out about the AI    │  │  │
│  │  │ Solution Architect role at Acme Corp. With │  │  │
│  │  │ 12+ years designing enterprise AI...      │  │  │
│  │  │                                           │  │  │
│  │  │ [📋 Copy] [✏ Edit & Regenerate]          │  │  │
│  │  └───────────────────────────────────────────┘  │  │
│  │                                                  │  │
│  │  👤 You                                          │  │
│  │  ┌───────────────────────────────────────────┐  │  │
│  │  │ Make it shorter and mention my Microsoft  │  │  │
│  │  │ Dynamics experience                        │  │  │
│  │  └───────────────────────────────────────────┘  │  │
│  │                                                  │  │
│  │  🤖 Assistant                                    │  │
│  │  ┌───────────────────────────────────────────┐  │  │
│  │  │ Hi Jane — saw the AI SA role at Acme.     │  │  │
│  │  │ I bring 12+ yrs in AI + Dynamics 365...   │  │  │
│  │  │ [📋 Copy] [✏ Edit & Regenerate]          │  │  │
│  │  └───────────────────────────────────────────┘  │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────┐ [Send]          │
│  │ Type your message...             │                  │
│  └──────────────────────────────────┘                  │
└────────────────────────────────────────────────────────┘
```

**Key behaviors:**
- "Copy" button → copies message text to clipboard with toast notification
- "Edit & Regenerate" → puts message in input field for editing, sends as new user message
- Context selector → dropdown to pick job + resume for context injection
- Message type radio buttons → changes system prompt and constraints
- LinkedIn Request enforces 300-character limit with live counter
- Streaming response rendered token-by-token with typing indicator

## Settings Page

```
┌────────────────────────────────────────────────────────┐
│  Settings                                              │
│                                                        │
│  ── Profile ──                                         │
│  Name:      [TJ                             ]         │
│  Email:     [jaitly.tushar1@gmail.com       ]         │
│  Phone:     [+1(947)254-4677                ]         │
│  LinkedIn:  [linkedin.com/in/tushar-jaitly  ]         │
│  Location:  [San Francisco, CA              ]         │
│  [Save Profile]                                        │
│                                                        │
│  ── Scraping Schedule ──                               │
│  Enabled: [Toggle ON]                                  │
│  Frequency: [Every 6 hours ▾]                          │
│  Platforms: ☑ Indeed ☑ Dice ☑ LinkedIn ☑ GD ☑ ZR     │
│  Active Profiles: ☑ All active profiles                │
│  [Save Schedule]                                       │
│                                                        │
│  ── API Keys ──                                        │
│  Bright Data: [•••••••••••••••] [Show] [Update]       │
│  Claude API:  [•••••••••••••••] [Show] [Update]       │
│                                                        │
│  ── Notifications ──                                   │
│  New job matches:  [Toggle ON]                         │
│  Scrape completed:  [Toggle ON]                        │
│  Follow-up reminders: [Toggle ON]                      │
│                                                        │
│  ── Data ──                                            │
│  [Export All Data (CSV)]                               │
│  [Clear Old Jobs (30+ days)]                           │
│  [Delete Account]                                      │
└────────────────────────────────────────────────────────┘
```

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|-----------|-------|----------------|
| Mobile | < 640px | Sidebar hidden (hamburger menu), single-column cards, stacked filters |
| Tablet | 640-1024px | Sidebar collapsed to icons, 2-column card grid |
| Desktop | 1024-1400px | Full sidebar, 2-column card grid |
| Wide | > 1400px | Full sidebar, 3-column card grid |

## Accessibility Requirements

- All interactive elements must be keyboard navigable
- ARIA labels on icon-only buttons
- Color contrast ratio minimum 4.5:1 (WCAG AA)
- Focus indicators visible on all interactive elements
- Screen reader support for job card details
- Skip navigation link at top of page
- Loading states announced to screen readers
- Form validation errors associated with inputs via `aria-describedby`
