const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

if (import.meta.env.PROD && !apiUrl) {
  console.error(
    "[H2O Admin] VITE_API_URL is missing. Copy admin/.env.production.example to .env.production and set your API URL before building."
  );
}

export const API_BASE = apiUrl || "http://localhost:5000";
