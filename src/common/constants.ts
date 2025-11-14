/**
 * API URL constants for different environments
 */
const LOCAL_API_URL = 'http://localhost:3000/';
const DEVELOPMENT_API_URL = 'https://fdsqoh08yl.execute-api.ap-south-1.amazonaws.com/prod/';
const PRODUCTION_API_URL = 'https://fdsqoh08yl.execute-api.ap-south-1.amazonaws.com/prod/';

/**
 * CarDekho API URL constants for different environments
 */
const CD_LOCAL_API_URL = 'https://auctionqa2.cardekho.com/';
const CD_DEVELOPMENT_API_URL = 'https://auctionqa2.cardekho.com/';
const CD_PRODUCTION_API_URL = 'https://auctions.cardekho.com/';

/**
 * @typedef {Object} Config
 * @property {string} API_URL - The main API URL based on environment
 * @property {string} CD_API_URL - The CarDekho API URL based on environment
 * @property {string} [TOKEN] - Optional authentication token
 */

/** @type {Config} */
const config = {
    API_URL: process.env.NODE_ENV === 'production' 
        ? PRODUCTION_API_URL 
        : (process.env.NODE_ENV === 'development' ? DEVELOPMENT_API_URL : LOCAL_API_URL),
    CD_API_URL: process.env.NODE_ENV === 'production'
        ? CD_PRODUCTION_API_URL 
        : (process.env.NODE_ENV === 'development' ? CD_DEVELOPMENT_API_URL : CD_LOCAL_API_URL),
    TOKEN: process.env.NEXT_PUBLIC_TEMP_TOKEN,
    RC_BASE_URL: 'https://rtoapi.girnarcare.com/bbuser/',
    RC_DETAIL_PRIME_API_USER_ID: '6176e81d02e2b17d3b1ef97c',
    RC_DETAIL_PRIME_API_AUTH_TOKEN: process.env.RC_DETAIL_PRIME_API_AUTH_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyZW1haWwiOiJhbWl0LmphbmdyYUBnaXJuYXJzb2Z0LmNvbSIsImlhdCI6MTc2MTY1MTAwMiwiZXhwIjoxNzkzMTg3MDAyfQ.MHLfmPcMs0sTHwT72bhGRO_xnNx8mHr_--B1K_O1XA0',
};

export default config;