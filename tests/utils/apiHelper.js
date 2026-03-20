const { request } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

let apiContext = null;
let authToken = null;
let adminToken = null;
let regularUserToken = null;
let regularUserId = null;

async function createAPIContext() {
  apiContext = await request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });
  return apiContext;
}

async function getAdminToken() {
  if (adminToken) return adminToken;
  
  const context = await request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });
  
  const response = await context.post('/api/auth/login', {
    data: {
      email: 'admin@example.com',
      password: 'admin123',
    },
  });
  
  if (response.ok()) {
    const data = await response.json();
    adminToken = data.token;
    await context.dispose();
    return adminToken;
  }
  
  await context.dispose();
  throw new Error('Failed to get admin token');
}

async function getAuthToken() {
  if (authToken) return authToken;
  
  await createAPIContext();
  
  const response = await apiContext.post('/api/auth/login', {
    data: {
      email: 'test@example.com',
      password: 'password123',
    },
  });
  
  if (response.ok()) {
    const data = await response.json();
    authToken = data.token;
    return authToken;
  }
  
  throw new Error('Failed to get auth token');
}

async function createTestUser(role = 'user', isVerified = true) {
  const timestamp = Date.now();
  const email = `testuser_${timestamp}@example.com`;
  
  const context = await request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });
  
  const registerResponse = await context.post('/api/auth/register', {
    data: {
      email: email,
      password: 'password123',
      name: `Test User ${timestamp}`,
    },
  });
  
  if (registerResponse.status() !== 201) {
    await context.dispose();
    throw new Error('Failed to register user');
  }
  
  if (isVerified) {
    try {
      const token = await getAdminToken();
      const usersResponse = await context.get('/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (usersResponse.ok()) {
        const users = await usersResponse.json();
        const newUser = users.find(u => u.email === email);
        
        if (newUser) {
          await context.put(`/api/users/${newUser.id}/verify`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            data: {
              is_verified: true,
              role: role,
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to verify user:', error);
    }
  }
  
  const loginResponse = await context.post('/api/auth/login', {
    data: {
      email: email,
      password: 'password123',
    },
  });
  
  if (!loginResponse.ok()) {
    await context.dispose();
    throw new Error('Failed to login after registration');
  }
  
  const loginData = await loginResponse.json();
  
  await context.dispose();
  
  return {
    token: loginData.token,
    user: loginData.user,
    email: email,
  };
}

async function createRegularUser() {
  if (regularUserToken) {
    return {
      token: regularUserToken,
      userId: regularUserId,
    };
  }
  
  const user = await createTestUser('user', true);
  regularUserToken = user.token;
  regularUserId = user.user.id;
  
  return {
    token: regularUserToken,
    userId: regularUserId,
  };
}

function getAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function cleanupTestUser(email) {
  try {
    const adminToken = await getAdminToken();
    const context = await request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
    });
    
    const usersResponse = await context.get('/api/users', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    
    if (usersResponse.ok()) {
      const users = await usersResponse.json();
      const userToDelete = users.find(u => u.email === email);
      
      if (userToDelete) {
        await context.delete(`/api/users/${userToDelete.id}`, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });
      }
    }
    
    await context.dispose();
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

module.exports = {
  BASE_URL,
  createAPIContext,
  getAdminToken,
  getAuthToken,
  createTestUser,
  createRegularUser,
  getAuthHeaders,
  cleanupTestUser,
};
