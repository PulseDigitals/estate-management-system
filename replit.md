# Estate Management System

## Overview
The Estate Management System is a comprehensive web application for managing residential estates. Its primary purpose is to streamline resident billing and levy collection, implement QR code-based visitor access control, enhance security management, and provide real-time notifications. The system supports three user roles: residents, estate administrators, and security personnel, offering role-specific dashboards and functionalities. The project aims to deliver a robust, scalable solution for modern estate management, improving efficiency, security, and resident satisfaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript, using Vite.
- **UI**: Shadcn UI (Radix UI base) with Material Design principles and Tailwind UI patterns.
- **Styling**: Tailwind CSS with custom design tokens, supporting light/dark themes.
- **State Management**: TanStack Query for server state.
- **Routing**: Wouter for client-side routing with role-based protection.
- **Forms**: React Hook Form with Zod validation.

### Backend
- **Framework**: Express.js with Node.js and TypeScript.
- **Authentication**: Replit's OpenID Connect (OIDC) with Passport.js; sessions in PostgreSQL.
- **API**: RESTful, role-based authorization, organized by user role.
- **Session Management**: Express-session with PostgreSQL store and secure, HTTP-only cookies.
- **Business Logic**: Delinquency checking, balance tracking, access code generation, financial reporting.
- **Request Body Limits**: Configured to 10MB to support large receipt image uploads.

### Data Storage
- **Database**: PostgreSQL via Neon's serverless driver.
- **ORM**: Drizzle ORM for type-safe queries.
- **Schema**: Comprehensive, covering users, residents, bills, payments, visitors, notifications, access logs, announcements, sessions, and a full double-entry accounting system.
- **Migrations**: Drizzle Kit.

### Authentication & Authorization
- **Provider**: Replit Auth (OpenID Connect).
- **User Roles**: Four-tier system (resident, admin, security, accountant) enforced at route and API levels.
- **Signup Flow**: Self-service resident registration via Replit Auth.
- **User Invite System**: Token-based invite links for onboarding new users with predefined roles.

### System Features
- **Account Status Workflow**: Financial analysis tool for administrators with resident filtering by ID.
- **Accounting System**: Modified cash-based double-entry bookkeeping with configurable Chart of Accounts, Transaction Templates, and Journal Entry system, and financial reports. Tailored for Magodo Residents Association - South East Zone.
- **Budget & Planning System**: Comprehensive budget planning and tracking with automated consumption tracking.
- **Automated Service Charge Billing**: Automatically generates bills upon resident registration and via daily scheduled checks.
- **Invoice Email Delivery System**: Professional email notifications sent automatically when bills are generated, using personalized HTML templates.
- **Invoice PDF Generation**: Professional PDF invoice generator using pdfkit with Nigerian Naira formatting.
- **Reports Center**: Comprehensive reporting system for administrators including Operational, Financial, and Accounting categories.
- **CSV Export**: Comprehensive CSV download functionality across all 13 reports (8 dialog-based reports, 2 backend-generated reports, and 3 accounting statement pages) with proper currency formatting, date formatting, and empty data handling.
- **Vendor Management System**: Interface for managing approved vendors.
- **Expense Request Enhancements**: Includes receipt upload functionality and expense classification.
- **Accounts Payable Workflow**: Manages approved expenses with payment status tracking and WHT management.
- **Accounts Receivable Workflow**: Manages outstanding resident bills with automatic invoice numbering and payment application.

## External Dependencies

- **Payment Processing**: Stripe (`@stripe/stripe-js`, `@stripe/react-stripe-js`).
- **Email Delivery**: Resend (`resend`).
- **QR Code Generation**: `qrcode` npm package.
- **Database**: Neon serverless PostgreSQL (`@neondatabase/serverless`).
- **Session Storage**: `connect-pg-simple`.
- **UI Components**: Radix UI primitives (`@radix-ui/*`).
- **Fonts**: Google Fonts (Inter family).