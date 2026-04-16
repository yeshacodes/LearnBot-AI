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
        <h1 className="text-4xl font-heading font-black text-primary uppercase tracking-tight">Account Settings</h1>
        <p className="text-primary font-bold mt-2">Manage your account preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-8">
          <h3 className="text-xl font-heading font-black text-primary uppercase mb-1">Theme</h3>
          <p className="text-sm text-primary font-bold mb-6">Toggle dark mode.</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-card border-[3px] border-default rounded-xl text-primary shadow-sm">
                {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <span className="text-[14px] font-black uppercase text-primary">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <button
              onClick={toggleDarkMode}
              className="w-14 h-8 rounded-full p-1 transition-colors bg-card border-[3px] border-default shadow-brutal flex items-center"
            >
              <div className={`w-5 h-5 bg-primary rounded-full transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>
        </Card>

        <Card className="p-8">
          <h3 className="text-xl font-heading font-black text-primary uppercase mb-1">Account</h3>
          <p className="text-sm text-primary font-bold mb-6">Signed in as {user?.email ?? 'unknown@example.com'}</p>
          <Button onClick={handleLogout} disabled={isSigningOut} className="inline-flex items-center gap-2 !bg-accent !text-black">
            <LogOut className="w-5 h-5" />
            {isSigningOut ? 'Signing Out...' : 'Logout'}
          </Button>
          {logoutError && (
            <p className="text-sm mt-3 font-bold text-accent">
              {logoutError}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Settings;
