import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { 
  KeyIcon, 
  BellIcon, 
  ShieldCheckIcon,
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { errorMessage } from '../utils/errorMessage';

const passwordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup
    .string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: yup
    .string()
    .required('Confirm password is required')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});

type PasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const SettingsPage: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    taskReminders: true,
    projectUpdates: false,
    weeklyDigest: true,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>({
    resolver: yupResolver(passwordSchema),
  });

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsChangingPassword(true);
    try {
      // Here you would call your API to change the password
      // await authService.changePassword(data.currentPassword, data.newPassword);
      toast.success('Password changed successfully');
      resetPassword();
    } catch (error: any) {
      toast.error(errorMessage(error) || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success('Notification preferences updated');
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: SunIcon },
    { value: 'dark', label: 'Dark', icon: MoonIcon },
    { value: 'system', label: 'System', icon: ComputerDesktopIcon },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account settings and preferences.</p>
        </div>

        {/* Theme Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <SunIcon className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Appearance</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">Choose how CyberTask looks to you.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value as any)}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  theme === option.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <option.icon className="h-5 w-5 text-gray-600 mr-2" />
                  <span className="font-medium text-gray-900">{option.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <BellIcon className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
          </div>
          <p className="text-sm text-gray-600 mb-6">Choose what notifications you want to receive.</p>
          
          <div className="space-y-4">
            {Object.entries(notifications).map(([key, value]) => {
              const labels = {
                email: 'Email notifications',
                push: 'Push notifications',
                taskReminders: 'Task reminders',
                projectUpdates: 'Project updates',
                weeklyDigest: 'Weekly digest',
              };

              return (
                <div key={key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div>
                    <label htmlFor={key} className="text-sm font-medium text-gray-900">
                      {labels[key as keyof typeof labels]}
                    </label>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id={key}
                      className="sr-only peer"
                      checked={value}
                      onChange={() => handleNotificationChange(key as keyof typeof notifications)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Password Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <KeyIcon className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
          </div>
          <p className="text-sm text-gray-600 mb-6">Update your password to keep your account secure.</p>
          
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                {...registerPassword('currentPassword')}
                className="input"
                placeholder="Enter current password"
              />
              {passwordErrors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                {...registerPassword('newPassword')}
                className="input"
                placeholder="Enter new password"
              />
              {passwordErrors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                {...registerPassword('confirmPassword')}
                className="input"
                placeholder="Confirm new password"
              />
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isChangingPassword}
            >
              Change Password
            </Button>
          </form>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <ShieldCheckIcon className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Security</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
              </div>
              <Button variant="secondary" size="sm">
                Enable
              </Button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Active Sessions</p>
                <p className="text-sm text-gray-600">Manage your active sessions</p>
              </div>
              <Button variant="secondary" size="sm">
                Manage
              </Button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Download Your Data</p>
                <p className="text-sm text-gray-600">Download a copy of your data</p>
              </div>
              <Button variant="secondary" size="sm">
                Download
              </Button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
          <h3 className="text-lg font-medium text-red-900 mb-4">Danger Zone</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-red-100">
              <div>
                <p className="text-sm font-medium text-red-900">Delete Account</p>
                <p className="text-sm text-red-600">Permanently delete your account and all data</p>
              </div>
              <Button variant="danger" size="sm">
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;