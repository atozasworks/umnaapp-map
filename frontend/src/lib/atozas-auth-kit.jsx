// Wrapper for atozas-react-auth-kit
// Vite alias maps 'atozas-react-auth-kit' to the source files
// Note: Type exports are not needed at runtime, only for TypeScript type checking

export { AuthProvider, apiClient } from 'atozas-react-auth-kit/context/AuthContext';
export { useAuth } from 'atozas-react-auth-kit/hooks/useAuth';
export { GoogleLoginButton } from 'atozas-react-auth-kit/components/GoogleLoginButton';
export { EmailOtpLogin } from 'atozas-react-auth-kit/components/EmailOtpLogin';

