# Setup Instructions

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - Copy `.env.example` to `.env` (if it exists) or create a `.env` file
   - Set `VITE_API_BASE_URL` to your backend API URL
   - Default: `http://localhost:5000/api`

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access the Application**
   - Open http://localhost:3000 in your browser
   - Register a new account or login

## Backend Requirements

The frontend expects a backend API with the following endpoints:

### Authentication Endpoints
- `POST /api/auth/login`
  - Body: `{ email: string, password: string }`
  - Returns: `{ token: string, user: { id, name, email } }`

- `POST /api/auth/register`
  - Body: `{ name: string, email: string, password: string }`
  - Returns: `{ token: string, user: { id, name, email } }`

### Forms Endpoints
- `GET /api/forms` - Get all forms
- `GET /api/forms/:id` - Get form by ID
- `POST /api/forms` - Create new form
  - Body: `{ title: string, fields: FormField[] }`
- `PUT /api/forms/:id` - Update form
- `DELETE /api/forms/:id` - Delete form

### Settings Endpoints
- `GET /api/settings/theme` - Get theme settings
  - Returns: `{ primaryColor: string, secondaryColor: string, mode: 'light' | 'dark' }`
- `PUT /api/settings/theme` - Update theme settings
  - Body: `{ primaryColor?: string, secondaryColor?: string, mode?: 'light' | 'dark' }`

## Mock Backend (For Testing)

If you don't have a backend yet, you can:

1. **Use JSON Server:**
   ```bash
   npm install -g json-server
   # Create db.json with mock data
   json-server --watch db.json --port 5000
   ```

2. **Use MSW (Mock Service Worker):**
   - Install MSW
   - Create mock handlers
   - See MSW documentation for setup

3. **Modify API files:**
   - Temporarily return mock data in `src/api/*.ts` files
   - Remove API calls and return promises with mock data

## Troubleshooting

### Port Already in Use
- Change the port in `vite.config.ts` or use `npm run dev -- --port 3001`

### TypeScript Errors
- Run `npm install` to ensure all types are installed
- Check that `tsconfig.json` paths are correct

### Build Errors
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

### API Connection Errors
- Check that your backend is running
- Verify `VITE_API_BASE_URL` in `.env` file
- Check browser console for CORS errors
- Ensure backend allows requests from `http://localhost:3000`

## Production Build

```bash
npm run build
```

The build output will be in the `dist` folder.

## Project Structure

```
react-admin-panel/
├── src/
│   ├── api/              # API layer
│   ├── components/       # Reusable components
│   ├── features/         # Feature modules
│   ├── router/           # Routing
│   ├── store/            # Zustand stores
│   ├── theme/            # Theme configuration
│   └── utils/            # Utilities
├── public/               # Static assets
├── index.html            # HTML entry point
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── vite.config.ts        # Vite configuration
└── README.md             # Project documentation
```

## Next Steps

1. Set up your backend API
2. Configure environment variables
3. Customize theme colors
4. Add additional form field types if needed
5. Implement full CKEditor integration if required
6. Add form validation rules
7. Implement form submission handling

