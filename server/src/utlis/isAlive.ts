import axios from 'axios';

export async function validateUrlReachability(url: string): Promise<boolean> {
  try {
    const res = await axios.head(url, {
      timeout: 4000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      validateStatus: (status) => status < 400,
    });
    return res.status >= 200 && res.status < 400;
  } catch (err: any) {
    // Some static doc hosts (like GitHub Pages/Cloudflare) block HEAD requests; fallback to a small GET
    try {
      const getRes = await axios.get(url, {
        timeout: 4000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Range: 'bytes=0-100', // Fetch minimal bytes
        },
        validateStatus: (status) => status < 400,
      });
      return getRes.status >= 200 && getRes.status < 400;
    } catch {
      return false;
    }
  }
}