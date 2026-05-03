import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#FF6B6B",
                    borderRadius: "22%",
                }}
            >
                <svg
                    viewBox="0 0 100 100"
                    width="130"
                    height="130"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <g>
                        <line x1="50" y1="50" x2="50" y2="18" stroke="#000" strokeWidth="3.2" strokeLinecap="round" />
                        <line x1="50" y1="50" x2="79" y2="36" stroke="#000" strokeWidth="3.2" strokeLinecap="round" />
                        <line x1="50" y1="50" x2="73" y2="72" stroke="#000" strokeWidth="3.2" strokeLinecap="round" />
                        <line x1="50" y1="50" x2="27" y2="72" stroke="#000" strokeWidth="3.2" strokeLinecap="round" />
                        <line x1="50" y1="50" x2="21" y2="36" stroke="#000" strokeWidth="3.2" strokeLinecap="round" />
                        <circle cx="50" cy="18" r="6" fill="#000" />
                        <circle cx="79" cy="36" r="6" fill="#000" />
                        <circle cx="73" cy="72" r="6" fill="#000" />
                        <circle cx="27" cy="72" r="6" fill="#000" />
                        <circle cx="21" cy="36" r="6" fill="#000" />
                        <circle cx="50" cy="50" r="10" fill="#000" />
                    </g>
                </svg>
            </div>
        ),
        { ...size }
    );
}
