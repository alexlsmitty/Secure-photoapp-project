const ForgotPassword = {
  data() {
    return {
      email: '',
      loading: false,
      message: '',
      error: '',
    };
  },
  methods: {
    async handleForgotPassword() {
      if (!this.email) {
        this.error = 'Please enter your email address.';
        return;
      }
      this.loading = true;
      this.error = '';
      this.message = '';
      try {
        const response = await fetch('https://localhost:3000/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: this.email }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to send password reset email.');
        }
        this.message = 'Password reset email sent. Please check your inbox.';
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
  },
  template: `
    <div class="auth-container">
      <h2>Forgot Password</h2>
      <p>Enter your email address and we will send you a link to reset your password.</p>
      <div v-if="message" class="success">{{ message }}</div>
      <div v-if="error" class="error">{{ error }}</div>
      <form @submit.prevent="handleForgotPassword">
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email"
            v-model="email"
            placeholder="your@email.com"
            required>
        </div>
        <button type="submit" class="btn" :disabled="loading" style="width: 100%;">
          {{ loading ? 'Sending...' : 'Send Reset Link' }}
        </button>
      </form>
      <div class="login-links">
        <a href="#" @click.prevent="$emit('show-login')">Back to Login</a>
      </div>
    </div>
  `,
  emits: ['show-login'],
};
