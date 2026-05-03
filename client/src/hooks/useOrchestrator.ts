"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface AgentEvent {
  type: string;
  [key: string]: unknown;
}

export interface PaymentRequest {
  toolName: string;
  amount: string;
  recipient: string;
  eip712: {
    domain: {
      name: string;
      version: string;
      chainId: number;
      verifyingContract: `0x${string}`;
    };
    types: Record<string, Array<{ name: string; type: string }>>;
    message: Record<string, unknown>;
  };
}

export interface TransactionRequest {
  toolName: string;
  description: string;
  transaction: {
    to: string;
    data: string;
    value: string;
    chainId: number;
  };
  quote: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut: string;
    route: string;
    gasEstimate?: string;
    priceImpact?: string;
  };
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

interface UseOrchestratorReturn {
  status: ConnectionStatus;
  events: AgentEvent[];
  sendGoal: (goal: string) => void;
  clearEvents: () => void;
  isAuthenticated: boolean;
  currentChatId: string | null;
  pendingPayment: PaymentRequest | null;
  approvePayment: (signature: string) => void;
  rejectPayment: () => void;
  pendingTransaction: TransactionRequest | null;
  approveTransaction: (txHash: string) => void;
  rejectTransaction: () => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const AUTH_CACHE_KEY = "agentmesh_auth";

export type SignMessageFn = (args: { message: string }) => Promise<string>;

export function useOrchestrator(
  walletAddress?: string,
  signMessage?: SignMessageFn,
  onAuthRejected?: () => void,
): UseOrchestratorReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const reconnectAttempts = useRef(0);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PaymentRequest | null>(
    null,
  );
  const [pendingTransaction, setPendingTransaction] =
    useState<TransactionRequest | null>(null);
  const walletRef = useRef(walletAddress);
  walletRef.current = walletAddress;
  const signMessageRef = useRef(signMessage);
  signMessageRef.current = signMessage;
  const onAuthRejectedRef = useRef(onAuthRejected);
  onAuthRejectedRef.current = onAuthRejected;
  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;
  const chatGenRef = useRef(0);

  const addEvent = useCallback((event: AgentEvent) => {
    const gen = chatGenRef.current;
    setEvents((prev) => {
      // If generation changed (new chat started), ignore stale events
      if (chatGenRef.current !== gen) return prev;
      return [...prev, { ...event, _ts: Date.now() }];
    });
  }, []);

  const authenticateWs = useCallback(async (ws: WebSocket) => {
    if (!walletRef.current) return;

    // Check localStorage for cached auth (persists across tab closes)
    const cached = localStorage.getItem(AUTH_CACHE_KEY);
    if (cached) {
      try {
        const {
          walletAddress: cachedAddr,
          signature,
          signedMessage,
        } = JSON.parse(cached);
        if (
          cachedAddr?.toLowerCase() === walletRef.current.toLowerCase() &&
          signature
        ) {
          ws.send(
            JSON.stringify({
              type: "auth",
              walletAddress: walletRef.current,
              signature,
              signedMessage,
            }),
          );
          return;
        }
      } catch {
        localStorage.removeItem(AUTH_CACHE_KEY);
      }
    }

    if (signMessageRef.current) {
      try {
        // Fetch nonce from server
        const nonceRes = await fetch(`${API_URL}/auth/nonce`);
        const { nonce } = await nonceRes.json();
        const message = `Sign in to AgentMesh\n\nWallet: ${walletRef.current}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
        const signature = await signMessageRef.current({ message });

        // Cache for persistence across reloads/tabs
        localStorage.setItem(
          AUTH_CACHE_KEY,
          JSON.stringify({
            walletAddress: walletRef.current,
            signature,
            signedMessage: message,
          }),
        );

        ws.send(
          JSON.stringify({
            type: "auth",
            walletAddress: walletRef.current,
            signature,
            signedMessage: message,
            nonce,
          }),
        );
      } catch {
        // User rejected signature — disconnect wallet
        localStorage.removeItem(AUTH_CACHE_KEY);
        onAuthRejectedRef.current?.();
      }
    } else {
      ws.send(
        JSON.stringify({ type: "auth", walletAddress: walletRef.current }),
      );
    }
  }, []);

  const connect = useCallback(() => {
    // Prevent duplicate connections (React Strict Mode fires effects twice)
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    )
      return;
    if (reconnectAttempts.current >= 5) return;

    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      // Ignore events from stale connections (StrictMode cleanup race)
      if (wsRef.current !== ws) return;
      setStatus("connected");
      reconnectAttempts.current = 0;
      addEvent({ type: "system", message: "Connected to Orchestrator" });

      // SIWE auth if wallet is connected
      if (walletRef.current) {
        authenticateWs(ws);
      }
    };

    ws.onmessage = (msg) => {
      if (wsRef.current !== ws) return;
      try {
        const event = JSON.parse(msg.data) as AgentEvent;
        if (event.type === "auth_success") {
          setIsAuthenticated(true);
        } else if (event.type === "chat_created") {
          setCurrentChatId(event.chatId as string);
          addEvent(event);
        } else if (event.type === "payment_request") {
          // Pause for user approval
          setPendingPayment(event as unknown as PaymentRequest);
          addEvent(event);
        } else if (event.type === "transaction_request") {
          // Pause for user transaction approval (swap execution)
          setPendingTransaction(event as unknown as TransactionRequest);
          addEvent(event);
        } else {
          addEvent(event);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      // Only handle close for the current active connection
      if (wsRef.current !== ws) return;
      setStatus("disconnected");
      setIsAuthenticated(false);
      wsRef.current = null;
      reconnectAttempts.current++;
      if (reconnectAttempts.current < 5) {
        reconnectTimer.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [addEvent, authenticateWs]);

  // Reconnect when wallet changes to re-auth
  const prevWalletRef = useRef(walletAddress);
  useEffect(() => {
    const prevWallet = prevWalletRef.current;
    prevWalletRef.current = walletAddress;

    // Only clear cache if wallet actually changed (not initial undefined)
    if (walletAddress && walletAddress !== prevWallet) {
      // New wallet connected — check if cache is for a different wallet
      const cached = localStorage.getItem(AUTH_CACHE_KEY);
      if (cached) {
        try {
          const { walletAddress: cachedAddr } = JSON.parse(cached);
          if (cachedAddr?.toLowerCase() !== walletAddress.toLowerCase()) {
            localStorage.removeItem(AUTH_CACHE_KEY);
          }
        } catch {
          localStorage.removeItem(AUTH_CACHE_KEY);
        }
      }
    } else if (!walletAddress && prevWallet) {
      // Wallet was connected, now disconnected
      localStorage.removeItem(AUTH_CACHE_KEY);
    }

    if (
      walletAddress &&
      wsRef.current?.readyState === WebSocket.OPEN &&
      !isAuthenticatedRef.current
    ) {
      authenticateWs(wsRef.current);
    }
  }, [walletAddress]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendGoal = useCallback(
    (goal: string) => {
      if (!walletRef.current) {
        addEvent({
          type: "error",
          message: "Connect your wallet to use AgentMesh",
        });
        return;
      }

      if (!isAuthenticatedRef.current) {
        // Wallet connected but WS auth not complete — retry auth
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          authenticateWs(wsRef.current);
        }
        addEvent({
          type: "system",
          message: "Authenticating... please try again in a moment.",
        });
        return;
      }

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "goal", goal, chatId: currentChatId }),
        );
      } else {
        // Fallback: POST to /goal endpoint
        addEvent({ type: "system", message: `🎯 Goal submitted: "${goal}"` });
        fetch(`${API_URL}/goal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal,
            walletAddress: walletRef.current,
            chatId: currentChatId,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.chatId) setCurrentChatId(data.chatId);
            addEvent({ type: "task_result", task: data.task });
          })
          .catch((err) => {
            addEvent({
              type: "error",
              message: `Failed to submit goal: ${err}`,
            });
          });
      }
    },
    [addEvent, currentChatId],
  );

  const clearEvents = useCallback(() => {
    chatGenRef.current++;
    setEvents([]);
    setCurrentChatId(null);
  }, []);

  const approvePayment = useCallback((signature: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "payment_approval",
          approved: true,
          signature,
        }),
      );
    }
    setPendingPayment(null);
  }, []);

  const rejectPayment = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "payment_approval",
          approved: false,
        }),
      );
    }
    setPendingPayment(null);
  }, []);

  const approveTransaction = useCallback((txHash: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "transaction_approval",
          approved: true,
          txHash,
        }),
      );
    }
    setPendingTransaction(null);
  }, []);

  const rejectTransaction = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "transaction_approval",
          approved: false,
        }),
      );
    }
    setPendingTransaction(null);
  }, []);

  return {
    status,
    events,
    sendGoal,
    clearEvents,
    isAuthenticated,
    currentChatId,
    pendingPayment,
    approvePayment,
    rejectPayment,
    pendingTransaction,
    approveTransaction,
    rejectTransaction,
  };
}
