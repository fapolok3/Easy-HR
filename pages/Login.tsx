import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button } from '../components/UI';
import { getCompanies } from '../services/api';
import { toast } from 'sonner';
import { AuthSession } from '../types';
import { useSession } from '../App';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, Check, Clock, Calendar, Users, ArrowUpRight } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-50 flex items-center justify-center p-4 md:p-8 font-sans relative overflow-hidden">
      {/* Floating ambient glow circles behind the glass card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-300/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-300/20 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl bg-white/60 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] border border-white/80 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.1)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px] relative z-10"
      >
        {/* Left Side (Banner with gradients, checkmarks and dashboard graphic) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-b from-blue-100/60 to-indigo-150/50 backdrop-blur-md text-slate-800 p-12 flex-col justify-between relative overflow-hidden border-r border-white/50">
          {/* Decorative background blur shapes */}
          <div className="absolute top-[-20%] left-[-20%] w-80 h-80 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none" />
          
          {/* Custom logo name above Welcome Back */}
          <div className="z-10 flex flex-col gap-3">
            {systemLogo ? (
              <img src={systemLogo} alt="Logo" className="w-28 h-28 object-contain rounded-xl" referrerPolicy="no-referrer" />
            ) : (
              <EasyHRLogo className="w-28 h-28" />
            )}
          </div>

          {/* Welcome Text in center-top */}
          <div className="z-10 mt-6 mb-6 space-y-6">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-slate-900">Welcome Back!</h2>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                Sign in to continue to your {systemName} account and manage your workspace.
              </p>
            </div>

            {/* Checkpoint points */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-xs font-semibold text-slate-700 tracking-wide">Real-time attendance</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-xs font-semibold text-slate-700 tracking-wide">Shift management</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-xs font-semibold text-slate-700 tracking-wide">Leave tracking</span>
              </div>
            </div>

            <div className="w-10 h-1 bg-blue-500/30 rounded-full mt-4" />
          </div>

          {/* Graphical Illustration Container */}
          <div className="z-10 mt-auto relative flex items-center justify-center pt-8 pb-4 min-h-[280px]">
            {/* Ambient light glow behind the graphic */}
            <div className="absolute w-52 h-52 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />
            
            {/* Elegant, minimalist vector card */}
            <div className="w-[270px] bg-white rounded-2xl border border-slate-100 shadow-xl p-5 relative z-10 flex flex-col items-center justify-center space-y-4 transition-all hover:shadow-2xl">
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* Outer pulsing ring */}
                <div className="absolute inset-0 rounded-full bg-blue-50/50 border border-blue-100 animate-pulse" />
                
                {/* Main Minimalist SVG illustration */}
                <svg className="w-24 h-24 relative z-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="clockGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#6366F1" />
                    </linearGradient>
                  </defs>
                  
                  {/* Subtle shadow circle */}
                  <circle cx="50" cy="50" r="38" fill="white" stroke="#F1F5F9" strokeWidth="2" />
                  
                  {/* Clock frame */}
                  <circle cx="50" cy="50" r="32" stroke="url(#clockGrad)" strokeWidth="3" strokeLinecap="round" />
                  
                  {/* Outer accent ticks */}
                  <line x1="50" y1="23" x2="50" y2="26" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
                  <line x1="50" y1="74" x2="50" y2="77" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
                  <line x1="23" y1="50" x2="26" y2="50" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
                  <line x1="74" y1="50" x2="77" y2="50" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
                  
                  {/* Clock Hands representing modern schedule */}
                  <line x1="50" y1="50" x2="68" y2="38" stroke="url(#clockGrad)" strokeWidth="3" strokeLinecap="round" />
                  <line x1="50" y1="50" x2="50" y2="32" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
                  
                  {/* Center pin */}
                  <circle cx="50" cy="50" r="4" fill="white" stroke="#1E293B" strokeWidth="2" />
                  
                  {/* Green Successful Check Badge on top right of clock */}
                  <circle cx="78" cy="22" r="11" fill="#10B981" />
                  <path d="M74 22L77 25L83 19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Minimal Text Label */}
              <div className="text-center space-y-1">
                <h4 className="text-xs font-bold text-slate-800 tracking-tight">Smart Workplace HR</h4>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Perfect Attendance & Leave Tracker</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side (Active Form and centered branding with Glass Effect) */}
        <div className="lg:col-span-7 flex flex-col justify-center p-8 md:p-16 bg-white/40 backdrop-blur-sm">
          <div className="w-full max-w-md mx-auto space-y-8">
            
            {/* Form Logo branding (No text name, just larger logo) */}
            <div className="text-center flex flex-col items-center justify-center mb-2">
              {systemLogo ? (
                <img src={systemLogo} alt="Logo" className="w-40 h-40 object-contain rounded-2xl drop-shadow-md" referrerPolicy="no-referrer" />
              ) : (
                <EasyHRLogo className="w-40 h-40" dark={true} />
              )}
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-xl text-center backdrop-blur-sm"
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
                    className="w-full h-11 pl-10 pr-3 py-2 bg-white/80 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
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
                    className="w-full h-11 pl-10 pr-10 py-2 bg-white/80 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
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
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
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
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isLoggingIn ? 'Authenticating...' : 'Sign In'}</span>
              </Button>

            </form>

            <div className="pt-6 border-t border-slate-200/50 text-center">
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
