# Node Mongo API Starter — Project Rules & Context

Use this file so Cursor (and other AI tools) have consistent context when editing this codebase.

---

## Tech Stack

- **Runtime**: Node.js (ES modules)
- **Framework**: Express 4
- **Database**: MongoDB with Mongoose 8
- **Auth**: JWT (jsonwebtoken), bcryptjs
- **Validation**: express-validator (where used)
- **File uploads**: Multer; optional S3 via @aws-sdk/client-s3
- **Realtime**: Socket.IO (server in server.js, config in config/socket.js)
- **Logging**: Winston (config/logger.js)
- **Other**: dotenv, cors, express-rate-limit, csv-parser, csv-writer

---

## Project Structure

```
config/         # database.js, logger.js, socket.js, roles.js, defaultdata.js
controllers/    # authController, userController, moduleController, formEntryController, etc.
middleware/     # auth.js (protect, requireRoles), rateLimiter, requestLogger, upload
models/         # User, Role, Module, FormDefinition, FormAccessRules, Settings; models/base/, helpers for dynamic form entries
routes/         # authRoutes, userRoutes, moduleRoutes, formEntryRoutes, formDefinitionRoutes, etc.
services/       # notificationService, fileUploadService, permissionService (central permission logic)
utils/          # generateToken, populateReferences, formEntryTransformer, buildMongoFilter, initDefaultUsers, etc.
helpers/        # formEntryModelFactory, validateModuleName
```

- **Entry**: `server.js` — connects DB, mounts middleware, mounts routes under `/api/*`, creates HTTP server + Socket.IO, starts listen.

---

## Conventions

### API design

- Base path: `/api`. Routes mounted as `/api/auth`, `/api/users`, `/api/modules`, `/api/form-entries`, `/api/form-access-rules`, `/api/form-definitions`, `/api/settings`, `/api/roles`, `/api/file-upload`.
- Standard response shape:
  - Success: `{ success: true, data?: T, user?: T, token?: string, message?: string, pagination?: {...} }`.
  - Error: `{ success: false, message: string, error?: string }` (error only in development).
- Pagination: `page`, `limit` query params; response includes `pagination: { currentPage, limit, total, totalPages, hasNextPage, hasPrevPage }` and `data` array.
- Use `logger` from `config/logger.js` for all logging (info, warn, error, debug). No `console.log` in production paths.

### Auth & roles

- **Middleware**: `protect` (JWT from `Authorization: Bearer <token>`, sets `req.user`), `requireRoles(allowedRoles)` (use after protect).
- **Roles**: Defined in `config/roles.js`. `ADMIN_ROLES = ['admin', 'superadmin']`. User roles: `user`, `admin`, `superadmin`, `guest`. Use `requireRoles(ADMIN_ROLES)` for admin-only routes.

### Permissions (single place)

- **All permission logic lives in `services/permissionService.js`.** Import from there for role checks and module/form access.
- **Exports**: `ADMIN_ROLES`, `isAdmin`, `VALID_ACTIONS`, `isValidAction`, `validateModuleAccess(userRole, form, action)`, `canUserAccessFormDefinition(user, formDefinition)`, `checkFormAccessMiddleware(moduleName, action)`, `getModuleAccessRule`, `checkModuleAccessByModuleName`, `isRoleAllowedForAction`.
- **Use**: Controllers and routes import from `permissionService` for admin checks and form/module access. For route-level module access use `checkFormAccessMiddleware(moduleName, action)` from the service.
- **Guest**: Guest users cannot login; use public guest-token endpoint for session. Check `user.role === 'guest'` where needed.
- **Inactive users**: `User.isActive`; protect middleware returns 403 if user is not active.
- Token: `utils/generateToken.js` (JWT with user id). Secret from `process.env.JWT_SECRET`.

### Routes pattern

- Each domain has a route file (e.g. `authRoutes.js`, `userRoutes.js`) and a controller (e.g. `authController.js`, `userController.js`).
- Route file: `express.Router()`, apply `protect` and/or `requireRoles(ADMIN_ROLES)` and optional `apiLimiter`/`authLimiter`, then map methods to controller functions. Export default router.
- Controllers: async (req, res). Use try/catch; on error log with logger and respond with appropriate status (400, 401, 403, 404, 500). Do not leak stack or internal details in production (use `process.env.NODE_ENV === 'development'` for error message).

### Models (Mongoose)

- **User**: name, email, password (select: false, hashed in pre-save), role, isActive, resetPasswordToken, resetPasswordExpire. Method: `matchPassword`.
- **FormDefinition**: title, name (unique), collectionName, module (ref Module), sections (Mixed), formType (system|custom), settings, createdBy/updatedBy (ref User).
- **Module**: Used for form grouping; collection name for dynamic form entries may be derived from module.
- **Dynamic form entries**: Built via `helpers/formEntryModelFactory.js`; base in `models/base/BaseFormEntry.js`. Form entry and file-upload controllers use `validateModuleAccess` from `permissionService` for access checks.
- Use `timestamps: true` where appropriate. Export model as default.

### File uploads

- Middleware: `middleware/upload.js` (Multer). Temp file cleanup on startup and periodically (env: `TEMP_FILE_CLEANUP_INTERVAL_HOURS`, `TEMP_FILE_MAX_AGE_HOURS`).
- Static files: `app.use('/media', express.static(path.join(__dirname, 'media')))`.
- S3: optional, via `services/fileUploadService.js` and @aws-sdk/client-s3.

### Environment

- Load with `dotenv.config()` at top of server.js.
- Important vars: `MONGODB_URI`, `JWT_SECRET`, `PORT`, `CORS_ORIGIN`, `CORS_CREDENTIALS`, `NODE_ENV`, `TRUST_PROXY` (for rate limiting), `BODY_PARSER_LIMIT`. Optional: S3, temp file cleanup intervals.

### Socket.IO

- Server created in server.js and passed to `setSocketIO(io)` (config/socket.js) so other modules can emit. Connection/disconnect logged in server.js.

---

## Adding New Features

1. **New resource**: Add model in `models/`, controller in `controllers/`, route file in `routes/`, mount in server.js (`app.use('/api/<path>', routeModule)`).
2. **New protected route**: In route file, use `protect` then optionally `requireRoles([...])`.
3. **New middleware**: Add in `middleware/`, use in server.js or in specific route files.
4. **Config changes**: Prefer `config/` and env vars; document new env in this file or a README.

Keep this file updated when you add new patterns or conventions so Cursor stays in sync with the project.
