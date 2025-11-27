const UploadPhoto = {
  props: ['token', 'username'],
  data() {
    return {
      form: {
        title: '',
        url: '',
        public: true,
      },
      loading: false,
      success: false,
      error: null,
    };
  },
  methods: {
    async uploadPhoto() {
      if (!this.form.title || !this.form.url) {
        this.error = 'Please fill in all fields';
        return;
      }

      try {
        this.loading = true;
        this.error = null;
        this.success = false;

        const response = await api.fetch('https://localhost:3000/photos/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify(this.form),
        });

        if (!response.ok) throw new Error('Upload failed');

        this.success = true;
        this.form.title = '';
        this.form.url = '';
        
        setTimeout(() => {
          this.$emit('back');
        }, 2000);
      } catch (err) {
        this.error = 'Failed to upload photo. Make sure you\'re logged in.';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
  },
  template: `
    <div>
      <button class="back-button" @click="$emit('back')">← Back</button>

      <h2>Upload New Photo</h2>
      <p style="color: #666; margin: 10px 0 30px 0;">✉️ POST request - never cached</p>

      <div v-if="success" class="success">
        ✅ Photo uploaded successfully! Redirecting...
      </div>

      <div v-if="error" class="error">
        {{ error }}
      </div>

      <form @submit.prevent="uploadPhoto">
        <div class="form-group">
          <label for="title">Photo Title</label>
          <input 
            type="text" 
            id="title"
            v-model="form.title"
            placeholder="Enter a title..."
            required>
        </div>

        <div class="form-group">
          <label for="url">Image URL</label>
          <input 
            type="text" 
            id="url"
            v-model="form.url"
            placeholder="https://example.com/photo.jpg"
            required>
        </div>

        <div class="form-group">
          <label for="public">Visibility</label>
          <select id="public" v-model="form.public">
            <option :value="true">Public</option>
            <option :value="false">Private</option>
          </select>
        </div>

        <button type="submit" class="btn" :disabled="loading" style="width: 100%;">
          {{ loading ? 'Uploading...' : 'Upload Photo' }}
        </button>
      </form>
    </div>
  `,
  emits: ['back']
};
