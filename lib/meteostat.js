import { readCache, writeCache } from './cache';
import axios from 'axios';

class Point {
  constructor(lat, lon, alt) {
    this.lat = lat;
    this.lon = lon;
    this.alt = alt;
  }
}

// In-memory storage for current year data
let currentYearData = null;
let lastFetchTime = null;
const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

async function fetchYearlyData(point, year) {
  console.log('=== fetchYearlyData START ===');
  console.log(`Processing year: ${year}`);
  console.log(`Current memory state:`, {
    hasCurrentYearData: !!currentYearData,
    lastFetchTime: lastFetchTime ? new Date(lastFetchTime).toISOString() : null
  });

  const currentYear = new Date().getFullYear();
  const now = new Date();
  
  if (!Number.isInteger(year) || year < 2000 || year > currentYear) {
    console.error(`Invalid year: ${year}`);
    return [];
  }

  // Reset memory cache if it's stale or doesn't exist
  if (!currentYearData || !lastFetchTime || (now.getTime() - lastFetchTime.getTime() >= REFRESH_INTERVAL)) {
    console.log('Memory cache is stale or empty, resetting...');
    currentYearData = null;
    lastFetchTime = null;
  }

  // Check memory first for current and previous year
  if ((year === currentYear || year === currentYear - 1) && currentYearData && lastFetchTime) {
    console.log(`Using in-memory data for year ${year}`);
    return currentYearData;
  }

  // Only check cache for years before previous year
  if (year < currentYear - 1) {
    const cacheKey = `yearly-${year}`;
    const cachedData = readCache(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for year ${year}`);
      return cachedData;
    }
  }

  // If we get here, we need to fetch the data
  const METEOSTAT_BASE_URL = 'https://meteostat.p.rapidapi.com/stations/daily';
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  const RAPIDAPI_HOST = 'meteostat.p.rapidapi.com';

  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const params = {
    start,
    end,
    station: '71624',
  };

  try {
    console.log(`Making API call for year ${year}`);
    console.log('API Request details:', {
      url: METEOSTAT_BASE_URL,
      params,
      hasApiKey: !!RAPIDAPI_KEY
    });

    const response = await axios.get(METEOSTAT_BASE_URL, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
      params,
    });

    console.log(`API call successful for year ${year}`);

    // Store current and previous year data in memory
    if (year === currentYear || year === currentYear - 1) {
      console.log(`Storing year ${year} data in memory`);
      currentYearData = response.data.data;
      lastFetchTime = now;
    } else {
      // Cache only years before previous year
      console.log(`Caching year ${year} data`);
      writeCache(`yearly-${year}`, response.data.data);
    }
    
    console.log('=== fetchYearlyData END ===');
    return response.data.data;
  } catch (error) {
    console.error('API call failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    return [];
  }
}

// Reset memory cache on module load
currentYearData = null;
lastFetchTime = null;

module.exports = { Point, fetchYearlyData };