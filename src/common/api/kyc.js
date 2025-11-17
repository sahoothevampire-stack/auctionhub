import config from "../constants";

export async function fetchPanDetails(pan_no) {
  const response = await fetch(config.RC_BASE_URL + 'pan_details', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + config.RC_DETAIL_PRIME_API_AUTH_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      pan_number: pan_no,
      user_id: config.RC_DETAIL_PRIME_API_USER_ID,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get the base URL for callbacks (dynamic based on environment).
 * Prefers window.location for client-side, falls back to env var.
 */
export function getCallbackBaseUrl() {
  // Client-side: use window.location
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`;
  }
  
  // Server-side or fallback: use env var (should be set in production)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.warn('NEXT_PUBLIC_APP_URL is not set; callback URLs may fail in server-side contexts.');
    return 'http://localhost:3000';
  }
  return appUrl.replace(/\/$/, ''); // remove trailing slash
}

export async function fetchDigiLockerUrl(userAuthId) {
  // userAuthId is the actual user_id from auth state (passed from component)
  const baseUrl = getCallbackBaseUrl();
  const callbackUrl = `${baseUrl}/api/verify-aadhaar-webhook?user_id=${userAuthId}`;
  
  console.log('Creating DigiLocker URL with callback:', callbackUrl);
  
  const response = await fetch(config.RC_BASE_URL + 'digilockeraadhaardetails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + config.RC_DETAIL_PRIME_API_AUTH_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      user_id: config.RC_DETAIL_PRIME_API_USER_ID,
      task: 'createurl',
      callbackurl: callbackUrl,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch Aadhaar details from DigiLocker after user authorization
 * @param {string} requestId - Request ID from DigiLocker callback
 * @returns {Promise<Object>} Aadhaar details
 */
export async function fetchAadhaarDetails(requestId) {
  // Determine the base URL for the callback
  const baseUrl = getCallbackBaseUrl();
  const callbackUrl = `${baseUrl}/api/verify-aadhaar-webhook`;
  
  const response = await fetch(config.RC_BASE_URL + 'digilockeraadhaardetails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + config.RC_DETAIL_PRIME_API_AUTH_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      user_id: config.RC_DETAIL_PRIME_API_USER_ID,
      task: 'getEaadhaar',
      callbackurl: callbackUrl,
      requistID: requestId,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
