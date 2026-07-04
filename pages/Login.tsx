import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button } from '../components/UI';
import { getCompanies } from '../services/api';
import { toast } from 'sonner';
import { AuthSession } from '../types';
import { useSession } from '../App';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, Check } from 'lucide-react';

// Custom high-fidelity Easy HR SVG Logo Component matching the user image
export const EasyHRLogo = ({ className = "w-16 h-16", dark = false }: { className?: string; dark?: boolean }) => {
  const primaryColor = "#2563EB"; // Vibrant blue
  const secondaryColor = dark ? "#0F172A" : "#FFFFFF"; // Deep slate or pure white
  const bridgeColor = "#2563EB";

  return (
    <svg viewBox="0 0 100 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left person (H stem) */}
      <circle cx="28" cy="18" r="5" fill={secondaryColor} />
      <rect x="25" y="27" width="6" height="32" rx="3" fill={secondaryColor} />

      {/* Right person (H stem + start of R) */}
      <circle cx="55" cy="18" r="5" fill={primaryColor} />
      <rect x="52" y="27" width="6" height="32" rx="3" fill={primaryColor} />

      {/* Bridge / Handshake connector */}
      <path d="M31 38 C38 46, 45 46, 52 38" stroke={primaryColor} strokeWidth="4.5" strokeLinecap="round" fill="none" />

      {/* Letter R loops */}
      <path d="M58 27 H72 C78 27, 81 31, 81 36 C81 41, 77 44, 71 44 H58" stroke={primaryColor} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M69 44 L81 59" stroke={primaryColor} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const navigate = useNavigate();
  const { login, systemLogo, systemName } = useSession();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    try {
      // Check Super Admin
      if ((email === 'fapolok3@gmail.com' && password === 'Iamfapolok@1') || 
          (email === 'admin@admin.com' && password === 'admin123')) {
        const session: AuthSession = {
          userEmail: email,
          isSuperAdmin: true,
          userName: 'Super Admin'
        };
        login(session);
        toast.success('Welcome back, Super Admin!', {
          description: 'You have full access to all system features.',
        });
        navigate('/admin');
        return;
      }

      // Check Company Admins
      const companies = await getCompanies();
      const company = companies.find(c => c.adminEmail === email && c.adminPassword === password);
      
      if (company) {
        const session: AuthSession = {
          userEmail: email,
          isSuperAdmin: false,
          companyId: company.id,
          userName: company.name
        };
        login(session);
        toast.success(`Welcome to ${company.name}`, {
          description: 'Successfully signed in as company administrator.',
        });
        navigate('/');
        return;
      }

      // Check Employee Logins
      const { getEmployeeByCredentials } = await import('../services/api');
      const employee = await getEmployeeByCredentials(email, password);
      
      if (employee) {
        const session: AuthSession = {
          userEmail: employee.email || employee.phone,
          isSuperAdmin: false,
          isEmployee: true,
          employeeId: employee.id,
          companyId: employee.companyId,
          userName: employee.name,
          avatarUrl: employee.avatarUrl
        };
        login(session);
        toast.info(`Welcome, ${employee.name}`, {
          description: 'Successfully signed in to your portal.',
        });
        navigate('/attendance/mobile-punch');
        return;
      }

      setError('Invalid email or password');
      toast.error('Login Failed', {
        description: 'Please check your credentials and try again.',
      });
    } catch (err) {
      console.error(err);
      setError('An error occurred during login. Please try again.');
      toast.error('System Error', {
        description: 'An unexpected error occurred. Please contact support.',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl bg-white rounded-[24px] md:rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]"
      >
        {/* Left Side (Banner with gradients and dashboard graphic) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white p-12 flex-col justify-between relative overflow-hidden">
          {/* Decorative background blur shapes */}
          <div className="absolute top-[-20%] left-[-20%] w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          
          {/* Custom logo name and Welcome Back! above it */}
          <div className="z-10 flex flex-col gap-3">
            {systemLogo ? (
              <img src={systemLogo} alt="Logo" className="w-24 h-24 object-contain rounded-xl" referrerPolicy="no-referrer" />
            ) : (
              <EasyHRLogo className="w-24 h-24" />
            )}
            {systemName && systemName.toLowerCase() !== 'easy hr' && (
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                {systemName}
              </h1>
            )}
          </div>

          {/* Welcome Text in center-top */}
          <div className="z-10 mt-6 mb-6">
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">Welcome Back!</h2>
            <p className="text-sm text-blue-100/90 font-medium">
              {systemName.toLowerCase() === 'easy hr' ? 'Sign in to continue to your account' : `Sign in to continue to your ${systemName} account`}
            </p>
            <div className="w-10 h-1 bg-blue-400 rounded-full mt-4" />
          </div>

          {/* Graphical Illustration Container */}
          <div className="z-10 mt-auto relative flex items-end justify-center pt-8">
            {/* The Plant */}
            <div className="absolute left-[-20px] bottom-0 z-20 flex flex-col items-center">
              {/* Leaves */}
              <div className="relative w-16 h-28 flex items-end">
                {/* Stem */}
                <div className="absolute left-1/2 bottom-0 w-0.5 h-24 bg-blue-400/50" />
                {/* Leaf 1 */}
                <div className="absolute bottom-4 left-0 w-6 h-10 bg-blue-400/40 rounded-full origin-bottom-right rotate-[-35deg]" />
                {/* Leaf 2 */}
                <div className="absolute bottom-10 right-0 w-6 h-10 bg-blue-300/40 rounded-full origin-bottom-left rotate-[35deg]" />
                {/* Leaf 3 */}
                <div className="absolute bottom-16 left-1 w-5 h-9 bg-blue-400/50 rounded-full origin-bottom-right rotate-[-20deg]" />
                {/* Leaf 4 */}
                <div className="absolute bottom-22 right-1 w-5 h-9 bg-blue-300/50 rounded-full origin-bottom-left rotate-[20deg]" />
                {/* Leaf Top */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-8 bg-blue-300/60 rounded-full" />
              </div>
              {/* White Pot */}
              <div className="w-10 h-10 bg-white rounded-b-md rounded-t-sm shadow-md border border-slate-100 flex items-center justify-center">
                <div className="w-8 h-1.5 bg-slate-100 rounded-full mb-5" />
              </div>
            </div>

            {/* Dashboard Mock Window */}
            <div className="w-full max-w-[280px] bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl ml-8">
              {/* Window Header */}
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <div className="w-2 h-2 rounded-full bg-white/20" />
              </div>
              {/* Window Layout */}
              <div className="grid grid-cols-12 min-h-[160px] text-white/90">
                {/* Sidebar of Mock Window */}
                <div className="col-span-3 border-r border-white/5 p-3 flex flex-col gap-3 items-center bg-white/5">
                  <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center">
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-300" />
                  </div>
                  <div className="w-5 h-1 bg-white/20 rounded" />
                  <div className="w-5 h-1 bg-white/10 rounded" />
                  <div className="w-5 h-1 bg-white/10 rounded" />
                  <div className="w-5 h-1 bg-white/10 rounded" />
                </div>
                {/* Main of Mock Window */}
                <div className="col-span-9 p-3 space-y-3">
                  {/* Row 1 */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/10" />
                    <div className="space-y-1 flex-1">
                      <div className="w-16 h-1.5 bg-white/20 rounded" />
                      <div className="w-10 h-1 bg-white/10 rounded" />
                    </div>
                  </div>
                  {/* Line Chart Graphic */}
                  <div className="p-2 rounded-lg bg-white/5 border border-white/5 space-y-1">
                    <div className="w-12 h-1.5 bg-white/15 rounded mb-2" />
                    <svg className="w-full h-8 overflow-visible" viewBox="0 0 100 30">
                      <path d="M0 25 Q20 5, 40 20 T80 8 T100 15" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="40" cy="20" r="2" fill="#3B82F6" />
                      <circle cx="80" cy="8" r="2" fill="#3B82F6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Float Small Widget */}
            <div className="absolute right-[-10px] bottom-4 bg-white rounded-xl shadow-lg border border-slate-100 p-2.5 flex items-center gap-2.5 text-slate-800 z-20 w-32">
              <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin flex items-center justify-center" />
              <div className="space-y-1">
                <div className="w-14 h-1.5 bg-slate-200 rounded" />
                <div className="w-8 h-1 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side (Active Form and centered branding) */}
        <div className="lg:col-span-7 flex flex-col justify-center p-8 md:p-16 bg-white">
          <div className="w-full max-w-md mx-auto space-y-8">
            
            {/* Form Logo branding */}
            <div className="text-center">
              <div className="flex flex-col items-center justify-center gap-2">
                {systemLogo ? (
                  <img src={systemLogo} alt="Logo" className="w-32 h-32 object-contain rounded-2xl shadow-sm" referrerPolicy="no-referrer" />
                ) : (
                  <EasyHRLogo className="w-32 h-32" dark={true} />
                )}
                {systemName && systemName.toLowerCase() !== 'easy hr' && (
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase flex items-baseline mt-1">
                    {systemName}
                  </h1>
                )}
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-xl text-center"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              
              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full h-11 pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full h-11 pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer group select-none">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 group-hover:border-slate-400'}`}>
                    {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="text-xs text-slate-500 font-medium group-hover:text-slate-700 transition-colors">
                    Remember me
                  </span>
                </label>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isLoggingIn ? 'Authenticating...' : 'Sign In'}</span>
              </Button>

            </form>

            <div className="pt-6 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase leading-relaxed">
                By signing in, you agree to our Terms of Service & Privacy Policy.
              </p>
            </div>

          </div>
        </div>

      </motion.div>
    </div>
  );
};

export default Login;
