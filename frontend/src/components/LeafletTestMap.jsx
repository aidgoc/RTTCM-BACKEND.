import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const LeafletTestMap = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Initialize the map
      mapInstanceRef.current = L.map(mapRef.current).setView([19.0760, 72.8777], 10);

      // Add a tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Add a marker
      L.marker([19.0760, 72.8777])
        .addTo(mapInstanceRef.current)
        .bindPopup('Mumbai, India')
        .openPopup();

      console.log('Leaflet map initialized successfully');
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-96 border border-gray-300 rounded-lg" ref={mapRef} />
  );
};

export default LeafletTestMap;
