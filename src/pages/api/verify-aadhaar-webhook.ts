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
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract userId from URL path: /api/verify-aadhaar-webhook/[userId]
    const { userId } = req.query;
    
    // DigiLocker sends data as GET query parameters
    const { state, confirmAuthorization, taskId } = req.query;

    // Basic request logging to help debug DigiLocker payloads
    try {
      console.log('DigiLocker webhook request:', {
        method: req.method,
        userId,
        state,
        confirmAuthorization,
        taskId,
        fullUrl: req.url,
      });
    } catch (e) {
      console.log('Failed to log webhook request', e);
    }

    // Extract requestId from 'state' parameter (DigiLocker sends it as state)
    const requestId = state as string | undefined;

    // Validate required fields
    if (!requestId) {
      console.error('DigiLocker webhook: missing requestId (state parameter)');
      return res.status(400).json({ 
        success: false,
        error: 'Missing requestId from DigiLocker callback' 
      });
    }

    if (!userId) {
      console.error('DigiLocker webhook: missing userId in path');
      return res.status(400).json({ 
        success: false,
        error: 'Missing user ID in callback URL' 
      });
    }

    console.log('DigiLocker webhook received with requestId:', requestId, 'for user:', userId);

    // Check if DigiLocker authorization failed or was cancelled
    const isAuthorized = confirmAuthorization === 'true' || String(confirmAuthorization).toLowerCase() === 'true';
    
    if (!isAuthorized) {
      console.log('DigiLocker authorization denied or cancelled by user for requestId:', requestId);
      
      // Store failure state
      try {
        await storeVerificationData(
          userId as string,
          {
            requestId,
            status: false,
            error: 'User denied authorization or authorization was cancelled',
            deniedAt: new Date().toISOString(),
          },
          true
        );
      } catch (storeErr) {
        console.error('Failed to store denial:', storeErr);
      }

      return res.status(200).json({
        success: false,
        error: 'Authorization was denied. Please try again.',
        requestId,
      });
    }

    // Now fetch the actual Aadhaar details using the requestId
    console.log('Fetching Aadhaar details from DigiLocker for requestId:', requestId);
    let aadhaarResponse: any;
    try {
      aadhaarResponse = await fetchAadhaarDetailsFromDigiLocker(requestId);
    } catch (fetchErr: any) {
      console.error('Error fetching Aadhaar details:', fetchErr.message);
      
      // Store timeout/fetch error
      try {
        await storeVerificationData(
          userId as string,
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
          userId as string,
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
      await storeVerificationData(userId as string, aadhaarData, false);
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
async function fetchAadhaarDetailsFromDigiLocker(requestId: string) {
  const RC_BASE_URL = config.RC_BASE_URL;
  const RC_USER_ID = config.RC_DETAIL_PRIME_API_USER_ID;
  const RC_TOKEN = config.RC_DETAIL_PRIME_API_AUTH_TOKEN;

  try {
    const response = await fetch(RC_BASE_URL + 'digilockeraadhaardetails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RC_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        user_id: RC_USER_ID,
        task: 'getEaadhaar',
        callbackurl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/verify-aadhaar-webhook`,
        requistID: requestId,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    console.error('DigiLocker API call failed:', error);
    throw error;
  }
}

/**
 * Store verification data for polling via /api/aadhaar-verification-status
 */
async function storeVerificationData(userId: string, aadhaarData: any, isFailed: boolean = false) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const payload = { aadhaarData, isFailed };
    console.log('Storing verification data for user:', userId, { isFailed, payloadSize: JSON.stringify(payload).length });

    const response = await fetch(`${appUrl}/api/aadhaar-verification-status?user_id=${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Failed to store verification data: ${response.status}`);
      throw new Error(`Failed to store verification data: ${response.status}`);
    }

    const result = await response.json();
    console.log('Verification data stored successfully:', result);
    return result;
  } catch (error: any) {
    console.error('Error storing verification data:', error.message);
    throw error;
  }
}
