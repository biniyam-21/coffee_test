import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdminSidebar } from '../../context/AdminSidebarContext';
import { useToast } from '../../context/ToastContext';
import { RoleType } from '../../types/api';
import { AuthBrandingPanel } from './AuthBrandingPanel';
import { CoffeeLoadingOverlay } from '../../components/ui/CoffeeLoadingOverlay';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { expandSidebar, openSidebar } = useAdminSidebar();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordNotice, setForgotPasswordNotice] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const validate = () => {
    const errs: { email?: string; password?: string } = {};
    if (!email) {
      errs.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Please enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setIsLoading(true);
    try {
      const loggedUser = await login(email, password);
      toast.success(
        'Welcome Back!',
        `Signed in as ${loggedUser.fullName || loggedUser.email}`,
      );

      const isStaffOrAdmin =
        loggedUser.roles.includes(RoleType.ADMIN) ||
        loggedUser.roles.includes(RoleType.STAFF);

      if (isStaffOrAdmin) {
        openSidebar();
        expandSidebar();
      }

      if (from === '/' && loggedUser.roles.includes(RoleType.ADMIN)) {
        navigate('/admin', { replace: true });
      } else if (from === '/' && loggedUser.roles.includes(RoleType.STAFF)) {
        navigate('/staff/queue', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please verify your credentials.';
      setServerError(msg);
      toast.error('Authentication Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrors({});
    setServerError(null);
    toast.info(
      'Demo Account Loaded',
      `Filled credentials for ${demoEmail.split('@')[0].toUpperCase()}`,
    );
  };

  return (
    <div className="relative min-h-[calc(100vh-94px)] bg-[#F6F4FA] flex items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-12 font-sans antialiased text-[#211D2B]">
      {/* Aesthetic Animated Coffee Loading Overlay when signing in */}
      {isLoading && (
        <CoffeeLoadingOverlay
          message="Signing you in..."
          subtext="Authenticating your artisanal coffee session..."
        />
      )}

      {/* Centered Two-Column Authentication Card (Expanded ~1,180 - 1,220px desktop) */}
      <div className="w-full max-w-[1180px] lg:max-w-[1220px] rounded-xl lg:rounded-2xl bg-white shadow-[0_20px_50px_-12px_rgba(33,17,63,0.12),0_4px_16px_-4px_rgba(33,17,63,0.06)] border border-[#E9E5EE] overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-all min-h-[640px] lg:min-h-[720px]">
        {/* Left Column: Coffee Brand Experience (Deep Plum #21113F with Background Image Overlay) */}
        <div className="lg:col-span-6 flex flex-col h-full">
          <AuthBrandingPanel />
        </div>

        {/* Right Column: Clean White Login Form Panel */}
        <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 xl:p-16 flex flex-col justify-between bg-white h-full">
          <div>
            {/* Header / Eyebrow / Heading */}
            <div className="mb-7 text-left">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#7138E8]">
                WELCOME BACK
              </span>
              <h1
                className="text-2xl sm:text-[28px] font-extrabold text-[#211D2B] tracking-tight leading-tight mt-1"
                aria-label="Sign in to Akufada Coffee - Sign in to your account"
              >
                <span className="sr-only">Sign in to Akufada Coffee - </span>
                Sign in to your account
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-[#777183]">
                Access your dashboard and manage your coffee business.
              </p>
            </div>

            {/* Error Notification */}
            {serverError && (
              <div
                role="alert"
                className="mb-6 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-[#C43D4B] flex items-start gap-2.5 animate-fadeIn"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#C43D4B]" />
                <div className="flex-1">
                  <span className="font-semibold block mb-0.5">Authentication Error</span>
                  <span>{serverError}</span>
                </div>
              </div>
            )}

            {/* Forgot Password Modal / Banner */}
            {forgotPasswordNotice && (
              <div
                role="status"
                className="mb-6 rounded-xl border border-purple-200 bg-[#F3EEFC] p-4 text-xs text-[#7138E8] flex items-start justify-between gap-2 animate-fadeIn"
              >
                <div>
                  <span className="font-bold block mb-0.5">Password Reset Assistance</span>
                  <span className="text-[#211D2B]">
                    To reset your credentials, please contact store management or use your
                    registered manager recovery key.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setForgotPasswordNotice(false)}
                  className="text-xs font-bold text-[#7138E8] hover:underline ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
              {/* Email Address */}
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="login-email"
                  className="block text-[11px] font-bold text-[#211D2B] uppercase tracking-wider"
                >
                  EMAIL ADDRESS
                </label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#777183]">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!errors.email}
                    className={`block w-full rounded-lg border bg-white pl-10 pr-4 py-2.5 text-sm text-[#211D2B] placeholder:text-[#777183]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#7138E8]/15 ${
                      errors.email
                        ? 'border-[#C43D4B] focus:border-[#C43D4B]'
                        : 'border-[#E9E5EE] focus:border-[#7138E8]'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-[#C43D4B] font-medium mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password with Show/Hide toggle */}
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="login-password"
                  className="block text-[11px] font-bold text-[#211D2B] uppercase tracking-wider"
                >
                  PASSWORD
                </label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#777183]">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!errors.password}
                    className={`block w-full rounded-lg border bg-white pl-10 pr-11 py-2.5 text-sm text-[#211D2B] placeholder:text-[#777183]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#7138E8]/15 ${
                      errors.password
                        ? 'border-[#C43D4B] focus:border-[#C43D4B]'
                        : 'border-[#E9E5EE] focus:border-[#7138E8]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#777183] hover:text-[#7138E8] transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-[#C43D4B] font-medium mt-1">{errors.password}</p>
                )}
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-[#211D2B]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[#E9E5EE] text-[#7138E8] focus:ring-[#7138E8] cursor-pointer accent-[#7138E8]"
                  />
                  <span className="font-medium text-[#777183]">Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setForgotPasswordNotice(true)}
                  className="font-semibold text-[#7138E8] hover:text-[#5E27D6] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Primary Purple Sign-In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#7138E8] hover:bg-[#5E27D6] active:bg-[#4D1FB5] text-white font-bold h-11 sm:h-12 text-sm shadow-md shadow-[#7138E8]/25 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7138E8] focus:ring-offset-2"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Evaluation Tools: Secondary Discreet Quick Preset Bar */}
            <div className="mt-6">
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-[#E9E5EE]" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-semibold text-[#777183]">
                  <span className="bg-white px-2.5">Evaluation Quick Access</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillQuickDemo('admin@akufada.com', 'AdminSecret123!')}
                  className="rounded-lg border border-[#E9E5EE] bg-[#F6F4FA]/70 px-2 py-1.5 text-xs font-semibold text-[#211D2B] hover:border-[#7138E8] hover:bg-purple-50/50 hover:text-[#7138E8] transition-all cursor-pointer text-center"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickDemo('staff@akufada.com', 'StaffSecret123!')}
                  className="rounded-lg border border-[#E9E5EE] bg-[#F6F4FA]/70 px-2 py-1.5 text-xs font-semibold text-[#211D2B] hover:border-[#7138E8] hover:bg-purple-50/50 hover:text-[#7138E8] transition-all cursor-pointer text-center"
                >
                  Staff
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickDemo('customer@akufada.com', 'CustomerSecret123!')}
                  className="rounded-lg border border-[#E9E5EE] bg-[#F6F4FA]/70 px-2 py-1.5 text-xs font-semibold text-[#211D2B] hover:border-[#7138E8] hover:bg-purple-50/50 hover:text-[#7138E8] transition-all cursor-pointer text-center"
                >
                  Customer
                </button>
              </div>
            </div>
          </div>

          {/* Account Registration Link Prompt */}
          <div className="mt-8 text-center text-xs text-[#777183]">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="font-bold text-[#7138E8] hover:text-[#5E27D6] hover:underline"
            >
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
