/**
 * PRODUCTION CONFIGURATION - HARDCODED URLS
 * NO ENVIRONMENT VARIABLES - JUST PRODUCTION URLS
 *
 * TODO: FIX BUILD PROCESS - This is a temporary workaround!
 * The Vite build process was not properly picking up environment variables,
 * so we hardcoded the URLs. This needs to be fixed for scalability:
 * 1. Investigate why VITE_API_URL environment variables weren't working
 * 2. Fix the Docker build process to properly handle env vars
 * 3. Remove hardcoded URLs and use proper environment configuration
 * 4. Test that the build process works without manual sed replacements
 */

// HARDCODED PRODUCTION URLS - NO LOCALHOST ANYWHERE
export const API_BASE_URL = 'https://mabt.eu';
export const SOCKET_BASE_URL = 'https://mabt.eu';
