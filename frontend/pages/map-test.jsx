import React, { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the map component with no SSR
const MapView = dynamic(() => import('../src/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
      </div>
    </div>
  )
});

export default function MapTest() {
  const [isListView, setIsListView] = useState(false);
  
  // Sample crane data for testing
  const sampleCranes = [
    {
      craneId: 'TC-001',
      name: 'Test Crane 1',
      location: 'Mumbai, India',
      online: true,
      swl: 50,
      locationData: {
        coordinates: [72.8777, 19.0760], // Mumbai coordinates
        locationSource: 'gps_hardware',
        locationMethod: 'gps',
        locationAccuracy: 5
      }
    },
    {
      craneId: 'TC-002', 
      name: 'Test Crane 2',
      location: 'Delhi, India',
      online: false,
      swl: 75,
      locationData: {
        coordinates: [77.1025, 28.7041], // Delhi coordinates
        locationSource: 'gsm_triangulation',
        locationMethod: 'gsm',
        locationAccuracy: 100
      }
    },
    {
      craneId: 'TC-003',
      name: 'Test Crane 3', 
      location: 'Bangalore, India',
      online: true,
      swl: 100,
      locationData: {
        coordinates: [77.5946, 12.9716], // Bangalore coordinates
        locationSource: 'gps_hardware',
        locationMethod: 'gps',
        locationAccuracy: 3
      }
    },
    {
      craneId: 'TC-004',
      name: 'Test Crane 4', 
      location: 'Chennai, India',
      online: true,
      swl: 80,
      locationData: {
        coordinates: [80.2707, 13.0827], // Chennai coordinates
        locationSource: 'gps_hardware',
        locationMethod: 'gps',
        locationAccuracy: 4
      }
    },
    {
      craneId: 'TC-005',
      name: 'Test Crane 5', 
      location: 'Kolkata, India',
      online: false,
      swl: 60,
      locationData: {
        coordinates: [88.3639, 22.5726], // Kolkata coordinates
        locationSource: 'gsm_triangulation',
        locationMethod: 'gsm',
        locationAccuracy: 150
      }
    }
  ];

  const handleCraneClick = (crane) => {
    console.log('Crane clicked:', crane);
    alert(`Clicked on ${crane.name} (${crane.craneId})`);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Map View Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing the map component with sample crane data
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <MapView
            cranes={sampleCranes}
            onCraneClick={handleCraneClick}
            isListView={isListView}
            onToggleView={() => setIsListView(!isListView)}
          />
        </div>
        
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Sample Crane Data
          </h2>
          <div className="space-y-4">
            {sampleCranes.map((crane) => (
              <div key={crane.craneId} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{crane.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{crane.craneId} • {crane.location}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${crane.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {crane.online ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
