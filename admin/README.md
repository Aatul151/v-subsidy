# React Admin Panel

A modern, feature-rich admin panel built with React 18+, TypeScript, Material UI v6, and Vite.

## 🚀 Features

- **Authentication**: Login and Register pages with form validation
- **Protected Routes**: Route guards to protect authenticated pages
- **Dashboard**: Overview page with statistics and quick actions
- **Form Builder**: JSON-based dynamic form builder with drag & drop
  - Support for multiple field types (text, email, number, select, checkbox, radio, datepicker, file, rich text)
  - Visual form canvas with drag & drop reordering
  - Field configuration drawer
  - Save and load forms from API
- **Form Renderer**: Render forms from JSON schema
- **Theme Settings**: Dynamic theme customization (primary/secondary colors, light/dark mode)
- **Responsive Design**: Mobile-friendly with collapsible sidebar
- **State Management**: Zustand for global state
- **API Integration**: Axios with automatic token injection

## 📁 Project Structure

```
src/
├── api/              # API layer (axios instance, auth, forms, settings)
├── components/       # Reusable components
│   ├── layout/      # AppLayout, Sidebar, Topbar
│   └── form-builder/ # Form builder components
├── features/        # Feature modules
│   ├── auth/        # Login, Register
│   ├── dashboard/   # Dashboard page
│   ├── form-builder/ # Form builder page
│   ├── settings/    # Theme settings
│   └── users/       # Users page
├── router/          # Routing configuration
├── store/           # Zustand stores
├── theme/           # MUI theme configuration
├── utils/           # Utility functions and types
├── App.tsx          # Main app component
└── main.tsx         # Entry point
```

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   VITE_CKEDITOR_LICENSE_KEY=your_ckeditor_license_key_here
   VITE_CKEDITOR_CLOUD_SERVICES_TOKEN_URL=your_cloud_services_token_url_here
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

## 🔧 Configuration

### API Base URL

Set the `VITE_API_BASE_URL` environment variable to point to your backend API. The default is `http://localhost:5000/api`.

### Backend API Endpoints

The application expects the following API endpoints:

#### Authentication
- `POST /auth/login` - Login
- `POST /auth/register` - Register

#### Forms
- `GET /forms` - Get all forms
- `GET /forms/:id` - Get form by ID
- `POST /forms` - Create form
- `PUT /forms/:id` - Update form
- `DELETE /forms/:id` - Delete form

#### Settings
- `GET /settings/theme` - Get theme settings
- `PUT /settings/theme` - Update theme settings

## 📝 Form Builder

The Form Builder allows you to create dynamic forms with the following field types:

1. **Text Field** - Single-line text input
2. **Email** - Email input with validation
3. **Number** - Numeric input with min/max validation
4. **Select** - Dropdown with options
5. **Checkbox** - Single checkbox
6. **Radio** - Radio button group
7. **Date Picker** - Date selection
8. **File Upload** - File input
9. **Rich Text** - CKEditor (simplified implementation)

### Form JSON Schema

Forms are saved as JSON with the following structure:

```json
{
  "title": "Registration Form",
  "fields": [
    {
      "type": "text",
      "label": "Name",
      "name": "name",
      "required": true,
      "placeholder": "Enter your name"
    },
    {
      "type": "email",
      "label": "Email",
      "name": "email",
      "required": true
    },
    {
      "type": "select",
      "label": "Country",
      "name": "country",
      "options": ["USA", "Canada", "UK"],
      "required": true
    }
  ]
}
```

## 🎨 Theme Customization

The theme can be customized through the Theme Settings page:

- **Primary Color**: Main theme color
- **Secondary Color**: Accent color
- **Mode**: Light or Dark theme

Changes are saved to the backend and applied instantly.

## 🔐 Authentication

The app uses JWT tokens stored in localStorage. The token is automatically included in API requests via axios interceptors.

### Protected Routes

All routes except `/login` and `/register` are protected and require authentication.

## 📦 Dependencies

### Core
- React 18+
- TypeScript
- Vite
- Material UI v6
- React Router v6

### State Management
- Zustand

### Forms
- React Hook Form
- Yup (validation)

### Drag & Drop
- @dnd-kit/core
- @dnd-kit/sortable
- @dnd-kit/utilities

### Date Picker
- @mui/x-date-pickers
- dayjs

### HTTP Client
- Axios

## 🚧 Development Notes

### Mock Backend

For development without a backend, you can:

1. Use a mock API server (e.g., JSON Server, MSW)
2. Modify the API files to return mock data
3. Use browser DevTools to mock network requests

### CKEditor Integration

The current CKEditor implementation is simplified. For full rich text editing, you'll need to:

1. Configure CKEditor 5 properly
2. Set up the editor build
3. Handle editor initialization and data

## 📄 License

MIT

## 👨‍💻 Author

Built with ❤️ using React, TypeScript, and Material UI

