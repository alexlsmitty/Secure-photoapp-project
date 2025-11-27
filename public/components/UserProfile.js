const UserProfile = {
  props: ['username'],
  data() {
    return {
      userData: null,
      loading: true,
      error: null,
    };
  },
  mounted() {
    this.fetchProfile();
  },
  methods: {
    async fetchProfile() {
      try {
        this.loading = true;
        const response = await api.fetch(`https://localhost:3000/users/${this.username}`);
        if (!response.ok) throw new Error('User not found');
        this.userData = await response.json();
        this.error = null;
      } catch (err) {
        this.error = err.message;
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
  },
  template: `
    <div>
      <button class="back-button" @click="$emit('back')">← Back</button>

      <div v-if="loading" class="loading">
        Loading profile...
      </div>

      <div v-else-if="error" class="error">
        {{ error }}
      </div>

      <div v-else>
        <div class="user-header">
          <h2>@{{ userData.user.username }}</h2>
          <p style="margin-top: 10px; opacity: 0.8;">
            📸 {{ userData.photoCount }} public photos
          </p>
        </div>

        <p style="color: #666; margin-bottom: 20px;">🔄 Cached for 5 minutes</p>

        <h3 style="margin-bottom: 20px;">Public Gallery</h3>

        <div v-if="userData.photos.length === 0" class="empty-state">
          <h3>No public photos</h3>
        </div>

        <div v-else class="photo-grid">
          <div 
            v-for="photo in userData.photos" 
            :key="photo._id"
            class="photo-card"
            @click="$emit('view-photo', photo._id)">
            <img :src="photo.url" :alt="photo.title" loading="lazy">
            <div class="photo-info">
              <div class="photo-title">{{ photo.title }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  emits: ['back', 'view-photo']
};
