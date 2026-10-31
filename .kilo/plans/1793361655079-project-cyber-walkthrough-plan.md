# Plan: Comprehensive Project Cyber Walkthrough & PDF Documentation Generation

## 1. Goal
Provide a rigorous, deep, system-wide technical walkthrough of **Project Cyber (Website Kantin Kampus)** covering backend Go, frontend Next.js (with Zustand, React Query, Zod), PostgreSQL database, authentication/authorization, security mechanisms, test suites (Vitest, Playwright, Go integration tests), and document the complete analysis into a PDF file located at `C:\Users\HP\Documents\marketplace\docs\project-cyber-walkthrough.pdf`.

---

## 2. Scope & Structure of the Walkthrough Document
The walkthrough document will cover all 15 requested sections in exhaustive detail, referencing exact file paths, function/struct names, and code logic:
1. **Gambaran Besar Project Cyber**: Application purpose, actors, tech stack matrix (Backend Go, Frontend Next.js, PostgreSQL, Supabase, Mailjet).
2. **Struktur Folder & Source Code**: Tree-based breakdown of `services/api/` and `apps/web/`.
3. **Arsitektur & Hubungan Antarkomponen**: Mermaid diagram tracing requests from Browser -> Next.js Proxy -> Go Router -> Middleware -> Handler -> Service -> Repository -> PostgreSQL / Supabase / Mailjet.
4. **Backend Go Secara Mendalam**: Entry point (`cmd/api/main.go`), routing (`internal/http/server.go`), handlers, business logic services, and SQL execution (`database/sql` + `pgx`).
5. **Logika Source Code**: Step-by-step conditional branch analysis (if/else, error handling, context cancellation, panic recovery, defer).
6. **Flowchart Setiap Fitur**: Mermaid diagrams for Register, Login, Verify OTP, Refresh, Checkout, Order Fulfillment, etc.
7. **Database PostgreSQL**: Migrations (`0001` to `0009`), schema, constraints, indexes, and ERD Mermaid diagram.
8. **Authentication & Authorization**: Password hashing (bcrypt), JWT access tokens in memory, HttpOnly refresh token cookies, double-submit CSRF, CORS, session rotation & revocation, role-based middleware (`buyer`, `seller`, `admin`).
9. **Frontend Next.js & State Management**: 
   - State management via **Zustand** (`auth-store.ts`) for session and auth status.
   - Server state caching & synchronization via **@tanstack/react-query** (`use-cart.ts`, queries/mutations).
   - Form validation via **Zod** schema validation (`login-form.tsx`, `register-form.tsx`, `stall-form.tsx`, `product-form.tsx`).
   - API Client layer (`client.ts`) with silent token refresh and 401 interceptors.
10. **Integrasi Layanan Eksternal**: Supabase Storage (image upload/secure access), Mailjet (email OTP delivery via Outbox worker).
11. **Simulasi Skenario Nyata**: Scenarios A to G (Successful login, failed login, expired token, unauthorized seller action, successful checkout, failed checkout due to stock/database).
12. **Testing & Quality Gate**: Go integration tests (`tests/integration/`), Vitest unit tests (`apps/web/src/**/*.test.ts`), Playwright E2E tests (`apps/web/src/e2e/`), `go vet`, TypeScript typecheck (`tsc --noEmit`), and GitHub Actions CI workflow.
13. **Kekurangan, Bug, & Pekerjaan Tertunda**: Unimplemented features, security disclaimers, local dev constraints.
14. **Kesimpulan & Materi Belajar**: Glossary of technical terms, key functions table, presentation material for academic/team defense, and 20 comprehension quiz questions.
15. **PDF Generation Strategy**: Conversion of the comprehensive Markdown report into a well-formatted PDF inside `docs/` using pandoc / Node script / Weasyprint or equivalent markdown-to-pdf pipeline.

---

## 3. Execution Steps
1. Finalize plan and exit plan mode.
2. Generate the Markdown report combining all codebase analyses.
3. Compile the Markdown report into a professional PDF at `C:\Users\HP\Documents\marketplace\docs\project-cyber-walkthrough.pdf`.
