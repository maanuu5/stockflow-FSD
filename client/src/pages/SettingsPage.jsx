import { useState } from 'react';
import { Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import api, { getErrorMessage } from '../services/api';

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  const [name, setName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.put('/auth/profile', { name: name.trim() });
      updateUser(res.data.data.user);
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Enter your current and new password.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      toast.success('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to change password.'));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Update your profile, password, and theme preference.
        </p>
      </div>

      {/* Profile */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="text-sm font-medium text-neutral-950 dark:text-white">Profile</h2>
        <form onSubmit={handleUpdateProfile} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Email
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Password */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="text-sm font-medium text-neutral-950 dark:text-white">Password</h2>
        <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Confirm New
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Appearance & Sign Out */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-medium text-neutral-950 dark:text-white">Theme</h2>
            <p className="mt-0.5 text-xs text-neutral-500">Choose light or dark mode.</p>
          </div>

          <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-900">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                theme === 'light'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-950 dark:text-neutral-400'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-950 dark:text-neutral-400'
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              Dark
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-5 dark:border-neutral-900">
          <div>
            <h3 className="text-sm font-medium text-neutral-950 dark:text-white">Sign Out</h3>
            <p className="text-xs text-neutral-500">End your current session.</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
