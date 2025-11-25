# Estate Management System - Design Guidelines

## Design Approach
**System-Based Approach**: Material Design principles with Tailwind UI patterns
**Rationale**: Information-dense management application requiring clear hierarchy, consistent patterns, and efficient data display across three distinct user roles.

## Typography
- **Font Family**: Inter (primary), system-ui fallback
- **Scale**: 
  - Headers: text-2xl to text-4xl, font-semibold
  - Body: text-base, font-normal
  - Labels/Meta: text-sm, font-medium
  - Data/Numbers: text-lg, font-semibold (for financial figures)

## Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, and 16 consistently
- Component padding: p-4 to p-6
- Section spacing: gap-6 to gap-8
- Page margins: px-4 md:px-8
- Card spacing: p-6

**Grid Structure**:
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Data tables: Full-width with horizontal scroll on mobile
- Forms: Single column on mobile, 2-column on desktop (grid-cols-1 md:grid-cols-2)

## Core Components

### Navigation
- **Sidebar Navigation** (Desktop): Fixed left sidebar (w-64) with role-based menu items, user profile at bottom, estate logo at top
- **Mobile**: Bottom tab bar with 4-5 primary actions, hamburger menu for secondary items
- Active states with subtle background fill and border accent

### Dashboard Cards
- Elevated cards with rounded corners (rounded-lg)
- Header with icon + title + action button
- Key metrics displayed prominently (text-3xl for numbers)
- Trend indicators (up/down arrows with percentage)
- Quick action buttons at card footer

### Data Tables
- Sticky header row
- Alternating row backgrounds for readability
- Status badges (paid/pending/overdue) with distinct visual treatments
- Row actions menu (three-dot overflow)
- Pagination at bottom with results counter
- Mobile: Convert to stacked cards with key info visible

### Forms
- Clear section grouping with headings
- Floating labels or top-aligned labels
- Input fields with consistent height (h-10 to h-12)
- Helper text below fields
- Validation states with inline error messages
- Primary action buttons at bottom right

### Status Indicators
- **Payment Status**: 
  - Paid: Green badge with checkmark
  - Pending: Yellow/amber badge with clock icon
  - Overdue: Red badge with alert icon
- **Account Status**: Colored dots or badges (Active: green, Inactive: gray, Delinquent: red)
- **Visitor Access**: QR code display in modal with expiry timer

### Modals & Overlays
- Centered modals (max-w-lg to max-w-2xl)
- Semi-transparent backdrop
- Header with title + close button
- Scrollable content area
- Sticky footer with actions

### Notifications
- Toast notifications: Top-right corner, auto-dismiss after 5s
- In-app notification center: Bell icon with badge counter
- Notification list: Avatar + message + timestamp, unread indicator

### QR Code Generation
- Large, centered QR code display (256x256 or larger)
- Visitor details card above code (name, purpose, validity period)
- Download/share buttons below
- Countdown timer for expiring codes

## Role-Specific Dashboards

### Resident Dashboard
- Welcome card with account status and outstanding balance
- Quick pay button prominently displayed if balance due
- Recent bills table (last 3-5 entries)
- Visitor management section with "Pre-approve Visitor" CTA
- Announcement/notification feed

### Admin Dashboard
- Key metrics row: Total residents, collection rate, pending payments, active visitors
- Recent activities timeline
- Quick actions: Issue bills, Send announcement, Add resident
- Delinquency report table with action buttons
- Charts: Payment trends, occupancy rate

### Security Dashboard
- Visitor verification scanner (camera or manual code entry)
- Today's approved visitors list with search/filter
- Resident lookup tool with access status indicator
- Recent gate activity log
- Quick actions: Log entry, Report incident

## Interactive Elements
- **Buttons**: 
  - Primary: Solid fill, medium weight
  - Secondary: Outlined
  - Text: No border, underline on hover
  - Sizes: h-10 (default), h-12 (prominent CTAs)
- **Links**: Underline on hover, medium font weight
- **Hover States**: Subtle background lightening, no dramatic transitions
- **Loading States**: Spinner or skeleton screens for data-heavy sections

## Responsive Behavior
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Mobile-first approach: Stack layouts vertically, full-width cards
- Hide secondary navigation on mobile, prioritize core actions
- Touch-friendly targets: min 44x44px for buttons and interactive elements

## Accessibility
- ARIA labels for all interactive elements
- Keyboard navigation support (focus states visible)
- Form inputs with proper labels and error associations
- Sufficient color contrast (WCAG AA minimum)
- Screen reader announcements for dynamic content updates

## Special Features
- **Payment Integration**: Stripe elements styled to match application theme
- **QR Scanner**: Full-screen camera overlay with targeting guide
- **Real-time Updates**: Subtle pulse animation for new notifications
- **Print Receipts**: Clean, printer-friendly CSS for payment receipts and statements

## Content Density
This is a data-rich application - embrace information density:
- Tables can show 10-15 rows per page
- Dashboard cards display multiple metrics
- Use progressive disclosure: summary view → detailed view on click
- Filters and search always visible for large datasets