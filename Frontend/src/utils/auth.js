// ไฟล์นี้เป็นตัวกลางให้ทุกหน้าของระบบเรียกใช้ Token ได้โดยไม่ต้องเขียน Refresh Token ซ้ำกัน 
let refreshPromise = null;

export const getAccessToken = () => sessionStorage.getItem('accessToken');

export const getRefreshToken = () => sessionStorage.getItem('refreshToken');

export const saveTokens = (access, refresh) => {
  if (access) {
    sessionStorage.setItem('accessToken', access);
  }

  if (refresh) {
    sessionStorage.setItem('refreshToken', refresh);
  }
};

export const clearTokens = () => {
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
};

export const refreshAccessToken = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refresh = getRefreshToken();

    if (!refresh) {
      clearTokens();
      return null;
    }

    let response;
    try {
      response = await fetch('/users/token/refresh/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh }),
      });
    } catch (error) {
      console.error('Refresh Token Error:', error);
      return null;
    }

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const data = await response.json();
    if (!data.access || !data.refresh) {
      clearTokens();
      throw new Error('Backend did not return rotated access and refresh tokens');
    }

    saveTokens(data.access, data.refresh);
    return data.access;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

export const authenticatedFetch = async (input, init = {}) => {
  const headers = new Headers(init.headers);
  const authorization = headers.get('Authorization');
  const response = await fetch(input, { ...init, headers });

  if (response.status !== 401 || !authorization) {
    return response;
  }

  const tokenUsed = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!tokenUsed) {
    return response;
  }

  let access = getAccessToken();
  if (!access || access === tokenUsed) {
    access = await refreshAccessToken();
  }

  if (!access) {
    return response;
  }

  headers.set('Authorization', `Bearer ${access}`);
  return fetch(input, { ...init, headers });
};
