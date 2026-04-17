const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

class ApiError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken() {
    return this.token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.message || data.error || 'Request failed',
          response.status,
          data.code
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(error.message, 0, 'network_error');
    }
  }

  // Auth methods
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.data?.tokens?.accessToken) {
      this.setToken(data.data.tokens.accessToken);
    }
    return data;
  }

  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (data.data?.tokens?.accessToken) {
      this.setToken(data.data.tokens.accessToken);
    }
    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async updateProfile(profileData) {
    return this.request('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(profileData)
    });
  }

  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${this.baseURL}/auth/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new ApiError(error.message || 'Upload failed', response.status);
    }

    return response.json();
  }

  async refreshToken(refreshToken) {
    const data = await this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });
    if (data.data?.tokens?.accessToken) {
      this.setToken(data.data.tokens.accessToken);
    }
    return data;
  }

  // Posts methods
  async getPosts(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/posts${query}`);
  }

  async getPost(id) {
    return this.request(`/posts/${id}`);
  }

  async createPost(postData) {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(postData)
    });
  }

  async updatePost(id, postData) {
    return this.request(`/posts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(postData)
    });
  }

  async deletePost(id) {
    return this.request(`/posts/${id}`, {
      method: 'DELETE'
    });
  }

  async toggleLike(postId) {
    return this.request(`/posts/${postId}/like`, {
      method: 'POST'
    });
  }

  async getUserLikes() {
    return this.request('/posts/likes/me');
  }

  // Comments methods
  async getComments(postId) {
    return this.request(`/posts/${postId}/comments`);
  }

  async createComment(postId, commentData) {
    return this.request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(commentData)
    });
  }

  async updateComment(commentId, commentData) {
    return this.request(`/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify(commentData)
    });
  }

  async deleteComment(commentId) {
    return this.request(`/comments/${commentId}`, {
      method: 'DELETE'
    });
  }

  // Alerts methods
  async getAlerts(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/alerts${query}`);
  }

  async getUnreadCount() {
    return this.request('/alerts/count');
  }

  async markAlertRead(alertId) {
    return this.request(`/alerts/${alertId}/read`, {
      method: 'PATCH'
    });
  }

  async markAllAlertsRead() {
    return this.request('/alerts/read-all', {
      method: 'PATCH'
    });
  }

  // Moderation methods
  async getModerationLogs(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/moderation/logs${query}`);
  }

  async getPendingPosts() {
    return this.request('/posts?status=pending');
  }

  async approvePost(postId) {
    return this.request(`/posts/${postId}/approve`, {
      method: 'PATCH'
    });
  }

  async rejectPost(postId) {
    return this.request(`/posts/${postId}/reject`, {
      method: 'PATCH'
    });
  }

  // Admin methods
  async getUsers(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/users${query}`);
  }

  async getUser(userId) {
    return this.request(`/users/${userId}`);
  }

  async updateUser(userId, userData) {
    return this.request(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(userData)
    });
  }

  async inviteUser(inviteData) {
    return this.request('/users/invite', {
      method: 'POST',
      body: JSON.stringify(inviteData)
    });
  }

  async deleteUser(userId) {
    return this.request(`/users/${userId}`, {
      method: 'DELETE'
    });
  }

  async toggleBlockUser(userId, days) {
    return this.request(`/users/${userId}/block`, {
      method: 'POST',
      body: JSON.stringify({ days })
    });
  }

  async getStats() {
    return this.request('/users/stats');
  }

  async getModerationLogs(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/moderation/logs${query}`);
  }

  async createAlert(alertData) {
    return this.request('/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData)
    });
  }

  async deleteAlert(alertId) {
    return this.request(`/alerts/${alertId}`, {
      method: 'DELETE'
    });
  }

  async togglePinPost(postId) {
    return this.request(`/posts/${postId}/pin`, {
      method: 'POST'
    });
  }

  // Upload methods
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Manual fetch since it's FormData, not JSON
    const url = `${this.baseURL}/upload`;
    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(data.message || 'Upload failed', response.status, data.code);
    }
    return data;
  }

  // Chat methods
  async getConversations() {
    return this.request('/chat');
  }

  async getConversation(conversationId) {
    return this.request(`/chat/${conversationId}`);
  }

  async startConversation(userId) {
    return this.request(`/chat/user/${userId}`, {
      method: 'POST'
    });
  }

  async adminStartConversation(userId) {
    return this.request(`/chat/admin/start/${userId}`, {
      method: 'POST'
    });
  }

  async sendMessage(conversationId, content, mediaUrls = []) {
    return this.request(`/chat/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, mediaUrls })
    });
  }

  async deleteConversation(conversationId) {
    return this.request(`/chat/${conversationId}`, {
      method: 'DELETE'
    });
  }
}

export const api = new ApiClient();
export { ApiError };
