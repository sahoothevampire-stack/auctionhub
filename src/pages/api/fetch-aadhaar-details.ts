import type { NextApiRequest, NextApiResponse } from 'next';
import config from '@/common/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requestId, userId } = req.query;

    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid requestId' });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid userId' });
    }

    // Call DigiLocker API to fetch Aadhaar details using the requestId
    console.log('Fetching Aadhaar details from DigiLocker for requestId:', requestId);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${appUrl}/api/verify-aadhaar-webhook/${userId}`;

    const response = await fetch(config.RC_BASE_URL + 'digilockeraadhaardetails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.RC_DETAIL_PRIME_API_AUTH_TOKEN}`,
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
      console.error(`DigiLocker API error: ${response.status}`);
      return res.status(response.status).json({ 
        success: false, 
        error: `DigiLocker API error: ${response.status}`,
        statusCode: response.status 
      });
    }

    const aadhaarData = await response.json();
    console.log('Aadhaar details fetched successfully:', {
      statusCode: aadhaarData.statusCode,
      userName: aadhaarData?.data?.userName,
    });

    return res.status(200).json(aadhaarData);
  } catch (err: any) {
    console.error('Failed to fetch Aadhaar details:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch Aadhaar details',
      statusCode: 500
    });
  }
}
