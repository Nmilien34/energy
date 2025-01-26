import React, { useState } from 'react';
import Modal from './Modal';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleError = (err: Error) => {
    setError(err.message);
    setSuccessMessage(null);
    setTimeout(() => setError(null), 5000);
  };

  const handleSuccess = () => {
    setError(null);
    setSuccessMessage('You have been successfully logged in');
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Welcome to NRGFLOW">
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm">
          {successMessage}
        </div>
      )}
      
      <div className="flex mb-6">
        <button
          className={`flex-1 py-2 text-center transition-colors ${
            activeTab === 'login'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-zinc-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('login')}
        >
          Login
        </button>
        <button
          className={`flex-1 py-2 text-center transition-colors ${
            activeTab === 'register'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-zinc-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('register')}
        >
          Register
        </button>
      </div>

      {activeTab === 'login' ? (
        <LoginForm onSuccess={handleSuccess} onError={handleError} />
      ) : (
        <RegisterForm onSuccess={handleSuccess} onError={handleError} />
      )}
    </Modal>
  );
};

export default AuthModal; 