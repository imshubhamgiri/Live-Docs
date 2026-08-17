import axios from 'axios';

 export const bdClient = axios.create({
    baseURL: 'https://api.brightdata.com',
    headers: {
      Authorization: `Bearer ${process.env.BRIGHTDATA_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });