const PhotoFeed = {
  data() {
    return {
      photos: [],
      loading: true,
      error: null,
    };
  },
  mounted() {
    this.fetchPhotos();
  },
  methods: {
    async fetchPhotos() {
      try {
        this.loading = true;
        const response = await fetch('https://localhost:3000/photos');
        const data = await response.json();
        this.photos = data.photos;
        this.error = null;
      } catch (err) {
        this.error = 'Failed to load photos. Make sure the server is running.';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
  },
  template: `
    <div>
      <h2>Public Photo Feed</h2>
      <p style="color: #666; margin: 10px 0;">🔄 Cached for 5 minutes</p>

      <div v-if="loading" class="loading">
        Loading photos...
      </div>

      <div v-else-if="error" class="error">
        {{ error }}
      </div>

      <div v-else-if="photos.length === 0" class="empty-state">
        <h3>No photos yet</h3>
        <p>Be the first to share!</p>
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
            <div 
              class="photo-author"
              @click.stop="$emit('view-user', photo.username)">
              by @{{ photo.username }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  emits: ['view-photo', 'view-user']
};
