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

    if (!userId || typeof userId !== 'string') {
      console.error('DigiLocker webhook: missing or invalid userId in path');
      return res.status(400).json({ 
        success: false,
        error: 'Missing or invalid user ID in callback URL' 
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
          userId,
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

      // If this was a GET redirect from DigiLocker to the browser, return an HTML page
      if (req.method === 'GET') {
        const safeUserId = typeof userId === 'string' ? userId : Array.isArray(userId) ? userId[0] : '';
        const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Authorization Cancelled</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0} .card{padding:20px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.08);text-align:center} .msg{font-size:18px;margin-bottom:8px} .sub{color:#666;font-size:13px}</style>
  </head>
  <body>
    <div class="card">
      <div class="msg">Authorization was cancelled or denied</div>
      <div class="sub">You may close this window and return to the previous tab.</div>
    </div>
    <script>
      (function(){
        try {
          const params = new URLSearchParams(window.location.search);
          const requestId = params.get('state');
          const userId = ${JSON.stringify(safeUserId)};

          function postResultToOpener(payload) {
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'aadhaarVerification', payload }, window.location.origin);
                try { window.opener.focus(); } catch(e) {}
              }
            } catch (e) {
              console.warn('Failed to post message to opener', e);
            }
          }

          postResultToOpener({ success: false, error: 'User denied authorization', requestId, userId });
          setTimeout(function(){ try { window.close(); } catch(e) {} }, 800);
        } catch (e) {
          try { window.close(); } catch(e) {}
        }
      })();
    </script>
  </body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
      }

      return res.status(200).json({
        success: false,
        error: 'Authorization was denied. Please try again.',
        requestId,
      });
    }

    // If this is a GET (browser redirect after authorization), return an HTML page
    if (req.method === 'GET') {
      const safeUserId = typeof userId === 'string' ? userId : Array.isArray(userId) ? userId[0] : '';
      const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Authorization Complete</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0} .card{padding:20px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.08);text-align:center} .msg{font-size:18px;margin-bottom:8px} .sub{color:#666;font-size:13px}</style>
  </head>
  <body>
    <div class="card">
      <div class="msg">Authorization complete</div>
      <div class="sub">You can close this window. Returning to the previous tab...</div>
    </div>

    <script>
      (function(){
        try {
          const params = new URLSearchParams(window.location.search);
          const requestId = params.get('state');
          const confirmAuthorization = params.get('confirmAuthorization') || params.get('confirmauthorization') || params.get('confirm');
          const isAuthorized = (String(confirmAuthorization || '').toLowerCase() === 'true');
          const userId = ${JSON.stringify(safeUserId)};

          function postResultToOpener(payload) {
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'aadhaarVerification', payload }, window.location.origin);
                try { window.opener.focus(); } catch(e) {}
              }
            } catch (e) {
              console.warn('Failed to post message to opener', e);
            }
          }

          if (!isAuthorized) {
            // notify opener about denial and close
            postResultToOpener({ success: false, error: 'User denied authorization', requestId, userId });
            setTimeout(function(){ try { window.close(); } catch(e) {} }, 800);
            return;
          }

          // In the background fetch Aadhaar details from our helper endpoint
          (async function(){
            try {
              const resp = await fetch('/api/fetch-aadhaar-details?requestId=' + encodeURIComponent(requestId || '') + '&userId=' + encodeURIComponent(userId || ''), { method: 'GET' });
              const json = await resp.json();
              // Post the JSON to the opener so the app can compare names and update form data
              postResultToOpener({ success: true, requestId, userId, data: json });
            } catch (err) {
              postResultToOpener({ success: false, error: String(err), requestId, userId });
            } finally {
              // give opener time to process, then close this window
              setTimeout(function(){ try { window.close(); } catch(e) {} }, 1000);
            }
          })();
        } catch (e) {
          console.error(e);
          try { window.close(); } catch(e) {}
        }
      })();
    </script>
  </body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
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
