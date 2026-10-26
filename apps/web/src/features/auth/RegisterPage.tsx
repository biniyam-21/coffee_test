import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AuthBrandingPanel } from './AuthBrandingPanel';
import { CoffeeLoadingOverlay } from '../../components/ui/CoffeeLoadingOverlay';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) {
      errs.fullName = 'Full name is required';
    }
    if (!email) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters long';
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    if (!agreeTerms) {
      errs.agreeTerms = 'You must agree to the Terms of Service';
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
      await register(email, password, fullName, phoneNumber || undefined);
      toast.success(
        'Account Created!',
        `Welcome to Akufada Coffee Artisans, ${fullName.split(' ')[0]}!`,
      );
      navigate('/');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Registration failed. Please verify your details.';
      setServerError(msg);
      toast.error('Registration Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-94px)] bg-[#F6F4FA] flex items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-12 font-sans antialiased text-[#211D2B]">
      {/* Aesthetic Animated Coffee Loading Overlay when registering */}
      {isLoading && (
        <CoffeeLoadingOverlay
          message="Creating your account..."
          subtext="Brewing your personalized Akufada coffee profile..."
        />
      )}

      {/* Centered Two-Column Authentication Card (Expanded ~1,180 - 1,220px desktop) */}
      <div className="w-full max-w-[1180px] lg:max-w-[1220px] rounded-xl lg:rounded-2xl bg-white shadow-[0_20px_50px_-12px_rgba(33,17,63,0.12),0_4px_16px_-4px_rgba(33,17,63,0.06)] border border-[#E9E5EE] overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-all min-h-[640px] lg:min-h-[720px]">
        {/* Left Column: Coffee Brand Experience (Deep Plum #21113F with Background Image Overlay) */}
        <div className="lg:col-span-6 flex flex-col h-full">
          <AuthBrandingPanel />
        </div>

        {/* Right Column: Clean White Registration Form Panel */}
        <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 xl:p-16 flex flex-col justify-between bg-white h-full">
          <div>
            {/* Header */}
            <div className="mb-6 text-left">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#7138E8]">
                GET STARTED
              </span>
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#211D2B] tracking-tight leading-tight mt-1">
                Create Your Account
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-[#777183]">
                Join Akufada Coffee Artisans and enjoy every cup.
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
                  <span className="font-semibold block mb-0.5">Registration Error</span>
                  <span>{serverError}</span>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="register-fullname"
                  className="block text-xs font-semibold text-[#191827] uppercase tracking-wider"
                >
                  Full Name
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#77758A]">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    id="register-fullname"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="e.g. Sara Haile"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    aria-invalid={!!errors.fullName}
                    className={`block w-full rounded-lg border bg-white pl-10 pr-4 py-2.5 text-sm text-[#191827] placeholder:text-[#77758A]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6D3BD1]/20 ${
                      errors.fullName
                        ? 'border-[#C43D4B] focus:border-[#C43D4B]'
                        : 'border-[#E3E1EB] focus:border-[#6D3BD1]'
                    }`}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-xs text-[#C43D4B] font-medium mt-1">{errors.fullName}</p>
                )}
              </div>

              {/* Email Address */}
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="register-email"
                  className="block text-xs font-semibold text-[#191827] uppercase tracking-wider"
                >
                  Email Address
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#77758A]">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!errors.email}
                    className={`block w-full rounded-lg border bg-white pl-10 pr-4 py-2.5 text-sm text-[#191827] placeholder:text-[#77758A]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6D3BD1]/20 ${
                      errors.email
                        ? 'border-[#C43D4B] focus:border-[#C43D4B]'
                        : 'border-[#E3E1EB] focus:border-[#6D3BD1]'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-[#C43D4B] font-medium mt-1">{errors.email}</p>
                )}
              </div>

              {/* Phone Number (Optional) */}
              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="register-phone"
                    className="block text-xs font-semibold text-[#191827] uppercase tracking-wider"
                  >
                    Phone Number
                  </label>
                  <span className="text-[10px] text-[#77758A] font-medium">Optional</span>
                </div>
                <div className="relative rounded-lg shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#77758A]">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    id="register-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+251 911 223 344"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="block w-full rounded-lg border border-[#E3E1EB] bg-white pl-10 pr-4 py-2.5 text-sm text-[#191827] placeholder:text-[#77758A]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6D3BD1]/20 focus:border-[#6D3BD1]"
                  />
                </div>
              </div>

              {/* Password & Confirm Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Password */}
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="register-password"
                    className="block text-xs font-semibold text-[#191827] uppercase tracking-wider"
                  >
                    Password
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#77758A]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      placeholder="Min. 8 chars"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={!!errors.password}
                      className={`block w-full rounded-lg border bg-white pl-9 pr-9 py-2.5 text-sm text-[#191827] placeholder:text-[#77758A]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6D3BD1]/20 ${
                        errors.password
                          ? 'border-[#C43D4B] focus:border-[#C43D4B]'
                          : 'border-[#E3E1EB] focus:border-[#6D3BD1]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-[#77758A] hover:text-[#5525A8] transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-[#C43D4B] font-medium mt-1">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="register-confirm-password"
                    className="block text-xs font-semibold text-[#191827] uppercase tracking-wider"
                  >
                    Confirm Password
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#77758A]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="register-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      aria-invalid={!!errors.confirmPassword}
                      className={`block w-full rounded-lg border bg-white pl-9 pr-9 py-2.5 text-sm text-[#191827] placeholder:text-[#77758A]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6D3BD1]/20 ${
                        errors.confirmPassword
                          ? 'border-[#C43D4B] focus:border-[#C43D4B]'
                          : 'border-[#E3E1EB] focus:border-[#6D3BD1]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-[#77758A] hover:text-[#5525A8] transition-colors cursor-pointer"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-[#C43D4B] font-medium mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              {/* Agreement Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-[#777183]">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-[#E9E5EE] text-[#7138E8] focus:ring-[#7138E8] cursor-pointer accent-[#7138E8]"
                  />
                  <span>
                    I agree to the{' '}
                    <span className="font-semibold text-[#211D2B]">Terms of Service</span> and{' '}
                    <span className="font-semibold text-[#211D2B]">Privacy Policy</span>.
                  </span>
                </label>
                {errors.agreeTerms && (
                  <p className="text-xs text-[#C43D4B] font-medium mt-1">{errors.agreeTerms}</p>
                )}
              </div>

              {/* Primary Purple Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#7138E8] hover:bg-[#5E27D6] active:bg-[#4D1FB5] text-white font-bold h-11 sm:h-12 text-sm shadow-md shadow-[#7138E8]/25 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7138E8] focus:ring-offset-2"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Sign In Prompt */}
          <div className="mt-8 text-center text-xs text-[#777183]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-bold text-[#7138E8] hover:text-[#5E27D6] hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
