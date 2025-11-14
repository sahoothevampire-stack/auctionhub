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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id } = req.query;
    const { requestId, status } = req.body;

    // Validate required fields
    if (!requestId) {
      return res.status(400).json({
        error: 'Missing required field: requestId',
      });
    }

    if (!user_id) {
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
    const response = await fetch(RC_BASE_URL + 'digilockeraadhaardetails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RC_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        user_id: RC_USER_ID,
        task: 'getEaadhaar',
        requistID: requestId,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
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
    const response = await fetch(`${API_URL}/api/aadhaar-verification-status?user_id=${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ aadhaarData, isFailed }),
    });

    if (!response.ok) {
      throw new Error(`Failed to store verification data: ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    console.error('Error storing verification data:', error);
    throw error;
  }
}
