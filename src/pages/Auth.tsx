import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Info, User, Shield, UserCheck, AlertCircle } from 'lucide-react';

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
        console.log('Attempting login with:', email);
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
              title: "Account Not Found",
              description: "No account found with these credentials. Please create a new account or use the test accounts below.",
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
        console.log('Attempting signup with:', email, role);
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

  const loginWithTestAccount = async (testRole: string) => {
    setLoading(true);
    try {
      console.log(`Attempting to login with ${testRole} test account`);
      const result = await login(`${testRole}@test.com`, 'password123');
      if (result.success) {
        toast({
          title: "Success",
          description: `Logged in as ${testRole}`,
        });
        navigate('/');
      } else {
        // If login fails, automatically create the account
        console.log(`${testRole} account doesn't exist, creating it...`);
        toast({
          title: "Creating Test Account",
          description: `The ${testRole} test account doesn't exist yet. Creating it now...`,
        });
        
        // Create the account
        const signupResult = await signup(
          `${testRole}@test.com`, 
          'password123', 
          `Test ${testRole.charAt(0).toUpperCase() + testRole.slice(1)}`, 
          testRole
        );
        
        if (signupResult.success) {
          toast({
            title: "Test Account Created",
            description: `${testRole} test account created successfully! Now logging in...`,
          });
          
          // Wait a moment for the account to be fully created, then try to login
          setTimeout(async () => {
            const loginResult = await login(`${testRole}@test.com`, 'password123');
            if (loginResult.success) {
              toast({
                title: "Success",
                description: `Logged in as ${testRole}`,
              });
              navigate('/');
            } else {
              toast({
                title: "Login Failed",
                description: "Account created but login failed. Please try logging in manually.",
                variant: "destructive",
              });
              // Fill the form for manual login
              setEmail(`${testRole}@test.com`);
              setPassword('password123');
              setIsLogin(true);
            }
            setLoading(false);
          }, 2000);
          return; // Don't set loading to false here, wait for the timeout
        } else {
          toast({
            title: "Account Creation Failed",
            description: signupResult.error?.message || "Failed to create test account",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error with test account:', error);
      toast({
        title: "Error",
        description: "Failed to login with test account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Auth Form */}
        <Card className="w-full">
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
          </CardContent>
        </Card>

        {/* Quick Access Panel */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Quick Access
            </CardTitle>
            <CardDescription>
              Get started immediately with test accounts or create your own
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Debug Info */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Debug Info</span>
              </div>
              <div className="text-xs text-yellow-700 space-y-1">
                <div>Database tables should be set up automatically</div>
                <div>Test accounts will be created on first use</div>
                <div>Check browser console for detailed logs</div>
              </div>
            </div>

            {isLogin ? (
              <>
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">Try Demo Accounts</h3>
                  <p className="text-sm text-gray-600">
                    Click to login instantly. If the account doesn't exist, it will be created automatically:
                  </p>
                  
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => loginWithTestAccount('admin')}
                      disabled={loading}
                    >
                      <Shield className="h-4 w-4 mr-2 text-red-600" />
                      <div className="text-left">
                        <div className="font-medium">Admin Account</div>
                        <div className="text-xs text-gray-500">admin@test.com</div>
                      </div>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => loginWithTestAccount('agent')}
                      disabled={loading}
                    >
                      <UserCheck className="h-4 w-4 mr-2 text-blue-600" />
                      <div className="text-left">
                        <div className="font-medium">Support Agent</div>
                        <div className="text-xs text-gray-500">agent@test.com</div>
                      </div>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => loginWithTestAccount('customer')}
                      disabled={loading}
                    >
                      <User className="h-4 w-4 mr-2 text-green-600" />
                      <div className="text-left">
                        <div className="font-medium">Customer Account</div>
                        <div className="text-xs text-gray-500">customer@test.com</div>
                      </div>
                    </Button>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <h3 className="font-medium text-gray-900 mb-2">Manual Login</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Or fill credentials manually:
                  </p>
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fillTestCredentials('admin')}
                      className="w-full text-left justify-start text-xs"
                    >
                      Fill Admin: admin@test.com / password123
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fillTestCredentials('agent')}
                      className="w-full text-left justify-start text-xs"
                    >
                      Fill Agent: agent@test.com / password123
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fillTestCredentials('customer')}
                      className="w-full text-left justify-start text-xs"
                    >
                      Fill Customer: customer@test.com / password123
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">Create Test Accounts</h3>
                  <p className="text-sm text-gray-600">
                    Quick setup with pre-filled test credentials:
                  </p>
                  
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => fillTestCredentials('admin')}
                    >
                      <Shield className="h-4 w-4 mr-2 text-red-600" />
                      <div className="text-left">
                        <div className="font-medium">Admin Account</div>
                        <div className="text-xs text-gray-500">Full system access</div>
                      </div>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => fillTestCredentials('agent')}
                    >
                      <UserCheck className="h-4 w-4 mr-2 text-blue-600" />
                      <div className="text-left">
                        <div className="font-medium">Support Agent</div>
                        <div className="text-xs text-gray-500">Handle tickets & chat</div>
                      </div>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => fillTestCredentials('customer')}
                    >
                      <User className="h-4 w-4 mr-2 text-green-600" />
                      <div className="text-left">
                        <div className="font-medium">Customer Account</div>
                        <div className="text-xs text-gray-500">Submit tickets & chat</div>
                      </div>
                    </Button>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <h3 className="font-medium text-gray-900 mb-2">Account Types</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-red-600" />
                      <span><strong>Admin:</strong> Manage users, view analytics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-3 w-3 text-blue-600" />
                      <span><strong>Agent:</strong> Handle support tickets</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-green-600" />
                      <span><strong>Customer:</strong> Submit support requests</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;