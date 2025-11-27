const LoginForm = {
  data() {
    return {
      activeTab: 'login',
      loginForm: {
        email: '',
        password: '',
      },
      signupForm: {
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
      },
      loading: false,
      error: null,
      success: null,
    };
  },
  methods: {
    async handleLogin() {
      if (!this.loginForm.email || !this.loginForm.password) {
        this.error = 'Please fill in all fields';
        return;
      }

      try {
        this.loading = true;
        this.error = null;

        const response = await api.fetch('https://localhost:3000/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(this.loginForm),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Login failed');
        }

        const data = await response.json();
        console.log('=== LOGIN RESPONSE ===');
        console.log('Full response data:', data);
        console.log('data.token:', data.token);
        console.log('data.user:', data.user);
        this.success = 'Login successful!';
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setTimeout(() => {
          this.$emit('login', data.token, data.user);
        }, 1000);
      } catch (err) {
        this.error = err.message;
        console.error(err);
      } finally {
        this.loading = false;
      }
    },

    async handleSignup() {
      if (!this.signupForm.email || !this.signupForm.username || !this.signupForm.password) {
        this.error = 'Please fill in all fields';
        return;
      }

      if (this.signupForm.password !== this.signupForm.confirmPassword) {
        this.error = 'Passwords do not match';
        return;
      }

      try {
        this.loading = true;
        this.error = null;

        const response = await api.fetch('https://localhost:3000/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: this.signupForm.email,
            username: this.signupForm.username,
            password: this.signupForm.password,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Signup failed');
        }

        const data = await response.json();
        console.log('=== SIGNUP RESPONSE ===');
        console.log('Full response data:', data);
        console.log('data.token:', data.token);
        console.log('data.user:', data.user);
        this.success = 'Account created! Logging you in...';
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setTimeout(() => {
          this.$emit('login', data.token, data.user);
        }, 1000);
      } catch (err) {
        this.error = err.message;
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
  },
  template: `
    <div class="auth-container">
      <h2>📸 Photo Sharing App</h2>

      <div v-if="error" class="error">
        {{ error }}
      </div>

      <div v-if="success" class="success">
        {{ success }}
      </div>

      <div class="auth-tabs">
        <button 
          :class="{ active: activeTab === 'login' }"
          @click="activeTab = 'login'">
          Login
        </button>
        <button 
          :class="{ active: activeTab === 'signup' }"
          @click="activeTab = 'signup'">
          Sign Up
        </button>
      </div>

      <form v-if="activeTab === 'login'" @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="login-email">Email</label>
          <input 
            type="email" 
            id="login-email"
            v-model="loginForm.email"
            placeholder="your@email.com"
            required>
        </div>

        <div class="form-group">
          <label for="login-password">Password</label>
          <input 
            type="password" 
            id="login-password"
            v-model="loginForm.password"
            placeholder="••••••••"
            required>
        </div>

        <button type="submit" class="btn" :disabled="loading" style="width: 100%;">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
        <div class="login-links">
          <a href="#" @click.prevent="$emit('show-forgot-password')">Forgot Password?</a>
        </div>
      </form>

      <form v-if="activeTab === 'signup'" @submit.prevent="handleSignup">
        <div class="form-group">
          <label for="signup-email">Email</label>
          <input 
            type="email" 
            id="signup-email"
            v-model="signupForm.email"
            placeholder="your@email.com"
            required>
        </div>

        <div class="form-group">
          <label for="signup-username">Username</label>
          <input 
            type="text" 
            id="signup-username"
            v-model="signupForm.username"
            placeholder="username"
            required>
        </div>

        <div class="form-group">
          <label for="signup-password">Password</label>
          <input 
            type="password" 
            id="signup-password"
            v-model="signupForm.password"
            placeholder="••••••••"
            required>
        </div>

        <div class="form-group">
          <label for="confirm-password">Confirm Password</label>
          <input 
            type="password" 
            id="confirm-password"
            v-model="signupForm.confirmPassword"
            placeholder="••••••••"
            required>
        </div>

        <button type="submit" class="btn" :disabled="loading" style="width: 100%;">
          {{ loading ? 'Creating account...' : 'Sign Up' }}
        </button>
      </form>
    </div>
  `,
  emits: ['login', 'show-forgot-password']
};
