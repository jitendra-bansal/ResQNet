// Geolocation and Reverse Geocoding Utility for ResQNet

export interface LiveLocationResult {
  address: string;
  lat: number;
  lon: number;
  accuracy: number;
  details?: Record<string, string>;
  isLiveGps: boolean;
}

/**
 * Get the user's current live location and reverse-geocode to a physical street/residential address.
 * If user is at home, this allows 1-click home address auto-fill with exact GPS coordinates.
 */
export async function getLiveCurrentAddress(): Promise<LiveLocationResult> {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser or device.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        try {
          // Attempt reverse geocoding via server endpoint
          const res = await fetch(`/api/reverse-geocode?lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            if (data.formattedAddress) {
              return resolve({
                address: data.formattedAddress,
                lat: latitude,
                lon: longitude,
                accuracy: Math.round(accuracy),
                details: data.details,
                isLiveGps: true,
              });
            }
          }

          // Direct client fallback if server endpoint is unreachable
          try {
            const clientRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            if (clientRes.ok) {
              const cData = await clientRes.json();
              if (cData.display_name) {
                return resolve({
                  address: cData.display_name,
                  lat: latitude,
                  lon: longitude,
                  accuracy: Math.round(accuracy),
                  details: cData.address,
                  isLiveGps: true,
                });
              }
            }
          } catch {
            // Ignore client fetch error and use coordinate fallback
          }

          // Coordinate string fallback
          resolve({
            address: `Live Location: ${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E (±${Math.round(accuracy)}m)`,
            lat: latitude,
            lon: longitude,
            accuracy: Math.round(accuracy),
            isLiveGps: true,
          });
        } catch (err: any) {
          resolve({
            address: `Live GPS Location: ${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E`,
            lat: latitude,
            lon: longitude,
            accuracy: Math.round(accuracy),
            isLiveGps: true,
          });
        }
      },
      (error) => {
        let msg = 'Unable to retrieve your live GPS location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser or enter your address manually.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is currently unavailable. Please enter your address manually.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please try again or enter your address manually.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  }
);
}
