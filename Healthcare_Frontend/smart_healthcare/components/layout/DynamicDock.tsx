"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, UserCircle, Cpu, LogIn, UserPlus, LogOut, FileText, Target, Stethoscope, FileClock } from "lucide-react";
import { OrbitalMenu } from "./OrbitalMenu";
import { NovaCureLogo } from "@/components/brand/NovaCureLogo";
import { useAppData } from "@/context/user.context";
import { useDoctorData } from "@/context/docter.context";
import Cookies from "js-cookie";

function DockIcon({
  item,
  mouseX,
}: {
  item: { href: string; icon: any; label: string; action?: () => void };
  mouseX: any;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  // Measure distance from the cursor to the center of this specific icon
  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  // Calculate the width curve based on physical cursor distance.
  const widthSync = useTransform(distance, [-150, 0, 150], [48, 80, 48]);
  // Spring to make the scale up incredibly buttery
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

  const Content = (
    <motion.div
      ref={ref}
      style={{ width, height: width }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={item.action}
      className="relative flex items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl hover:bg-zinc-800 hover:border-zinc-700 transition-colors group z-10 cursor-pointer"
    >
      <item.icon className={`w-1/2 h-1/2 transition-colors ${item.label === "Disconnect" ? "text-red-500/80 group-hover:text-red-400" : "text-zinc-400 group-hover:text-cyan-400"}`} />

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.9 }}
            className="absolute -top-12 px-3 py-1.5 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-lg text-sm font-medium text-zinc-200 shadow-xl whitespace-nowrap z-[100] pointer-events-none"
          >
            {item.label}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return item.action ? Content : <Link href={item.href}>{Content}</Link>;
}

export const DynamicDock = () => {
  const mouseX = useMotionValue(Infinity);
  const [isOrbitalOpen, setIsOrbitalOpen] = useState(false);
  const router = useRouter();

  // Authentication Contexts
  const { isAuth, setIsAuth, setUser } = useAppData();
  const { isAuth2, setIsAuth2, setDoctor } = useDoctorData();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Ultimate source of truth: Application State OR localStorage token
    setIsAuthenticated(isAuth || isAuth2 || !!localStorage.getItem("token"));
  }, [isAuth, isAuth2]);

  const handleLogout = () => {
    Cookies.remove("token", { path: '/' });
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    setIsAuth(false);
    setIsAuth2(false);
    setUser(null);
    setDoctor(null);
    window.location.href = "/login";
  };

  const publicItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/doctors", icon: Stethoscope, label: "Specialists" },
    { href: "/login", icon: LogIn, label: "Login" },
    { href: "/register", icon: UserPlus, label: "Register" },
  ];

  const patientItems = [
    { href: "/dashboard", icon: UserCircle, label: "Dashboard" },
    { href: "/dashboard/reports", icon: FileClock, label: "Records" },
    { href: "/dashboard/nova", icon: Cpu, label: "Nova AI" },
    { href: "/dashboard/wellness", icon: Target, label: "Wellness" },
  ];

  const doctorItems = [
    { href: "/", icon: Home, label: "Feed" },
    { href: "/ai-diagnostics", icon: Cpu, label: "Nova AI" },
    { href: "/dashboard/doctor", icon: UserCircle, label: "Control Center" },
    { href: "#", icon: LogOut, label: "Disconnect", action: handleLogout },
  ];

  const [activeItems, setActiveItems] = useState<{ href: string; icon: React.ElementType; label: string; action?: () => void }[]>(publicItems);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      if (localStorage.getItem("userRole") === "doctor") {
        setActiveItems(doctorItems);
      } else {
        setActiveItems(patientItems);
      }
    } else {
      setActiveItems(publicItems);
    }
  }, [mounted, isAuthenticated, isAuth, isAuth2]);

  return (
    <>
      <OrbitalMenu isOpen={isOrbitalOpen} onClose={() => setIsOrbitalOpen(false)} />

      {/* Floating Bottom Dock Wrapper */}
      <div className="fixed bottom-6 inset-x-0 w-full flex justify-center z-50 pointer-events-none px-4">
        <motion.div
          onMouseMove={(e) => mouseX.set(e.pageX)}
          onMouseLeave={() => mouseX.set(Infinity)}
          className="flex items-end gap-3 px-4 pb-3 pt-4 rounded-[2rem] bg-zinc-950/70 backdrop-blur-3xl border border-white/10 shadow-[0_0_40px_-10px_rgba(6,182,212,0.2)] pointer-events-auto"
        >
          {activeItems.slice(0, 2).map((item) => (
            <DockIcon key={item.label} item={item} mouseX={mouseX} />
          ))}

          {/* Center Orbital Trigger wrapped in identical dock structure footprint but fixed size so the logo stays dominant */}
          <div className="px-2 pb-1 relative z-20">
            <button
              onClick={() => setIsOrbitalOpen(true)}
              className="relative w-16 h-16 flex items-center justify-center rounded-full bg-zinc-950 border border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all group outline-none"
            >
              <div className="absolute inset-0 bg-cyan-500/10 rounded-full group-hover:bg-cyan-500/20 transition-colors" />
              <NovaCureLogo className="w-8 h-8 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {activeItems.slice(2, 4).map((item) => (
            <DockIcon key={item.label} item={item} mouseX={mouseX} />
          ))}
        </motion.div>
      </div>
    </>
  );
};
