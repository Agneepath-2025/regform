# Admin Portal Setup Guide

This guide explains how to set up and use the admin portal for managing Agneepath registrations.

## Features

- **Google OAuth Authentication**: Secure login restricted to authorized admin emails
- **User Management**: View and edit all registered users
- **Form Management**: View and manage all submitted registration forms
- **Real-time Updates**: Edit registration statuses, payment statuses, and user details
- **Dashboard Statistics**: Quick overview of registrations, payments, and forms

## Prerequisites

1. Google Cloud Project with OAuth 2.0 credentials
2. MongoDB database (local or remote)
3. Admin email addresses

## Setup Instructions

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. For **Application type**, select **Web application**
7. Add authorized redirect URIs:
   - For local development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`
8. Save and copy the **Client ID** and **Client Secret**

### 2. Configure Environment Variables

Create or update `.env.local` file in the `regform` directory:

```env
# Existing MongoDB configuration
MONGODB_URI=mongodb://localhost:27017
DB_NAME=agneepath

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# Admin Email Addresses (comma-separated)
ADMIN_EMAILS=admin1@example.com,admin2@example.com,admin3@example.com
```

**Important Notes:**
- Replace `your-google-client-id-here` with your actual Google Client ID
- Replace `your-google-client-secret-here` with your actual Google Client Secret
- Replace admin email addresses with actual authorized admin emails
- Generate `NEXTAUTH_SECRET` using: `openssl rand -base64 32`

### 3. Update Middleware

The current project has a `middleware.ts` file. We need to update it to support admin routes.

**Option A: Merge with existing middleware**
If your current middleware is important, merge the admin middleware logic into your existing `middleware.ts`.

**Option B: Use separate admin middleware (recommended for testing)**
The admin routes are protected by the middleware in `middleware-admin.ts`. You can test this first before integrating with your main middleware.

### 4. Start the Development Server

```bash
cd /Users/nitin/Documents/agneepath/regform
npm run dev
```

### 5. Access the Admin Portal

1. Navigate to `http://localhost:3000/admin`
2. You'll be redirected to the login page
3. Click "Sign in with Google"
4. Sign in with an authorized admin email
5. You'll be redirected to the admin dashboard

## Admin Portal Structure

```
/admin
├── /login          # Google OAuth login page
├── /               # Main admin dashboard
│   ├── Users Tab   # View and edit all users
│   └── Forms Tab   # View and edit all forms
```

## Usage

### Managing Users

1. Go to the **Users** tab
2. View all registered users with their details
3. Click **Edit** on any user to:
   - Update name, email, phone, university
   - Toggle email verification status
   - Toggle registration completion status
   - Toggle payment completion status

### Managing Forms

1. Go to the **Forms** tab
2. View all submitted forms
3. Click **View/Edit** on any form to:
   - Change form status (draft, submitted, confirmed, rejected)
   - View detailed form fields (players, coaches, etc.)
   - View owner information

### Dashboard Statistics

The top of the dashboard shows:
- Total Users
- Verified Users
- Completed Registrations
- Completed Payments
- Total Forms
- Submitted Forms

## Security Considerations

1. **Email Whitelist**: Only emails listed in `ADMIN_EMAILS` can access the admin portal
2. **Session Management**: Sessions are managed by NextAuth.js with secure cookies
3. **API Protection**: All admin API routes check for valid authentication
4. **HTTPS**: Use HTTPS in production for secure OAuth flow

## API Endpoints

### Users
- `GET /api/admin/registrations` - Get all users
- `GET /api/admin/registrations/[id]` - Get specific user
- `PATCH /api/admin/registrations/[id]` - Update user

### Forms
- `GET /api/admin/forms` - Get all forms
- `GET /api/admin/forms/[id]` - Get specific form
- `PATCH /api/admin/forms/[id]` - Update form

## Troubleshooting

### "Unauthorized" Error
- Check that your email is in the `ADMIN_EMAILS` list
- Verify environment variables are loaded correctly
- Clear cookies and try logging in again

### OAuth Redirect Error
- Verify redirect URIs in Google Cloud Console match exactly
- Check `NEXTAUTH_URL` is set correctly
- Ensure Google+ API is enabled

### Database Connection Error
- Verify MongoDB is running: `npm run db:start`
- Check `MONGODB_URI` in environment variables
- Test connection with MongoDB Compass

### Middleware Conflicts
- If you have existing middleware, you may need to merge the logic
- Check the `middleware.ts` file for conflicts
- The admin middleware only protects `/admin/*` routes

## Production Deployment

1. Update environment variables:
   ```env
   NEXTAUTH_URL=https://yourdomain.com
   MONGODB_URI=your-production-mongodb-uri
   ```

2. Add production redirect URI to Google OAuth:
   - `https://yourdomain.com/api/auth/callback/google`

3. Generate strong `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

4. Deploy your application

## Adding More Admins

To add more admin users, simply update the `NEXTAUTH_ADMIN_EMAILS` environment variable:

```env
NEXTAUTH_ADMIN_EMAILS=admin1@example.com,admin2@example.com,newadmin@example.com
```

Restart your server for changes to take effect.

## Future Enhancements

Potential features to add:
- Export data to CSV/Excel
- Advanced filtering and search
- Bulk operations
- Email notifications
- Audit log for admin actions
- Role-based permissions (super admin, viewer, editor)
- Form field inline editing
- Custom form validation overrides

---

**Last Updated:** December 26, 2024
**Version:** 1.0.0
