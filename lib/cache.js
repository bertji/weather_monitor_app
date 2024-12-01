import fs from 'fs';
import path from 'path';

// Static cache for pre-generated files (always in project directory)
const STATIC_CACHE_DIR = path.join(process.cwd(), 'cache');

// Dynamic cache for runtime-generated files (in /tmp for production)
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

function getCacheFilePath(key, isDynamic = false) {
  const baseDir = isDynamic ? DYNAMIC_CACHE_DIR : STATIC_CACHE_DIR;
  return path.join(baseDir, `${key}.json`);
}

function readCache(key) {
  try {
    // First try to read from static cache
    const staticPath = getCacheFilePath(key, false);
    if (fs.existsSync(staticPath)) {
      const data = fs.readFileSync(staticPath, 'utf-8');
      return JSON.parse(data);
    }

    // If not in static cache, try dynamic cache
    const dynamicPath = getCacheFilePath(key, true);
    if (fs.existsSync(dynamicPath)) {
      const data = fs.readFileSync(dynamicPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn(`Error reading cache for key ${key}:`, error.message);
  }
  return null;
}

function writeCache(key, data) {
  try {
    // Only write to dynamic cache
    const filePath = getCacheFilePath(key, true);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Cache written successfully to ${filePath}`);
  } catch (error) {
    console.warn(`Error writing cache for key ${key}:`, error.message);
  }
}

module.exports = { readCache, writeCache };