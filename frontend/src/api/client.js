const BASE_URL = 'http://localhost:8000/api';

class ApiClient {
  static getHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  static async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = this.getHeaders();
    const config = {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      
      // Auto handle unauthorized token expired
      if (response.status === 401 && localStorage.getItem('refresh_token')) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // retry original request with new token
          const retryHeaders = this.getHeaders();
          const retryConfig = {
            ...config,
            headers: {
              ...retryHeaders,
              ...options.headers
            }
          };
          const retryResponse = await fetch(url, retryConfig);
          return await this.parseResponse(retryResponse);
        } else {
          this.logout();
          window.location.reload();
        }
      }

      return await this.parseResponse(response);
    } catch (error) {
      console.error('API request error:', error);
      return { success: false, error: 'Network error or server unreachable' };
    }
  }

  static async parseResponse(response) {
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text };
    }

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: data.error || data.detail || 'Request failed'
      };
    }

    return {
      success: true,
      status: response.status,
      data
    };
  }

  static async refreshToken() {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return false;

    try {
      const response = await fetch(`${BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh })
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access);
        if (data.refresh) {
          localStorage.setItem('refresh_token', data.refresh);
        }
        return true;
      }
    } catch (e) {
      console.error('Token refresh failed:', e);
    }
    return false;
  }

  static logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  static get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  static post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  static put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  static patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  static delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export default ApiClient;
