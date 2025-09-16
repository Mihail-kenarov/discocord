"use client";

import Image from "next/image";
import { useState } from "react";


export default function Home() {

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left side - image */}
      <div className="relative hidden md:block">
        <Image
          src="/landing_boi.jpg"
          alt="Landing illustration"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Right side - canvas */}
      <div className="flex items-center justify-center bg-white p-6">
    
    
      </div>
    </div>
  );
}
