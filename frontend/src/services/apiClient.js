import axios from 'axios';

// Create a centralized Axios instance
const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Modify request config before sending
    // For example, attach auth token if available:
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    // Handle request errors
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Any status code within 2xx range triggers this
    return response.data; // Return only the data payload for convenience
  },
  (error) => {
    // Any status code outside 2xx range triggers this
    console.error('API Client Error:', error?.response?.status, error?.message);
    
    if (error.response?.status === 401) {
      // Handle Unauthorized logic here
      console.warn("Unauthorized access - maybe redirect to login?");
    }

    return Promise.reject(error);
  }
);

export default apiClient;
