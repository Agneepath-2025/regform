# Player Swap Feature

## Overview

The Player Swap feature allows administrators to replace player details in submitted sport registrations. This feature updates data across all three systems:
1. **MongoDB** - Primary database
2. **Google Sheets** - For spreadsheet tracking
3. **DMZ API** - For access control (if player is team owner)

## When to Use

Use player swapping when:
- A player drops out and needs to be replaced
- Incorrect player information was submitted
- Team composition changes after registration
- Email/phone number updates are needed

## How It Works

### Single Player Swap

1. Navigate to **Admin Portal → Forms**
2. Click on the form you want to edit
3. In the **Details** tab, find the player you want to replace
4. Click the **🔄 Swap** button next to the player
5. Fill in the new player's details:
   - Name (required)
   - Email (required)
   - Phone (required)
   - Date of Birth (optional)
6. Click **Confirm Swap**
7. Confirm the action in the popup dialog

### What Gets Updated

When you swap a player:

#### 1. MongoDB Update
```javascript
{
  "fields.playerFields[index]": {
    name: "New Player Name",
    email: "newplayer@email.com",
    phone: "+919999999999",
    date: "2005-06-15",
    // ... other fields preserved
  }
}
```

#### 2. Google Sheets Sync
The corresponding row in the "Registrations" sheet is updated automatically with:
- New player names
- New player emails
- New player phones
- Updated timestamp

#### 3. DMZ API Update
**Only if the swapped player is the team owner:**
- Old email is removed from DMZ
- New email is added to DMZ with university and phone

## API Endpoints

### Single Player Swap

**Endpoint:** `PATCH /api/admin/forms/[id]/swap-player`

**Request Body:**
```json
{
  "playerIndex": 0,
  "oldPlayerData": {
    "email": "old@email.com",
    "name": "Old Player Name",
    "phone": "+919876543210"
  },
  "newPlayerData": {
    "email": "new@email.com",
    "name": "New Player Name",
    "phone": "+919999999999",
    "date": "2005-06-15"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Player swapped successfully",
  "data": {
    "formId": "507f1f77bcf86cd799439011",
    "oldPlayer": { ... },
    "newPlayer": { ... },
    "updatedAt": "2026-01-20T10:30:00.000Z"
  }
}
```

### Batch Player Swap

**Endpoint:** `PATCH /api/admin/forms/[id]/batch-swap`

**Request Body:**
```json
{
  "swaps": [
    {
      "playerIndex": 0,
      "oldPlayerData": {
        "email": "player1@email.com",
        "name": "Player 1",
        "phone": "+919876543210"
      },
      "newPlayerData": {
        "email": "newplayer1@email.com",
        "name": "New Player 1",
        "phone": "+919999999991"
      }
    },
    {
      "playerIndex": 2,
      "oldPlayerData": {
        "email": "player3@email.com",
        "name": "Player 3",
        "phone": "+919876543212"
      },
      "newPlayerData": {
        "email": "newplayer3@email.com",
        "name": "New Player 3",
        "phone": "+919999999993"
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "2 players swapped successfully",
  "data": {
    "formId": "507f1f77bcf86cd799439011",
    "swapsCount": 2,
    "results": [
      { "success": true, "index": 0 },
      { "success": true, "index": 2 }
    ],
    "updatedAt": "2026-01-20T10:30:00.000Z"
  }
}
```

## Security & Validation

### Pre-Swap Checks
1. **Authentication**: Only logged-in admins can swap players
2. **Data Verification**: Old player email and name must match exactly
3. **Index Validation**: Player index must be within valid range
4. **Required Fields**: Name, email, and phone are mandatory

### Confirmation Dialog
Before swapping, admins see a confirmation with:
- Old player details
- New player details
- List of systems that will be updated
- Warning about DMZ impact if team owner

## Error Handling

### Common Errors

**Player Data Mismatch**
```
Error: Player data mismatch - cannot verify swap
```
**Solution:** Double-check the old player's email and name

**Invalid Player Index**
```
Error: Invalid player index
```
**Solution:** Refresh the page and try again

**Form Not Found**
```
Error: Form not found
```
**Solution:** Verify the form ID and ensure it exists

## Synchronization

### Google Sheets
- **Automatic**: Syncs immediately after MongoDB update
- **Non-blocking**: Won't fail the swap if sheets sync fails
- **Retries**: Built-in retry logic with exponential backoff

### DMZ API
- **Conditional**: Only syncs if swapped player is team owner
- **Non-blocking**: Won't fail the swap if DMZ sync fails
- **Atomic**: Removes old email, then adds new email

## Best Practices

1. **Verify Before Swapping**: Double-check all new player information
2. **Inform Team**: Let the team know about the swap
3. **Update Forms**: If physical forms exist, update them too
4. **Monitor Logs**: Check PM2 logs for sync confirmations
5. **Backup**: Google Sheets maintains history automatically

## Monitoring

### Check Swap Success

**MongoDB:**
```bash
# In MongoDB shell
db.form.findOne({ _id: ObjectId("FORM_ID") })
```

**Google Sheets:**
- Open the "Registrations" sheet
- Find the row by email/sport
- Verify player names/emails are updated

**DMZ API:**
```bash
# Check if new email has access
curl https://dmz.agneepath.co.in/api/users \
  -H "X-API-Key: YOUR_KEY" | grep "newplayer@email.com"
```

### Logs

**Success Indicators:**
```
✅ Player swapped in MongoDB: old@email.com → new@email.com
✅ Updated Registrations row 123
🔄 DMZ swap triggered for team owner: old@email.com → new@email.com
```

**Error Indicators:**
```
❌ Failed to sync form to sheets after player swap
❌ Failed to swap player in DMZ
```

## Troubleshooting

### Swap Didn't Reflect in Sheets
1. Check PM2 logs: `pm2 logs regform --lines 100`
2. Manually trigger sync:
   ```bash
   curl -X POST http://localhost:7000/api/sync/incremental \
     -H "Content-Type: application/json" \
     -d '{"collection": "form", "recordId": "FORM_ID"}'
   ```

### DMZ Not Updated
1. Verify the swapped player was the team owner
2. Check DMZ API key is configured
3. Check logs for DMZ errors
4. Manually update DMZ if needed:
   ```bash
   # Remove old
   curl -X DELETE https://dmz.agneepath.co.in/api/users \
     -H "X-API-Key: YOUR_KEY" \
     -d '{"email": "old@email.com"}'
   
   # Add new
   curl -X POST https://dmz.agneepath.co.in/api/users \
     -H "X-API-Key: YOUR_KEY" \
     -d '{
       "email": "new@email.com",
       "name": "New Name",
       "university": "University",
       "phone": "+919999999999"
     }'
   ```

## Code Location

- **API Endpoint:** `/app/api/admin/forms/[id]/swap-player/route.ts`
- **Batch Endpoint:** `/app/api/admin/forms/[id]/batch-swap/route.ts`
- **UI Component:** `/app/admin/edit-form-dialog.tsx`
- **DMZ Utility:** `/app/utils/dmz-api.ts`
- **Sheets Sync:** `/app/utils/incremental-sync.ts`

## Future Enhancements

- Swap history/audit log
- Undo swap functionality
- Email notifications to swapped players
- Bulk swap via CSV upload
- Player swap approval workflow
