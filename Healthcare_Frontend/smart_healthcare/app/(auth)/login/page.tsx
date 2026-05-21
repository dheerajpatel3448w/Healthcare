"use client"

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Activity, Lock, Mail, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { useAppData } from "@/context/user.context";
import { useDoctorData } from "@/context/docter.context";
import axios from "axios";
import { ThreeVisualizer } from "@/components/ui/ThreeVisualizer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const { setBtnLoading, btnLoading, setIsAuth, setUser } = useAppData();
  const { setDoctor, setBtnLoading2, btnLoading2, setIsAuth2 } = useDoctorData();
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }
    setBtnLoading(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_AUTH}/auth/login`, formData);
      if (res.data.success) {
        Cookies.set("token", res.data.token, { expires: 7, sameSite: "lax" });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("userRole", res.data.user.role);
        toast.success("Login successful");
        console.log("login successfull");
      }
      if (res.data.user.role === "patient") {
        const res2 = await axios.get(`${process.env.NEXT_PUBLIC_API_USER}/profile/getprofile`, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${Cookies.get("token")}` }
        });
        setUser({ ...res.data.user, profile: { ...res2.data.profile } });
        setIsAuth(true);
        // Small delay to ensure cookie is committed before RoleGuard reads it
        await new Promise((r) => setTimeout(r, 100));
        router.push("/dashboard");
      }
      if (res.data.user.role === "doctor") {
        const res3 = await axios.get(`${process.env.NEXT_PUBLIC_API_DOCTOR}/doctor/getprofile`, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${Cookies.get("token")}` }
        });
        setDoctor({ ...res.data.user, doctorProfile: { ...res3.data.profile } });
        setIsAuth2(true);
        // Small delay to ensure cookie is committed before RoleGuard reads it
        await new Promise((r) => setTimeout(r, 100));
        router.push("/dashboard/doctor");
      }
    } catch (error) {
      toast.error("Invalid credentials. Please try again.");
    } finally {
      setBtnLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-zinc-950 text-zinc-100 font-sans">
      {/* LEFT: 3D Visualizer Panel (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 relative bg-black flex-col justify-end p-12 overflow-hidden border-r border-zinc-900">
        <div className="absolute inset-0 z-0">
          <ThreeVisualizer />
        </div>
        <div className="relative z-10 select-none pointer-events-none">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-cyan-500/10 backdrop-blur border border-cyan-500/30 rounded-xl flex items-center justify-center">
                <Activity className="text-cyan-400 w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">NovaCure</h1>
            </div>
            <h2 className="text-4xl font-light text-zinc-100 mb-2 drop-shadow-lg shadow-black">Welcome back to NovaCure.</h2>
            <p className="text-zinc-300 text-lg max-w-md drop-shadow">Sign in to access your appointments, medical records, and seamlessly consult with your doctors.</p>
          </motion.div>
        </div>
      </div>

      {/* RIGHT: Login Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-[#09090B] relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.03),transparent_50%)] pointer-events-none" />

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm relative z-10">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-cyan-500/10 backdrop-blur border border-cyan-500/30 rounded-xl flex items-center justify-center">
              <Activity className="text-cyan-400 w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">NovaCure</h1>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Sign In</h2>
              <p className="text-sm text-zinc-400 mt-2">Enter your email and password to access your portal</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500 z-10" />
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all placeholder:text-zinc-600 text-sm"
                    placeholder="doctor@novacure.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-zinc-300">Password</label>
                  <a href="#" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">Forgot password?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500 z-10" />
                  <Input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all placeholder:text-zinc-600 text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={btnLoading}
                className="w-full group relative flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 py-2 rounded-md text-sm font-semibold transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50 mt-6 h-10"
              >
                {btnLoading ? (
                  <div className="h-4 w-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                ) : (
                  <>
                    Sign into Portal
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-zinc-500 mt-6">
              Don't have an account? <a href="/register" className="text-cyan-400 hover:text-cyan-300 transition-colors">Apply for access</a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}