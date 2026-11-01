/**
 * Extracts and normalizes the backend origin from environment variables.
 * Supports VITE_API_URL or VITE_SERVER_URL.
 * In development, returns empty string to utilize Vite dev server proxy.
 */
export const getBackendOrigin = (): string => {
  const envUrl = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_SERVER_URL ||
    ''
  ).trim();

  if (!envUrl) return '';

  const clean = envUrl.replace(/\/+$/, '');
  // If user provided URL ending in /api, strip it to get the server origin
  return clean.endsWith('/api') ? clean.slice(0, -4) : clean;
};

/**
 * Resolves media and avatar URLs across production domains.
 * If media URL is relative (e.g. /api/upload/media/photo.jpg), prepends the configured backend origin.
 */
export const resolveMediaUrl = (url?: string): string => {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }

  const backendOrigin = getBackendOrigin();
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return backendOrigin ? `${backendOrigin}${normalizedPath}` : normalizedPath;
};

interface RequestOptions extends RequestInit {
  data?: unknown;
}

export const apiClient = async <T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const token = localStorage.getItem('privateid_token');
  const backendOrigin = getBackendOrigin();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = backendOrigin ? `${backendOrigin}${normalizedEndpoint}` : normalizedEndpoint;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set application/json if data is not FormData
  if (options.data && !(options.data instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.data);
  } else if (options.data instanceof FormData) {
    options.body = options.data;
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  const resData = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(resData.message || `Request failed with status ${response.status}`);
  }

  return resData as T;
};
