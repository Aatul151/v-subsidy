# Node.js MongoDB API Starter

A complete Node.js API starter with MongoDB, Express, and JWT authentication.

## Features

- ✅ Express.js server
- ✅ MongoDB with Mongoose
- ✅ JWT authentication
- ✅ User registration and login
- ✅ Password reset functionality
- ✅ Protected routes middleware
- ✅ User profile endpoints
- ✅ Winston logger with file and console output
- ✅ Rate limiting for API protection
- ✅ Configurable CORS settings

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Copy `.env` file and update the values:
     - `MONGODB_URI`: Your MongoDB connection string
     - `JWT_SECRET`: A secret key for JWT tokens
     - `PORT`: Server port (default: 3000)
     - `LOG_LEVEL`: Logging level (default: 'info') - options: error, warn, info, debug

3. Start MongoDB:
   - Make sure MongoDB is running on your system
   - Default connection: `mongodb://localhost:27017/node-mongo-api`

4. Run the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Authentication Routes (`/api/auth`)

- `POST /api/auth/register` - Register a new user
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```

- `POST /api/auth/login` - Login user
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

- `POST /api/auth/forgotpassword` - Request password reset
  ```json
  {
    "email": "john@example.com"
  }
  ```

- `PUT /api/auth/resetpassword/:resettoken` - Reset password
  ```json
  {
    "password": "newpassword123"
  }
  ```

### User Routes (`/api/users`)

- `GET /api/users/me` - Get current user (Protected)
  - Headers: `Authorization: Bearer <token>`

- `GET /api/users/:id` - Get user by ID (Protected)
  - Headers: `Authorization: Bearer <token>`

## Project Structure

```
node-mongo-api-starter/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── authController.js    # Authentication logic
│   └── userController.js    # User operations
├── middleware/
│   ├── auth.js              # JWT authentication middleware
│   └── rateLimiter.js       # Rate limiting middleware
├── models/
│   └── User.js              # User model
├── routes/
│   ├── authRoutes.js        # Auth routes
│   └── userRoutes.js        # User routes
├── utils/
│   └── generateToken.js     # JWT token generator
├── .env                     # Environment variables
├── .gitignore
├── package.json
├── README.md
└── server.js                # Main server file
```

## Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/node-mongo-api

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Logging Configuration
LOG_LEVEL=info

# CORS Configuration
CORS_ORIGIN=*
CORS_CREDENTIALS=false

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=5
PASSWORD_RESET_RATE_LIMIT_WINDOW_MS=3600000
PASSWORD_RESET_RATE_LIMIT_MAX=3

# Request Body Size Limit
BODY_PARSER_LIMIT=10mb

# Trust Proxy (set to true if behind reverse proxy like nginx)
TRUST_PROXY=false

# Email Configuration (for password reset - optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
```

### Environment Variable Descriptions

- **PORT**: Server port number (default: 3000)
- **NODE_ENV**: Environment mode - `development` or `production`
- **MONGODB_URI**: MongoDB connection string
- **JWT_SECRET**: Secret key for signing JWT tokens (use a strong random string in production)
- **JWT_EXPIRE**: JWT token expiration time (e.g., `7d`, `24h`, `1h`)
- **LOG_LEVEL**: Logging level - `error`, `warn`, `info`, or `debug` (default: `info`)
- **CORS_ORIGIN**: Allowed CORS origins (use `*` for all or specific domain)
- **CORS_CREDENTIALS**: Enable CORS credentials (true/false)
- **RATE_LIMIT_WINDOW_MS**: Time window for general API rate limiting in milliseconds (default: 15 minutes)
- **RATE_LIMIT_MAX**: Maximum requests per window for general API (default: 100)
- **AUTH_RATE_LIMIT_WINDOW_MS**: Time window for auth endpoints rate limiting (default: 15 minutes)
- **AUTH_RATE_LIMIT_MAX**: Maximum auth requests per window (default: 5)
- **PASSWORD_RESET_RATE_LIMIT_WINDOW_MS**: Time window for password reset rate limiting (default: 1 hour)
- **PASSWORD_RESET_RATE_LIMIT_MAX**: Maximum password reset requests per window (default: 3)
- **BODY_PARSER_LIMIT**: Maximum request body size (default: 10mb)
- **TRUST_PROXY**: Trust proxy headers (set to `true` if behind reverse proxy)
- **EMAIL_*****: Email configuration for password reset functionality

## Logging


### Log Files

Logs are stored in the `logs/` directory:
- `error.log` - Error level logs only
- `combined.log` - All logs (info, warn, error)

### Log Levels

- `error` - Error logs only
- `warn` - Warning and error logs
- `info` - Info, warning, and error logs (default)
- `debug` - All logs including debug information

## Rate Limiting

The application includes rate limiting to protect against abuse and brute force attacks.

### Rate Limiters

1. **General API Rate Limiter** (`/api/*`)
   - Default: 100 requests per 15 minutes per IP
   - Configurable via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`

2. **Authentication Rate Limiter** (login/register endpoints)
   - Default: 5 requests per 15 minutes per IP
   - Configurable via `AUTH_RATE_LIMIT_MAX` and `AUTH_RATE_LIMIT_WINDOW_MS`

3. **Password Reset Rate Limiter** (forgot/reset password endpoints)
   - Default: 3 requests per hour per IP
   - Configurable via `PASSWORD_RESET_RATE_LIMIT_MAX` and `PASSWORD_RESET_RATE_LIMIT_WINDOW_MS`

### Rate Limit Headers

Rate limit information is included in response headers:
- `RateLimit-Limit`: Maximum number of requests allowed
- `RateLimit-Remaining`: Number of requests remaining
- `RateLimit-Reset`: Time when the rate limit resets

When rate limit is exceeded, the API returns a `429 Too Many Requests` status code.

## Security Notes

- Change `JWT_SECRET` in production
- Use strong passwords
- Implement rate limiting in production
- Use HTTPS in production
- Remove reset token from response in production (send via email instead)

## License

ISC

