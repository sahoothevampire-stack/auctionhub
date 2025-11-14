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

export async function fetchDigiLockerUrl(userAuthId) {
  // userAuthId is the actual user_id from auth state (passed from component)
  // Determine the base URL for the callback (use window.location for client-side calls)
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const callbackUrl = `${baseUrl}/api/verify-aadhaar-webhook?user_id=${userAuthId}`;
  
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
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
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
