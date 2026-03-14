# API Documentation

## Authentication Endpoints

### NextAuth.js Authentication Handler

**Endpoint:** `/api/auth/[...nextauth]`  
**Methods:** `GET`, `POST`  
**Framework:** NextAuth.js dynamic route handler

This endpoint handles all NextAuth.js authentication flows through the catch-all dynamic route.

#### Available Sub-endpoints:

##### 1. Sign In
- **URL:** `/api/auth/signin`
- **Method:** `POST`
- **Auth Requirements:** None
- **Purpose:** Authenticate user with email and OTP code

**Request Shape:**
```typescript
{
  email: string;     // User's email address
  code: string;      // 6-digit verification code
  csrfToken: string; // CSRF protection token
  callbackUrl?: string; // Optional redirect URL
}
```

**Response Shape (Success):**
```typescript
{
  url: string; // Redirect URL after successful authentication
}
```

**Response Shape (Error):**
```typescript
{
  error: string; // Error message (e.g., "CredentialsSignin")
  url: string;   // Redirect URL with error parameter
}
```

**Data Flow:**
1. Client submits email and OTP code via form
2. NextAuth calls the `email-otp` credentials provider
3. Provider validates email format and code presence
4. Checks if production database is available
5. Queries `verification_codes` table for matching email, code, and valid expiration
6. If match found, deletes the used verification code
7. Returns user object with email as ID
8. JWT token created with user data
9. Session established and user redirected

##### 2. Sign Out
- **URL:** `/api/auth/signout`
- **Method:** `POST`
- **Auth Requirements:** Valid session
- **Purpose:** Terminate user session

**Request Shape:**
```typescript
{
  csrfToken: string; // CSRF protection token
}
```

**Response Shape:**
```typescript
{
  url: string; // Redirect URL after sign out
}
```

##### 3. Session
- **URL:** `/api/auth/session`
- **Method:** `GET`
- **Auth Requirements:** None (returns null if not authenticated)
- **Purpose:** Get current session data

**Response Shape (Authenticated):**
```typescript
{
  user: {
    email: string;
    name: string;
    image?: string;
  };
  expires: string; // ISO date string
}
```

**Response Shape (Not Authenticated):**
```typescript
null
```

##### 4. CSRF Token
- **URL:** `/api/auth/csrf`
- **Method:** `GET`
- **Auth Requirements:** None
- **Purpose:** Get CSRF token for form protection

**Response Shape:**
```typescript
{
  csrfToken: string;
}
```

##### 5. Providers
- **URL:** `/api/auth/providers`
- **Method:** `GET`
- **Auth Requirements:** None
- **Purpose:** Get available authentication providers

**Response Shape:**
```typescript
{
  "email-otp": {
    id: "email-otp";
    name: "Email";
    type: "credentials";
    signinUrl: string;
    callbackUrl: string;
  }
}
```

## Authentication Configuration Details

### Credentials Provider: `email-otp`

**Validation Logic:**
1. Requires both email and code parameters
2. Only works in production database environment
3. Converts email to lowercase for consistency
4. Queries verification codes with conditions:
   - Exact email match
   - Exact code match  
   - Expiration date in future
5. Limits query to 1 result
6. Deletes verification code after successful use (one-time use)

**User Object Creation:**
```typescript
{
  id: string;    // User's email address
  email: string; // User's email address
  name: string;  // Username derived from email (part before @)
}
```

### Session Management

**Strategy:** JWT (JSON Web Tokens)
- No server-side session storage
- Session data stored in encrypted JWT cookie
- Token contains user email and name

**JWT Callback:**
- Adds user email and name to token on sign-in
- Preserves existing token data on subsequent requests

**Session Callback:**
- Populates session.user with data from JWT token
- Ensures email and name are available in client session

### Security Features

1. **CSRF Protection:** Built-in CSRF token validation
2. **Code Expiration:** Verification codes have time limits
3. **One-time Use:** Codes deleted after successful authentication
4. **Production Only:** Authentication only works with production database
5. **Email Normalization:** Emails converted to lowercase
6. **JWT Encryption:** Session tokens are encrypted

### Error Handling

**Common Error Scenarios:**
- Invalid or expired verification code
- Missing email or code parameters
- Non-production database environment
- Database connection issues
- CSRF token mismatch

**Error Response Format:**
Errors are handled by NextAuth.js and typically redirect to sign-in page with error parameter in URL.

This authentication system provides a secure, OTP-based login flow with proper session management and CSRF protection, designed specifically for production environments with database-backed verification code storage.