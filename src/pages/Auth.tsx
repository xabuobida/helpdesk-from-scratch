import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Info } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Email validation function
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!isValidEmail(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address (e.g., user@example.com)",
        variant: "destructive",
      });
      return;
    }

    if (!isLogin && !name) {
      toast({
        title: "Error",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    if (!isLogin && password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let result = null;
      
      if (isLogin) {
        result = await login(email, password);
        if (result.success) {
          toast({
            title: "Success",
            description: "Logged in successfully",
          });
          navigate('/');
        } else {
          // Handle specific login errors
          if (result.error?.code === 'email_not_confirmed') {
            toast({
              title: "Email Not Confirmed",
              description: "Please check your email and click the confirmation link before logging in.",
              variant: "destructive",
            });
          } else if (result.error?.code === 'invalid_credentials') {
            toast({
              title: "Invalid Credentials",
              description: "Account not found. Please check your email and password, or create a new account.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Login Failed",
              description: result.error?.message || "Unable to log in. Please try again.",
              variant: "destructive",
            });
          }
        }
      } else {
        result = await signup(email, password, name, role);
        if (result.success) {
          toast({
            title: "Account Created",
            description: "Account created successfully! You can now sign in.",
          });
          setIsLogin(true);
          setPassword('');
        } else {
          toast({
            title: "Signup Failed",
            description: result.error?.message || "Unable to create account. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fillTestCredentials = (testRole: string) => {
    setEmail(`${testRole}@test.com`);
    setPassword('password123');
    if (!isLogin) {
      setName(`Test ${testRole.charAt(0).toUpperCase() + testRole.slice(1)}`);
      setRole(testRole);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {isLogin ? 'Sign In' : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {isLogin 
              ? 'Enter your credentials to access your account' 
              : 'Fill in your details to create a new account'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  placeholder="Enter your full name"
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter a valid email (e.g., user@example.com)"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder={isLogin ? "Enter your password" : "Create a password (min 6 characters)"}
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {!isLogin && (
              <div>
                <Label htmlFor="role">Account Type</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="agent">Support Agent</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setPassword('');
                setName('');
                setEmail('');
              }}
              className="text-indigo-600 hover:text-indigo-800 text-sm"
            >
              {isLogin 
                ? "Don't have an account? Create one" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-900 mb-2">
                  {isLogin ? 'First time here?' : 'Quick Setup'}
                </p>
                {isLogin ? (
                  <div className="text-blue-800">
                    <p className="mb-2">Create test accounts to explore different user roles:</p>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(false);
                          fillTestCredentials('admin');
                        }}
                        className="block text-left hover:underline"
                      >
                        • Create Admin Account
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(false);
                          fillTestCredentials('agent');
                        }}
                        className="block text-left hover:underline"
                      >
                        • Create Agent Account
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(false);
                          fillTestCredentials('customer');
                        }}
                        className="block text-left hover:underline"
                      >
                        • Create Customer Account
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-blue-800">
                    <p className="mb-2">Fill test credentials for quick setup:</p>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => fillTestCredentials('admin')}
                        className="block text-left hover:underline"
                      >
                        • Admin: admin@test.com
                      </button>
                      <button
                        type="button"
                        onClick={() => fillTestCredentials('agent')}
                        className="block text-left hover:underline"
                      >
                        • Agent: agent@test.com
                      </button>
                      <button
                        type="button"
                        onClick={() => fillTestCredentials('customer')}
                        className="block text-left hover:underline"
                      >
                        • Customer: customer@test.com
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;