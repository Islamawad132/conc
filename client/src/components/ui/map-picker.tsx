import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// عنوان المركز (الموقع الافتراضي)
const CENTER_POSITION: [number, number] = [30.0358493, 31.2077047];

// إنشاء أيقونة مخصصة للعلامة
const markerIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface LocationPickerProps {
  onLocationChange?: (lat: number, lng: number) => void;
  initialLocation?: [number, number];
}

// مكون يستمع لأحداث النقر على الخريطة
function LocationMarker({ 
  onLocationChange 
}: { 
  onLocationChange?: (lat: number, lng: number) => void 
}) {
  const [position, setPosition] = useState<LatLng | null>(null);
  
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      if (onLocationChange) {
        onLocationChange(e.latlng.lat, e.latlng.lng);
      }
    }
  });

  return position === null ? null : (
    <Marker position={position} icon={markerIcon} />
  );
}

export default function MapPicker({ onLocationChange, initialLocation }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number]>(initialLocation || CENTER_POSITION);

  useEffect(() => {
    if (initialLocation) {
      setPosition(initialLocation);
      if (onLocationChange) {
        onLocationChange(initialLocation[0], initialLocation[1]);
      }
    }
  }, [initialLocation, onLocationChange]);

  // حساب المسافة بين المركز والموقع المحدد (بالكيلومتر)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // المسافة بالكيلومتر
    return Math.round(distance * 100) / 100; // تقريب إلى أقرب 100 متر
  };

  const handleMarkerChange = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    if (onLocationChange) {
      onLocationChange(lat, lng);
    }
  };

  const distance = calculateDistance(CENTER_POSITION[0], CENTER_POSITION[1], position[0], position[1]);

  return (
    <div className="flex flex-col gap-2">
      <div className="h-[300px] w-full rounded-md overflow-hidden border">
        <MapContainer 
          center={position} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position} icon={markerIcon} />
          <LocationMarker onLocationChange={handleMarkerChange} />
        </MapContainer>
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        <p>إحداثيات الموقع: {position[0].toFixed(6)}, {position[1].toFixed(6)}</p>
        <p>المسافة عن المركز: {distance} كم</p>
      </div>
    </div>
  );
}