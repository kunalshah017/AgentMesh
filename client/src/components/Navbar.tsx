"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect } from "wagmi";
import { WalletDropdown } from "./WalletDropdown";
import { LogoIcon } from "./Logo";

interface NavbarProps {
    /** Optional status indicator for dashboard */
    status?: "connected" | "connecting" | "disconnected";
    /** Optional event count badge */
    eventCount?: number;
}

export function Navbar({ status, eventCount }: NavbarProps) {
    const pathname = usePathname();
    const { isConnected } = useAccount();
    const { connect, connectors } = useConnect();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const links = [
        { href: "/", label: "Home" },
        { href: "/explore", label: "Explore" },
        { href: "/publish", label: "Publish" },
        { href: "/dashboard", label: "Dashboard" },
    ];

    return (
        <nav className="border-b-4 border-black bg-neo-white px-6 py-4 flex items-center justify-between">
            {/* Left: Logo + Links */}
            <div className="flex items-center gap-4">
                <Link href="/">
                    <div className="bg-neo-accent border-4 border-black px-3 py-1.5 shadow-[4px_4px_0px_0px_#000] -rotate-1 cursor-pointer flex items-center gap-2">
                        <LogoIcon size={22} className="text-black" />
                        <h1 className="text-xl font-black tracking-tighter uppercase text-black">
                            AGENT<span className="text-neo-white">MESH</span>
                        </h1>
                    </div>
                </Link>
                <div className="hidden md:flex items-center gap-3">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`text-sm font-black uppercase transition-colors ${pathname === link.href
                                ? "text-neo-accent"
                                : "hover:text-neo-accent"
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Right: Status + Wallet */}
            <div className="flex items-center gap-3">
                {/* Connection status (dashboard only) */}
                {status && (
                    <div className={`border-3 border-black px-3 py-1.5 flex items-center gap-2 ${status === "connected" ? "bg-neo-secondary" : status === "connecting" ? "bg-neo-muted" : "bg-neo-white"
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${status === "connected" ? "bg-green-500" : status === "connecting" ? "bg-yellow-400" : "bg-red-500"
                            }`} />
                        <span className="mono text-xs font-black uppercase">
                            {status === "connected" ? "LIVE" : status === "connecting" ? "..." : "OFF"}
                        </span>
                    </div>
                )}

                {/* Event counter (dashboard only) */}
                {eventCount !== undefined && eventCount > 0 && (
                    <div className="bg-black text-neo-white border-4 border-black px-3 py-1.5 mono text-xs font-black">
                        {eventCount} EVT
                    </div>
                )}

                {/* Wallet */}
                {!mounted ? (
                    <div className="bg-neo-secondary border-4 border-black px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0px_0px_#000] opacity-50">
                        Connect Wallet
                    </div>
                ) : isConnected ? (
                    <WalletDropdown />
                ) : (
                    <button
                        onClick={() => connect({ connector: connectors[0] })}
                        className="bg-neo-secondary border-4 border-black px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                        Connect Wallet
                    </button>
                )}
            </div>
        </nav>
    );
}
