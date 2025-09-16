import React, { useState } from 'react';
import { User, Shield, Bell, Volume2, Palette, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const settingsSections = [
    {
      id: 'profile',
      title: 'Profile Settings',
      icon: User,
      description: 'Manage your account information'
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: Shield,
      description: 'Control your privacy settings'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      description: 'Manage notification preferences'
    },
    {
      id: 'audio',
      title: 'Audio Settings',
      icon: Volume2,
      description: 'Configure audio quality and playback'
    },
    {
      id: 'appearance',
      title: 'Appearance',
      icon: Palette,
      description: 'Customize the app appearance'
    }
  ];

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Profile Information</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Username</label>
          <input
            type="text"
            value={user?.username || ''}
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
          <input
            type="email"
            value={user?.email || ''}
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            readOnly
          />
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Theme Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">Choose Theme</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['light', 'dark', 'system'].map((themeOption) => (
              <button
                key={themeOption}
                onClick={() => setTheme(themeOption as any)}
                className={`p-3 rounded-lg border transition-colors ${
                  theme === themeOption
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-zinc-600 bg-zinc-700 text-zinc-300 hover:border-zinc-500'
                }`}
              >
                <div className="text-center">
                  <div className="text-sm font-medium capitalize">{themeOption}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAudioSettings = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Audio Quality</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">Streaming Quality</label>
          <select className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="auto">Auto (Recommended)</option>
            <option value="high">High (320kbps)</option>
            <option value="normal">Normal (160kbps)</option>
            <option value="low">Low (96kbps)</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-white">Crossfade</h4>
            <p className="text-xs text-zinc-400">Smooth transitions between songs</p>
          </div>
          <button className="w-12 h-6 bg-zinc-600 rounded-full p-1 transition-colors">
            <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform"></div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Notification Preferences</h3>
      <div className="space-y-4">
        {[
          { title: 'New Music Releases', description: 'Get notified about new releases from your favorite artists' },
          { title: 'Playlist Updates', description: 'Notifications when someone updates a shared playlist' },
          { title: 'Social Activity', description: 'Get notified about likes and follows' }
        ].map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-white">{item.title}</h4>
              <p className="text-xs text-zinc-400">{item.description}</p>
            </div>
            <button className="w-12 h-6 bg-blue-600 rounded-full p-1 transition-colors">
              <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform translate-x-6"></div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Privacy & Security</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-white">Private Profile</h4>
            <p className="text-xs text-zinc-400">Only you can see your listening activity</p>
          </div>
          <button className="w-12 h-6 bg-zinc-600 rounded-full p-1 transition-colors">
            <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform"></div>
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-white">Share Listening Activity</h4>
            <p className="text-xs text-zinc-400">Let friends see what you're listening to</p>
          </div>
          <button className="w-12 h-6 bg-blue-600 rounded-full p-1 transition-colors">
            <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform translate-x-6"></div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSettings();
      case 'appearance':
        return renderAppearanceSettings();
      case 'audio':
        return renderAudioSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'privacy':
        return renderPrivacySettings();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-zinc-400">Manage your account and app preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                    activeSection === section.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-700 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <section.icon className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">{section.title}</div>
                      <div className="text-xs opacity-75">{section.description}</div>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 transition-transform duration-200 ${
                      activeSection === section.id ? 'rotate-90' : ''
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-2">
            {activeSection ? (
              <div className="bg-zinc-800 rounded-lg p-6 transform transition-all duration-300 animate-in fade-in slide-in-from-right-5">
                {renderSectionContent()}
              </div>
            ) : (
              <div className="bg-zinc-800 rounded-lg p-8 text-center transform transition-all duration-300">
                <div className="space-y-4 animate-pulse">
                  <div className="w-16 h-16 mx-auto bg-zinc-700 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-zinc-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Choose a Setting</h3>
                  <p className="text-zinc-400">Select a category from the left to view and modify settings</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;