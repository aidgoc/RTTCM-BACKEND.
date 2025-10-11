import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the map component with no SSR
const MapViewClient = dynamic(() => import('./MapViewClient'), {
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

// Main MapView component that handles SSR
const MapView = ({ cranes = [], onCraneClick, isListView, onToggleView }) => {
  return (
    <MapViewClient
      cranes={cranes}
      onCraneClick={onCraneClick}
      isListView={isListView}
      onToggleView={onToggleView}
    />
  );
};

export default MapView;
