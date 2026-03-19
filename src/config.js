export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  anthropicApiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};
