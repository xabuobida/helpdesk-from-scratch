import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Info, User, Shield, UserCheck, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializingDatabase, setInitializingDatabase] = useState(false);
  const [databaseInitialized, setDatabaseInitialized] = useState(false);
  
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if database is initialized on component mount
  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  const checkDatabaseStatus = async () => {
    try {
      // Try to query profiles table to see if it exists and has data
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (!error && data !== null) {
        setDatabaseInitialized(true);
      }
    } catch (error) {
      console.log('Database not yet initialized');
    }
  };

  const initializeDatabase = async () => {
    setInitializingDatabase(true);
    try {
      toast({
        title: "Initializing Database",
        description: "Setting up fresh database and creating initial user accounts...",
      });

      // Call the Edge Function to create initial users
      const { data, error } = await supabase.functions.invoke('create-initial-users', {
        body: {}
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setDatabaseInitialized(true);
        toast({
          title: "Database Initialized! 🎉",
          description: `Successfully created ${data.summary.successful} user accounts. You can now login with the provided credentials.`,
        });
        
        // Auto-fill admin credentials
        setEmail('mohammadddigham@gmail.com');
        setPassword('admin123456');
        setIsLogin(true);
      } else {
        throw new Error(data.error || 'Failed to initialize database');
      }
    } catch (error) {
      console.error('Database initialization error:', error);
      toast({
        title: "Initialization Failed",
        description: error.message || "Failed to initialize database. Please try again.",
        variant: "destructive",
      });
    } finally {
      setInitializingDatabase(false);
    }
  };

  // Email validation function
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!databaseInitialized) {
      toast({
        title: "Database Not Ready",
        description: "Please initialize the database first by clicking the 'Initialize Database' button.",
        variant: "destructive",
      });
      return;
    }
    
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
        description: "Please enter a valid email address",
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
              title: "Invalid Credentials",
              description: "Invalid email or password. Please check your credentials and try again.",
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

  const fillCredentials = (userType: 'admin' | 'customer' | 'agent') => {
    const credentials = {
      admin: { email: 'mohammadddigham@gmail.com', password: 'admin123456', name: 'Mohammad Digham' },
      customer: { email: 'abudosh2@gmail.com', password: 'customer123456', name: 'Abu Dosh' },
      agent: { email: 'it@domedia.me', password: 'agent123456', name: 'IT Support' }
    };
    
    const cred = credentials[userType];
    setEmail(cred.email);
    setPassword(cred.password);
    if (!isLogin) {
      setName(cred.name);
      setRole(userType);
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
            {!databaseInitialized && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Database Setup Required</span>
                </div>
                <p className="text-sm text-yellow-700 mb-3">
                  The database needs to be initialized with fresh tables and user accounts.
                </p>
                <Button 
                  onClick={initializeDatabase}
                  disabled={initializingDatabase}
                  className="w-full"
                >
                  {initializingDatabase ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Initializing Database...
                    </>
                  ) : (
                    'Initialize Database & Create Users'
                  )}
                </Button>
              </div>
            )}

            {databaseInitialized && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Database Ready</span>
                </div>
              </div>
            )}

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
                    disabled={!databaseInitialized}
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
                  placeholder="Enter your email address"
                  disabled={!databaseInitialized}
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
                    disabled={!databaseInitialized}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={!databaseInitialized}
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
                  <Select value={role} onValueChange={setRole} disabled={!databaseInitialized}>
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
                disabled={loading || !databaseInitialized}
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
                disabled={!databaseInitialized}
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
              Pre-Created Accounts
            </CardTitle>
            <CardDescription>
              Use these accounts that were created during database initialization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!databaseInitialized ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Initialize the database first to access pre-created accounts
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Available Test Accounts</h3>
                <p className="text-sm text-gray-600">
                  Click to auto-fill credentials for quick access:
                </p>
                
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => fillCredentials('admin')}
                  >
                    <Shield className="h-4 w-4 mr-2 text-red-600" />
                    <div className="text-left">
                      <div className="font-medium">Admin Account</div>
                      <div className="text-xs text-gray-500">mohammadddigham@gmail.com</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => fillCredentials('agent')}
                  >
                    <UserCheck className="h-4 w-4 mr-2 text-blue-600" />
                    <div className="text-left">
                      <div className="font-medium">Support Agent</div>
                      <div className="text-xs text-gray-500">it@domedia.me</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => fillCredentials('customer')}
                  >
                    <User className="h-4 w-4 mr-2 text-green-600" />
                    <div className="text-left">
                      <div className="font-medium">Customer Account</div>
                      <div className="text-xs text-gray-500">abudosh2@gmail.com</div>
                    </div>
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-medium text-gray-900 mb-2">Account Details</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-red-600" />
                      <span><strong>Admin:</strong> Full system access, user management</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-3 w-3 text-blue-600" />
                      <span><strong>Agent:</strong> Handle tickets and customer support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-green-600" />
                      <span><strong>Customer:</strong> Submit tickets and get support</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Email Activation</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      All accounts are pre-activated and ready to use. No email confirmation required.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;