import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // For development and testing, return the sample Aadhaar success JSON
    const filePath = path.join(process.cwd(), 'src', 'data', 'aadhaarsuccess.json');
    const raw = await fs.readFile(filePath, 'utf8');
    const json = JSON.parse(raw);

    // You could augment/check requestId/userId here if needed
    return res.status(200).json(json);
  } catch (err: any) {
    console.error('Failed to read aadhaar sample JSON:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch Aadhaar details' });
  }
}
