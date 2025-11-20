import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Profile = () => {
  const { user, updateProfile, verifyCurrentPassword } = useAuth();

  // Basic info states
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');

  // Email & password states
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState(''); // used for editing
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verification states
  const [authMode, setAuthMode] = useState(false); 
  const [currentPassword, setCurrentPassword] = useState('');
  const [verified, setVerified] = useState(false);
  const [authError, setAuthError] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!user)
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h2 className="text-xl font-semibold">No user logged in</h2>
        <p className="text-sm text-gray-600">Please login to view or edit your profile.</p>
      </div>
    );

  // Creates masked password equal to length of existing password
  const maskedPassword = user.password
    ? '*'.repeat(user.password.length)
    : '******';

  const handleVerifyCurrentPassword = async () => {
    setAuthError('');
    try {
      const success = await verifyCurrentPassword(currentPassword);
      if (success) {
        setVerified(true);
        setPassword(user.password); // load actual password
        setCurrentPassword('');
      } else {
        setAuthError('Incorrect current password');
      }
    } catch (err) {
      setAuthError(err.message || 'Verification failed');
    }
  };

  const toggleAuthMode = () => {
    setAuthMode(!authMode);

    // Reset everything when cancelling
    if (authMode === true) {
      setVerified(false);
      setCurrentPassword('');
      setAuthError('');
      setPassword('');
      setConfirmPassword('');
    }
  };

  const handleSaveAll = async () => {
    setError('');
    setSaving(true);

    try {
      const payload = { name, phone, address };

      // Email or password changed → must be verified
      if ((email !== user.email || password) && !verified) {
        setError('You must verify your current password to change email or password');
        setSaving(false);
        return;
      }

      if (password && password !== confirmPassword) {
        setError('Passwords do not match');
        setSaving(false);
        return;
      }

      if (email !== user.email) payload.email = email;
      if (password && password !== user.password) payload.password = password;

      await updateProfile(payload);
      alert('Profile updated successfully');

      // Reset states
      setPassword('');
      setConfirmPassword('');
      setVerified(false);
      setAuthMode(false);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    }

    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-4">Your Profile</h2>

      {/* Name */}
      <div className="space-y-1">
        <label className="block text-sm text-gray-600">Full Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border rounded-lg" />
      </div>

      {/* Phone */}
      <div className="space-y-1">
        <label className="block text-sm text-gray-600">Phone Number</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 border rounded-lg" />
      </div>

      {/* Address */}
      <div className="space-y-1">
        <label className="block text-sm text-gray-600">Address</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-3 border rounded-lg" />
      </div>

      {/* Update Authentication Button */}
      <button
        onClick={toggleAuthMode}
        className={`px-4 py-2 ${authMode ? 'bg-red-500' : 'bg-blue-500'} text-white rounded-lg mt-2`}
      >
        {authMode ? 'Cancel' : 'Update Authentication'}
      </button>

      {/* Current Password Verification */}
      {authMode && !verified && (
        <div className="space-y-1 mt-2">
          <label className="block text-sm text-gray-600">Enter Current Password</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="flex-1 p-3 border rounded-lg"
              placeholder="Current password"
            />
            <button
              type="button"
              onClick={handleVerifyCurrentPassword}
              className="px-4 py-2 bg-green-500 text-white rounded-lg"
            >
              Verify
            </button>
          </div>
          {authError && <p className="text-red-600 text-sm">{authError}</p>}
        </div>
      )}

      {/* Email */}
      <div className="space-y-1 mt-4">
        <label className="block text-sm text-gray-600">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded-lg"
          disabled={!verified}
        />
      </div>

      {/* Password */}
      <div className="space-y-1">
        <label className="block text-sm text-gray-600">Password</label>
        <div className="flex gap-2">
          <input
            type={verified && showPassword ? 'text' : 'password'}
            value={
              verified
                ? password
                : maskedPassword
            }
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 p-3 border rounded-lg"
            disabled={!verified}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="px-2 py-2 bg-gray-200 rounded-lg"
            disabled={!verified}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      {password && verified && (
        <div className="space-y-1">
          <label className="block text-sm text-gray-600">Confirm New Password</label>
          <div className="flex gap-2">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="flex-1 p-3 border rounded-lg"
              placeholder="Confirm new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="px-2 py-2 bg-gray-200 rounded-lg"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Save All Changes */}
      <button
        onClick={handleSaveAll}
        disabled={saving}
        className="px-6 py-3 bg-amber-500 text-white rounded-lg font-semibold mt-4 w-full"
      >
        {saving ? 'Saving...' : 'Save All Changes'}
      </button>
    </div>
  );
};

export default Profile;
