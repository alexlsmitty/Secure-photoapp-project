const ResetPassword = {
  props: ['token'],
  data() {
    return {
      password: '',
      confirmPassword: '',
      loading: false,
      message: '',
      error: '',
    };
  },
  computed: {
    passwordsMatch() {
      return this.password === this.confirmPassword;
    },
  },
  methods: {
    async handleResetPassword() {
      if (!this.passwordsMatch) {
        this.error = 'Passwords do not match.';
        return;
      }
      this.loading = true;
      this.error = '';
      this.message = '';
      try {
        const response = await fetch(`https://localhost:3000/auth/reset-password/${this.token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: this.password }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to reset password.');
        }
        this.message = 'Password has been reset successfully. You can now log in with your new password.';
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
  },
  template: `
    <div class="auth-container">
      <h2>Reset Password</h2>
      <div v-if="message" class="success">{{ message }}</div>
      <div v-if="error" class="error">{{ error }}</div>
      <form @submit.prevent="handleResetPassword">
        <div class="form-group">
          <label for="password">New Password</label>
          <input 
            type="password" 
            id="password"
            v-model="password"
            placeholder="••••••••"
            required>
        </div>
        <div class="form-group">
          <label for="confirm-password">Confirm New Password</label>
          <input 
            type="password" 
            id="confirm-password"
            v-model="confirmPassword"
            placeholder="••••••••"
            required>
        </div>
        <button type="submit" class="btn" :disabled="loading || !passwordsMatch" style="width: 100%;">
          {{ loading ? 'Resetting...' : 'Reset Password' }}
        </button>
      </form>
      <div class="login-links">
        <a href="#" @click.prevent="$emit('show-login')">Back to Login</a>
      </div>
    </div>
  `,
  emits: ['show-login'],
};
