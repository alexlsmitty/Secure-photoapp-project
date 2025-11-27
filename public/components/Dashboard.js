const Dashboard = {
  props: ['token', 'user'],
  data() {
    return {
      activeTab: 'profile',
      profile: {
        username: '',
        email: '',
        bio: '',
        profilePicture: '',
        role: '',
        createdAt: ''
      },
      editMode: false,
      passwordChange: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      photos: [],
      loading: true,
      message: '',
      error: '',
      passwordStrength: '',
      showDeleteConfirm: false,
      deletePassword: ''
    };
  },
  async mounted() {
    await this.loadProfile();
    await this.loadPhotos();
  },
  computed: {
    publicPhotos() {
      return this.photos.filter(p => p.public);
    },
    privatePhotos() {
      return this.photos.filter(p => !p.public);
    },
    passwordsMatch() {
      return this.passwordChange.newPassword === this.passwordChange.confirmPassword;
    }
  },
  methods: {
    async loadProfile() {
      try {
        const response = await api.fetch('https://localhost:3000/profile', {
          headers: {
            'Authorization': `Bearer ${this.token}`
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          this.profile = data.user;
          this.loading = false;
        } else {
          this.error = 'Failed to load profile';
          this.loading = false;
        }
      } catch (err) {
        console.error('Profile load error:', err);
        this.error = 'Network error loading profile';
        this.loading = false;
      }
    },
    
    async loadPhotos() {
      try {
        const response = await api.fetch('https://localhost:3000/my-photos', {
          headers: {
            'Authorization': `Bearer ${this.token}`
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          this.photos = data.photos;
        }
      } catch (err) {
        console.error('Photos load error:', err);
      }
    },
    
    async updateProfile() {
      this.message = '';
      this.error = '';
      
      try {
        const response = await api.fetch('https://localhost:3000/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          credentials: 'include',
          body: JSON.stringify({
            username: this.profile.username,
            email: this.profile.email,
            bio: this.profile.bio,
            profilePicture: this.profile.profilePicture
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          this.message = '✅ Profile updated successfully!';
          this.editMode = false;
          
          // Update stored user info
          const updatedUser = { ...this.user, username: this.profile.username, email: this.profile.email };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          this.$emit('profile-updated', updatedUser);
        } else {
          this.error = data.error || 'Failed to update profile';
        }
      } catch (err) {
        console.error('Update error:', err);
        this.error = 'Network error updating profile';
      }
    },
    
    async changePassword() {
      this.message = '';
      this.error = '';
      
      if (!this.passwordsMatch) {
        this.error = 'Passwords do not match';
        return;
      }
      
      try {
        const response = await api.fetch('https://localhost:3000/profile/password', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          credentials: 'include',
          body: JSON.stringify(this.passwordChange)
        });
        
        const data = await response.json();
        
        if (response.ok) {
          this.message = '✅ Password changed successfully!';
          this.passwordChange = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          };
        } else {
          this.error = data.error || data.details?.[0]?.msg || 'Failed to change password';
        }
      } catch (err) {
        console.error('Password change error:', err);
        this.error = 'Network error changing password';
      }
    },
    
    async togglePhotoPrivacy(photo) {
      try {
        const response = await api.fetch(`https://localhost:3000/photos/${photo._id}/privacy`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          credentials: 'include',
          body: JSON.stringify({ public: !photo.public })
        });
        
        if (response.ok) {
          photo.public = !photo.public;
          this.message = `✅ Photo is now ${photo.public ? 'public' : 'private'}`;
        } else {
          const data = await response.json();
          this.error = data.error || 'Failed to update privacy';
        }
      } catch (err) {
        console.error('Privacy toggle error:', err);
        this.error = 'Network error updating privacy';
      }
    },
    
    async deleteAccount() {
      if (!this.deletePassword) {
        this.error = 'Password required to delete account';
        return;
      }
      
      try {
        const response = await api.fetch('https://localhost:3000/profile', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          credentials: 'include',
          body: JSON.stringify({ password: this.deletePassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          alert('Account deleted successfully. You will be logged out.');
          this.$emit('logout');
        } else {
          this.error = data.error || 'Failed to delete account';
        }
      } catch (err) {
        console.error('Delete account error:', err);
        this.error = 'Network error deleting account';
      }
    },
    
    checkPasswordStrength() {
      const pwd = this.passwordChange.newPassword;
      
      if (pwd.length === 0) {
        this.passwordStrength = '';
        return;
      }
      
      if (pwd.length < 8) {
        this.passwordStrength = 'weak';
        return;
      }
      
      let strength = 0;
      if (/[a-z]/.test(pwd)) strength++;
      if (/[A-Z]/.test(pwd)) strength++;
      if (/[0-9]/.test(pwd)) strength++;
      if (/[@$!%*?&]/.test(pwd)) strength++;
      
      if (strength === 4) this.passwordStrength = 'strong';
      else if (strength >= 2) this.passwordStrength = 'medium';
      else this.passwordStrength = 'weak';
    },
    
    cancelEdit() {
      this.editMode = false;
      this.loadProfile();
    }
  },
  template: `
    <div class="dashboard">
      <div class="dashboard-header">
        <h2>📊 My Dashboard</h2>
        <button @click="$emit('back')" class="back-btn">← Back to Feed</button>
      </div>
      
      <div v-if="loading" class="loading">Loading...</div>
      
      <div v-else>
        <!-- Tabs -->
        <div class="tabs">
          <button 
            :class="{ active: activeTab === 'profile' }"
            @click="activeTab = 'profile'">
            👤 Profile
          </button>
          <button 
            :class="{ active: activeTab === 'photos' }"
            @click="activeTab = 'photos'">
            📸 My Photos ({{ photos.length }})
          </button>
          <button 
            :class="{ active: activeTab === 'security' }"
            @click="activeTab = 'security'">
            🔒 Security
          </button>
        </div>
        
        <!-- Messages -->
        <div v-if="message" class="success-message">{{ message }}</div>
        <div v-if="error" class="error-message">{{ error }}</div>
        
        <!-- Profile Tab -->
        <div v-if="activeTab === 'profile'" class="tab-content">
          <div class="profile-section">
            <h3>Profile Information</h3>
            
            <div v-if="!editMode" class="profile-view">
              <div class="profile-item">
                <strong>Username:</strong> {{ profile.username }}
                <span v-if="profile.role === 'Admin'" class="admin-badge">ADMIN</span>
              </div>
              <div class="profile-item">
                <strong>Email:</strong> {{ profile.email }}
              </div>
              <div class="profile-item">
                <strong>Bio:</strong> {{ profile.bio || 'No bio yet' }}
              </div>
              <div class="profile-item">
                <strong>Profile Picture:</strong> 
                <span v-if="profile.profilePicture">
                  <img :src="profile.profilePicture" alt="Profile" class="profile-pic-preview">
                </span>
                <span v-else>No picture set</span>
              </div>
              <div class="profile-item">
                <strong>Member since:</strong> {{ new Date(profile.createdAt).toLocaleDateString() }}
              </div>
              
              <button @click="editMode = true" class="btn-primary">✏️ Edit Profile</button>
            </div>
            
            <div v-else class="profile-edit">
              <div class="form-group">
                <label>Username:</label>
                <input v-model="profile.username" type="text" placeholder="Username" maxlength="30">
                <small>3-30 characters, letters, numbers, underscores, hyphens only</small>
              </div>
              
              <div class="form-group">
                <label>Email:</label>
                <input v-model="profile.email" type="email" placeholder="Email">
              </div>
              
              <div class="form-group">
                <label>Bio (max 500 chars):</label>
                <textarea v-model="profile.bio" placeholder="Tell us about yourself..." maxlength="500" rows="4"></textarea>
                <small>{{ profile.bio?.length || 0 }}/500 characters</small>
              </div>
              
              <div class="form-group">
                <label>Profile Picture URL:</label>
                <input v-model="profile.profilePicture" type="url" placeholder="https://example.com/photo.jpg">
                <small>Must be a valid image URL (https only)</small>
              </div>
              
              <div class="button-group">
                <button @click="updateProfile" class="btn-primary">💾 Save Changes</button>
                <button @click="cancelEdit" class="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Photos Tab -->
        <div v-if="activeTab === 'photos'" class="tab-content">
          <div class="photos-section">
            <h3>My Photos</h3>
            <p>Public: {{ publicPhotos.length }} | Private: {{ privatePhotos.length }}</p>
            
            <div v-if="photos.length === 0" class="empty-state">
              <p>No photos yet. Upload your first photo!</p>
            </div>
            
            <div v-else class="photo-grid">
              <div v-for="photo in photos" :key="photo._id" class="photo-card">
                <img :src="photo.url" :alt="photo.title" class="photo-thumbnail">
                <div class="photo-info">
                  <h4>{{ photo.title }}</h4>
                  <div class="photo-privacy">
                    <span :class="photo.public ? 'badge-public' : 'badge-private'">
                      {{ photo.public ? '🌐 Public' : '🔒 Private' }}
                    </span>
                    <button 
                      @click="togglePhotoPrivacy(photo)" 
                      class="btn-toggle"
                      :title="'Make ' + (photo.public ? 'private' : 'public')">
                      {{ photo.public ? '🔒 Make Private' : '🌐 Make Public' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Security Tab -->
        <div v-if="activeTab === 'security'" class="tab-content">
          <div class="security-section">
            <h3>🔐 Change Password</h3>
            
            <div class="form-group">
              <label>Current Password:</label>
              <input 
                v-model="passwordChange.currentPassword" 
                type="password" 
                placeholder="Enter current password">
            </div>
            
            <div class="form-group">
              <label>New Password:</label>
              <input 
                v-model="passwordChange.newPassword" 
                @input="checkPasswordStrength"
                type="password" 
                placeholder="Enter new password">
              <div v-if="passwordStrength" :class="'password-strength ' + passwordStrength">
                Strength: {{ passwordStrength.toUpperCase() }}
              </div>
              <small>Min 8 chars, must include: uppercase, lowercase, number, special char (@$!%*?&)</small>
            </div>
            
            <div class="form-group">
              <label>Confirm New Password:</label>
              <input 
                v-model="passwordChange.confirmPassword" 
                type="password" 
                placeholder="Confirm new password">
              <div v-if="passwordChange.confirmPassword && !passwordsMatch" class="error-text">
                ❌ Passwords don't match
              </div>
              <div v-else-if="passwordChange.confirmPassword && passwordsMatch" class="success-text">
                ✅ Passwords match
              </div>
            </div>
            
            <button 
              @click="changePassword" 
              :disabled="!passwordsMatch || !passwordChange.currentPassword"
              class="btn-primary">
              🔄 Change Password
            </button>
            
            <hr style="margin: 40px 0;">
            
            <h3>⚠️ Danger Zone</h3>
            <div class="danger-zone">
              <p><strong>Delete Account:</strong> This action cannot be easily undone.</p>
              
              <div v-if="!showDeleteConfirm">
                <button @click="showDeleteConfirm = true" class="btn-danger">
                  🗑️ Delete My Account
                </button>
              </div>
              
              <div v-else class="delete-confirm">
                <p class="warning-text">⚠️ Are you sure? Enter your password to confirm:</p>
                <input 
                  v-model="deletePassword" 
                  type="password" 
                  placeholder="Enter password to confirm">
                <div class="button-group">
                  <button @click="deleteAccount" class="btn-danger">Yes, Delete Account</button>
                  <button @click="showDeleteConfirm = false; deletePassword = ''" class="btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
