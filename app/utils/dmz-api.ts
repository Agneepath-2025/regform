/**
 * DMZ API utilities for managing user registrations
 * Handles adding and removing users from the DMZ database
 */

const DMZ_API_URL = process.env.DMZ_API_URL || 'https://dmz.agneepath.co.in/api/users';
const DMZ_API_KEY = process.env.DMZ_API_KEY || '';

interface DmzUser {
  email: string;
  name: string;
  university: string;
  phone: string;
}

interface DmzApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Add a user to the DMZ database
 * @param user User information to add
 * @returns Promise with success status
 */
export async function addUserToDmz(user: DmzUser): Promise<DmzApiResponse> {
  try {
    if (!DMZ_API_KEY) {
      console.error('[DMZ] API key not configured');
      return {
        success: false,
        error: 'DMZ API key not configured'
      };
    }

    const response = await fetch(DMZ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': DMZ_API_KEY
      },
      body: JSON.stringify(user)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[DMZ] Failed to add user:', response.status, errorData);
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`
      };
    }

    const data = await response.json();
    console.log('[DMZ] User added successfully:', user.email);
    return {
      success: true,
      message: data.message || 'User added successfully'
    };
  } catch (error) {
    console.error('[DMZ] Error adding user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Remove a user from the DMZ database
 * @param email Email of the user to remove
 * @returns Promise with success status
 */
export async function removeUserFromDmz(email: string): Promise<DmzApiResponse> {
  try {
    if (!DMZ_API_KEY) {
      console.error('[DMZ] API key not configured');
      return {
        success: false,
        error: 'DMZ API key not configured'
      };
    }

    const response = await fetch(DMZ_API_URL, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': DMZ_API_KEY
      },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[DMZ] Failed to remove user:', response.status, errorData);
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`
      };
    }

    const data = await response.json();
    console.log('[DMZ] User removed successfully:', email);
    return {
      success: true,
      message: data.message || 'User removed successfully'
    };
  } catch (error) {
    console.error('[DMZ] Error removing user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Swap a user (remove old, add new)
 * Useful when changing email or university
 * @param oldEmail Email to remove
 * @param newUser New user data to add
 * @returns Promise with success status
 */
export async function swapUserInDmz(
  oldEmail: string,
  newUser: DmzUser
): Promise<DmzApiResponse> {
  // First remove the old user
  const removeResult = await removeUserFromDmz(oldEmail);
  if (!removeResult.success) {
    return removeResult;
  }

  // Then add the new user
  const addResult = await addUserToDmz(newUser);
  return addResult;
}
