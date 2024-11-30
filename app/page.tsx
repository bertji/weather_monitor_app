'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import annotationPlugin from 'chartjs-plugin-annotation';
Chart.register(annotationPlugin);

// At the top, add type definitions
type DataEntry = [string, number];
type DailyDataEntry = {
  date: string;
  tavg: number;
};

export default function Home() {
  const [meteorologicalData, setMeteorologicalData] = useState<DataEntry[]>([]);
  const [astronomicalData, setAstronomicalData] = useState<DataEntry[]>([]);
  const [dailyData, setDailyData] = useState<DailyDataEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemperatureData();
  }, []);

  const fetchTemperatureData = async () => {
    try {
      const response = await fetch('/api/temperature');
      if (!response.ok) {
        throw new Error(`Failed to fetch temperature data: ${response.status}`);
      }
      const data = await response.json();
      setMeteorologicalData(Object.entries(data.meteorological));
      setAstronomicalData(Object.entries(data.astronomical));
      setDailyData(data.dailyData);
    } catch (err) {
      console.error(err);
      setError('Failed to load temperature data.');
    }
  };

  const renderCombinedChart = useCallback(() => {
    const ctx = document.getElementById('combinedChart') as HTMLCanvasElement;
    const labels = meteorologicalData.map(([year]) => year);

    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Meteorological Winter (°C)',
            data: meteorologicalData.map(([, temp]) => temp),
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderWidth: 2,
            fill: false,
          },
          {
            label: 'Astronomical Winter (°C)',
            data: astronomicalData.map(([, temp]) => temp),
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderWidth: 2,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Winter Temperature Comparison'
          },
          legend: {
            position: 'top',
          },
        },
        scales: {
          y: {
            title: {
              display: true,
              text: 'Temperature (°C)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Year'
            }
          }
        }
      }
    });
  }, [meteorologicalData, astronomicalData]);

  const renderDailyComparisonChart = useCallback(() => {
    const ctx = document.getElementById('dailyComparisonChart') as HTMLCanvasElement;
    
    // Define winter periods for both years
    const winters = {
      2024: {
        meteo: {
          start: new Date(2023, 11, 1),  // Dec 1, 2023
          end: new Date(2024, 1, 28)     // Feb 28, 2024
        },
        astro: {
          start: new Date('2023-12-21T22:27:00'),
          end: new Date('2024-03-20T17:24:00')
        }
      },
      2025: {
        meteo: {
          start: new Date(2024, 11, 1),  // Dec 1, 2024
          end: new Date(2025, 1, 28)     // Feb 28, 2025
        },
        astro: {
          start: new Date('2024-12-21T04:12:00'),
          end: new Date('2025-03-20T13:16:00')
        }
      }
    };

    // Function to normalize date to ignore year
    const normalizeDate = (date: Date) => {
      const month = date.getMonth();
      const year = 2000;
      return new Date(month === 11 ? year : year + 1, date.getMonth(), date.getDate());
    };

    // Helper function for average temperature lines
    const avgTempLine = (temp: string | number, label: string, color: string) => ({
      type: 'line' as const,
      yMin: typeof temp === 'string' ? parseFloat(temp) : temp,
      yMax: typeof temp === 'string' ? parseFloat(temp) : temp,
      borderColor: color,
      borderWidth: 2,
      label: {
        content: label,
        enabled: true,
        position: 'start' as const
      }
    });

    // Helper function for period marker lines
    const periodLine = (date: Date, label: string, color: string) => ({
      type: 'line' as const,
      xMin: normalizeDate(date).getTime(),
      xMax: normalizeDate(date).getTime(),
      borderColor: color,
      borderWidth: 1,
      borderDash: [5, 5],
      label: {
        content: label,
        enabled: true,
        position: 'start' as const
      }
    });

    // Function to split data into actual and forecast
    const createDataPoints = (start: Date, end: Date) => {
      const actualPoints = [];
      const forecastPoints = [];
      const currentDate = new Date();
      let checkDate = new Date(start);

      while (checkDate <= end) {
        const matchingData = dailyData.find(d => {
          const dataDate = new Date(d.date);
          return dataDate.getFullYear() === checkDate.getFullYear() &&
                 dataDate.getMonth() === checkDate.getMonth() &&
                 dataDate.getDate() === checkDate.getDate();
        });

        const point = {
          x: normalizeDate(checkDate),
          y: matchingData ? matchingData.tavg : null
        };

        if (checkDate <= currentDate) {
          actualPoints.push(point);
        } else {
          forecastPoints.push(point);
        }
        
        checkDate.setDate(checkDate.getDate() + 1);
      }
      return { actualPoints, forecastPoints };
    };

    const data2024 = createDataPoints(winters[2024].meteo.start, winters[2024].astro.end);
    const data2025 = createDataPoints(winters[2025].meteo.start, winters[2025].astro.end);

    new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: '2024 Winter',
            data: data2024.actualPoints,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderWidth: 2,
            fill: false
          },
          {
            label: '2025 Winter (Actual)',
            data: data2025.actualPoints,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderWidth: 2,
            fill: false
          },
          {
            label: '2025 Winter (Forecast)',
            data: data2025.forecastPoints,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointStyle: 'star',
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Winter Temperature Comparison'
          },
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${value?.toFixed(1)}°C`;
              }
            }
          },
          annotation: {
            annotations: [
              avgTempLine(getTemperature(meteorologicalData, '2025'), '2025 Avg Temp', 'rgba(255, 99, 132, 0.5)'),
              periodLine(winters[2025].meteo.start, '2025 Met Start', 'rgba(255, 99, 132, 0.5)'),
              periodLine(winters[2025].astro.start, '2025 Astro Start', 'rgba(255, 99, 132, 0.5)'),
              periodLine(winters[2025].astro.end, '2025 Astro End', 'rgba(255, 99, 132, 0.5)')
            ]
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day',
              displayFormats: {
                day: 'MMM d'
              }
            },
            min: normalizeDate(new Date(2000, 11, 1)).getTime(),  // Dec 1, 2000
            max: normalizeDate(new Date(2001, 2, 25)).getTime(),  // Mar 25, 2001
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Temperature (°C)'
            }
          }
        }
      }
    });
  }, [dailyData, meteorologicalData]);

  useEffect(() => {
    if (meteorologicalData.length && astronomicalData.length) {
      renderCombinedChart();
      renderDailyComparisonChart();
    }
  }, [meteorologicalData, astronomicalData, renderCombinedChart, renderDailyComparisonChart]);

  const getTemperature = (data: [string, number][], year: string) => {
    const entry = data.find(([y]) => y === year);
    return entry ? entry[1].toFixed(1) : 'N/A';
  };

  const determineWinner = (data2025: string | number) => {
    // If temperature is N/A, return null
    if (data2025 === 'N/A') {
      return null;
    }
    
    const temp2025 = typeof data2025 === 'string' ? parseFloat(data2025) : data2025;
    
    if (temp2025 >= 0) {
      return 'neomonk';
    }
    return 'pajaro';
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Winter Temperature Tracker</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Current Winners</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-medium text-lg mb-2">Meteorological Winter</h3>
            <p>
              Current winner: <span className="font-bold text-blue-600">
                {determineWinner(
                  getTemperature(meteorologicalData, '2025')
                ) || 'Not yet determined'}
              </span>
            </p>
            <div className="text-sm text-gray-600 mt-2">
              <p className="mb-1">
                <span className="font-medium">2025:</span> Dec 1, 2024 - Feb 28, 2025
                <span className="ml-2 text-blue-600">
                  ({getTemperature(meteorologicalData, '2025')}°C)
                </span>
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-medium text-lg mb-2">Astronomical Winter</h3>
            <p>
              Current winner: <span className="font-bold text-blue-600">
                {determineWinner(
                  getTemperature(astronomicalData, '2025')
                ) || 'Not yet determined'}
              </span>
            </p>
            <div className="text-sm text-gray-600 mt-2">
              <p className="mb-1">
                <span className="font-medium">2025:</span> Dec 21, 2024 04:12 - Mar 20, 2025
                <span className="ml-2 text-blue-600">
                  ({getTemperature(astronomicalData, '2025')}°C)
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <canvas id="dailyComparisonChart" width="400" height="200"></canvas>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <canvas id="combinedChart" width="400" height="200"></canvas>
      </div>
    </div>
  );
}