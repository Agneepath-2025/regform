# DMZ API Integration

This document explains how the registration system integrates with the DMZ API for managing user registrations.

## Overview

When a user completes their sport registration through the regform portal, their information is automatically synced to the DMZ database. This enables access control and user management across the Agneepath infrastructure.

## How It Works

### Automatic Registration
When a user clicks "Complete Registration" on the dashboard:
1. The `completeRegistration` API endpoint is called
2. User's `registrationDone` status is set to `true` in MongoDB
3. **User data is automatically sent to the DMZ API**
4. User information is synced to Google Sheets

### User Data Synced
The following information is sent to the DMZ:
- **Email**: User's email address
- **Name**: Full name
- **University**: University/institution name
- **Phone**: Contact phone number

## API Endpoints

### Add User (POST)
**Endpoint:** `https://dmz.agneepath.co.in/api/users`

**Headers:**
- `Content-Type: application/json`
- `X-API-Key: <DMZ_API_KEY>`

**Body:**
```json
{
  "email": "user@example.com",
  "name": "Hedwig Nitin",
  "university": "Ashoka University",
  "phone": "+919876543210"
}
```

### Remove User (DELETE)
**Endpoint:** `https://dmz.agneepath.co.in/api/users`

**Headers:**
- `Content-Type: application/json`
- `X-API-Key: <DMZ_API_KEY>`

**Body:**
```json
{
  "email": "user@example.com"
}
```

## Configuration

### Environment Variables
Add these to your `.env.local` and `.env.production`:

```bash
# DMZ API Configuration
DMZ_API_URL=https://dmz.agneepath.co.in/api/users
DMZ_API_KEY=your-api-key-here
```

### Testing Locally
To test the DMZ integration:

1. Ensure DMZ_API_KEY is set in `.env.local`
2. Complete a test registration
3. Check server logs for DMZ API responses:
   - Success: `[DMZ] User added successfully: user@example.com`
   - Error: `[DMZ] Failed to add user: <error message>`

## Error Handling

The DMZ API integration is **non-blocking**:
- If the DMZ API fails, registration still completes successfully
- Errors are logged to the console but don't affect the user experience
- This ensures the registration process is resilient

### Common Errors

**Missing API Key:**
```
[DMZ] API key not configured
```
**Solution:** Set `DMZ_API_KEY` in environment variables

**Network Error:**
```
[DMZ] Error adding user: fetch failed
```
**Solution:** Check network connectivity and DMZ API status

**Authentication Failed:**
```
[DMZ] Failed to add user: HTTP 401
```
**Solution:** Verify the API key is correct

## Implementation Details

### Code Location
- **Utility Functions:** `/app/utils/dmz-api.ts`
- **Integration Point:** `/app/api/form/completeRegistration/route.ts`

### Key Functions

#### `addUserToDmz(user)`
Adds a user to the DMZ database after registration completion.

```typescript
addUserToDmz({
  email: user.email,
  name: user.name,
  university: user.universityName,
  phone: user.phone
}).catch(err => {
  console.error("[DMZ] Failed to add user:", err);
});
```

#### `removeUserFromDmz(email)`
Removes a user from the DMZ database.

```typescript
removeUserFromDmz(email).catch(err => {
  console.error("[DMZ] Failed to remove user:", err);
});
```

#### `swapUserInDmz(oldEmail, newUser)`
Replaces one user with another (remove old, add new).

```typescript
swapUserInDmz(
  "old@example.com",
  {
    email: "new@example.com",
    name: "New Name",
    university: "New University",
    phone: "+919999999999"
  }
);
```

## Future Enhancements

### Manual User Management
For swapping users or manual management, you can:

1. **Remove a user:**
```bash
curl -X DELETE https://dmz.agneepath.co.in/api/users \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-key>" \
  -d '{"email": "user@example.com"}'
```

2. **Add a new user:**
```bash
curl -X POST https://dmz.agneepath.co.in/api/users \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-key>" \
  -d '{
    "email": "newuser@example.com",
    "name": "New User",
    "university": "New University",
    "phone": "+919999999999"
  }'
```

### Potential Admin Features
- Bulk user sync button in admin portal
- Manual user swap interface
- DMZ sync status dashboard
- Retry failed syncs automatically

## Security Notes

- **API Key Security:** The DMZ_API_KEY should be kept secret
- **Never commit** `.env.local` or `.env.production` to git
- Use different API keys for development and production
- The API key is stored server-side only (not exposed to client)

## Troubleshooting

### Check if DMZ sync is working

1. **Monitor server logs:**
```bash
# During registration completion, look for:
[DMZ] User added successfully: user@example.com
```

2. **Test manually with curl:**
```bash
curl -X POST https://dmz.agneepath.co.in/api/users \
  -H "Content-Type: application/json" \
  -H "X-API-Key: 1VQYErnSMVn5l/K1IZkTDO8Hsu1Mv3ASs7eAl9oEghs" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "university": "Test University",
    "phone": "+919876543210"
  }'
```

### Verify Environment Variable
```bash
# In your project directory
cat .env.local | grep DMZ_API
```

## Contact

For issues with the DMZ API integration:
- Check server logs first
- Verify environment variables are set
- Test with curl commands
- Contact tech team if DMZ API is down

---

**Last Updated:** January 15, 2026
