import { getGoogleMapsApiKey } from "@/src/utils/mapRuntime";

export { getGoogleMapsApiKey };

export async function reverseGeocode(latitude, longitude) {
  const key = getGoogleMapsApiKey();
  if (!key) {
    throw new Error("Google Maps API key is not configured");
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK" || !data.results?.length) {
    return null;
  }
  return data.results[0];
}

export function parseAddressFromGeocode(result) {
  const components = result.address_components || [];
  const get = (types) => {
    for (const type of types) {
      const match = components.find((c) => c.types.includes(type));
      if (match) return match.long_name;
    }
    return "";
  };

  const streetNumber = get(["street_number"]);
  const route = get(["route"]);
  const premise = get(["premise", "subpremise"]);
  const houseNumber =
    premise || (streetNumber && route ? `${streetNumber}, ${route}` : streetNumber || route);

  return {
    houseNumber,
    locality: get(["sublocality_level_1", "sublocality", "neighborhood", "route"]),
    city: get(["locality", "administrative_area_level_2"]),
    state: get(["administrative_area_level_1"]),
    pinCode: get(["postal_code"]),
  };
}
