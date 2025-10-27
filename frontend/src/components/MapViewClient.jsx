import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Crane Icon Component
const CraneIcon = ({ isOnline, size = 40, craneNumber = 1 }) => {
  const iconHtml = `
    <div class="crane-marker ${isOnline ? 'online' : 'offline'}" style="
      width: ${size}px;
      height: ${size}px;
      background: white;
      border: 4px solid ${isOnline ? '#10B981' : '#EF4444'};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      position: relative;
      font-family: Arial, sans-serif;
    ">
      <!-- Crane Icon -->
      <div class="crane-icon" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: ${size * 0.5}px;
        height: ${size * 0.5}px;
        background-image: url('https://cdn-icons-png.flaticon.com/128/10549/10549312.png');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        filter: none;
        z-index: 2;
      "></div>
      
      <!-- Crane Number -->
      <div style="
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        background: ${isOnline ? '#10B981' : '#EF4444'};
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        z-index: 3;
      ">${craneNumber}</div>
      
      ${isOnline ? `
        <div style="
          position: absolute;
          top: -4px;
          right: -4px;
          width: 12px;
          height: 12px;
          background: #10B981;
          border-radius: 50%;
          border: 3px solid white;
          animation: pulse 2s infinite;
          z-index: 4;
        "></div>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-div-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2 + 10], // Adjust for the number badge
    popupAnchor: [0, -size / 2 - 10]
  });
};

// Map Controls Component
const MapControls = ({ onToggleView, isListView, onCenterMap, cranes }) => {
  const map = useMap();
  
  const centerOnCranes = () => {
    if (cranes.length === 0) return;
    
    const bounds = L.latLngBounds();
    cranes.forEach(crane => {
      if (crane.coordinates) {
        bounds.extend([crane.coordinates.lat, crane.coordinates.lng]);
      }
    });
    
    if (!bounds.isValid()) return;
    
    map.fitBounds(bounds, { padding: [20, 20] });
  };

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col space-y-2">
      <button
        onClick={onToggleView}
        className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
      >
        {isListView ? '🗺️ Map View' : '📋 List View'}
      </button>
      
      <button
        onClick={centerOnCranes}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-600 transition-colors duration-200"
      >
        🎯 Center on Cranes
      </button>
    </div>
  );
};

// City to Coordinates lookup service
const getCityCoordinates = async (cityName) => {
  try {
    // Using OpenStreetMap Nominatim API for geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1&addressdetails=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        address: data[0].display_name,
        accuracy: 'city'
      };
    }
    
    // Fallback to major cities if not found
    const majorCities = {
      'mumbai': { lat: 19.0760, lng: 72.8777 },
      'delhi': { lat: 28.7041, lng: 77.1025 },
      'bangalore': { lat: 12.9716, lng: 77.5946 },
      'hyderabad': { lat: 17.3850, lng: 78.4867 },
      'chennai': { lat: 13.0827, lng: 80.2707 },
      'kolkata': { lat: 22.5726, lng: 88.3639 },
      'pune': { lat: 18.5204, lng: 73.8567 },
      'ahmedabad': { lat: 23.0225, lng: 72.5714 },
      'jaipur': { lat: 26.9124, lng: 75.7873 },
      'surat': { lat: 21.1702, lng: 72.8311 }
    };
    
    const cityKey = cityName.toLowerCase().trim();
    if (majorCities[cityKey]) {
      return {
        ...majorCities[cityKey],
        address: cityName,
        accuracy: 'major_city'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error geocoding city:', error);
    return null;
  }
};

// Main Map Component
const MapViewClient = ({ cranes = [], onCraneClick, isListView, onToggleView }) => {
  const [craneLocations, setCraneLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default to India center
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering map
  useEffect(() => {
    setMounted(true);
  }, []);

  // Process crane locations
  useEffect(() => {
    const processCraneLocations = async () => {
      console.log('Processing crane locations:', cranes);
      setLoading(true);
      const processedCranes = [];

      for (const crane of cranes) {
        let coordinates = null;
        let locationSource = 'unknown';

        // Check if crane has GPS coordinates from MQTT
        if (crane.locationData?.coordinates && crane.locationData.coordinates.length === 2) {
          const [lng, lat] = crane.locationData.coordinates;
          coordinates = { lat, lng };
          locationSource = crane.locationData.locationSource || 'gps';
          console.log('Found GPS coordinates for crane:', crane.craneId, coordinates);
        } else {
          // Try to geocode city name for manual cranes
          console.log('Geocoding city for crane:', crane.craneId, crane.location);
          const cityCoords = await getCityCoordinates(crane.location);
          if (cityCoords) {
            coordinates = { lat: cityCoords.lat, lng: cityCoords.lng };
            locationSource = 'city_geocoded';
            console.log('Found city coordinates for crane:', crane.craneId, coordinates);
          }
        }

        if (coordinates) {
          processedCranes.push({
            ...crane,
            coordinates,
            locationSource,
            displayName: crane.name || crane.craneId,
            isOnline: crane.online || false
          });
        }
      }

      console.log('Processed crane locations:', processedCranes);
      setCraneLocations(processedCranes);
      setLoading(false);
    };

    if (mounted) {
      processCraneLocations();
    }
  }, [cranes, mounted]);

  // Update map center when cranes are loaded
  useEffect(() => {
    if (craneLocations.length > 0) {
      const bounds = L.latLngBounds();
      craneLocations.forEach(crane => {
        bounds.extend([crane.coordinates.lat, crane.coordinates.lng]);
      });
      
      if (bounds.isValid()) {
        setMapCenter(bounds.getCenter());
      }
    }
  }, [craneLocations]);

  // Don't render map until component is mounted
  if (!mounted) {
    return (
      <div className="w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing map...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading crane locations...</p>
        </div>
      </div>
    );
  }

  if (craneLocations.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏗️</div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">No cranes with location data found</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            Cranes need GPS coordinates or city information to appear on the map
          </p>
        </div>
      </div>
    );
  }

  console.log('Rendering map with:', { craneLocations, mapCenter, mounted });

  return (
    <div className="w-full h-96 relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <MapContainer
        center={mapCenter}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render crane markers */}
        {craneLocations.map((crane, index) => (
          <Marker
            key={crane.craneId}
            position={[crane.coordinates.lat, crane.coordinates.lng]}
            icon={CraneIcon({ 
              isOnline: crane.isOnline, 
              size: 40, 
              craneNumber: index + 1 
            })}
            eventHandlers={{
              click: () => onCraneClick && onCraneClick(crane)
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="relative">
                    <img 
                      src="https://cdn-icons-png.flaticon.com/128/10549/10549312.png" 
                      alt="Tower Crane" 
                      className="w-6 h-6"
                      style={{ filter: 'none' }}
                    />
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{crane.displayName}</h3>
                    <p className="text-sm text-gray-600">{crane.craneId}</p>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${crane.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={crane.isOnline ? 'text-green-700' : 'text-red-700'}>
                      {crane.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500">📍</span>
                    <span className="text-gray-700">{crane.location}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500">🎯</span>
                    <span className="text-gray-700 capitalize">
                      {crane.locationSource.replace('_', ' ')}
                    </span>
                  </div>
                  
                  {crane.swl && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">⚖️</span>
                      <span className="text-gray-700">SWL: {crane.swl}kg</span>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => onCraneClick && onCraneClick(crane)}
                  className="mt-3 w-full bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors duration-200"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
        
        <MapControls 
          onToggleView={onToggleView}
          isListView={isListView}
          onCenterMap={() => {}}
          cranes={craneLocations}
        />
      </MapContainer>
    </div>
  );
};

export default MapViewClient;
