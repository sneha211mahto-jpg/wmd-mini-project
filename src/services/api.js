export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';
export const TOKEN_STORAGE_KEY = 'roommate_token';
export const USER_STORAGE_KEY = 'roommate_user';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function storeAuthSession(authData) {
  localStorage.setItem(TOKEN_STORAGE_KEY, authData.token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authData.user));
}

export async function apiRequest(endpoint, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const token = auth ? localStorage.getItem(TOKEN_STORAGE_KEY) : '';
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError('Cannot reach the RoomMate backend. Check that it is running on port 8081.', 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      clearStoredSession();
      window.dispatchEvent(new Event('roommate:unauthorized'));
    }

    const fallbackMessages = {
      400: 'Please check the information you entered.',
      401: 'Your session has expired. Please log in again.',
      404: 'The requested RoomMate record was not found.',
      500: 'The server could not complete the request. Please try again later.',
    };
    throw new ApiError(data.message || fallbackMessages[response.status] || 'Request failed. Please try again.', response.status);
  }

  return data;
}
