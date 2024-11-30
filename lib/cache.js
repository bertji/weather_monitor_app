import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR);
}

function getCacheFilePath(key) {
  return path.join(CACHE_DIR, `${key}.json`);
}

function readCache(key) {
  const filePath = getCacheFilePath(key);
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading cache for key ${key}:`, error.message);
      return null;
    }
  }
  return null;
}

function writeCache(key, data) {
    const filePath = getCacheFilePath(key);
    try {
      console.log(`Writing cache for key: ${key}`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`Cache written successfully to ${filePath}`);
    } catch (error) {
      console.error(`Error writing cache for key ${key}:`, error.message);
    }
  }

module.exports = { readCache, writeCache };