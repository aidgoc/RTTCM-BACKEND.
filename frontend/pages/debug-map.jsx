import React, { useState, useEffect } from 'react';

export default function DebugMap() {
  const [mounted, setMounted] = useState(false);
  const [mapComponent, setMapComponent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setMounted(true);
    
    // Try to dynamically import the map component
    import('../src/components/MapViewClient')
      .then((module) => {
        console.log('MapViewClient imported successfully:', module);
        setMapComponent(() => module.default);
      })
      .catch((err) => {
        console.error('Error importing MapViewClient:', err);
        setError(err.message);
      });
  }, []);

  const sampleCranes = [
    {
      craneId: 'TC-001',
      name: 'Test Crane 1',
      location: 'Mumbai, India',
      online: true,
      swl: 50,
      locationData: {
        coordinates: [72.8777, 19.0760],
        locationSource: 'gps_hardware',
        locationMethod: 'gps',
        locationAccuracy: 5
      }
    }
  ];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 dark:bg-red-900 rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-4">
              Error Loading Map Component
            </h1>
            <p className="text-red-700 dark:text-red-300 mb-4">
              {error}
            </p>
            <div className="bg-red-50 dark:bg-red-800 p-4 rounded">
              <pre className="text-sm text-red-800 dark:text-red-200 overflow-auto">
                {JSON.stringify({ mounted, error, hasMapComponent: !!mapComponent }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!mapComponent) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-100 dark:bg-yellow-900 rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-yellow-800 dark:text-yellow-200 mb-4">
              Map Component Not Loaded
            </h1>
            <p className="text-yellow-700 dark:text-yellow-300">
              The map component is still loading...
            </p>
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
            Debug Map Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing map component loading and rendering
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Map Component Status
          </h2>
          <div className="mb-4 p-4 bg-green-100 dark:bg-green-900 rounded">
            <p className="text-green-800 dark:text-green-200">
              ✅ Map component loaded successfully
            </p>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Sample Crane Data
          </h3>
          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(sampleCranes, null, 2)}
          </pre>
          
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 mt-4">
            Map Component
          </h3>
          <div className="border border-gray-300 rounded-lg">
            {React.createElement(mapComponent, {
              cranes: sampleCranes,
              onCraneClick: (crane) => console.log('Crane clicked:', crane),
              isListView: false,
              onToggleView: () => console.log('Toggle view clicked')
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
