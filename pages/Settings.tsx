import React, { useState } from 'react';
import { Moon, Sun, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../components/Common';
import { User } from '../types';
import { useAuth } from '../src/contexts/AuthContext';

interface SettingsProps {
  user: User | null;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, isDarkMode, toggleDarkMode }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLogoutError(null);
    setIsSigningOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      setLogoutError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-primary">Account Settings</h1>
        <p className="text-muted">Manage your account preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h3 className="font-bold text-primary mb-1">Theme</h3>
          <p className="text-sm text-muted mb-6">Toggle dark mode.</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-surface2 text-accent rounded-lg">
                {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <span className="text-sm font-medium text-primary">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <button
              onClick={toggleDarkMode}
              className="w-11 h-6 rounded-full p-1 transition-colors bg-surface2 border border-default"
            >
              <div className={`w-4 h-4 bg-accent rounded-full transition-transform ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-primary mb-1">Account</h3>
          <p className="text-sm text-muted mb-6">Signed in as {user?.email ?? 'unknown@example.com'}</p>
          <Button onClick={handleLogout} disabled={isSigningOut} className="inline-flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            {isSigningOut ? 'Signing Out...' : 'Logout'}
          </Button>
          {logoutError && (
            <p className="text-sm mt-3" style={{ color: 'red' }}>
              {logoutError}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Settings;
