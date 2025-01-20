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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Welcome to NRGflow">
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
        <LoginForm onSuccess={onClose} />
      ) : (
        <RegisterForm onSuccess={onClose} />
      )}
    </Modal>
  );
};

export default AuthModal; 