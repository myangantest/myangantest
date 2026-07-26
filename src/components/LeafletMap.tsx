/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  title: string;
}

export default function LeafletMap({ latitude, longitude, title }: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    // 1. Dynamic Asset Loader
    const linkId = 'leaflet-cdn-css';
    const scriptId = 'leaflet-cdn-js';

    // Inject CSS
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // Inject JS
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = () => setIsLoaded(true);
      script.onerror = () => setLoadError(true);
      document.body.appendChild(script);
    } else {
      // Script is already in DOM, check if L is available
      if ((window as any).L) {
        setIsLoaded(true);
      } else {
        // Wait and check
        const interval = setInterval(() => {
          if ((window as any).L) {
            setIsLoaded(true);
            clearInterval(interval);
          }
        }, 100);
        return () => clearInterval(interval);
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    try {
      // Reset any previous instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Initialize map
      const map = L.map(mapContainerRef.current).setView([latitude, longitude], 14);
      mapInstanceRef.current = map;

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Fix default icon issues in Leaflet (retina/shadow assets are sometimes broken)
      const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      L.Marker.prototype.options.icon = DefaultIcon;

      // Add marker and popup
      L.marker([latitude, longitude])
        .addTo(map)
        .bindPopup(`<strong>${title}</strong><br/>Rent Property Location`)
        .openPopup();

      // Trigger redraw to fix rendering issues inside tabs/modals
      setTimeout(() => {
        map.invalidateSize();
      }, 200);

    } catch (err) {
      console.error('Error initializing Leaflet Map:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isLoaded, latitude, longitude, title]);

  if (loadError) {
    return (
      <div className="w-full h-72 bg-gray-100 rounded-xl flex items-center justify-center text-sm text-gray-500 border border-gray-200">
        Map failed to load. Please check your internet connection.
      </div>
    );
  }

  return (
    <div className="relative w-full h-72 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-mono">Loading OpenStreetMap...</p>
          </div>
        </div>
      )}
      <div id={`map-${latitude}-${longitude}`} ref={mapContainerRef} className="w-full h-full z-10" />
    </div>
  );
}
