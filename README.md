# SaaS Core

Monorepo containing the API backend and admin panel for FixedCMS.

## Project Structure

| Directory | Description |
|-----------|-------------|
| `api/` | Node.js API with Express, MongoDB, and JWT authentication |
| `admin/` | React admin panel (Vite + TypeScript + MUI) |

## Prerequisites

- Node.js 24
- MongoDB

## Setup

1. **Install dependencies** for each project:

   ```bash
   cd api && npm install && cd ..
   cd admin && npm install && cd ..
   ```

2. **Configure environment** – Create `.env` files in `api/` and `admin/` as needed (see each project's documentation).

## Scripts

From the project root:

| Command | Description |
|---------|-------------|
| `npm run api` | Start the API dev server |
| `npm run admin` | Start the admin panel dev server |

Run each in a separate terminal. For more scripts and options, see the `package.json` in `api/` and `admin/`.
