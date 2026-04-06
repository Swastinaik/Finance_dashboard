# Personal Finance API Implementation

This document provides a concise overview of the project's architecture, technology stack, setup procedures, and core features.

## 1. Project Overview
A robust personal financial management RESTful API built with modern Node.js and TypeScript. The application enables users to securely track their income and expenses, generate financial summaries, and manage their profile.

## 2. Technology Stack
The project leverages a modern, typesafe stack ensuring performance and developer productivity:
- **Runtime**: Node.js
- **Framework**: Express.js (v5.x, ESM support)
- **Language**: TypeScript (v6+)
- **Database**: MongoDB with **Mongoose** ORM
- **Validation**: **Zod** (Schema-based validation for all requests)
- **Security**: **JWT** (JSON Web Tokens) for authentication and **bcrypt** for password hashing
- **Testing**: **Vitest** for unit and integration testing, **Supertest** for API testing
- **Utilities**: **tsx** (for fast development execution), **dotenv** (for configuration management)

## 3. Project Structure
```text
src/
├── controllers/    # Request handlers and business logic
├── db/             # Database connection and configuration
├── middleware/     # Auth, error handling, and validation middlewares
├── models/         # Mongoose schemas and models
├── routes/         # Express router definitions
├── schemas/        # Zod validation schemas
├── utils/          # Shared utility functions (async handlers, custom error classes)
└── index.ts        # Application entry point
tests/              # Comprehensive test suites using Vitest
```

## 4. Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account or local MongoDB instance

### Installation
1. Clone the repository and navigate to the project root.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   PORT=3000
   JWT_SECRET=your_jwt_secret_key
   ```

### Running the Application
- **Development Mode**: Runs the app with `tsx` for fast reloading.
  ```bash
  npm run dev
  ```

### Running Tests
- **Run all tests**:
  ```bash
  npm test
  ```
- **Run tests in watch mode**:
  ```bash
  npm run test:watch
  ```
- **Coverage report**:
  ```bash
  npm run test:coverage
  ```

## 5. Core Features

### 🔐 Authentication & Authorization
- **Secure Registration/Login**: Uses `bcrypt` for one-way password hashing.
- **JWT Protection**: Generates JSON Web Tokens upon successful login, which are then passed in the `Authorization` header for protected routes.
- **Auth Middleware**: A central `auth.middleware.ts` validates tokens and attaches the authenticated user's ID to the request object.

### 💰 Financial Record Management (CRUD)
- Complete CRUD operations for income and expense records.
- Each record includes: `amount`, `type` (income/expense), `category`, `date`, and optional `notes`.
- **Validation**: Every request is validated against strict Zod schemas before reaching the controller.
- **Relational Integrity**: Each record is linked to a specific `userId` using Mongoose `ObjectId` references.

### 📑 Efficient Pagination
- Optimized record retrieval using `page` and `limit` query parameters.
- Built-in pagination metadata in responses:
  ```json
  "pagination": {
    "totalCount": 100,
    "totalPages": 10,
    "currentPage": 1,
    "limit": 10
  }
  ```
- Uses MongoDB `skip` and `limit` for database-level performance.

### 🧪 Comprehensive Testing
- **Unit & Integration Testing**: Extensive tests for controllers, routes, schemas, and utilities using `Vitest`.
- **API Testing**: Uses `Supertest` to simulate real HTTP requests and verify end-to-end API behavior.
- **Environment Isolation**: Tests are designed to run against isolated instances or mocks to ensure reliability.

### 📊 Financial Summaries
- Advanced aggregation of financial data (as seen in `summary.routes.test.ts`) providing users with insights into their spending habits and total balance.
