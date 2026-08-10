import axios from 'axios';

// Read from runtime env (Docker) or build-time env (dev)
const getEnv = (key, defaultValue = '') => {
  return window._env_?.[key] || import.meta.env?.[key] || defaultValue;
};

const API_BASE_URL = getEnv('VITE_API_BASE_URL', 'http://localhost:8080/api');
const API_ENABLED = String(getEnv('VITE_ENABLE_BACKEND_API', 'false')).toLowerCase() === 'true';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// If backend API calls are disabled, stub axios HTTP methods to prevent any outbound calls
if (!API_ENABLED) {
  ['get', 'post', 'put', 'delete', 'patch'].forEach((method) => {
    api[method] = async () => {
      throw new Error('Backend API is disabled in this build.');
    };
  });
}

const makeUserFriendly = (message) => {
  if (!message) return 'Something went wrong. Please try again.';
  
  const lower = message.toLowerCase();
  
  if (lower.includes('authentication failed')) return 'Invalid email or password.';
  if (lower.includes('verify your email')) {
    return 'Please verify your email before signing in. Check your inbox for the verification link.';
  }
  if (lower.includes('invalid or expired verification')) {
    return 'This verification link is invalid or has expired.';
  }
  if (lower.includes('too many verification')) return 'Too many verification emails. Please try again later.';
  if (lower.includes('registration failed')) return 'Unable to create account. Please try again.';
  if (lower.includes('user not found') || lower.includes('no account found')) {
    return 'No account found with this email address. Please check your email or sign up.';
  }
  if (lower.includes('already registered but not verified')) {
    return 'This email is waiting for verification. Use the same password you used when you registered, or log in and tap “Resend verification email”, or use Forgot password.';
  }
  if (lower.includes('already exists')) return 'An account with this email already exists.';
  
  if (lower.includes('invalid token') || lower.includes('token expired') || lower.includes('token has expired')) {
    return 'This password reset link has expired or is invalid. Please request a new one.';
  }
  if (lower.includes('reset link') && lower.includes('expired')) {
    return 'This password reset link has expired. Please request a new one.';
  }
  
  if (message.includes('Exception') || message.includes('Error:') || message.includes('failed:')) {
    return 'Something went wrong. Please try again.';
  }
  
  return message;
};

const getErrorMessage = (error) => {
  if (error.response?.data) {
    const data = error.response.data;
    
    if (data.message) {
      return makeUserFriendly(data.message);
    }
    
    if (data.errors) {
      const fieldErrors = Object.values(data.errors).join('. ');
      return fieldErrors || 'Please check your input and try again.';
    }
  }
  
  if (error.request) {
    return 'Unable to connect to server. Check your internet connection.';
  }
  
  return 'Something went wrong. Please try again.';
};


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      const headerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      config.headers.Authorization = headerToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthAttempt = error.config?.url?.includes('/auth/login') || 
                         error.config?.url?.includes('/auth/signup');
    
    if ((error.response?.status === 401 || error.response?.status === 403) && !isAuthAttempt) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export const authService = {
  googleLogin: async (idToken) => {
    try {
      const { data } = await api.post('/auth/google', { idToken });
      return {
        token: data.token,
        user: {
          id: data.userId,
          email: data.email,
          fullName: data.fullName,
        },
      };
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  signup: async (email, password, fullName) => {
    try {
      const payload = { email, password, fullName };
      const { data } = await api.post('/auth/signup', payload);
      if (data.requiresEmailVerification) {
        return {
          requiresEmailVerification: true,
          message: data.message || 'Check your email to verify your account.',
        };
      }
      return {
        requiresEmailVerification: false,
        token: data.token,
        user: {
          id: data.userId,
          email: data.email,
          fullName: data.fullName,
        },
      };
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  verifyEmail: async (token) => {
    try {
      const { data } = await api.get('/auth/verify-email', {
        params: { token, format: 'json' },
      });
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  resendVerification: async (email) => {
    try {
      const { data } = await api.post('/auth/resend-verification', { email });
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  login: async (email, password) => {
    try {
      const payload = { email, password };
      const { data } = await api.post('/auth/login', payload);
      return {
        token: data.token,
        user: {
          id: data.userId,
          email: data.email,
          fullName: data.fullName,
        },
      };
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      }
      
      if (error.response?.status === 400) {
        const responseData = error.response?.data;
        if (responseData?.errors) {
          const errorMessages = Object.values(responseData.errors).join('. ');
          throw new Error(errorMessages);
        }
        throw new Error(responseData?.message || 'Validation failed');
      }
      
      throw new Error(getErrorMessage(error));
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  forgotPassword: async (email) => {
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      return data;
    } catch (error) {
      if (error.response?.status === 500) {
        const responseData = error.response?.data;
        const message = responseData?.message || '';
        
        // Check for rate limit error
        if (message.toLowerCase().includes('too many') || 
            message.toLowerCase().includes('rate limit') ||
            message.toLowerCase().includes('try again in')) {
          throw new Error(message);
        }
        
        // Check for user not found error
        if (message.toLowerCase().includes('user not found') || 
            message.toLowerCase().includes('not found with email')) {
          throw new Error('No account found with this email address. Please check your email or sign up.');
        }
        
        throw new Error('Unable to process your request. Please try again later.');
      }
      
      throw new Error(getErrorMessage(error));
    }
  },

  validateResetToken: async (token) => {
    try {
      const { data } = await api.get(`/auth/validate-reset-token?token=${token}`);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  resetPassword: async (token, newPassword) => {
    try {
      const { data } = await api.post('/auth/reset-password', { token, newPassword });
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

// Notifier Service -> backend integration
export const notifierService = {
  getAll: async () => {
    try {
      const { data } = await api.get('/notifiers');
      return data; // array of NotifierResponse
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  getById: async (id) => {
    try {
      const { data } = await api.get(`/notifiers/${id}`);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  create: async (notifierData) => {
    try {
      const { data } = await api.post('/notifiers', notifierData);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  update: async (id, notifierData) => {
    try {
      const { data } = await api.put(`/notifiers/${id}`, notifierData);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  delete: async (id) => {
    try {
      const { data } = await api.delete(`/notifiers/${id}`);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  updateResume: async (id, resumeLatex) => {
    try {
      const { data } = await api.patch(`/notifiers/${id}/resume`, {
        resumeLatex: resumeLatex
      });
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  compileResume: async (id) => {
    try {
      const { data } = await api.post(`/notifiers/${id}/resume/compile`);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  toggleActive: async (id) => {
    try {
      const { data } = await api.patch(`/notifiers/${id}/toggle-active`);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

// Notification Service -> backend integration (if needed)
export const notificationService = {
  getForNotifier: async (notifierId) => {
    try {
      const { data } = await api.get(`/notifications/notifier/${notifierId}`);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  markAsApplied: async (notificationId) => {
    try {
      const { data } = await api.put(`/notifications/${notificationId}/applied`);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  delete: async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      return true;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  updateResume: async (notificationId, resumeLatex) => {
    try {
      const { data } = await api.patch(`/notifications/${notificationId}/resume`, {
        resumeLatex: resumeLatex
      });
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  interviewChat: async (notificationId, message, conversationHistory) => {
    try {
      const { data } = await api.post(`/notifications/${notificationId}/interview-chat`, {
        message,
        conversationHistory
      });
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

// User Service
export const userService = {
  deleteAccount: async () => {
    try {
      await api.delete('/users/me');
      return true;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

// Jobs Service stays mocked for now (no backend endpoint provided yet)
export const jobsService = {
  getByFilters: async (filters) => {
    const jobs = [
      {
        id: 1,
        title: 'Frontend Developer',
        company: 'TechCorp',
        skills: ['React', 'JavaScript', 'TypeScript'],
        location: 'Bangalore',
        salary: '₹12 LPA',
        experience: '3-5 years',
        description: 'Work on beautiful UIs using React and TypeScript.',
      },
      {
        id: 2,
        title: 'Backend Engineer',
        company: 'InnovateX',
        skills: ['Java', 'Spring Boot', 'PostgreSQL'],
        location: 'Remote',
        salary: '₹18 LPA',
        experience: '5-7 years',
        description: 'Build scalable backend APIs for modern SaaS applications.',
      },
      {
        id: 3,
        title: 'Full Stack Developer',
        company: 'WebWizards',
        skills: ['Node.js', 'React', 'MongoDB'],
        location: 'Delhi',
        salary: '₹10.5 LPA',
        experience: '3-5 years',
        description: 'Deliver end-to-end web experiences with our agile team.',
      },
      {
        id: 4,
        title: 'Data Analyst',
        company: 'DataInsights',
        skills: ['Python', 'Data Science', 'Pandas'],
        location: 'Mumbai',
        salary: '₹7 LPA',
        experience: '1-3 years',
        description: 'Analyze and visualize data for business impact.',
      },
      {
        id: 5,
        title: 'Software Engineer',
        company: 'FinEdge',
        skills: ['Java', 'Spring Boot', 'Microservices'],
        location: 'Hyderabad',
        salary: '₹20 LPA',
        experience: '6-10 years',
        description: 'High-growth fintech company, modern engineering stack.',
      }
    ];
    let filtered = jobs;
    if (filters.skills && filters.skills.length > 0) {
      filtered = filtered.filter(job => filters.skills.some(skill => job.skills.includes(skill)));
    }
    if (filters.city && filters.city !== 'Any') {
      filtered = filtered.filter(job => job.location && job.location.toLowerCase().includes(filters.city.toLowerCase()));
    }
    if (filters.experience) {
      filtered = filtered.filter(job => job.experience === filters.experience || job.experience?.includes(filters.experience));
    }
    if (filters.salaryExpectation && typeof filters.salaryExpectation === 'string' && filters.salaryExpectation.toLowerCase().includes('lpa')) {
      const band = filters.salaryExpectation.toLowerCase().replace('lpa', '').split('-');
      const minLpa = parseFloat(band[0]);
      const maxLpa = band[1] ? parseFloat(band[1]) : minLpa;
      filtered = filtered.filter(job => {
        const jobLpa = parseFloat(job.salary.replace(/[^\d.]/g, ''));
        return jobLpa >= minLpa && jobLpa <= maxLpa;
      });
    }
    if (filters.jobPreferences && filters.jobPreferences.length > 0) {
      filtered = filtered.filter(job => filters.jobPreferences.some(pref => (job.description || '').toLowerCase().includes(pref.toLowerCase())));
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    return filtered;
  },
};

// User Info Service -> backend integration for education details
export const userInfoService = {
  create: async (userInfoData) => {
    try {
      const { data } = await api.post('/user-info', userInfoData);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  getAll: async () => {
    try {
      const { data } = await api.get('/user-info');
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  getById: async (id) => {
    try {
      const { data } = await api.get(`/user-info/${id}`);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  update: async (id, userInfoData) => {
    try {
      const { data } = await api.put(`/user-info/${id}`, userInfoData);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  delete: async (id) => {
    try {
      const { data } = await api.delete(`/user-info/${id}`);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

export default api;
