import axios from 'axios';

const BASEURL = 'http://128.199.95.147';

export default function requestApi(endpoint, method, body, responseType = 'json') {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (body instanceof FormData) {
    headers['Content-Type'] = 'multipart/form-data';
  }

  const instance = axios.create({ headers });

  instance.interceptors.request.use(
    (config) => {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        config.headers['Authorization'] = `Bearer ${accessToken}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const originalConfig = error.config;
      if (error.response && error.response.status === 419) {
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            throw new Error('Refresh token not found');
          }
          const result = await instance.post(
            `${BASEURL}/auth/refresh-token`,
            {
              refresh_token: refreshToken,
            },
            {
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            },
          );
          const { access_token: new_access_token, refresh_token: new_refresh_token } =
            result.data.result;

          localStorage.setItem('accessToken', new_access_token);
          localStorage.setItem('refreshToken', new_refresh_token);

          originalConfig.headers['Authorization'] = `Bearer ${new_access_token}`;

          return instance(originalConfig);
        } catch (err) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          console.log('err', err);
          return Promise.reject(err);
        }
      }
      return Promise.reject(error);
    },
  );

  return instance.request({
    method: method,
    url: `${BASEURL}${endpoint}`,
    data: body,
    responseType: responseType,
  });
}
