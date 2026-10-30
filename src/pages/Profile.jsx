import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Modal from '../components/Modal';
import { useRoomMate } from '../context/useRoomMate';
import { apiRequest } from '../services/api';

export default function Profile() {
  const navigate = useNavigate();
  const {
    profile,
    logout,
    saving,
    error,
    clearError,
    updateProfile,
  } = useRoomMate();
  const [dialog, setDialog] = useState('');
  const [profileForm, setProfileForm] = useState({ name: profile.name, email: profile.email });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const openDialog = (name) => {
    clearError();
    setMessage('');
    if (name === 'profile') setProfileForm({ name: profile.name, email: profile.email });
    if (name === 'password') setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setDialog(name);
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    const updated = await updateProfile(profileForm);
    if (updated) setMessage('Profile updated successfully.');
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setMessage('');
    setPasswordStatus('');
    clearError();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await apiRequest('/profile/password', {
        method: 'PUT',
        body: {
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
        },
      });
      setPasswordStatus(result.message || 'Password changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setDialog('');
    } catch (passwordError) {
      setMessage(passwordError.message || 'Could not change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="page-panel profile-page">
      <div className="profile-header card-block">
        <div className="profile-avatar large">{profile.avatar}</div>
        <div className="profile-info">
          <h1>{profile.name}</h1>
          <p>{profile.email}</p>
          <div className="profile-meta-row">
            <span>Room: {profile.room}</span>
            <span>Role: {profile.role}</span>
          </div>
        </div>
      </div>

      {passwordStatus && <p className="success-message" role="status">{passwordStatus}</p>}

      <div className="profile-actions">
        <button type="button" className="secondary-btn" onClick={() => openDialog('profile')}>Edit Profile</button>
        <button type="button" className="secondary-btn" onClick={() => openDialog('password')}>Change Password</button>
        <button type="button" className="tertiary-btn" onClick={() => {
          logout();
          navigate('/login', { replace: true });
        }}>Logout</button>
      </div>

      <Modal
        open={Boolean(dialog)}
        title={dialog === 'profile' ? 'Edit Profile' : 'Change Password'}
        onClose={() => setDialog('')}
      >
        {dialog === 'profile' && (
          <form className="form-grid" onSubmit={handleProfileSave}>
            <label>
              <span>Full Name</span>
              <input value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} required />
            </label>
            <label>
              <span>Email Address</span>
              <input type="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} required />
            </label>
            {(error || message) && <p className={error ? 'auth-error' : 'success-message'} role={error ? 'alert' : 'status'}>{error || message}</p>}
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={() => setDialog('')}>Close</button>
              <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        )}

        {dialog === 'password' && (
          <form className="form-grid" onSubmit={handlePasswordChange}>
            <label>
              <span>Current Password</span>
              <input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} required />
            </label>
            <label>
              <span>New Password</span>
              <input type="password" minLength={6} value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} required />
            </label>
            <label>
              <span>Confirm New Password</span>
              <input type="password" minLength={6} value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} required />
            </label>
            {(error || message) && <p className={error ? 'auth-error' : 'success-message'} role={error ? 'alert' : 'status'}>{error || message}</p>}
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={() => setDialog('')}>Close</button>
              <button type="submit" className="primary-btn" disabled={isChangingPassword}>{isChangingPassword ? 'Changing...' : 'Change Password'}</button>
            </div>
          </form>
        )}

      </Modal>
    </div>
  );
}
