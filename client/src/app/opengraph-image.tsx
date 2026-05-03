import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AgentMesh — Decentralized Agent Marketplace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#FFFDF5",
                    fontFamily: "sans-serif",
                    position: "relative",
                }}
            >
                {/* Border frame */}
                <div
                    style={{
                        position: "absolute",
                        top: "16px",
                        left: "16px",
                        right: "16px",
                        bottom: "16px",
                        border: "6px solid #000",
                    }}
                />

                {/* Content */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "60px",
                        padding: "80px",
                    }}
                >
                    {/* Logo graphic */}
                    <div
                        style={{
                            width: "220px",
                            height: "220px",
                            background: "#FF6B6B",
                            border: "6px solid #000",
                            boxShadow: "12px 12px 0px 0px #000",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        <svg
                            viewBox="0 0 100 100"
                            width="160"
                            height="160"
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

                    {/* Text */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div
                            style={{
                                fontSize: "72px",
                                fontWeight: 900,
                                letterSpacing: "-2px",
                                textTransform: "uppercase",
                                lineHeight: 1,
                            }}
                        >
                            AgentMesh
                        </div>
                        <div
                            style={{
                                fontSize: "24px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "2px",
                                opacity: 0.6,
                            }}
                        >
                            Decentralized Agent Marketplace
                        </div>
                        <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                            <div
                                style={{
                                    background: "#FFD93D",
                                    border: "4px solid #000",
                                    padding: "6px 16px",
                                    fontSize: "14px",
                                    fontWeight: 900,
                                    textTransform: "uppercase",
                                }}
                            >
                                P2P Mesh
                            </div>
                            <div
                                style={{
                                    background: "#C4B5FD",
                                    border: "4px solid #000",
                                    padding: "6px 16px",
                                    fontSize: "14px",
                                    fontWeight: 900,
                                    textTransform: "uppercase",
                                }}
                            >
                                MCP Tools
                            </div>
                            <div
                                style={{
                                    background: "#FF6B6B",
                                    border: "4px solid #000",
                                    padding: "6px 16px",
                                    fontSize: "14px",
                                    fontWeight: 900,
                                    textTransform: "uppercase",
                                }}
                            >
                                x402 Payments
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ),
        { ...size }
    );
}
