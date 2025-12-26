# Admin Portal - Advanced Registration Management

## Overview
The admin portal now includes comprehensive tools for fully modifying existing registrations with automatic synchronization to both MongoDB and Google Sheets.

## Key Features

### 1. Advanced User Editing
**File:** `app/admin/edit-user-advanced-dialog.tsx`

Features:
- **Basic Info Tab**: Edit name, email, phone, university
- **Sport Registrations Tab**: 
  - Add new sport registrations
  - Remove existing sport registrations
  - Edit form data as JSON with live preview
  - View player counts and creation dates
- **Status Flags Tab**: Toggle verification, registration, and payment status
- **Google Sheets Sync**: Manual sync button with loading state

### 2. Advanced Form Editing
**File:** `app/admin/edit-form-advanced-dialog.tsx`

Features:
- **Players Tab**: 
  - Add players with name, email, phone, DOB
  - Remove existing players
  - Visual list of all current players
- **Raw JSON Tab**: Direct JSON editing with validation
- **Owner Info Tab**: View form owner details and timestamps
- **Status Tab**: Change form status (draft/submitted/confirmed/rejected)
- **Google Sheets Sync**: Manual sync button

### 3. Mode Toggle
Both user and form management now support:
- **Simple Mode**: Basic editing interface (original)
- **Advanced Mode**: Full control with JSON editing and comprehensive features

Toggle via switch in the card header of each tab.

## API Enhancements

### Updated Endpoints

#### `PATCH /api/admin/registrations/[id]`
**Enhancements:**
- Now accepts `submittedForms` field
- Automatically updates corresponding documents in `form` collection
- Creates new form documents if they don't exist
- Updates existing form documents if found
- Triggers Google Sheets sync via webhook (non-blocking)

**Allowed Fields:**
- name
- email
- phone
- universityName
- emailVerified
- registrationDone
- paymentDone
- **submittedForms** (NEW)

#### `PATCH /api/admin/forms/[id]`
**Already supports:**
- status updates
- fields updates (full replacement)

## Data Synchronization

### MongoDB → Google Sheets Flow

1. **User Update**: Admin modifies user data
2. **MongoDB Update**: Changes saved to users collection
3. **Form Collection Sync**: If submittedForms changed, form collection is updated
4. **Webhook Trigger**: Background sync request sent to `/api/sync/event`
5. **Google Sheets Sync**: Data synced to Google Sheets asynchronously

### Manual Sync
Both advanced dialogs include a "Sync to Sheets" button that:
- Syncs users collection to "Users" sheet
- Syncs form collection to "Forms" sheet
- Shows loading state during sync
- Non-blocking (doesn't prevent other operations)

## Form Validation Rules

As defined in `app/utils/forms/schema.ts`:

### Player Fields Validation
- **Name**: Required, min 1 character
- **Date of Birth**: Age must be 17-25 years on Feb 1, 2026
- **Email**: Required, valid email format
- **Phone**: Required, 10-15 digits
- **Photo**: Optional

### Sport-Specific Rules
Each sport has defined min/max player requirements:
- Badminton: 5-7 players
- Basketball: 10-12 players
- Football: 16-18 players
- Cricket: 15-17 players
- etc.

## Usage

### Edit User (Advanced Mode)

1. Go to Admin Dashboard → Users tab
2. Enable "Advanced Mode" toggle
3. Click "Edit" on any user
4. Navigate between tabs:
   - **Basic Info**: Edit core user details
   - **Sport Registrations**: Manage sport-specific registrations
   - **Status Flags**: Toggle verification/payment status
5. Click "Save All Changes"
6. Optionally click "Sync to Sheets" for immediate sync

### Edit Form (Advanced Mode)

1. Go to Admin Dashboard → Forms tab
2. Enable "Advanced Mode" toggle
3. Click "View/Edit" on any form
4. Navigate between tabs:
   - **Players**: Add/remove players with UI
   - **Raw JSON**: Direct JSON editing
   - **Owner Info**: View owner details
   - **Status**: Change form status
5. Click "Save All Changes"
6. Optionally click "Sync to Sheets" for immediate sync

### Adding Sport Registration

1. Open user in advanced mode
2. Go to "Sport Registrations" tab
3. Select sport from dropdown
4. Click "Add Sport"
5. Edit the JSON data for the sport
6. Click "Update Sport Data"
7. Save changes

### Adding Players to Form

**Method 1: UI (Advanced Form Dialog)**
1. Open form in advanced mode
2. Go to "Players" tab
3. Fill in player details
4. Click "Add Player"
5. Save changes

**Method 2: JSON (Advanced Form Dialog)**
1. Go to "Raw JSON" tab
2. Edit playerFields array directly
3. Ensure valid JSON format
4. Save changes

## Data Structure

### User Document (with submittedForms)
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string",
  "phone": "string",
  "universityName": "string",
  "emailVerified": boolean,
  "registrationDone": boolean,
  "paymentDone": boolean,
  "submittedForms": {
    "Basketball_Men": {
      "title": "Basketball (Men)",
      "status": "submitted",
      "fields": {
        "playerFields": [...],
        "coachFields": {...}
      },
      "createdAt": "ISO date"
    }
  }
}
```

### Form Document
```json
{
  "_id": "ObjectId",
  "ownerId": "ObjectId (ref users)",
  "title": "Basketball (Men)",
  "status": "submitted|draft|confirmed|rejected",
  "fields": {
    "playerFields": [
      {
        "name": "string",
        "email": "string",
        "phone": "string",
        "date": "ISO date or Date object"
      }
    ],
    "coachFields": {
      "name": "string",
      "contact": "string"
    }
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## Google Sheets Integration

### Sync Endpoint
`POST /api/sync/sheets`

**Request Body:**
```json
{
  "collection": "users" | "form" | "payments",
  "sheetName": "Sheet1"
}
```

### Formatted Columns

**Users Sheet:**
- User ID
- Name
- Email
- University
- Verified
- Registration Done
- Payment Done
- Created At

**Forms Sheet:**
- Form ID
- Owner ID
- Sport/Event
- Status
- Created At
- Updated At
- Player Count
- Player Names
- Coach Name
- Coach Contact

## Security

- All endpoints require authentication (NextAuth session)
- Admin access validated via `NEXTAUTH_ADMIN_EMAILS`
- Google Sheets sync uses service account credentials
- Background sync failures don't block user operations

## Performance Considerations

- Google Sheets sync is non-blocking
- Background webhook calls catch and log errors
- Form collection updates happen in same transaction as user updates
- Large JSON editing validated client-side before submission

## Future Enhancements

1. Batch operations (update multiple users/forms)
2. Export/import via CSV
3. Audit log for all changes
4. Real-time validation against schema rules
5. Undo/redo functionality
6. Version history for registrations
