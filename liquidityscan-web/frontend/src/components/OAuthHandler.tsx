import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/userApi';

/**
 * OAuth Handler Component
 * 
 * SINGLE SOURCE OF TRUTH for OAuth callback processing.
 * This component intercepts OAuth redirects from backend and:
 * 1. Extracts tokens from URL parameters
 * 2. Stores them in Zustand store
 * 3. Fetches user profile from API
 * 4. Redirects to dashboard
 * 5. Cleans up URL parameters
 * 
 * Should be placed at the root level in App.tsx to catch all OAuth redirects.
 */
export function OAuthHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setToken, setRefreshToken } = useAuthStore();
  
  // Use ref to prevent duplicate processing
  const isProcessingRef = useRef(false);
  const processedTokenRef = useRef<string | null>(null);

  // Process OAuth callback function (extracted for reuse)
  const processOAuthCallback = async (urlToken: string, urlRefreshToken: string) => {
    if (isProcessingRef.current) {
      console.log('[OAuthHandler] Already processing, skipping...');
      return;
    }
    
    if (processedTokenRef.current === urlToken) {
      console.log('[OAuthHandler] Token already processed, skipping...');
      return;
    }
    
    isProcessingRef.current = true;
    processedTokenRef.current = urlToken;
    
    try {
      // 1. Store tokens in Zustand (persist middleware will save to localStorage automatically)
      setToken(urlToken);
      setRefreshToken(urlRefreshToken);
      
      // 2. Fetch user profile from API
      try {
        const profile = await authApi.getProfile();
        // 3. Store user in Zustand (persist middleware will save to localStorage automatically)
        setUser(profile);
      } catch (error) {
        console.error('[OAuthHandler] Failed to fetch profile, using token data:', error);
        // Fallback: Extract user info from token
        try {
          const payload = JSON.parse(atob(urlToken.split('.')[1]));
          setUser({
            id: payload.sub || '',
            email: payload.email || '',
            name: payload.email?.split('@')[0] || 'User',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.error('[OAuthHandler] Failed to decode token:', e);
        }
      }
      
      // 4. Clean up sessionStorage (tokens are now in Zustand persist)
      sessionStorage.removeItem('oauth_token');
      sessionStorage.removeItem('oauth_refreshToken');
      
      // 5. Clean up URL and navigate to dashboard (only if not already there)
      const currentPath = window.location.pathname;
      if (currentPath !== '/dashboard' && !currentPath.startsWith('/dashboard')) {
        window.history.replaceState({}, '', '/dashboard');
        navigate('/dashboard', { replace: true });
      }
      
    } catch (error) {
      console.error('[OAuthHandler] Error processing OAuth callback:', error);
      isProcessingRef.current = false;
      navigate('/login?error=failed_to_process_oauth', { replace: true });
    }
  };

  useEffect(() => {
    // CRITICAL: Check sessionStorage FIRST (tokens saved by main.tsx before React loads)
    let urlToken: string | null = sessionStorage.getItem('oauth_token');
    let urlRefreshToken: string | null = sessionStorage.getItem('oauth_refreshToken');
    
    // Check sessionStorage for tokens (saved by main.tsx before React loads)
    
    // Get full URL and match for logging
    const fullUrl = window.location.href;
    const urlMatch = fullUrl.match(/\?([^#]+)/);
    
    // If not in sessionStorage, try to extract from URL
    if (!urlToken || !urlRefreshToken) {
      if (urlMatch) {
        const urlParams = new URLSearchParams(urlMatch[1]);
        urlToken = urlParams.get('token') || urlToken;
        urlRefreshToken = urlParams.get('refreshToken') || urlRefreshToken;
      }
      
      // Fallback to window.location.search and searchParams
      if (!urlToken) {
        const searchParamsObj = new URLSearchParams(window.location.search);
        urlToken = searchParamsObj.get('token') || searchParams.get('token');
        urlRefreshToken = searchParamsObj.get('refreshToken') || searchParams.get('refreshToken');
      }
    }
    
    const errorParam = new URLSearchParams(window.location.search).get('error') || searchParams.get('error');
    
    // Handle OAuth error
    if (errorParam) {
      console.error('[OAuthHandler] OAuth error detected:', decodeURIComponent(errorParam));
      navigate(`/login?error=${errorParam}`, { replace: true });
      return;
    }
    
    // Check if we have tokens to process
    if (!urlToken || !urlRefreshToken) {
      return;
    }
    
    // Process tokens
    processOAuthCallback(urlToken, urlRefreshToken);
    
  }, [searchParams, location.pathname, navigate, setToken, setRefreshToken, setUser]);

  // CRITICAL: Check for tokens IMMEDIATELY on mount (before React Router can lose them)
  useEffect(() => {
    // Extract search params from full URL
    const fullUrl = window.location.href;
    const urlMatch = fullUrl.match(/\?([^#]+)/);
    if (urlMatch) {
      const urlParams = new URLSearchParams(urlMatch[1]);
      const urlToken = urlParams.get('token');
      const urlRefreshToken = urlParams.get('refreshToken');
      
      if (urlToken && urlRefreshToken && !isProcessingRef.current && processedTokenRef.current !== urlToken) {
        console.log('[OAuthHandler] Mount check: Found tokens in URL, processing IMMEDIATELY...');
        processOAuthCallback(urlToken, urlRefreshToken);
        return; // Don't continue with normal useEffect logic
      }
    }
  }, []); // Only run on mount - CRITICAL for catching tokens before React Router loses them

  return null; // This component doesn't render anything
}
