const { createApp } = Vue;

// Main App Component
const App = {
  data() {
    return {
      isLoggedIn: false,
      token: null,
      user: null,
      currentView: 'feed',
      selectedPhotoId: null,
      selectedUsername: null,
    };
  },
  mounted() {
    console.log('App mounted, checking for saved session...');
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    console.log('Saved token:', savedToken ? 'exists' : 'not found');
    console.log('Saved user:', savedUser ? 'exists' : 'not found');
    
    if (savedToken && savedUser) {
      this.token = savedToken;
      this.user = JSON.parse(savedUser);
      this.isLoggedIn = true;
      console.log('User logged in:', this.user.username);
    } else {
      console.log('Showing login screen');
    }
  },
  methods: {
    handleLogin(token, user) {
      console.log('Login successful:', user.username);
      console.log('Token received:', token ? `${token.substring(0, 20)}...` : 'undefined');
      this.token = token;
      this.user = user;
      this.isLoggedIn = true;
      this.currentView = 'feed';
      console.log('After setting - this.token:', this.token ? `${this.token.substring(0, 20)}...` : 'undefined');
    },
    async handleLogout() {
      console.log('Logging out...');
      try {
        // Call logout endpoint to blacklist the token on the server
        await fetch('https://localhost:3000/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        // Clear local session regardless of server response
        this.token = null;
        this.user = null;
        this.isLoggedIn = false;
        this.currentView = 'feed';
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        console.log('✅ Session cleared and token blacklisted');
      }
    },
    navigate(view, params = {}) {
      console.log('Navigating to:', view);
      console.log('Current token before nav:', this.token ? `${this.token.substring(0, 20)}...` : 'undefined');
      this.currentView = view;
      if (params.photoId) this.selectedPhotoId = params.photoId;
      if (params.username) this.selectedUsername = params.username;
    },
    goBack() {
      this.currentView = 'feed';
      this.selectedPhotoId = null;
      this.selectedUsername = null;
    }
  },
  template: `
    <div>
      <!-- Login View -->
      <login-form 
        v-if="!isLoggedIn"
        @login="handleLogin">
      </login-form>

      <!-- Main App -->
      <div v-else>
        <div class="header">
          <h1>📸 Photo Sharing App</h1>
          <div class="nav">
            <button 
              :class="{ active: currentView === 'feed' }"
              @click="navigate('feed')">
              Feed
            </button>
            <button 
              :class="{ active: currentView === 'private' }"
              @click="navigate('private', { username: user.username })">
              My Private Photos
            </button>
            <button 
              :class="{ active: currentView === 'upload' }"
              @click="navigate('upload')">
              Upload
            </button>
            <div style="margin-left: auto; display: flex; align-items: center; gap: 10px;">
              <span style="color: #667eea; font-weight: 500;">
                Welcome, {{ user.username }}
                <span v-if="user.role === 'Admin'" class="admin-badge">ADMIN</span>
              </span>
              <button @click="handleLogout" style="background: #dc3545;">
                Logout
              </button>
            </div>
          </div>
        </div>

        <div class="content">
          <photo-feed 
            v-if="currentView === 'feed'"
            @view-photo="navigate('detail', { photoId: $event })"
            @view-user="navigate('profile', { username: $event })">
          </photo-feed>

          <photo-detail 
            v-else-if="currentView === 'detail'"
            :photo-id="selectedPhotoId"
            :token="token"
            @back="goBack">
          </photo-detail>

          <user-profile 
            v-else-if="currentView === 'profile'"
            :username="selectedUsername"
            @view-photo="navigate('detail', { photoId: $event })"
            @back="goBack">
          </user-profile>

          <private-gallery 
            v-else-if="currentView === 'private'"
            :username="user.username"
            :token="token"
            @view-photo="navigate('detail', { photoId: $event })"
            @back="goBack">
          </private-gallery>

          <upload-photo 
            v-else-if="currentView === 'upload'"
            :token="token"
            :username="user.username"
            @back="goBack">
          </upload-photo>
        </div>
      </div>
    </div>
  `
};

// Create and mount the app
const app = createApp(App);
app.component('login-form', LoginForm);
app.component('photo-feed', PhotoFeed);
app.component('photo-detail', PhotoDetail);
app.component('user-profile', UserProfile);
app.component('private-gallery', PrivateGallery);
app.component('upload-photo', UploadPhoto);
app.mount('#app');
