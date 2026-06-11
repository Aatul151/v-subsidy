# React Admin Starter — Project Rules & Context

Use this file so Cursor (and other AI tools) have consistent context when editing this codebase.

---

## Tech Stack

- **Runtime**: React 18, TypeScript, Vite 5
- **UI**: Material UI (MUI) v6, Emotion
- **State**: Zustand (with persist for auth/theme/settings)
- **Data**: TanStack React Query, Axios
- **Routing**: React Router v6 (createBrowserRouter)
- **Forms**: React Hook Form, Yup, @hookform/resolvers
- **Other**: dayjs, @aatulwork/customform-renderer, CKEditor 5 (loaded via script in index.html), @dnd-kit for drag-and-drop

---

## Project Structure

```
src/
  api/           # API modules (axiosInstance, auth, users, forms, etc.)
  components/   # Reusable UI: common/, layout/, form-builder/, forms/
  features/     # Feature-based pages: auth/, dashboard/, admin/, forms/, form-builder/, settings/
  router/       # AppRouter, routeConfig, AuthGuard, RoleGuard
  store/        # Zustand stores: authStore, themeStore, settingsStore, formBuilderStore
  theme/        # MUI theme (createAppTheme), theme.d.ts
  utils/        # Helpers, form utils, types
  lib/           # CKEditor (excluded from Vite optimizeDeps)
```

- **Path alias**: `@/` → `src/` (use `@/components/...`, `@/api/...`, etc.)
- **Entry**: `main.tsx` → `App.tsx` → `AppRouter` (from `routeConfig`)

---

## Conventions

### Routing & auth

- Routes are defined in `src/router/routeConfig.tsx` as `routesConfig` (public) and `protectedRoutesConfig` (under AuthGuard).
- Each route has: `path`, `element`, `requiresAuth`, `allowedRoles?`, `useLayout?`.
- **Role hierarchy**: `superadmin` inherits `admin` (see `ROLE_HIERARCHY` and `hasRoleAccess` in routeConfig).
- Protected routes are wrapped by `AuthGuard` (redirect to `/login` if unauthenticated or role denied) and optionally `AppLayout`.
- Add new protected routes to `protectedRoutesConfig`; add public routes to `routesConfig`.

### API layer

- All API calls use `src/api/axiosInstance.ts`. Base URL: `VITE_API_BASE_URL` or `http://localhost:3100/api`.
- Token: request interceptor adds `Authorization: Bearer <token>` from `localStorage.getItem('token')`.
- On 403, interceptor clears token and redirects to `/login`.
- API modules live under `src/api/` (e.g. `auth.ts`, `users.ts`, `forms.ts`). They use `axiosInstance` and return typed responses (e.g. `AuthResponse`, `PaginatedApiResponse<T>`).
- Backend response shape: `{ success: boolean, data?: T, user?: ..., token?: string, message?: string }`. Pagination: `pagination: { currentPage, limit, total, totalPages, hasNextPage, hasPrevPage }`.

### State (Zustand)

- Auth: `useAuthStore` — `user`, `token`, `isAuthenticated`, `login`, `register`, `logout`, `initialize`. Persisted as `auth-storage`.
- Theme: `useThemeStore` — `primaryColor`, `secondaryColor`, `mode`, `sidebarCollapsed`, etc. Persisted.
- Settings: `useSettingsStore` — synced from API when authenticated; used for theme and app settings.
- Use selectors when needed (e.g. `selectUserAndRoles` from authStore).

### UI & layout

- Main layout: `AppLayout` (Sidebar + Topbar + children). Sidebar can be collapsed; state in theme store.
- Use MUI components and `sx`/Emotion. Theme is built by `createAppTheme(themeStore)` in `App.tsx` (primary/secondary/mode).
- Reusable pieces: `PageHeader`, `PageContent`, `AppDataTable`, `AppAlert`, `AppDrawer`, `AppSearchableSelect`, `FileDisplay`, `FilePreviewDialog`, `CKEditorContentDisplay`, etc.
- Favicon is updated dynamically from theme primary color in `App.tsx`.

### Forms & form builder

- Form builder: `FormBuilder` feature; drag-and-drop with @dnd-kit; sections/fields config; uses `formBuilderStore` and form definition API.
- Rendered forms use `@aatulwork/customform-renderer` and form definition JSON from the API.
- Form entries and list views live under `features/forms/` (FormEntries, ManageForms) and talk to form-definition and form-entry APIs.

### Code style

- Use functional components and TypeScript (strict).
- Prefer named exports for components and API functions.
- Colocate feature-specific components under `features/<feature>/`.
- Shared components and layout under `components/`.

---

## Environment

- `VITE_API_BASE_URL` — API base URL (default `http://localhost:3100/api`).
- Dev server runs on port 3000 (Vite config).

---

## Adding New Features

1. **New page**: Add route in `routeConfig.tsx` (`protectedRoutesConfig` or `routesConfig`), create feature under `src/features/<name>/`.
2. **New API surface**: Add module in `src/api/` using `axiosInstance`, define response types.
3. **New global state**: Add Zustand store in `src/store/`; use persist if it should survive refresh.
4. **New shared UI**: Add under `src/components/common/` or a dedicated folder under `components/`.

Keep this file updated when you add new patterns or conventions so Cursor stays in sync with the project.
