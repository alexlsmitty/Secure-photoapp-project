const PhotoDetail = {
  props: ['photoId', 'token'],
  data() {
    return {
      photo: null,
      loading: true,
      error: null,
    };
  },
  mounted() {
    this.fetchPhoto();
  },
  methods: {
    async fetchPhoto() {
      try {
        this.loading = true;
        // Use /detail endpoint which supports both public and private photos
        // If token is provided, it will check ownership for private photos
        const headers = {
          'Content-Type': 'application/json'
        };
        
        // Add auth header if token exists
        if (this.token) {
          headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        const response = await fetch(`https://localhost:3000/photos/${this.photoId}/detail`, {
          headers: headers
        });
        
        if (!response.ok) throw new Error('Photo not found');
        this.photo = await response.json();
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
      <button class="back-button" @click="$emit('back')">← Back to Feed</button>

      <div v-if="loading" class="loading">
        Loading photo...
      </div>

      <div v-else-if="error" class="error">
        {{ error }}
      </div>

      <div v-else class="photo-detail">
        <p style="color: #666; margin-bottom: 20px;">🔄 Cached for 10 minutes</p>
        <h2>{{ photo.title }}</h2>
        <p class="author">by @{{ photo.username }}</p>
        <img :src="photo.url" :alt="photo.title">
      </div>
    </div>
  `,
  emits: ['back']
};
