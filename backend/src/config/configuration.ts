export default () => ({
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  domeapi: {
    apiKey: process.env.DOME_API_KEY,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  BACKEND_PORT: parseInt(process.env.BACKEND_PORT || '4002', 10),
});

