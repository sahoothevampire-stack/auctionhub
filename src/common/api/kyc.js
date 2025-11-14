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
  const response = await fetch(config.RC_BASE_URL + 'digilockeraadhaardetails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + config.RC_DETAIL_PRIME_API_AUTH_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      user_id: config.RC_DETAIL_PRIME_API_USER_ID,
      task: 'createurl',
      callbackurl: config.API_URL + `verify-aadhaar-webhook?user_id=${userAuthId}`,
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
  const response = await fetch(config.RC_BASE_URL + 'digilockeraadhaardetails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + config.RC_DETAIL_PRIME_API_AUTH_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      user_id: config.RC_DETAIL_PRIME_API_USER_ID,
      task: 'getEaadhaar',
      callbackurl: config.API_URL + 'verify-aadhaar-webhook',
      requistID: requestId,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
