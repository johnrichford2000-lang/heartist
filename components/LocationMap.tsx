"use client";

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";

// Fix for default marker icons in Leaflet with webpack/nextjs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LocationMapProps {
  lat: number | null;
  lng: number | null;
  interactive?: boolean; // If true, clicking updates pin
  onChange?: (lat: number, lng: number) => void;
}

function LocationMarker({ lat, lng, interactive, onChange }: LocationMapProps) {
  useMapEvents({
    click(e) {
      if (interactive && onChange) {
        onChange(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return lat && lng ? <Marker position={[lat, lng]} /> : null;
}

function MapUpdater({ lat, lng }: { lat: number | null, lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 14, { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

export default function LocationMap({ lat, lng, interactive, onChange }: LocationMapProps) {
  const [mapKey, setMapKey] = useState("");
  useEffect(() => {
    setMapKey(Math.random().toString());
  }, []);

  const centerLat = lat || 14.5995;
  const centerLng = lng || 120.9842;
  const zoom = lat ? 14 : 7;

  if (!mapKey) return <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>Loading Map...</div>;
  
  return (
    <div style={{ height: "300px", width: "100%", borderRadius: "12px", overflow: "hidden", border: "2px solid rgba(255,255,255,0.1)", position: "relative", isolation: "isolate" }}>
      <MapContainer key={mapKey} center={[centerLat, centerLng]} zoom={zoom} scrollWheelZoom={true} style={{ height: "100%", width: "100%", borderRadius: "10px" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker lat={lat} lng={lng} interactive={interactive} onChange={onChange} />
        <MapUpdater lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}
