import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AuthForm from '@/components/auth/AuthForm';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              Welcome
            </CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm
              databaseInitialized={true}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;