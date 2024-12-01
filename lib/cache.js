import fs from 'fs';
import path from 'path';

const STATIC_CACHE_DIR = path.join(process.cwd(), 'public', 'cache');
const DYNAMIC_CACHE_DIR = process.env.NODE_ENV === 'production'
  ? '/tmp/dynamic-cache'
  : path.join(process.cwd(), 'dynamic-cache');

// Ensure dynamic cache directory exists
if (!fs.existsSync(DYNAMIC_CACHE_DIR)) {
  try {
    fs.mkdirSync(DYNAMIC_CACHE_DIR, { recursive: true });
  } catch (error) {
    console.warn(`Unable to create dynamic cache directory: ${error.message}`);
  }
}

async function readCache(key) {
  try {
    if (process.env.NODE_ENV === 'production') {
      // In production, fetch cache file via HTTP
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/cache/${key}.json`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } else {
      // In development, read from filesystem
      const staticPath = path.join(STATIC_CACHE_DIR, `${key}.json`);
      if (fs.existsSync(staticPath)) {
        const data = fs.readFileSync(staticPath, 'utf-8');
        return JSON.parse(data);
      }

      const dynamicPath = path.join(DYNAMIC_CACHE_DIR, `${key}.json`);
      if (fs.existsSync(dynamicPath)) {
        const data = fs.readFileSync(dynamicPath, 'utf-8');
        return JSON.parse(data);
      }
    }
  } catch (error) {
    console.warn(`Error reading cache for key ${key}:`, error.message);
  }
  return null;
}

function writeCache(key, data) {
  try {
    // Only write to dynamic cache
    const filePath = path.join(DYNAMIC_CACHE_DIR, `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Cache written successfully to ${filePath}`);
  } catch (error) {
    console.warn(`Error writing cache for key ${key}:`, error.message);
  }
}

module.exports = { readCache, writeCache };