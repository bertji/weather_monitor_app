import { NextResponse } from 'next/server';
import { Point, fetchYearlyData } from '@/lib/meteostat';
import { readCache } from '@/lib/cache';

const winterDates = {
    2001: ["2000-12-21 08:37", "2001-03-20 02:35"],
    2002: ["2001-12-21 14:21", "2002-03-20 08:31"],
    2003: ["2002-12-21 20:14", "2003-03-20 14:16"],
    2004: ["2003-12-22 02:04", "2004-03-20 20:00"],
    2005: ["2004-12-21 07:42", "2005-03-20 01:49"],
    2006: ["2005-12-21 13:35", "2006-03-20 07:34"],
    2007: ["2006-12-21 19:22", "2007-03-20 13:26"],
    2008: ["2007-12-22 01:08", "2008-03-20 19:07"],
    2009: ["2008-12-21 07:04", "2009-03-20 01:48"],
    2010: ["2009-12-21 12:47", "2010-03-20 07:44"],
    2011: ["2010-12-21 18:38", "2011-03-20 13:32"],
    2012: ["2011-12-22 00:30", "2012-03-20 19:21"],
    2013: ["2012-12-21 06:12", "2013-03-20 01:14"],
    2014: ["2013-12-21 12:11", "2014-03-20 07:02"],
    2015: ["2014-12-21 18:03", "2015-03-20 12:57"],
    2016: ["2015-12-22 00:48", "2016-03-20 18:45"],
    2017: ["2016-12-21 05:44", "2017-03-20 00:30"],
    2018: ["2017-12-21 11:28", "2018-03-20 06:28"],
    2019: ["2018-12-21 17:23", "2019-03-20 12:15"],
    2020: ["2019-12-21 23:19", "2020-03-20 18:58"],
    2021: ["2020-12-21 05:02", "2021-03-19 23:50"],
    2022: ["2021-12-21 10:59", "2022-03-20 05:37"],
    2023: ["2022-12-21 16:48", "2023-03-20 11:33"],
    2024: ["2023-12-21 22:27", "2024-03-20 17:24"],
    2025: ["2024-12-21 04:12", "2025-03-20 13:16"],
  };

  export async function GET() {
    const startYear = 2001;
    const endYear = new Date().getFullYear();
    const currentDate = new Date();
  
    if (!Number.isInteger(startYear) || !Number.isInteger(endYear)) {
      console.error(`Invalid year range: startYear=${startYear}, endYear=${endYear}`);
      return NextResponse.json({ error: 'Invalid year range' }, { status: 400 });
    }
  
    try {
      // Collect all daily data from cache files AND current years
      const dailyData = [];
      for (let year = startYear; year <= endYear; year++) {
        // For historical years, check cache
        const cachedData = readCache(`yearly-${year}`);
        if (cachedData) {
          dailyData.push(...cachedData);
          continue;
        }
  
        // If not in cache (like 2024), fetch it
        const point = new Point(43.6532, -79.3832); // Toronto coordinates
        const yearData = await fetchYearlyData(point, year);
        if (yearData && yearData.length > 0) {
          dailyData.push(...yearData);
        }
      }
  
      if (!dailyData || dailyData.length === 0) {
        console.error("No data found in cache files.");
        return NextResponse.json({ error: 'No data available' }, { status: 404 });
      }
  
      const meteorologicalData = {};
      const astronomicalData = {};
  
      for (const year of Object.keys(winterDates)) {
        const [astroStartStr, astroEndStr] = winterDates[year];
        const astroStart = new Date(astroStartStr);
        const astroEnd = new Date(astroEndStr);
        const meteoStart = new Date(year - 1, 11, 1); // Dec 1 of previous year
        const meteoEnd = new Date(year, 1, 28); // Feb 28 of current year
  
        // Skip future winters
        if (meteoStart > currentDate) {
          continue;
        }
  
        const meteoFiltered = dailyData.filter(
          (entry) => {
            const entryDate = new Date(entry.date);
            return entryDate >= meteoStart && 
                   entryDate <= meteoEnd && 
                   entryDate <= currentDate;
          }
        );
  
        const astroFiltered = dailyData.filter(
          (entry) => {
            const entryDate = new Date(entry.date);
            return entryDate >= astroStart && 
                   entryDate <= astroEnd && 
                   entryDate <= currentDate;
          }
        );
  
        // Only include data if we have enough readings
        if (meteoFiltered.length > 0) {
          meteorologicalData[year] = meteoFiltered.reduce(
            (sum, entry) => sum + entry.tavg,
            0
          ) / meteoFiltered.length;
        }
  
        if (astroFiltered.length > 0) {
          astronomicalData[year] = astroFiltered.reduce(
            (sum, entry) => sum + entry.tavg,
            0
          ) / astroFiltered.length;
        }
      }
  
      return NextResponse.json({ 
        meteorological: meteorologicalData, 
        astronomical: astronomicalData,
        dailyData: dailyData  // Add daily data to response
      });
    } catch (error) {
      console.error('Error processing temperature data:', error.message);
      return NextResponse.json({ error: 'Failed to process temperature data' }, { status: 500 });
    }
  }