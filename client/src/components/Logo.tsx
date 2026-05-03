export function LogoIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
    return (
        <svg
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            className={className}
        >
            <g>
                <line x1="50" y1="50" x2="50" y2="18" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
                <line x1="50" y1="50" x2="79" y2="36" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
                <line x1="50" y1="50" x2="73" y2="72" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
                <line x1="50" y1="50" x2="27" y2="72" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
                <line x1="50" y1="50" x2="21" y2="36" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
                <circle cx="50" cy="18" r="6" fill="currentColor" />
                <circle cx="79" cy="36" r="6" fill="currentColor" />
                <circle cx="73" cy="72" r="6" fill="currentColor" />
                <circle cx="27" cy="72" r="6" fill="currentColor" />
                <circle cx="21" cy="36" r="6" fill="currentColor" />
                <circle cx="50" cy="50" r="10" fill="currentColor" />
            </g>
        </svg>
    );
}

export function LogoFull({ size = 32, className = "" }: { size?: number; className?: string }) {
    return (
        <svg
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            className={className}
        >
            <g>
                <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3.5 5" opacity="0.25" />
                <line x1="50" y1="50" x2="50" y2="18" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
                <line x1="50" y1="50" x2="79" y2="36" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
                <line x1="50" y1="50" x2="73" y2="72" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
                <line x1="50" y1="50" x2="27" y2="72" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
                <line x1="50" y1="50" x2="21" y2="36" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
                <line x1="50" y1="18" x2="79" y2="36" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
                <line x1="79" y1="36" x2="73" y2="72" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
                <line x1="73" y1="72" x2="27" y2="72" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
                <line x1="27" y1="72" x2="21" y2="36" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
                <line x1="21" y1="36" x2="50" y2="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
                <circle cx="50" cy="18" r="5.5" fill="currentColor" />
                <circle cx="79" cy="36" r="5.5" fill="currentColor" />
                <circle cx="73" cy="72" r="5.5" fill="currentColor" />
                <circle cx="27" cy="72" r="5.5" fill="currentColor" />
                <circle cx="21" cy="36" r="5.5" fill="currentColor" />
                <circle cx="50" cy="50" r="9" fill="currentColor" />
            </g>
        </svg>
    );
}
