import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const GoogleLoginButton = () => {
  const { login, isAuthenticated } = useAuth();

  const handleLoginSuccess = async (credentialResponse) => {
    try {
      // credentialResponse.credential is the JWT from Google
      await login(credentialResponse.credential);
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please try again.');
    }
  };

  const handleLoginError = () => {
    console.error('Login Failed');
    alert('Login failed. Please check your credentials and try again.');
  };

  if (isAuthenticated) {
    // Don't show login button if already logged in
    return null;
  }

  return (
    <div className="flex items-center justify-center">
      <GoogleLogin
        onSuccess={handleLoginSuccess}
        onError={handleLoginError}
        size="large"
        theme="outline"
      />
    </div>
  );
};

export default GoogleLoginButton;
