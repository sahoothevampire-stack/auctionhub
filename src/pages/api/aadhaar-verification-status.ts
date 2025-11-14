import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory store for webhook verification data (in production, use Redis or a database)
const verificationStore: Record<string, any> = {};

/**
 * GET: Retrieve verification status for a user
 * POST: Store verification data from webhook
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const { user_id } = req.query;

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' });
  }

  if (req.method === 'GET') {
    // Frontend polls this to check if webhook data is available
    const data = verificationStore[user_id];
    
    if (data) {
      // Return the data and optionally delete it so it's only retrieved once
      delete verificationStore[user_id];
      return res.status(200).json({
        verified: true,
        aadhaarData: data,
      });
    }

    return res.status(200).json({
      verified: false,
      aadhaarData: null,
    });
  } else if (req.method === 'POST') {
    // Webhook or backend stores verification data here
    const { aadhaarData, isFailed } = req.body;

    if (!aadhaarData) {
      return res.status(400).json({ error: 'aadhaarData is required' });
    }

    // If authorization failed, mark as failed
    if (isFailed) {
      verificationStore[user_id] = {
        ...aadhaarData,
        authorizationFailed: true,
      };
    } else {
      verificationStore[user_id] = aadhaarData;
    }

    return res.status(200).json({
      success: true,
      message: 'Verification data stored',
    });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
