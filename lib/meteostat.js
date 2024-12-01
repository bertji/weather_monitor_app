import { readCache, writeCache } from './cache';
import axios from 'axios';

class Point {
  constructor(lat, lon, alt) {
    this.lat = lat;
    this.lon = lon;
    this.alt = alt;
  }
}

// Separate memory storage for current and previous year
let currentYearData = null;
let previousYearData = null;
let lastFetchTime = null;
const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

async function fetchYearlyData(point, year) {
  console.log(`Processing year: ${year}`);
  
  const currentYear = new Date().getFullYear();
  const now = new Date();

  // For previous year (2024)
  if (year === currentYear - 1) {
    if (previousYearData && lastFetchTime && 
        (now.getTime() - lastFetchTime.getTime() < REFRESH_INTERVAL)) {
      console.log(`Using memory cache for previous year ${year}`);
      return previousYearData;
    }
  }

  // For current year (2025)
  if (year === currentYear) {
    if (currentYearData && lastFetchTime && 
        (now.getTime() - lastFetchTime.getTime() < REFRESH_INTERVAL)) {
      console.log(`Using memory cache for current year ${year}`);
      return currentYearData;
    }
  }

  // For historical years (before 2024)
  if (year < currentYear - 1) {
    const cacheKey = `yearly-${year}`;
    const cachedData = readCache(cacheKey);
    if (cachedData) {
      console.log(`Using file cache for historical year ${year}`);
      return cachedData;
    }
  }

  // If we get here, we need to fetch from API
  try {
    const response = await makeApiCall(year);
    
    if (year === currentYear) {
      currentYearData = response.data.data;
      lastFetchTime = now;
    } else if (year === currentYear - 1) {
      previousYearData = response.data.data;
      lastFetchTime = now;
    } else {
      writeCache(`yearly-${year}`, response.data.data);
    }
    
    return response.data.data;
  } catch (error) {
    console.error(`API call failed for year ${year}:`, error.message);
    return [];
  }
}

async function makeApiCall(year) {
  const METEOSTAT_BASE_URL = 'https://meteostat.p.rapidapi.com/stations/daily';
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  const RAPIDAPI_HOST = 'meteostat.p.rapidapi.com';

  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const params = {
    start,
    end,
    station: '71624', // Toronto station
  };

  return await axios.get(METEOSTAT_BASE_URL, {
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
    params,
  });
}

// Reset memory cache on module load
currentYearData = null;
lastFetchTime = null;

module.exports = { Point, fetchYearlyData };