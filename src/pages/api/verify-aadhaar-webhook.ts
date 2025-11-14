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

    if (req.method === 'POST') {
      requestId = req.body?.requestId || req.body?.requestid || req.body?.requistID || req.body?.requistId;
      status = req.body?.status;
    } else {
      // GET - DigiLocker/browser redirect may send params in query
      requestId = (req.query?.requestId || req.query?.requestid || req.query?.requistID || req.query?.requistId || req.query?.reqid || req.query?.request_id) as string | undefined;
      status = req.query?.status;
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

    // Check if DigiLocker authorization failed
    if (status === false) {
      console.log('DigiLocker authorization failed for user:', user_id);
      
      // Store failure data for polling
      const failureData = {
        name_on_aadhar: null,
        aadhar_no: null,
        dob: null,
        gender: null,
        address: null,
      };

      await storeVerificationData(user_id as string, failureData, true); // true = failure

      return res.status(200).json({
        success: false,
        message: 'DigiLocker authorization failed',
      });
    }

    // Now fetch the actual Aadhaar details using the requestId
    console.log('Fetching Aadhaar details from DigiLocker for requestId:', requestId);
    const aadhaarResponse = await fetchAadhaarDetailsFromDigiLocker(requestId);

    if (!aadhaarResponse.status || !aadhaarResponse.data) {
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch Aadhaar details',
        message: aadhaarResponse.message || 'Unknown error',
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
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  try {
    const payload = { aadhaarData, isFailed };
    console.log('Storing verification data to status API', { url: `${API_URL}/api/aadhaar-verification-status`, userId, isFailed, payloadSize: JSON.stringify(payload).length });

    const response = await fetch(`${API_URL}/api/aadhaar-verification-status?user_id=${userId}`, {
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
