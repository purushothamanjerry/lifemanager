import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL;
const baseURL = rawApiUrl 
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : rawApiUrl.replace(/\/$/, '') + '/api') 
  : '/api';
const API = axios.create({ baseURL });

// Request interceptor: inject authorization token from localStorage
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_pass') || '';
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor: watch for 401 Unauthorized responses to prompt re-login
API.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('auth_pass');
    localStorage.removeItem('auth_login_time');
    window.dispatchEvent(new Event('auth-unauthorized'));
  }
  return Promise.reject(error);
});

export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  if (rawApiUrl) {
    const base = rawApiUrl.replace(/\/api\/?$/, '');
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  }
  // In development, assume the vite proxy will handle it, or fallback to the same origin
  return path.startsWith('/') ? path : `/${path}`;
};

export const peopleApi = {
  getAll:   ()         => API.get('/people'),
  getById:  (id)       => API.get(`/people/${id}`),
  getOne:   (id)       => API.get(`/people/${id}`),
  create:   (data)     => API.post('/people', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:   (id, data) => API.put(`/people/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete:   (id)       => API.delete(`/people/${id}`),
  addPhoto: (id, data) => API.post(`/people/${id}/photos`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  bulkGroup:(data)     => API.post('/people/bulk-group', data),
};

export const conversationsApi = {
  getByPerson: (personId) => API.get(`/conversations/person/${personId}`),
  create:      (data)     => API.post('/conversations', data),
  delete:      (id)       => API.delete(`/conversations/${id}`),
};

export const notesApi = {
  getAll:     (params)    => API.get('/notes', { params }),
  getById:    (id)        => API.get(`/notes/${id}`),
  create:     (data)      => API.post('/notes', data),
  update:     (id, data)  => API.put(`/notes/${id}`, data),
  delete:     (id)        => API.delete(`/notes/${id}`),
  getTags:    ()          => API.get('/notes/meta/tags'),
};

export const memoriesApi = {
  getAll:      (params)   => API.get('/memories', { params }),
  getById:     (id)       => API.get(`/memories/${id}`),
  getByPerson: (personId) => API.get(`/memories/person/${personId}`),
  getMeta:     ()         => API.get('/memories/meta/all'),
  create:      (data)     => API.post('/memories', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:      (id, data) => API.put(`/memories/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete:      (id)       => API.delete(`/memories/${id}`),
  deletePhoto: (id, idx)  => API.delete(`/memories/${id}/photos/${idx}`),
};

export const plansApi = {
  getAll:         (params)     => API.get('/plans', { params }),
  getById:        (id)         => API.get(`/plans/${id}`),
  getStats:       (params)     => API.get('/plans/meta/stats', { params }),
  create:         (data)       => API.post('/plans', data),
  update:         (id, data)   => API.put(`/plans/${id}`, data),
  setStatus:      (id, status) => API.patch(`/plans/${id}/status`, { status }),
  reschedule:     (id, data)   => API.patch(`/plans/${id}/reschedule`, data),
  delete:         (id)         => API.delete(`/plans/${id}`),
  checkConflicts: (data)       => API.post('/plans/check-conflicts', data),
};

export const financeApi = {
  getTransactions:  (params)        => API.get('/finance/transactions', { params }),
  getTransaction:   (id)            => API.get(`/finance/transactions/${id}`),
  create:           (data)          => API.post('/finance/transactions', data),
  update:           (id, data)      => API.put(`/finance/transactions/${id}`, data),
  delete:           (id)            => API.delete(`/finance/transactions/${id}`),
  getAnalytics:     (params)        => API.get('/finance/analytics', { params }),
  getMonthlyOverview:(params)       => API.get('/finance/monthly-overview', { params }),
  getAccounts:      ()              => API.get('/finance/accounts'),
  updateAccount:    (method, data)  => API.put(`/finance/accounts/${method}`, data),
};

export const healthApi = {
  getLogs:       (params)         => API.get('/health/logs', { params }),
  getLog:        (date)           => API.get(`/health/logs/${date}`),
  saveLog:       (date, data)     => API.put(`/health/logs/${date}`, data),
  deleteLog:     (date)           => API.delete(`/health/logs/${date}`),
  addFood:       (date, entry)    => API.post(`/health/logs/${date}/food`, entry),
  deleteFood:    (date, foodId)   => API.delete(`/health/logs/${date}/food/${foodId}`),
  getAnalytics:  (params)         => API.get('/health/analytics', { params }),
  getProfile:    ()               => API.get('/health/profile'),
};

export const activityApi = {
  getAll:       (params)      => API.get('/activities', { params }),
  getById:      (id)          => API.get(`/activities/${id}`),
  create:       (data)        => API.post('/activities', data),
  update:       (id, data)    => API.put(`/activities/${id}`, data),
  delete:       (id)          => API.delete(`/activities/${id}`),
  getAnalytics: (params)      => API.get('/activities/meta/analytics', { params }),
};

export const profileApi = {
  get:         ()          => API.get('/profile'),
  update:      (data)      => API.put('/profile', data),
  uploadPhoto: (form)      => API.post('/profile/photo', form, { headers:{'Content-Type':'multipart/form-data'} }),
  setPin:      (pin)       => API.post('/profile/safety/set-pin', { pin }),
  verifyPin:   (pin)       => API.post('/profile/safety/verify-pin', { pin }),
  getStats:    ()          => API.get('/profile/stats'),
  getRecent:   ()          => API.get('/profile/recent'),
};

export const authApi = {
  getStatus:   ()          => API.get('/auth/status'),
};