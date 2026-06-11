# SaaS Setup Instructions

Use this guide when setting up a **new database** (fresh MongoDB) for the API. The API auto-creates default data on first connect; you then complete setup by logging in as superadmin and importing System Forms.

---

## 1. What Gets Auto-Created (New DB)

When the API starts and connects to MongoDB, it runs **default initialization** (see `config/database.js` → `initDefaultUsers()` in `utils/initDefaultUsers.js`). If the collections are empty, the following are created automatically.

### Default users (created if they don’t exist)

| Email               | Password  | Role        | Purpose                          |
|---------------------|-----------|------------|-----------------------------------|
| `spdmin@gmail.com`  | `******`  | superadmin | First-time setup, import system forms |
| `admin@gmail.com`   | `******`  | admin      | Day-to-day admin                  |
| `guest@gmail.com`   | `******`  | guest      | Read-only / guest token use      |

All three are created with `isActive: true`. **Change these passwords after first login in production.**

### Default roles (from `config/defaultdata.js`)

- **System roles:** `superadmin`, `admin`, `user`, `guest` (always created)
- **Default roles:** Varies based on SaaS type. Currently configured for **school** type:
  - `teacher`, `student`

**Note:** Default roles will vary based on your SaaS type (school, portfolio, content provider, etc.). Update `config/defaultdata.js` → `DEFAULT_ROLES` to match your use case.

Created with fixed IDs so references stay stable.

### Default modules (from `config/defaultdata.js`)

- **System modules:** `default`, `settings` (always created)
- **Default modules:** Varies based on SaaS type. Currently configured for **school** type:
  - `people` (Student Form | Teacher Form | Parent Form | Staff Form)
  - `academic` (Academic Module | Student Profile Form | Class Allocation Form | Subject Mapping Form)
  - `administration` (Academic Year Setup | School Configuration)
  - `finance` (Fee Structure Form | Fee Payment Form)
  - `communication` (Announcement Form | Message Template Form | Notification Settings Form)

**Note:** Default modules will vary based on your SaaS type (school, portfolio, content provider, etc.). Update `config/defaultdata.js` → `DEFAULT_MODULES` to match your use case.

Each module gets a **default Form Access Rule** (via `initDefaultModuleAccess`): only `superadmin` and `admin` have create/read/update/delete. You can change these later in **Admin → Access Rules**.

### Summary

| What                | When created | Source / logic                          |
|---------------------|-------------|------------------------------------------|
| Users (3)           | On DB connect | `utils/initDefaultUsers.js`             |
| Roles (varies)      | On DB connect | `config/defaultdata.js` → SYSTEM_ROLES (always), DEFAULT_ROLES (varies by SaaS type) |
| Modules (varies)    | On DB connect | `config/defaultdata.js` → SYSTEM_MODULES (always), DEFAULT_MODULES (varies by SaaS type) |
| Form Access Rules   | Per module  | One rule per module; rolesAllowed/actions = superadmin, admin only |

**Not auto-created:** Form definitions (e.g. User form, Collections form, etc.). Those come from the **System Forms import** in the next step.

---

## 2. Manual Step: Login as Superadmin and Import System Forms

System forms (User, Role, Collections, etc.) are **not** created by the API. You must import them once using the JSON file in this repo.

### 2.1 Start the API and (if applicable) the Admin UI

- Set `MONGODB_URI` and other env vars (see project root `.env.example` or README).
- Start the API (e.g. `npm run dev`).
- Open the React Admin app (e.g. `http://localhost:3000`) and ensure it points at this API.

### 2.2 Log in as superadmin

1. Open the login page.
2. Use:
   - **Email:** `spdmin@gmail.com`
   - **Password:** `******` (see code or env for actual value; change after first login in production)
3. Log in. Only superadmin can see the **System Forms** tab and perform the import below.

### 2.3 Import System Forms from JSON

1. In the admin panel, go to **Manage Forms** (or equivalent).
2. Open the **System Forms** tab (superadmin only).
3. Use the **Import** action and choose the System Forms JSON file:
   - **File:** `docs/SYSTEM_FORM_JSON.json` (from this repo).
4. Run the import. The file contains multiple form definitions (e.g. User, Role, Collections). They will be created/updated in the database and linked to the existing default/settings modules.

After this, the SaaS is set up up to this point: default users, roles, modules, access rules, and system forms are in place. You can then create more forms, adjust access rules, and add users as needed.

---

## 3. Quick Reference

- **Default users:** `utils/initDefaultUsers.js`
- **Default roles/modules data:** `config/defaultdata.js` (update `DEFAULT_ROLES` and `DEFAULT_MODULES` for your SaaS type)
- **Default access rule per module:** `utils/initDefaultModuleAccess.js`
- **System forms JSON:** `docs/SYSTEM_FORM_JSON.json`
- **Change default passwords** after first login in production.
- **Customize for your SaaS type:** Edit `config/defaultdata.js` before first run to set roles/modules for school, portfolio, content provider, etc.
