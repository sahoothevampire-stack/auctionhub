import type { NextApiRequest, NextApiResponse } from 'next';
import config from '@/common/constants';

/**
 * Webhook endpoint to receive DigiLocker authorization callback
 * Called by DigiLocker after user authorizes Aadhaar sharing
 * Contains the request ID needed to fetch actual Aadhaar details
 * 
 * Expected query params from callback URL:
 * - user_id: the authenticated user's ID (passed in callback URL during createurl)
 * 
 * Expected body from DigiLocker:
 * {
 *   "requestId": "be9640c5e47c42ce453bd9927ccc4",
 *   ... other fields
 * }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id } = req.query;

    // Basic request logging to help debug DigiLocker payloads
    try {
      const safeHeaders = { ...req.headers } as any;
      // avoid logging any authorization-like headers fully
      if (safeHeaders.authorization) safeHeaders.authorization = '[REDACTED]';
      console.log('Incoming webhook:', {
        method: req.method,
        url: req.url,
        headers: safeHeaders,
        query: req.query,
        body: typeof req.body === 'object' ? JSON.stringify(req.body) : req.body,
      });
    } catch (e) {
      console.log('Failed to stringify incoming request for logs', e);
    }

    // Accept requestId/status either in body (POST) or in query (GET callbacks)
    let requestId: string | undefined;
    let status: any = undefined;

    // Helper to robustly extract query params from malformed URLs (multiple '?')
    function getAllQueryParams(req: NextApiRequest): Record<string, string> {
      let query: Record<string, string> = {};
      // If req.url is present, parse it manually for all params
      if (req.url) {
        let url = req.url;
        // If there are multiple '?', join them as '&' to parse all params
        const qIndex = url.indexOf('?');
        if (qIndex !== -1) {
          let queryString = url.slice(qIndex + 1).replace(/\?/g, '&');
          for (const part of queryString.split('&')) {
            const [k, v] = part.split('=');
            if (k) query[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
          }
        }
      }
      // Merge with req.query (Next.js already parses some params)
      for (const k in req.query) {
        if (typeof req.query[k] === 'string') query[k] = req.query[k] as string;
        else if (Array.isArray(req.query[k])) query[k] = req.query[k][0];
      }
      return query;
    }

    if (req.method === 'POST') {
      requestId = req.body?.requestId || req.body?.requestid || req.body?.requistID || req.body?.requistId;
      status = req.body?.status;
    } else {
      // GET - DigiLocker/browser redirect may send params in query, sometimes with malformed URL
      const allParams = getAllQueryParams(req);
      requestId = allParams.requestId || allParams.requestid || allParams.requistID || allParams.requistId || allParams.reqid || allParams.request_id;
      status = allParams.status;
    }

    // Validate required fields
    if (!requestId) {
      if (req.method === 'GET') {
        res.setHeader('Content-Type', 'text/html');
        return res.status(400).send(`<html><body><h1>Missing requestId</h1><p>DigiLocker did not provide a requestId.</p></body></html>`);
      }

      return res.status(400).json({
        error: 'Missing required field: requestId',
      });
    }

    if (!user_id) {
      if (req.method === 'GET') {
        res.setHeader('Content-Type', 'text/html');
        return res.status(400).send(`<html><body><h1>Missing user_id</h1><p>Callback did not include user_id query param.</p></body></html>`);
      }

      return res.status(400).json({
        error: 'Missing required parameter: user_id',
      });
    }

    console.log('DigiLocker webhook received with requestId:', requestId, 'for user:', user_id);

    // Check if DigiLocker authorization failed or was cancelled
    if (status === false || status === 'false' || (status && String(status).toLowerCase() === 'false')) {
      console.log('DigiLocker authorization failed for user:', user_id);
      
      // Store failure data for polling
      const failureData = {
        name_on_aadhar: null,
        aadhar_no: null,
        dob: null,
        gender: null,
        address: null,
        error: 'DigiLocker authorization failed',
      };

      try {
        await storeVerificationData(user_id as string, failureData, true); // true = failure
      } catch (storeErr) {
        console.error('Failed to store authorization failure:', storeErr);
      }

      // Return error response so frontend can display user-friendly message
      if (req.method === 'GET') {
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(`<html><body><h1>Authorization Failed</h1><p>DigiLocker authorization was cancelled or failed. Please try again.</p></body></html>`);
      }
      return res.status(200).json({
        success: false,
        error: 'DigiLocker authorization failed',
        message: 'Authorization was cancelled or failed. Please try again.',
      });
    }

    // Now fetch the actual Aadhaar details using the requestId
    console.log('Fetching Aadhaar details from DigiLocker for requestId:', requestId);
    let aadhaarResponse: any;
    try {
      aadhaarResponse = await fetchAadhaarDetailsFromDigiLocker(requestId);
    } catch (fetchErr: any) {
      console.error('Error fetching Aadhaar details:', fetchErr);
      
      // Store failure on fetch error (timeout, network issue, etc.)
      const failureData = {
        name_on_aadhar: null,
        aadhar_no: null,
        dob: null,
        gender: null,
        address: null,
        error: 'Failed to fetch Aadhaar details from DigiLocker',
      };
      
      try {
        await storeVerificationData(user_id as string, failureData, true); // true = failure
      } catch (storeErr) {
        console.error('Failed to store fetch error:', storeErr);
      }
      
      // Return error response
      if (req.method === 'GET') {
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(`<html><body><h1>Verification Failed</h1><p>Could not retrieve Aadhaar details from DigiLocker. Error: ${fetchErr.message || 'Unknown error'}</p></body></html>`);
      }
      return res.status(200).json({
        success: false,
        error: 'Failed to fetch Aadhaar details',
        message: fetchErr.message || 'Timeout or network error',
      });
    }

    if (!aadhaarResponse || !aadhaarResponse.status || !aadhaarResponse.data) {
      console.error('Invalid Aadhaar response:', aadhaarResponse);
      
      // Store failure on invalid response
      const failureData = {
        name_on_aadhar: null,
        aadhar_no: null,
        dob: null,
        gender: null,
        address: null,
        error: 'Invalid response from DigiLocker API',
      };
      
      try {
        await storeVerificationData(user_id as string, failureData, true); // true = failure
      } catch (storeErr) {
        console.error('Failed to store invalid response:', storeErr);
      }
      
      // Return error response
      if (req.method === 'GET') {
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(`<html><body><h1>Verification Failed</h1><p>DigiLocker returned invalid data. Please try again.</p></body></html>`);
      }
      return res.status(200).json({
        success: false,
        error: 'Failed to fetch Aadhaar details',
        message: aadhaarResponse?.message || 'Invalid response from DigiLocker',
      });
    }

    const aadhaarData = aadhaarResponse.data;
    console.log('Aadhaar details received:', {
      userName: aadhaarData.userName,
      maskedAadhaarNo: aadhaarData.maskedAadhaarNo,
    });

    // Store the verification data in the status API
    const verificationData = {
      name_on_aadhar: aadhaarData.userName,
      aadhar_no: aadhaarData.maskedAadhaarNo,
      dob: aadhaarData.DOB,
      gender: aadhaarData.gender,
      address: aadhaarData.address,
    };

    console.log('Storing verification data for user:', user_id, 'maskedAadhaarNo:', verificationData.aadhar_no ? verificationData.aadhar_no : '[N/A]');
    await storeVerificationData(user_id as string, verificationData, false); // false = success

    // Return success response to acknowledge webhook receipt
    return res.status(200).json({
      success: true,
      message: 'Aadhaar details fetched and stored',
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      error: error.message || 'Webhook processing failed',
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
    const payload = new URLSearchParams({
      user_id: RC_USER_ID,
      task: 'getEaadhaar',
      requistID: requestId,
    }).toString();

    console.log('Calling DigiLocker API', { url: RC_BASE_URL + 'digilockeraadhaardetails', payload: `[form-data:${payload.length}chars]` });

    const response = await fetch(RC_BASE_URL + 'digilockeraadhaardetails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RC_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload,
    });

    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (parseErr) {
      console.error('Failed to parse DigiLocker response JSON:', parseErr, 'raw:', text);
      throw new Error('Invalid JSON response from DigiLocker');
    }

    console.log('DigiLocker response status:', response.status, 'responseKeys:', data ? Object.keys(data) : 'null');

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error('Error fetching Aadhaar details:', error);
    throw error;
  }
}

/**
 * Store verification data for polling via /api/aadhaar-verification-status
 */
async function storeVerificationData(userId: string, aadhaarData: any, isFailed: boolean = false) {

  try {
    const payload = { aadhaarData, isFailed };
    console.log('Storing verification data to status API', { url: `${config.APP_URL}/api/aadhaar-verification-status`, userId, isFailed, payloadSize: JSON.stringify(payload).length });

    const response = await fetch(`${config.APP_URL}/api/aadhaar-verification-status?user_id=${userId}`, {
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
      console.error('Failed to parse response from status API:', parseErr, 'raw:', respText);
    }

    console.log('Status API response:', { ok: response.ok, status: response.status, keys: respJson ? Object.keys(respJson) : 'raw-string' });

    if (!response.ok) {
      throw new Error(`Failed to store verification data: ${response.status}`);
    }

    return respJson;
  } catch (error: any) {
    console.error('Error storing verification data:', error);
    throw error;
  }
}
