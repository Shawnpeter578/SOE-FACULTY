"use client";

import React, { useState } from "react";
import { Calendar, Check, Eye, EyeOff, X } from "lucide-react";

export default function LoginPage() {
  const [activeRole, setActiveRole] = useState("Student");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock authentication delay
    setTimeout(() => {
      console.log("Login Attempt:", { activeRole, email, password, rememberMe });
      alert(`Simulating login for ${activeRole}...\nEmail: ${email}`);
      setIsLoading(false);
    }, 1200);
  };

  const roles = ["Student", "Faculty", "Dean"];

  return (
    <div className="relative min-h-screen w-full flex flex-col md:flex-row font-sans bg-slate-50 md:bg-white transition-colors duration-500">
      {/* Floating Close Button - Hidden on small mobile, visible on desktop/tablets */}
      <button
        type="button"
        className="hidden md:flex absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-[#424242] hover:bg-black transition-all duration-300 ease-out hover:scale-105 active:scale-95 text-white rounded-full p-2.5 items-center justify-center cursor-pointer shadow-lg border border-white/10"
        onClick={() => console.log("Close clicked")}
        aria-label="Close"
      >
        <X size={20} />
      </button>

      {/* LEFT PANEL / MOBILE TOP HEADER */}
      <div className="relative w-full md:w-1/2 bg-[#182855] flex flex-col pt-10 pb-20 px-6 md:px-16 md:py-14 md:min-h-screen shrink-0 overflow-hidden transition-all duration-500">
        
        {/* Decorative Concentric Circles - Desktop only */}
        <div className="hidden md:block absolute bottom-0 right-0 pointer-events-none h-full w-full overflow-hidden opacity-80">
          <div className="absolute bottom-[-150px] right-[-150px] w-[450px] h-[450px] rounded-full border border-white/5" />
          <div className="absolute bottom-[-250px] right-[-250px] w-[650px] h-[650px] rounded-full border border-white/5" />
          <div className="absolute bottom-[-350px] right-[-350px] w-[850px] h-[850px] rounded-full border border-white/5" />
          <div className="absolute bottom-[-450px] right-[-450px] w-[1050px] h-[1050px] rounded-full border border-white/5" />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 border border-white/20 rounded-[12px] flex items-center justify-center bg-white/5 shrink-0 transition-transform duration-300 hover:scale-105">
              <Calendar size={24} className="text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-white">
              EventDesk
            </span>
          </div>

          {/* MOBILE ONLY: Alternate Header Text */}
          <div className="md:hidden mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Welcome back
            </h1>
            <p className="mt-3 text-base text-blue-200/90">
              Sign in to continue
            </p>
          </div>

          {/* DESKTOP ONLY: Value Prop */}
          <div className="hidden md:block mt-32 max-w-lg animate-in fade-in slide-in-from-left-8 duration-700">
            <h1 className="text-5xl lg:text-6xl font-bold leading-[1.15] tracking-tight text-white">
              Every event, from idea to approval, in one place.
            </h1>
            <p className="mt-6 text-lg text-blue-100/90 leading-relaxed font-light">
              Bring your campus together. Plan, collaborate and keep every
              detail moving forward.
            </p>

            <ul className="mt-12 space-y-5">
              <FeatureItem text="Quick approvals" />
              <FeatureItem text="Committee chat" />
              <FeatureItem text="Bills and reports" />
            </ul>
          </div>

          {/* DESKTOP ONLY: Footer */}
          <div className="hidden md:block mt-auto">
            <p className="text-sm text-blue-200/60 font-light">
              Thoughtfully organized. Effortlessly managed.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL / MOBILE BOTTOM CONTENT */}
      <div className="w-full md:w-1/2 flex flex-col items-center md:justify-center px-4 sm:px-8 pb-10 md:p-12 relative z-10 -mt-10 md:mt-0 bg-transparent md:bg-white flex-1 transition-all duration-500">
        
        {/* Login Card */}
        <div className="w-full max-w-[480px] bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] md:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] border border-gray-100/80 md:border-gray-100/50 p-6 sm:p-10 transition-all duration-300">
          
          {/* DESKTOP ONLY: Card Header */}
          <div className="hidden md:block mb-8">
            <h2 className="text-3xl font-bold text-[#0F172A] tracking-tight">
              Welcome back
            </h2>
            <p className="text-base text-slate-500 mt-2">
              Sign in to continue
            </p>
          </div>

          {/* Segmented Control (Tabs) */}
          <div className="flex bg-slate-50/80 p-1.5 rounded-[14px] border border-slate-100 overflow-hidden">
            {roles.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setActiveRole(role)}
                className={`flex-1 rounded-[10px] py-3 text-[15px] transition-all duration-300 ease-out active:scale-[0.98] ${
                  activeRole === role
                    ? "bg-[#182855] text-white font-semibold shadow-md"
                    : "text-slate-500 hover:text-slate-800 font-medium bg-transparent hover:bg-slate-200/50"
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Form */}
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {/* Email/ID Input */}
            <div className="space-y-2.5">
              <label className="block text-sm font-semibold text-slate-900">
                College email or ID
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter college email or ID"
                className="w-full border border-gray-200 rounded-[12px] px-4 py-3.5 min-h-[52px] text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#182855] focus:ring-4 focus:ring-[#182855]/10 transition-all duration-300 ease-out bg-white"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2.5">
              <label className="block text-sm font-semibold text-slate-900">
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full border border-gray-200 rounded-[12px] px-4 py-3.5 min-h-[52px] text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#182855] focus:ring-4 focus:ring-[#182855]/10 transition-all duration-300 ease-out bg-white pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-4 text-slate-400 hover:text-slate-700 transition-colors duration-200 flex items-center justify-center active:scale-95"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Options Row */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-3 cursor-pointer group py-1">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-5 h-5 rounded-[6px] border-gray-300 text-[#182855] focus:ring-[#182855] bg-white cursor-pointer appearance-none border-2 checked:bg-[#182855] checked:border-[#182855] transition-all duration-200"
                  />
                  <Check
                    size={14}
                    className={`absolute text-white pointer-events-none transition-all duration-300 ease-out ${
                      rememberMe ? "opacity-100 scale-100" : "opacity-0 scale-50"
                    }`}
                    strokeWidth={3}
                  />
                </div>
                <span className="text-[15px] text-slate-500 select-none group-hover:text-slate-700 transition-colors">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                onClick={() => alert("Forgot password clicked")}
                className="text-[15px] font-semibold text-[#182855] hover:text-[#132045] hover:underline bg-transparent border-none p-1 transition-all"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 bg-[#182855] hover:bg-[#132045] disabled:bg-slate-400 disabled:cursor-not-allowed text-white py-4 min-h-[52px] rounded-[12px] text-base font-semibold transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.98] flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Help Footer */}
          <div className="mt-8 text-center">
            <p className="text-[14px] text-slate-500">
              Need help?{" "}
              <button
                type="button"
                onClick={() => alert("Contact admin clicked")}
                className="text-slate-600 font-medium hover:text-slate-900 transition-colors bg-transparent border-none p-0 inline hover:underline"
              >
                Contact the admin office
              </button>
            </p>
          </div>
        </div>

        {/* MOBILE ONLY: Bottom Tagline */}
        <p className="md:hidden text-[14px] text-slate-500 mt-10 mb-4 text-center">
          Every campus moment, organized.
        </p>
      </div>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-4 group">
      <div className="bg-white/10 p-1 rounded-full group-hover:bg-white/20 transition-colors duration-300">
        <Check size={16} className="text-white shrink-0" strokeWidth={3} />
      </div>
      <span className="text-base font-medium text-white/90 group-hover:text-white transition-colors duration-300">{text}</span>
    </li>
  );
}