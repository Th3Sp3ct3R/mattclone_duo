const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

module.exports = ({ config }) => ({
  ...config,
  name: config.name || 'julio',
  slug: config.slug || 'julio',
  version: config.version || '0.1.0',
  extra: {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL
  }
});


