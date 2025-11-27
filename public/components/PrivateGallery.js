const PrivateGallery = {
  props: ['username', 'token'],
  data() {
    return {
      photos: [],
      loading: true,
      error: null,
    };
  },
  mounted() {
    console.log('PrivateGallery mounted');
    console.log('Token prop value:', this.token);
    console.log('Token type:', typeof this.token);
    console.log('Token length:', this.token ? this.token.length : 'N/A');
    console.log('Username:', this.username);
    this.fetchPrivatePhotos();
  },
  methods: {
    async fetchPrivatePhotos() {
      try {
        this.loading = true;
        console.log('Fetching private photos with auth header:', `Bearer ${this.token}`);
        const response = await api.fetch(`https://localhost:3000/users/${this.username}/private`, {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
        console.log('Response status:', response.status);
        if (!response.ok) throw new Error('Failed to load private photos');
        const data = await response.json();
        this.photos = data.photos;
        this.error = null;
      } catch (err) {
        this.error = 'Failed to load private photos. Make sure you\'re logged in.';
        console.error('Error fetching private photos:', err);
      } finally {
        this.loading = false;
      }
    },
  },
  template: `
    <div>
      <button class="back-button" @click="$emit('back')">← Back</button>

      <h2>Private Gallery <span class="badge">🔒 PRIVATE</span></h2>
      <p style="color: #666; margin: 10px 0;">⚠️ No caching - sensitive data</p>

      <div v-if="loading" class="loading">
        Loading private photos...
      </div>

      <div v-else-if="error" class="error">
        {{ error }}
      </div>

      <div v-else-if="photos.length === 0" class="empty-state">
        <h3>No private photos</h3>
      </div>

      <div v-else class="photo-grid">
        <div 
          v-for="photo in photos" 
          :key="photo._id"
          class="photo-card"
          @click="$emit('view-photo', photo._id)">
          <img :src="photo.url" :alt="photo.title" loading="lazy">
          <div class="photo-info">
            <div class="photo-title">{{ photo.title }}</div>
            <span class="badge">Private</span>
          </div>
        </div>
      </div>
    </div>
  `,
  emits: ['back', 'view-photo']
};
