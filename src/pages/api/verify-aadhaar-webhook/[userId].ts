import type { NextApiRequest, NextApiResponse } from 'next';
import config from '@/common/constants';

/**
 * Webhook endpoint to receive DigiLocker authorization callback
 * Called by DigiLocker after user authorizes/denies Aadhaar sharing
 * 
 * Expected URL format: /api/verify-aadhaar-webhook/[userId]
 * 
 * Expected query params from DigiLocker callback:
 * - state: the requestId needed to fetch actual Aadhaar details
 * - confirmAuthorization: 'true' if authorized, 'false' if denied
 * - taskId: optional task ID from DigiLocker
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const logs: string[] = [];

  const logDebug = (msg: string, data?: any) => {
    const entry = `[${new Date().toISOString()}] ${msg}`;
    if (data !== undefined) logs.push(entry + ' ' + JSON.stringify(data));
    else logs.push(entry);
    console.log(entry, data || '');
  };

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract userId from URL path: /api/verify-aadhaar-webhook/[userId]
    const { userId } = req.query;
    
    // DigiLocker sends data as GET query parameters OR POST body
    // Expected params: state (requestId), confirmAuthorization (auth status), taskId
    const queryParams = req.query;
    const bodyParams = req.body || {};

    // Log the raw incoming data
    logDebug('DigiLocker webhook received', {
      method: req.method,
      userId,
      queryKeys: Object.keys(queryParams),
      query: queryParams,
      bodyKeys: Object.keys(bodyParams),
      body: bodyParams,
      fullUrl: req.url,
    });

    // Extract requestId from 'state' parameter (DigiLocker sends it as state)
    const requestId = (queryParams.state || bodyParams.state) as string | undefined;

    // Extract authorization status - DigiLocker might send it as different field names
    let confirmAuthorization: any = queryParams.confirmAuthorization || bodyParams.confirmAuthorization;
    let isAuthorized = false;

    // Handle various formats DigiLocker might use
    if (confirmAuthorization !== undefined) {
      isAuthorized = confirmAuthorization === 'true' || confirmAuthorization === true || String(confirmAuthorization).toLowerCase() === 'true';
      logDebug('Authorization status from confirmAuthorization:', { confirmAuthorization, isAuthorized });
    } else {
      // DigiLocker might not send explicit status - if they sent requestId, assume success
      logDebug('No confirmAuthorization field found, checking for implicit success via requestId');
      isAuthorized = !!requestId;
    }

    // Validate required fields
    if (!requestId) {
      logDebug('Missing requestId (state parameter)');
      return res.status(400).json({ 
        success: false,
        error: 'Missing requestId from DigiLocker callback',
        logs,
      });
    }

    if (!userId || typeof userId !== 'string') {
      logDebug('Missing or invalid userId in path');
      return res.status(400).json({ 
        success: false,
        error: 'Missing or invalid user ID in callback URL',
        logs,
      });
    }

    logDebug('DigiLocker webhook validated', { requestId, userId, isAuthorized });

    // Check if DigiLocker authorization was denied
    if (!isAuthorized) {
      logDebug('DigiLocker authorization denied or cancelled by user');
      
      // Store failure state
      try {
        await storeVerificationData(
          userId,
          {
            requestId,
            status: false,
            error: 'User denied authorization or authorization was cancelled',
            deniedAt: new Date().toISOString(),
          },
          true,
          logDebug
        );
      } catch (storeErr) {
        logDebug('Failed to store denial:', storeErr);
      }

      return res.status(200).json({
        success: false,
        error: 'Authorization was denied. Please try again.',
        requestId,
        logs,
      });
    }

    // Now fetch the actual Aadhaar details using the requestId
    logDebug('Fetching Aadhaar details from DigiLocker for requestId:', requestId);
    let aadhaarResponse: any;
    try {
      aadhaarResponse = await fetchAadhaarDetailsFromDigiLocker(requestId, logDebug);
    } catch (fetchErr: any) {
      console.error('Error fetching Aadhaar details:', fetchErr.message);
      
      // Store timeout/fetch error
      try {
        await storeVerificationData(
          userId,
          {
            requestId,
            error: `Failed to fetch Aadhaar details: ${fetchErr.message}`,
            failedAt: new Date().toISOString(),
          },
          true
        );
      } catch (storeErr) {
        console.error('Failed to store fetch error:', storeErr);
      }

      return res.status(200).json({
        success: false,
        error: 'Failed to fetch Aadhaar details. Please try again later.',
        requestId,
      });
    }

    if (!aadhaarResponse || !aadhaarResponse.status || !aadhaarResponse.data) {
      console.error('Invalid Aadhaar response from DigiLocker:', aadhaarResponse);
      
      // Store invalid response error
      try {
        await storeVerificationData(
          userId,
          {
            requestId,
            error: 'Invalid response from Aadhaar service',
            failedAt: new Date().toISOString(),
          },
          true
        );
      } catch (storeErr) {
        console.error('Failed to store invalid response:', storeErr);
      }

      return res.status(200).json({
        success: false,
        error: 'Invalid response from Aadhaar service',
        requestId,
      });
    }

    const aadhaarData = aadhaarResponse.data;
    console.log('Aadhaar details received:', {
      userName: aadhaarData.userName,
      maskedAadhaarNo: aadhaarData.maskedAadhaarNo,
    });

    // Store the verification data successfully
    try {
      await storeVerificationData(userId, aadhaarData, false);
    } catch (storeErr) {
      console.error('Failed to store success data:', storeErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Aadhaar verification completed successfully',
      requestId,
    });
  } catch (error: any) {
    console.error('DigiLocker webhook error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
}

/**
 * Call DigiLocker API to fetch Aadhaar details using requestId
 */
async function fetchAadhaarDetailsFromDigiLocker(requestId: string, logDebug?: (msg: string, data?: any) => void) {
  const RC_BASE_URL = config.RC_BASE_URL;
  const RC_USER_ID = config.RC_DETAIL_PRIME_API_USER_ID;
  const RC_TOKEN = config.RC_DETAIL_PRIME_API_AUTH_TOKEN;

  try {
    const payload = new URLSearchParams({
      user_id: RC_USER_ID,
      task: 'getEaadhaar',
      callbackurl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/verify-aadhaar-webhook`,
      requistID: requestId,
    }).toString();

    logDebug?.('Calling DigiLocker API to fetch Aadhaar', {
      url: RC_BASE_URL + 'digilockeraadhaardetails',
      payload: `[form-data:${payload.length}chars]`,
    });

    const response = await fetch(RC_BASE_URL + 'digilockeraadhaardetails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RC_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload,
    });

    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (parseErr) {
      logDebug?.('Failed to parse DigiLocker response JSON', { parseErr, raw: text });
      console.error('Failed to parse DigiLocker response JSON:', parseErr, 'raw:', text);
      throw new Error('Invalid JSON response from DigiLocker');
    }

    logDebug?.('DigiLocker API response received', {
      status: response.status,
      ok: response.ok,
      dataKeys: data ? Object.keys(data) : 'null',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return data;
  } catch (error: any) {
    logDebug?.('DigiLocker API call failed', error?.message || error);
    console.error('DigiLocker API call failed:', error);
    throw error;
  }
}

/**
 * Store verification data for polling via /api/aadhaar-verification-status
 */
async function storeVerificationData(userId: string, aadhaarData: any, isFailed: boolean = false, logDebug?: (msg: string, data?: any) => void) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const payload = { aadhaarData, isFailed };

    logDebug?.('Storing verification data to status API', {
      url: `${appUrl}/api/aadhaar-verification-status`,
      userId,
      isFailed,
      payloadSize: JSON.stringify(payload).length,
    });

    const response = await fetch(`${appUrl}/api/aadhaar-verification-status?user_id=${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const respText = await response.text();
    let respJson: any = null;
    try {
      respJson = respText ? JSON.parse(respText) : null;
    } catch (parseErr) {
      logDebug?.('Failed to parse status API response JSON', { parseErr, raw: respText });
      console.error('Failed to parse status API response JSON:', parseErr, 'raw:', respText);
    }

    logDebug?.('Status API response received', {
      ok: response.ok,
      status: response.status,
      dataKeys: respJson ? Object.keys(respJson) : 'null',
    });

    if (!response.ok) {
      throw new Error(`Failed to store verification data: ${response.status}`);
    }

    return respJson;
  } catch (error: any) {
    logDebug?.('Error storing verification data', error?.message || error);
    console.error('Error storing verification data:', error);
    throw error;
  }
}
