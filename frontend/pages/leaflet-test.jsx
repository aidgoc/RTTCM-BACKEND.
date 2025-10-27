import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components
const LeafletMap = dynamic(() => import('../src/components/LeafletTestMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading Leaflet map...</p>
      </div>
    </div>
  )
});

export default function LeafletTest() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Leaflet Map Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing basic Leaflet map rendering
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <LeafletMap />
        </div>
      </div>
    </div>
  );
}
