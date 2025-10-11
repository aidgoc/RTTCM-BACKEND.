import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Simple map test without any complex logic
const SimpleMapTest = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Simple Map Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing basic map rendering without crane data
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="w-full h-96 border border-gray-300 rounded-lg">
            <iframe
              src="https://www.openstreetmap.org/export/embed.html?bbox=72.8,19.0,73.0,19.2&layer=mapnik"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="OpenStreetMap"
            />
          </div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            This is a simple OpenStreetMap iframe to test if maps work at all.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimpleMapTest;
