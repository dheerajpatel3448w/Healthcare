"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const RoleGuard = ({ 
   children, 
   allowedRole 
}: { 
   children: React.ReactNode, 
   allowedRole: "patient" | "doctor" 
}) => {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    // localStorage is synchronous — no race condition, no cookie domain issues
    const token = localStorage.getItem("token");

    if (!token) {
      console.log("no token found in localStorage");
      router.replace("/login");
      return;
    }

    console.log("token found ✓");

    const storedRole = localStorage.getItem("userRole");

    if (storedRole === allowedRole) {
      setIsVerified(true);
    } else {
      if (storedRole === "doctor") {
        router.replace("/dashboard/doctor");
      } else if (storedRole === "patient") {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [allowedRole, router]);

  if (!isVerified) {
    return (
      <div className="flex w-full min-h-screen items-center justify-center bg-zinc-950">
        <div className="animate-pulse flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-2 border-zinc-800 border-t-cyan-500 rounded-full animate-spin"></div>
           <span className="text-zinc-500 tracking-widest text-xs uppercase font-medium">Securing Enclave</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
