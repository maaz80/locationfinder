import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Loader2, Copy, Map, Navigation } from "lucide-react";

const App = () => {
  const inputRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load Google Maps + Places script
  const loadGoogleMapsScript = () => {
    return new Promise((resolve) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_API_KEY}&libraries=places`;
      script.async = true;
      script.onload = resolve;
      document.body.appendChild(script);
    });
  };

  // Reverse Geocode: get formatted address from lat/lng using Google Maps Geocoding API
  const getAddressFromLatLng = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_API_KEY}`
      );
      const data = await response.json();
      if (data.status === "OK" && data.results.length > 0) {
        return data.results[0].formatted_address;
      } else {
        return "Unknown location";
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      return "Unknown location";
    }
  };

  useEffect(() => {
    loadGoogleMapsScript().then(() => {
      if (inputRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ["geocode"],
          componentRestrictions: { country: "in" },
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.geometry || !place.geometry.location) {
            setError("No details available for this place");
            return;
          }

          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          const newLocation = {
            name: place.formatted_address || place.name,
            lat,
            lng,
            accuracy: "From search",
            timestamp: new Date().toISOString()
          };
          
          setLocation(newLocation);
          addToHistory(newLocation);
          setError("");
        });
      }
    });

    // Load history from localStorage
    const savedHistory = localStorage.getItem('locationHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse location history", e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('locationHistory', JSON.stringify(history));
    }
  }, [history]);

  const addToHistory = (loc) => {
    setHistory(prev => {
      // Limit history to 5 items and avoid duplicates
      const filtered = prev.filter(item => item.name !== loc.name);
      return [loc, ...filtered].slice(0, 5);
    });
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        const address = await getAddressFromLatLng(latitude, longitude);
        
        const newLocation = {
          name: address,
          lat: latitude,
          lng: longitude,
          accuracy,
          timestamp: new Date().toISOString()
        };
        
        setLocation(newLocation);
        addToHistory(newLocation);
        setLoading(false);
      },
      (err) => {
        setError(`Error: ${err.message}`);
        setLocation(null);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const copyCoordinates = () => {
    if (location) {
      navigator.clipboard.writeText(`${location.lat}, ${location.lng}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openInMaps = () => {
    if (location) {
      window.open(`https://www.google.com/maps?q=${location.lat},${location.lng}`, '_blank');
    }
  };

  const selectFromHistory = (historyItem) => {
    setLocation(historyItem);
    setShowHistory(false);
    if (inputRef.current) {
      inputRef.current.value = historyItem.name;
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('locationHistory');
    setShowHistory(false);
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="poppins-regular min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Location Finder</h1>
          <p className="text-gray-500 text-sm">Search or get your current location</p>
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          
          <input
            type="text"
            ref={inputRef}
            placeholder="Search for a location"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            onClick={() => setShowHistory(true)}
          />
          
          {showHistory && history.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="p-2 flex justify-between items-center border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">Recent Locations</span>
                <button 
                  onClick={clearHistory}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Clear All
                </button>
              </div>
              <ul>
                {history.map((item, index) => (
                  <li 
                    key={index} 
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
                    onClick={() => selectFromHistory(item)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-700 truncate max-w-xs">{item.name}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(item.timestamp)}</p>
                    </div>
                    <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={getCurrentLocation}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white rounded-lg py-3 px-4 transition shadow-md"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <MapPin className="h-5 w-5" />
            )}
            <span className="font-medium">Get My Location</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {location && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-blue-900">Location Details</h3>
              <div className="flex space-x-2">
                <button 
                  onClick={copyCoordinates}
                  className="p-2 rounded-full hover:bg-blue-100 transition"
                  title="Copy coordinates"
                >
                  <Copy className="h-4 w-4 text-blue-700" />
                </button>
                <button 
                  onClick={openInMaps}
                  className="p-2 rounded-full hover:bg-blue-100 transition"
                  title="Open in Google Maps"
                >
                  <Map className="h-4 w-4 text-blue-700" />
                </button>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="font-medium text-blue-900">{location.name}</p>
              <div className="flex items-center text-sm text-blue-800">
                <Navigation className="h-4 w-4 mr-1" />
                <span>{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
                {copied && <span className="ml-2 text-xs text-green-600">Copied!</span>}
              </div>
              {location.accuracy && location.accuracy !== "From search" && (
                <p className="text-xs text-blue-600 flex items-center">
                  <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
                  Accuracy: {typeof location.accuracy === 'number' ? `${location.accuracy.toFixed(1)} meters` : location.accuracy}
                </p>
              )}
              {location.timestamp && (
                <p className="text-xs text-blue-600">
                  Retrieved: {formatDateTime(location.timestamp)}
                </p>
              )}
            </div>
          </div>
        )}
        
       
      </div>
    </div>
  );
};

export default App;