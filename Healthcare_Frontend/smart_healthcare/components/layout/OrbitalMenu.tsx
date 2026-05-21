"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, ArrowUpRight } from "lucide-react";
import { NovaCureLogo } from "@/components/brand/NovaCureLogo";
import { useAppData } from "@/context/user.context";
import { useDoctorData } from "@/context/docter.context";
import Cookies from "js-cookie";

export const OrbitalMenu = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const router = useRouter();

  const { isAuth, setIsAuth, setUser } = useAppData();
  const { isAuth2, setIsAuth2, setDoctor } = useDoctorData();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsAuthenticated(isAuth || isAuth2 || !!localStorage.getItem("token"));
  }, [isAuth, isAuth2]);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    Cookies.remove("token", { path: '/' });
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    setIsAuth(false);
    setIsAuth2(false);
    setUser(null);
    setDoctor(null);
    onClose();
    window.location.href = "/login";
  };

  type MenuLink = {
    title: string;
    href: string;
    action?: (e: React.MouseEvent) => void;
  };

  const publicLinks: MenuLink[] = [
    { title: "Home", href: "/" },
    { title: "Find Specialists", href: "/doctors" },
    { title: "Register", href: "/register" },
    { title: "Login", href: "/login" },
  ];

  const patientLinks: MenuLink[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Medical Records", href: "/dashboard/reports" },
    { title: "Nova AI", href: "/dashboard/nova" },
    { title: "Wellness Tracker", href: "/dashboard/wellness" },
    { title: "Find Specialists", href: "/doctors" },
    { title: "Disconnect", href: "#", action: handleLogout },
  ];

  const doctorLinks: MenuLink[] = [
    { title: "Control Room", href: "/dashboard/doctor" },
    { title: "Nova AI", href: "/dashboard/doctor/ai" },
    { title: "Disconnect", href: "#", action: handleLogout },
  ];

  const [activeLinks, setActiveLinks] = useState<MenuLink[]>(publicLinks);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      if (localStorage.getItem("userRole") === "doctor") {
         setActiveLinks(doctorLinks);
      } else {
         setActiveLinks(patientLinks);
      }
    } else {
       setActiveLinks(publicLinks);
    }
  }, [mounted, isAuthenticated, isAuth, isAuth2]);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          onMouseMove={handleMouseMove}
          className="fixed inset-0 z-[100] bg-zinc-950/80 backdrop-blur-3xl overflow-hidden flex flex-col font-sans"
        >
          {/* Spotlight Ambient Gradient */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
            style={{
               background: `radial-gradient(circle 800px at ${mousePos.x}px ${mousePos.y}px, rgba(6,182,212,0.12), transparent 80%)`,
            }}
          />

          {/* Top Bar inside Command Center */}
          <div className="flex justify-between items-center p-6 lg:p-12 z-10">
            <div className="flex items-center gap-3">
              <NovaCureLogo className="w-8 h-8" />
              <span className="text-xl md:text-2xl font-bold tracking-tight text-white drop-shadow-sm">Menu</span>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-900/50 border border-white/10 hover:bg-zinc-800 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all text-white outline-none"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Massive Typography Navigation Links */}
          <div className="flex-1 flex items-center justify-center z-10 w-full overflow-y-auto pt-10 pb-20">
            <div className="flex flex-col gap-2 w-full max-w-6xl px-6 lg:px-12">
              {activeLinks.map((link, i) => {
                
                const Content = (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col relative z-20"
                    >
                      <span
                        className={`text-4xl sm:text-6xl md:text-8xl font-light tracking-tighter transition-all duration-500 ${
                          hoveredIndex === i ? (link.title === "Disconnect" ? "text-red-500 translate-x-4 md:translate-x-8 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]" : "text-white translate-x-4 md:translate-x-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]") : "text-zinc-600"
                        }`}
                      >
                        {link.title}
                      </span>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: hoveredIndex === i ? 1 : 0, scale: hoveredIndex === i ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                      className={`hidden md:flex w-20 h-20 rounded-full items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.3)] z-20 ${link.title === "Disconnect" ? "bg-red-500/10 border border-red-400 text-red-400" : "bg-cyan-500/10 border border-cyan-400 text-cyan-400"}`}
                    >
                      <ArrowUpRight className="w-10 h-10" />
                    </motion.div>
                  </>
                );

                const commonClasses = "group relative flex items-center justify-between py-6 md:py-8 border-b border-white/5 last:border-0 w-full text-left";

                return link.action ? (
                  <button 
                    key={link.title}
                    onClick={link.action}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={commonClasses}
                  >
                    {Content}
                  </button>
                ) : (
                  <Link
                    key={link.title}
                    href={link.href}
                    onClick={onClose}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={commonClasses}
                  >
                    {Content}
                  </Link>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
