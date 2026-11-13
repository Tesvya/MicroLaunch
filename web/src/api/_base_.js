import axios from 'axios'

// Development: the Vite dev server talks to the API on localhost:4000.
// Production: by default the site and API share one domain, so a relative URL is used (no config needed).
// Only set VITE_SERVER_PRODUCTION if the frontend is hosted on a different domain than the API.
const baseURL = import.meta.env.DEV
  ? (import.meta.env.VITE_SERVER_LOCAL || 'http://localhost:4000/api/v1/')
  : (import.meta.env.VITE_SERVER_PRODUCTION || '/api/v1/')

export const apiInstance = axios.create({ baseURL, withCredentials: true })
