import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button } from '../components/UI';
import { getCompanies, setCurrentSession, AuthSession } from '../services/api';
import { IconCheckCircle, IconBot } from '../components/Icons';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check Super Admin
    if (email === 'fapolok3@gmail.com' && password === '123456') {
      const session: AuthSession = {
        userEmail: email,
        isSuperAdmin: true
      };
      setCurrentSession(session);
      navigate('/admin');
      return;
    }

    // Check Company Admins
    const companies = getCompanies();
    const company = companies.find(c => c.adminEmail === email && c.adminPassword === password);
    
    if (company) {
      const session: AuthSession = {
        userEmail: email,
        isSuperAdmin: false,
        companyId: company.id
      };
      setCurrentSession(session);
      navigate('/');
      return;
    }

    setError('Invalid email or password');
  };

  return (
    <div className="min-h-screen bg-surfaceHighlight flex items-center justify-center p-4">
      <Card className="w-full max-w-[420px] p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <IconBot className="w-32 h-32" />
        </div>
        
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
             <div className="w-12 h-12 bg-[#1cbdb0] rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <IconCheckCircle className="w-8 h-8" />
             </div>
             <h1 className="text-3xl font-black text-text tracking-tighter uppercase">Easy<span className="text-[#1cbdb0]">HR</span></h1>
          </div>
          <p className="text-sm text-textMuted font-bold uppercase tracking-widest">Enterprise Management System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-lg text-center uppercase">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
             <Input 
                label="Email Address" 
                type="email"
                value={email} 
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@company.com"
                required
             />
             <Input 
                label="Password" 
                type="password"
                value={password} 
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
             />
          </div>

          <Button type="submit" className="w-full h-12 text-md uppercase font-black tracking-widest mt-4">
            Sign In
          </Button>
          
          <div className="pt-6 text-center border-t border-border mt-8">
             <p className="text-[10px] text-textMuted uppercase font-bold tracking-widest leading-relaxed">
                By signing in, you agree to our Terms of Service and Privacy Policy.
             </p>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Login;
