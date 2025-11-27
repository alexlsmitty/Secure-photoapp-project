const api = {
  async fetch(url, options = {}) {
    let response = await fetch(url, options);

    if (response.status === 401) {
      const data = await response.json();
      if (data.error === 'Token expired') {
        // Token expired, try to refresh it
        const refreshResponse = await fetch('https://localhost:3000/auth/refresh-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (refreshResponse.ok) {
          const { token } = await refreshResponse.json();
          localStorage.setItem('token', token);

          // Retry the original request with the new token
          const newOptions = { ...options };
          newOptions.headers = {
            ...newOptions.headers,
            'Authorization': `Bearer ${token}`,
          };
          response = await fetch(url, newOptions);
        } else {
          // Refresh token is invalid or expired, force logout
          window.location.href = '/';
        }
      }
    }

    return response;
  },
};
