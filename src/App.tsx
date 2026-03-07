import React from 'react';
import { jsx as _jsx } from 'react/jsx-runtime';
import { motion, AnimatePresence } from 'framer-motion';
 import {
  Shield,
  ShieldCheck,
  Activity,
  Globe,
  Zap,
  Lock,
  RefreshCw,
  Signal,
  Terminal,
  Play,
  Square,
  Search,
  Database,
  Server,
  X,
  Sliders,
  Radio,
  ToggleLeft,
  ToggleRight,
  Save,
  Download
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer
} from "recharts";
const PROTOCOLS = ["SSH", "SSL", "UDP", "V2RAY"];
const PAYLOADS = [
  "GET / HTTP/1.1[crlf]Host: [host][crlf]Connection: Keep-Alive[crlf][crlf]",
  "CONNECT [host] HTTP/1.1[crlf]Host: [host][crlf]Proxy-Connection: Keep-Alive[crlf][crlf]",
  "POST http://[host]/ HTTP/1.1[crlf]Host: [host][crlf]Content-Length: 999999999[crlf][crlf]"
];
const SNIS = [
  "facebook.com",
  "whatsapp.net",
  "instagram.com",
  "tiktok.com",
  "google.com"
];
export default function App() {
  const {
    stats,
    history,
    setStats,
    logs,
    addLog,
    setLogs,
    advancedConfig,
    setAdvancedConfig,
    selectedServer,
    setSelectedServer,
    handleCarrierChange,
    handleConnectionTypeChange
  } = useNetworkStats();
  const [isVpnActive, setIsVpnActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanPhase, setScanPhase] = useState("idle");
  const [selectedPayload, setSelectedPayload] = useState(0);
  const [selectedSni, setSelectedSni] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const scanningRef = useRef(false);
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      addLog("Aplicativo instalado com sucesso!", "success");
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
      setIsInstalled(true);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);
  const installPWA = async () => {
    if (isInstalled) {
      addLog("O aplicativo já está instalado!", "info");
      return;
    }
    if (!deferredPrompt) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        addLog("Instalação no iOS: Toque no ícone de 'Compartilhar' e selecione 'Adicionar à Tela de Início'", "warning");
      } else {
        addLog("Instalação: Use o menu do navegador (três pontos) e selecione 'Instalar Aplicativo' ou 'Adicionar à tela de início'", "warning");
      }
      return;
    }
    try {
      addLog("Solicitando permissão de instalação ao sistema...", "info");
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        addLog("Instalação aceita pelo usuário!", "success");
      } else {
        addLog("Instalação cancelada pelo usuário.", "warning");
      }
      setDeferredPrompt(null);
    } catch (err) {
      addLog("Erro ao disparar prompt. Use o menu do navegador para instalar.", "error");
      console.error("PWA Prompt Error:", err);
    }
  };
  const logEndRef = useRef(null);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);
  const selectFastestServer = () => {
    const fastest = [...SERVERS].sort((a, b) => a.latency - b.latency)[0];
    setSelectedServer(fastest);
    addLog(`Auto-seleção: Servidor mais rápido encontrado (${fastest.name} - ${fastest.latency}ms)`, "success");
    setShowServerMenu(false);
  };
  const startAutoScan = async () => {
    if (isScanning || isVpnActive) return;
    setIsScanning(true);
    setScanPhase("selecting");
    scanningRef.current = true;
    setStats((prev) => ({ ...prev, status: "scanning" }));
    setLogs([]);
    addLog("Iniciando Escâner Automático 4G...", "info");
    addLog("Operadora selecionada: " + stats.carrier, "info");
    addLog("Otimizando rota: Testando latência dos servidores...", "warning");
    await new Promise((r) => setTimeout(r, 1e3));
    let fastest = SERVERS[0];
    for (const server of SERVERS) {
      if (!scanningRef.current) {
        setScanPhase("idle");
        return;
      }
      addLog(`Ping [${server.name}]... ${server.latency}ms`, "info");
      if (server.latency < fastest.latency) {
        fastest = server;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    setSelectedServer(fastest);
    addLog(`Melhor servidor identificado: ${fastest.name} (${fastest.latency}ms)`, "success");
    await new Promise((r) => setTimeout(r, 800));
    setScanPhase("connecting");
    addLog("Configurações avançadas carregadas.", "info");
    let connected = false;
    let attempt = 1;
    while (!connected && attempt <= 10 && scanningRef.current) {
      const currentSni = advancedConfig.sni || SNIS[Math.floor(Math.random() * SNIS.length)];
      addLog(`Tentativa #${attempt}: Abrindo socket TCP/IP...`, "info");
      addLog(`Handshake TLS 1.3 iniciado com ${currentSni}...`, "warning");
      setScanProgress(attempt / 10 * 100);
      await new Promise((r) => setTimeout(r, 1500));
      if (!scanningRef.current) break;
      if (Math.random() > 0.6 || attempt === 3) {
        addLog(`Conexão estabelecida! Iniciando tunelamento ${advancedConfig.protocol}...`, "success");
        addLog(`Injetando Payload: ${advancedConfig.payload.substring(0, 20)}...`, "info");
        await new Promise((r) => setTimeout(r, 800));
        if (!scanningRef.current) break;
        addLog(`Encapsulamento de pacotes ativo (MTU: ${advancedConfig.mtu} bytes).`, "success");
        addLog(`Criptografia AES-256-GCM habilitada.`, "info");
        addLog(`VPN Tunelada com sucesso via ${stats.carrier}!`, "success");
        connected = true;
        setIsVpnActive(true);
        setStats((prev) => ({ ...prev, status: "connected" }));
      } else {
        addLog(`Erro de Protocolo: Resposta inesperada do Proxy (403 Forbidden).`, "error");
        attempt++;
      }
      if (!connected && attempt > 10 && scanningRef.current) {
        addLog("Escâner finalizado: Nenhum host vulnerável encontrado.", "error");
        setIsScanning(false);
        scanningRef.current = false;
        setStats((prev) => ({ ...prev, status: "disconnected" }));
      }
    }
    setIsScanning(false);
    setScanPhase("idle");
    scanningRef.current = false;
    setScanProgress(0);
  };
  const stopScan = () => {
    setIsScanning(false);
    setScanPhase("idle");
    scanningRef.current = false;
    setIsVpnActive(false);
    setStats((prev) => ({ ...prev, status: "disconnected" }));
    addLog("Conexão interrompida pelo usuário.", "warning");
  };
  const downloadProjectZip = async () => {
    setIsZipping(true);
    addLog("Iniciando empacotamento do projeto...", "info");
    try {
      const zip = new JSZip();
      const files = [
        "package.json",
        "src/App.tsx",
        "src/main.tsx",
        "src/index.css",
        "index.html",
        "public/manifest.json",
        "public/sw.js",
        "vite.config.ts",
        "tsconfig.json",
        "metadata.json",
        ".env.example",
        ".gitignore"
      ];
      for (const file of files) {
        try {
          const response = await fetch(`/${file}`);
          if (response.ok) {
            const content2 = await response.text();
            zip.file(file, content2);
          }
        } catch (e) {
          console.error(`Erro ao baixar ${file}:`, e);
        }
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "emforma_project_source.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      addLog("Projeto empacotado e download iniciado!", "success");
    } catch (error) {
      addLog("Erro ao gerar ZIP do projeto.", "error");
      console.error(error);
    } finally {
      setIsZipping(false);
    }
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "min-h-screen p-4 md:p-6 flex flex-col gap-4 max-w-7xl mx-auto font-sans text-zinc-200", children: [
    /* @__PURE__ */ jsxDEV("header", { className: "flex justify-between items-center glass rounded-2xl px-6 py-4 border-white/5", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/30", children: /* @__PURE__ */ jsxDEV(Zap, { className: "text-cyan-400 w-6 h-6" }, void 0, false, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 308,
          columnNumber: 13
        }, this) }, void 0, false, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 307,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("h1", { className: "text-lg font-bold tracking-tight text-white", children: [
            "emforma ",
            /* @__PURE__ */ jsxDEV("span", { className: "text-cyan-400", children: "4G Pro" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 311,
              columnNumber: 81
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 311,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 313,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-zinc-500 uppercase tracking-widest font-mono", children: "Engine v4.0.1 - Advanced Injector" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 314,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 312,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 310,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 306,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-6", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "hidden md:flex flex-col items-end", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-zinc-500 uppercase font-mono", children: [
            "Sinal ",
            stats.carrier
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 321,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex gap-0.5 items-end h-3", children: [1, 2, 3, 4, 5].map((i) => /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: cn(
                "w-1 rounded-t-sm transition-all",
                i <= 4 ? "bg-cyan-500" : "bg-zinc-800"
              ),
              style: { height: `${i * 20}%` }
            },
            i,
            false,
            {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 324,
              columnNumber: 17
            },
            this
          )) }, void 0, false, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 322,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 320,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "h-8 w-px bg-zinc-800" }, void 0, false, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 335,
          columnNumber: 11
        }, this),
        !isVpnActive && !isScanning && /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: startAutoScan,
            className: "flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black rounded-xl text-xs font-bold hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 active:scale-95",
            children: [
              /* @__PURE__ */ jsxDEV(ShieldCheck, { className: "w-4 h-4" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 341,
                columnNumber: 15
              }, this),
              "Conectar"
            ]
          },
          void 0,
          true,
          {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 337,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setShowAdvancedMenu(true),
            className: "p-2 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10",
            children: /* @__PURE__ */ jsxDEV(Sliders, { className: "w-5 h-5 text-zinc-400" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 349,
              columnNumber: 13
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 345,
            columnNumber: 11
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 319,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/App.tsx",
      lineNumber: 305,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("main", { className: "grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "lg:col-span-4 flex flex-col gap-4", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "glass rounded-3xl p-6 flex flex-col gap-6 relative overflow-hidden border-white/5", children: [
          isScanning && /* @__PURE__ */ jsxDEV(
            motion.div,
            {
              initial: { x: "-100%" },
              animate: { x: "100%" },
              transition: { duration: 2, repeat: Infinity, ease: "linear" },
              className: "absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 363,
              columnNumber: 15
            },
            this
          ),
          /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between items-center", children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setShowServerMenu(true),
                className: "p-3 bg-zinc-900/50 rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-all flex items-center gap-3",
                children: [
                  /* @__PURE__ */ jsxDEV(Server, { className: "w-6 h-6 text-cyan-400" }, void 0, false, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 376,
                    columnNumber: 17
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { className: "text-left", children: [
                    /* @__PURE__ */ jsxDEV("span", { className: "text-[8px] text-zinc-500 uppercase font-mono block", children: "Mudar Servidor" }, void 0, false, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 378,
                      columnNumber: 19
                    }, this),
                    /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold text-white truncate max-w-[100px] block", children: selectedServer.name }, void 0, false, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 379,
                      columnNumber: 19
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 377,
                    columnNumber: 17
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 372,
                columnNumber: 15
              },
              this
            ),
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-end gap-2", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-zinc-500 uppercase font-mono", children: "VPN" }, void 0, false, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 385,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: isVpnActive || isScanning ? stopScan : startAutoScan,
                    className: cn(
                      "w-12 h-6 rounded-full p-1 transition-all duration-300 relative",
                      isVpnActive || isScanning ? "bg-cyan-500 shadow-[0_0_10px_rgba(0,242,255,0.4)]" : "bg-zinc-800"
                    ),
                    children: /* @__PURE__ */ jsxDEV(
                      motion.div,
                      {
                        animate: { x: isVpnActive || isScanning ? 24 : 0 },
                        transition: { type: "spring", stiffness: 500, damping: 30 },
                        className: "w-4 h-4 bg-white rounded-full shadow-md"
                      },
                      void 0,
                      false,
                      {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 393,
                        columnNumber: 21
                      },
                      this
                    )
                  },
                  void 0,
                  false,
                  {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 386,
                    columnNumber: 19
                  },
                  this
                )
              ] }, void 0, true, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 384,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "text-right", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "text-[8px] text-zinc-500 uppercase font-mono block", children: "Carga do Server" }, void 0, false, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 401,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: cn(
                  "text-[10px] font-bold",
                  selectedServer.load > 80 ? "text-rose-500" : selectedServer.load > 50 ? "text-amber-500" : "text-emerald-500"
                ), children: [
                  selectedServer.load,
                  "%"
                ] }, void 0, true, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 402,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 400,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 383,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 371,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center py-4", children: /* @__PURE__ */ jsxDEV("div", { className: "relative", children: [
            /* @__PURE__ */ jsxDEV(
              motion.div,
              {
                animate: {
                  scale: isVpnActive ? [1, 1.08, 1] : 1,
                  rotate: isVpnActive ? 360 : 0
                },
                transition: {
                  scale: { duration: 3, repeat: Infinity },
                  rotate: { duration: 30, repeat: Infinity, ease: "linear" }
                },
                className: cn(
                  "w-44 h-44 rounded-full border-2 flex items-center justify-center transition-all duration-700",
                  isVpnActive ? "border-cyan-500 shadow-[0_0_40px_rgba(0,242,255,0.2)]" : "border-zinc-800"
                ),
                children: /* @__PURE__ */ jsxDEV("div", { className: cn(
                  "w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-700",
                  isVpnActive ? "bg-cyan-500/5" : "bg-zinc-900/50"
                ), children: [
                  isVpnActive ? /* @__PURE__ */ jsxDEV(ShieldCheck, { className: "w-16 h-16 text-cyan-400 mb-2" }, void 0, false, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 431,
                    columnNumber: 23
                  }, this) : /* @__PURE__ */ jsxDEV(Shield, { className: "w-16 h-16 text-zinc-700 mb-2" }, void 0, false, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 433,
                    columnNumber: 23
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { className: cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    isVpnActive ? "text-cyan-400" : "text-zinc-600"
                  ), children: isVpnActive ? "Protegido" : "Inativo" }, void 0, false, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 435,
                    columnNumber: 21
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 426,
                  columnNumber: 19
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 412,
                columnNumber: 17
              },
              this
            ),
            isScanning && /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV("div", { className: "w-52 h-52 rounded-full border border-cyan-500/20 animate-ping" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 446,
              columnNumber: 21
            }, this) }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 445,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 411,
            columnNumber: 15
          }, this) }, void 0, false, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 410,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-3", children: /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: isVpnActive || isScanning ? stopScan : startAutoScan,
              className: cn(
                "w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group",
                isVpnActive ? "bg-zinc-800 text-white border border-white/10" : "bg-cyan-500 text-black hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
              ),
              children: isScanning ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
                /* @__PURE__ */ jsxDEV(Square, { className: "w-5 h-5 fill-current" }, void 0, false, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 464,
                  columnNumber: 21
                }, this),
                /* @__PURE__ */ jsxDEV("span", { children: scanPhase === "selecting" ? "Otimizando Rota..." : "Parar Escâner" }, void 0, false, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 465,
                  columnNumber: 21
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 463,
                columnNumber: 19
              }, this) : isVpnActive ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
                /* @__PURE__ */ jsxDEV(RefreshCw, { className: "w-5 h-5" }, void 0, false, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 469,
                  columnNumber: 21
                }, this),
                /* @__PURE__ */ jsxDEV("span", { children: "Desconectar" }, void 0, false, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 470,
                  columnNumber: 21
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 468,
                columnNumber: 19
              }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
                /* @__PURE__ */ jsxDEV(Play, { className: "w-5 h-5 fill-current" }, void 0, false, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 474,
                  columnNumber: 21
                }, this),
                /* @__PURE__ */ jsxDEV("span", { children: "Iniciar Conexão" }, void 0, false, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 475,
                  columnNumber: 21
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 473,
                columnNumber: 19
              }, this)
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 453,
              columnNumber: 15
            },
            this
          ) }, void 0, false, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 452,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 361,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "glass rounded-3xl p-5 flex flex-col gap-4 border-white/5", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-1", children: [
            /* @__PURE__ */ jsxDEV(Radio, { className: "w-4 h-4 text-cyan-400" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 485,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("h3", { className: "text-xs font-bold uppercase tracking-wider text-zinc-400", children: "Operadora de Rede" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 486,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 484,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-3 gap-2", children: CARRIERS.map((carrier) => /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => handleCarrierChange(carrier),
              className: cn(
                "py-2.5 rounded-xl text-[10px] font-bold transition-all border",
                stats.carrier === carrier ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" : "bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/10"
              ),
              children: carrier
            },
            carrier,
            false,
            {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 491,
              columnNumber: 17
            },
            this
          )) }, void 0, false, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 489,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 483,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "glass rounded-3xl p-5 flex flex-col gap-4 border-white/5", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-1", children: [
            /* @__PURE__ */ jsxDEV(Signal, { className: "w-4 h-4 text-cyan-400" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 510,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("h3", { className: "text-xs font-bold uppercase tracking-wider text-zinc-400", children: "Tipo de Conexão" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 511,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 509,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-4 gap-2", children: CONNECTION_TYPES.map((type) => /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => handleConnectionTypeChange(type),
              className: cn(
                "py-2.5 rounded-xl text-[10px] font-bold transition-all border",
                stats.connectionType === type ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" : "bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/10"
              ),
              children: type
            },
            type,
            false,
            {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 516,
              columnNumber: 17
            },
            this
          )) }, void 0, false, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 514,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 508,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "glass rounded-3xl p-5 flex flex-col gap-4 border-white/5", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-1", children: [
            /* @__PURE__ */ jsxDEV(Database, { className: "w-4 h-4 text-cyan-400" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 535,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("h3", { className: "text-xs font-bold uppercase tracking-wider text-zinc-400", children: "Métodos de Injeção" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 536,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 534,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("label", { className: "text-[10px] text-zinc-500 uppercase mb-1.5 block ml-1", children: "Payload Method" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 541,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV(
                "select",
                {
                  className: "w-full bg-zinc-900/80 border border-white/5 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500/50 transition-colors",
                  value: selectedPayload,
                  onChange: (e) => setSelectedPayload(Number(e.target.value)),
                  children: [
                    /* @__PURE__ */ jsxDEV("option", { value: 0, children: "HTTP Custom Injector" }, void 0, false, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 547,
                      columnNumber: 19
                    }, this),
                    /* @__PURE__ */ jsxDEV("option", { value: 1, children: "SSL/TLS Handshake" }, void 0, false, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 548,
                      columnNumber: 19
                    }, this),
                    /* @__PURE__ */ jsxDEV("option", { value: 2, children: "Direct Proxy Tunnel" }, void 0, false, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 549,
                      columnNumber: 19
                    }, this)
                  ]
                },
                void 0,
                true,
                {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 542,
                  columnNumber: 17
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 540,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("label", { className: "text-[10px] text-zinc-500 uppercase mb-1.5 block ml-1", children: "SNI Hostname" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 554,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV(
                "select",
                {
                  className: "w-full bg-zinc-900/80 border border-white/5 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500/50 transition-colors",
                  value: selectedSni,
                  onChange: (e) => setSelectedSni(Number(e.target.value)),
                  children: SNIS.map((sni, idx) => /* @__PURE__ */ jsxDEV("option", { value: idx, children: sni }, idx, false, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 561,
                    columnNumber: 21
                  }, this))
                },
                void 0,
                false,
                {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 555,
                  columnNumber: 17
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 553,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 539,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 533,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 358,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "lg:col-span-8 flex flex-col gap-4", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "glass rounded-2xl p-4 border-white/5", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 text-zinc-500 mb-1", children: [
              /* @__PURE__ */ jsxDEV(Signal, { className: "w-3 h-3" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 576,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] font-mono uppercase", children: "Sinal" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 577,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 575,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-lg font-bold font-mono text-white", children: [
              stats.signalStrength,
              " ",
              /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-zinc-500", children: "dBm" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 579,
                columnNumber: 94
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 579,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 574,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "glass rounded-2xl p-4 border-white/5", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 text-zinc-500 mb-1", children: [
              /* @__PURE__ */ jsxDEV(Zap, { className: "w-3 h-3" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 583,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] font-mono uppercase", children: "Ping" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 584,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 582,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-lg font-bold font-mono text-white", children: [
              stats.latency || "--",
              " ",
              /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-zinc-500", children: "ms" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 586,
                columnNumber: 95
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 586,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 581,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "glass rounded-2xl p-4 border-white/5", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 text-zinc-500 mb-1", children: [
              /* @__PURE__ */ jsxDEV(Globe, { className: "w-3 h-3" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 590,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] font-mono uppercase", children: "Rede" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 591,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 589,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-sm font-bold text-white truncate", children: [
              stats.connectionType,
              " / ",
              stats.carrier
            ] }, void 0, true, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 593,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 588,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "glass rounded-2xl p-4 border-white/5", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 text-zinc-500 mb-1", children: [
              /* @__PURE__ */ jsxDEV(Lock, { className: "w-3 h-3" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 597,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] font-mono uppercase", children: "IP" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 598,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 596,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-sm font-bold text-cyan-400 font-mono truncate", children: stats.ip }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 600,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 595,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 573,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "glass rounded-3xl p-5 flex-1 flex flex-col min-h-[400px] border-white/5 relative overflow-hidden", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between items-center mb-4", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxDEV(Terminal, { className: "text-cyan-400 w-4 h-4" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 608,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("h3", { className: "text-xs font-bold uppercase tracking-wider", children: "Log de Conexão em Tempo Real" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 609,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 607,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "w-2 h-2 rounded-full bg-red-500/20" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 612,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "w-2 h-2 rounded-full bg-yellow-500/20" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 613,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "w-2 h-2 rounded-full bg-green-500/20" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 614,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 611,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 606,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex-1 bg-black/40 rounded-2xl p-4 font-mono text-[11px] overflow-y-auto custom-scrollbar border border-white/5", children: /* @__PURE__ */ jsxDEV("div", { className: "space-y-1.5", children: [
            logs.length === 0 && /* @__PURE__ */ jsxDEV("div", { className: "text-zinc-600 italic", children: "Aguardando início da conexão..." }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 621,
              columnNumber: 19
            }, this),
            logs.map((log) => /* @__PURE__ */ jsxDEV("div", { className: "flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300", children: [
              /* @__PURE__ */ jsxDEV("span", { className: "text-zinc-600 shrink-0", children: [
                "[",
                log.timestamp,
                "]"
              ] }, void 0, true, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 625,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: cn(
                "break-all",
                log.type === "success" && "text-emerald-400",
                log.type === "error" && "text-rose-400",
                log.type === "warning" && "text-amber-400",
                log.type === "info" && "text-cyan-400"
              ), children: log.message }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 626,
                columnNumber: 21
              }, this)
            ] }, log.id, true, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 624,
              columnNumber: 19
            }, this)),
            /* @__PURE__ */ jsxDEV("div", { ref: logEndRef }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 637,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 619,
            columnNumber: 15
          }, this) }, void 0, false, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 618,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV(AnimatePresence, { children: isScanning && /* @__PURE__ */ jsxDEV(
            motion.div,
            {
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: 10 },
              className: "absolute bottom-8 left-8 right-8",
              children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between text-[9px] uppercase font-mono mb-1.5 text-cyan-400", children: [
                  /* @__PURE__ */ jsxDEV("span", { children: "Escaneando Hosts Vulneráveis..." }, void 0, false, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 650,
                    columnNumber: 21
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: [
                    Math.round(scanProgress),
                    "%"
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 651,
                    columnNumber: 21
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 649,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "h-1 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5", children: /* @__PURE__ */ jsxDEV(
                  motion.div,
                  {
                    className: "h-full bg-cyan-500 shadow-[0_0_10px_rgba(0,242,255,0.5)]",
                    initial: { width: 0 },
                    animate: { width: `${scanProgress}%` }
                  },
                  void 0,
                  false,
                  {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 654,
                    columnNumber: 21
                  },
                  this
                ) }, void 0, false, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 653,
                  columnNumber: 19
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 643,
              columnNumber: 17
            },
            this
          ) }, void 0, false, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 641,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 605,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "glass rounded-3xl p-5 border-white/5", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between items-center mb-4", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxDEV(Activity, { className: "text-cyan-400 w-4 h-4" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 669,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("h3", { className: "text-xs font-bold uppercase tracking-wider", children: "Monitor de Tráfego" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 670,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 668,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex gap-4 text-[9px] font-mono", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "w-1.5 h-1.5 rounded-full bg-cyan-500" }, void 0, false, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 674,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-zinc-400", children: [
                  "DL: ",
                  stats.download.toFixed(1),
                  " Mbps"
                ] }, void 0, true, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 675,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 673,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "w-1.5 h-1.5 rounded-full bg-zinc-600" }, void 0, false, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 678,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-zinc-400", children: [
                  "UL: ",
                  stats.upload.toFixed(1),
                  " Mbps"
                ] }, void 0, true, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 679,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 677,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 672,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 667,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "h-32 w-full", children: /* @__PURE__ */ jsxDEV(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxDEV(AreaChart, { data: history, children: [
            /* @__PURE__ */ jsxDEV("defs", { children: [
              /* @__PURE__ */ jsxDEV("linearGradient", { id: "colorDownload", x1: "0", y1: "0", x2: "0", y2: "1", children: [
                /* @__PURE__ */ jsxDEV("stop", { offset: "5%", stopColor: "#00f2ff", stopOpacity: 0.3 }, void 0, false, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 688,
                  columnNumber: 23
                }, this),
                /* @__PURE__ */ jsxDEV("stop", { offset: "95%", stopColor: "#00f2ff", stopOpacity: 0 }, void 0, false, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 689,
                  columnNumber: 23
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 687,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("linearGradient", { id: "colorUpload", x1: "0", y1: "0", x2: "0", y2: "1", children: [
                /* @__PURE__ */ jsxDEV("stop", { offset: "5%", stopColor: "#71717a", stopOpacity: 0.3 }, void 0, false, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 692,
                  columnNumber: 23
                }, this),
                /* @__PURE__ */ jsxDEV("stop", { offset: "95%", stopColor: "#71717a", stopOpacity: 0 }, void 0, false, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 693,
                  columnNumber: 23
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 691,
                columnNumber: 21
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 686,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV(
              Area,
              {
                type: "monotone",
                dataKey: "download",
                stroke: "#00f2ff",
                strokeWidth: 2,
                fillOpacity: 1,
                fill: "url(#colorDownload)",
                isAnimationActive: false
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 696,
                columnNumber: 19
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              Area,
              {
                type: "monotone",
                dataKey: "upload",
                stroke: "#71717a",
                strokeWidth: 2,
                fillOpacity: 1,
                fill: "url(#colorUpload)",
                isAnimationActive: false
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 705,
                columnNumber: 19
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 685,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 684,
            columnNumber: 15
          }, this) }, void 0, false, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 683,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 666,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 570,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/App.tsx",
      lineNumber: 355,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(AnimatePresence, { children: showAdvancedMenu && /* @__PURE__ */ jsxDEV(
      motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm",
        children: /* @__PURE__ */ jsxDEV(
          motion.div,
          {
            initial: { scale: 0.9, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            exit: { scale: 0.9, opacity: 0 },
            className: "glass w-full max-w-2xl rounded-3xl overflow-hidden border-white/10 shadow-2xl flex flex-col max-h-[90vh]",
            children: [
              /* @__PURE__ */ jsxDEV("div", { className: "px-8 py-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
                  /* @__PURE__ */ jsxDEV(Sliders, { className: "text-cyan-400 w-6 h-6" }, void 0, false, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 738,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { children: [
                    /* @__PURE__ */ jsxDEV("h2", { className: "text-xl font-bold text-white", children: "Menu Avançado" }, void 0, false, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 740,
                      columnNumber: 21
                    }, this),
                    /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-zinc-500 uppercase tracking-widest font-mono", children: "Configurações do Core" }, void 0, false, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 741,
                      columnNumber: 21
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 739,
                    columnNumber: 19
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 737,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: () => setShowAdvancedMenu(false),
                    className: "p-2 rounded-full hover:bg-white/5 transition-colors",
                    children: /* @__PURE__ */ jsxDEV(X, { className: "w-6 h-6 text-zinc-400" }, void 0, false, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 748,
                      columnNumber: 19
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 744,
                    columnNumber: 17
                  },
                  this
                )
              ] }, void 0, true, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 736,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar", children: [
                /* @__PURE__ */ jsxDEV("section", { className: "space-y-4", children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsxDEV(Terminal, { className: "w-4 h-4 text-cyan-400" }, void 0, false, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 756,
                      columnNumber: 21
                    }, this),
                    /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-bold uppercase tracking-wider", children: "Custom Payload" }, void 0, false, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 757,
                      columnNumber: 21
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 755,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV(
                    "textarea",
                    {
                      className: "w-full bg-black/40 border border-white/5 rounded-2xl p-4 font-mono text-xs outline-none focus:border-cyan-500/50 transition-colors h-24 resize-none",
                      value: advancedConfig.payload,
                      onChange: (e) => setAdvancedConfig({ ...advancedConfig, payload: e.target.value }),
                      placeholder: "Insira seu payload aqui..."
                    },
                    void 0,
                    false,
                    {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 759,
                      columnNumber: 19
                    },
                    this
                  )
                ] }, void 0, true, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 754,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-8", children: [
                  /* @__PURE__ */ jsxDEV("section", { className: "space-y-4", children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxDEV(Shield, { className: "w-4 h-4 text-cyan-400" }, void 0, false, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 771,
                        columnNumber: 23
                      }, this),
                      /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-bold uppercase tracking-wider", children: "Protocolo VPN" }, void 0, false, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 772,
                        columnNumber: 23
                      }, this)
                    ] }, void 0, true, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 770,
                      columnNumber: 21
                    }, this),
                    /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 gap-2", children: PROTOCOLS.map((proto) => /* @__PURE__ */ jsxDEV(
                      "button",
                      {
                        onClick: () => setAdvancedConfig({ ...advancedConfig, protocol: proto }),
                        className: cn(
                          "py-2.5 rounded-xl text-[10px] font-bold transition-all border",
                          advancedConfig.protocol === proto ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" : "bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/10"
                        ),
                        children: proto
                      },
                      proto,
                      false,
                      {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 776,
                        columnNumber: 25
                      },
                      this
                    )) }, void 0, false, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 774,
                      columnNumber: 21
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 769,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("section", { className: "space-y-4", children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxDEV(Globe, { className: "w-4 h-4 text-cyan-400" }, void 0, false, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 795,
                        columnNumber: 23
                      }, this),
                      /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-bold uppercase tracking-wider", children: "Custom SNI" }, void 0, false, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 796,
                        columnNumber: 23
                      }, this)
                    ] }, void 0, true, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 794,
                      columnNumber: 21
                    }, this),
                    /* @__PURE__ */ jsxDEV(
                      "input",
                      {
                        type: "text",
                        className: "w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-mono text-xs outline-none focus:border-cyan-500/50 transition-colors",
                        value: advancedConfig.sni,
                        onChange: (e) => setAdvancedConfig({ ...advancedConfig, sni: e.target.value }),
                        placeholder: "ex: m.facebook.com"
                      },
                      void 0,
                      false,
                      {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 798,
                        columnNumber: 21
                      },
                      this
                    )
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 793,
                    columnNumber: 19
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 767,
                  columnNumber: 15
                }, this),
                /* @__PURE__ */ jsxDEV("section", { className: "space-y-4", children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsxDEV(Search, { className: "w-4 h-4 text-cyan-400" }, void 0, false, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 811,
                      columnNumber: 21
                    }, this),
                    /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-bold uppercase tracking-wider", children: "DNS Customizado" }, void 0, false, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 812,
                      columnNumber: 21
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 810,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 gap-4", children: [
                    /* @__PURE__ */ jsxDEV(
                      "input",
                      {
                        type: "text",
                        className: "w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-mono text-xs outline-none focus:border-cyan-500/50 transition-colors",
                        value: advancedConfig.dnsPrimary,
                        onChange: (e) => setAdvancedConfig({ ...advancedConfig, dnsPrimary: e.target.value }),
                        placeholder: "Primário"
                      },
                      void 0,
                      false,
                      {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 815,
                        columnNumber: 21
                      },
                      this
                    ),
                    /* @__PURE__ */ jsxDEV(
                      "input",
                      {
                        type: "text",
                        className: "w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-mono text-xs outline-none focus:border-cyan-500/50 transition-colors",
                        value: advancedConfig.dnsSecondary,
                        onChange: (e) => setAdvancedConfig({ ...advancedConfig, dnsSecondary: e.target.value }),
                        placeholder: "Secundário"
                      },
                      void 0,
                      false,
                      {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 822,
                        columnNumber: 21
                      },
                      this
                    )
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 814,
                    columnNumber: 19
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 809,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("section", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: () => setAdvancedConfig({ ...advancedConfig, udpForwarding: !advancedConfig.udpForwarding }),
                      className: "flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all",
                      children: [
                        /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-start", children: [
                          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold", children: "UDP Forwarding" }, void 0, false, {
                            fileName: "/app/applet/src/App.tsx",
                            lineNumber: 839,
                            columnNumber: 23
                          }, this),
                          /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-zinc-500", children: "Melhora performance em jogos" }, void 0, false, {
                            fileName: "/app/applet/src/App.tsx",
                            lineNumber: 840,
                            columnNumber: 23
                          }, this)
                        ] }, void 0, true, {
                          fileName: "/app/applet/src/App.tsx",
                          lineNumber: 838,
                          columnNumber: 21
                        }, this),
                        advancedConfig.udpForwarding ? /* @__PURE__ */ jsxDEV(ToggleRight, { className: "text-cyan-400 w-8 h-8" }, void 0, false, {
                          fileName: "/app/applet/src/App.tsx",
                          lineNumber: 842,
                          columnNumber: 53
                        }, this) : /* @__PURE__ */ jsxDEV(ToggleLeft, { className: "text-zinc-600 w-8 h-8" }, void 0, false, {
                          fileName: "/app/applet/src/App.tsx",
                          lineNumber: 842,
                          columnNumber: 105
                        }, this)
                      ]
                    },
                    void 0,
                    true,
                    {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 834,
                      columnNumber: 19
                    },
                    this
                  ),
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: () => setAdvancedConfig({ ...advancedConfig, compression: !advancedConfig.compression }),
                      className: "flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all",
                      children: [
                        /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-start", children: [
                          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold", children: "Compressão de Dados" }, void 0, false, {
                            fileName: "/app/applet/src/App.tsx",
                            lineNumber: 850,
                            columnNumber: 23
                          }, this),
                          /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-zinc-500", children: "Economiza dados móveis" }, void 0, false, {
                            fileName: "/app/applet/src/App.tsx",
                            lineNumber: 851,
                            columnNumber: 23
                          }, this)
                        ] }, void 0, true, {
                          fileName: "/app/applet/src/App.tsx",
                          lineNumber: 849,
                          columnNumber: 21
                        }, this),
                        advancedConfig.compression ? /* @__PURE__ */ jsxDEV(ToggleRight, { className: "text-cyan-400 w-8 h-8" }, void 0, false, {
                          fileName: "/app/applet/src/App.tsx",
                          lineNumber: 853,
                          columnNumber: 51
                        }, this) : /* @__PURE__ */ jsxDEV(ToggleLeft, { className: "text-zinc-600 w-8 h-8" }, void 0, false, {
                          fileName: "/app/applet/src/App.tsx",
                          lineNumber: 853,
                          columnNumber: 103
                        }, this)
                      ]
                    },
                    void 0,
                    true,
                    {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 845,
                      columnNumber: 19
                    },
                    this
                  ),
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      className: "flex items-center justify-between p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 transition-all",
                      children: [
                        /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-start", children: [
                          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold text-rose-400", children: "Kill Switch" }, void 0, false, {
                            fileName: "/app/applet/src/App.tsx",
                            lineNumber: 860,
                            columnNumber: 23
                          }, this),
                          /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-rose-500/70", children: "Bloqueia internet se VPN cair" }, void 0, false, {
                            fileName: "/app/applet/src/App.tsx",
                            lineNumber: 861,
                            columnNumber: 23
                          }, this)
                        ] }, void 0, true, {
                          fileName: "/app/applet/src/App.tsx",
                          lineNumber: 859,
                          columnNumber: 21
                        }, this),
                        /* @__PURE__ */ jsxDEV(ToggleRight, { className: "text-rose-500 w-8 h-8" }, void 0, false, {
                          fileName: "/app/applet/src/App.tsx",
                          lineNumber: 863,
                          columnNumber: 21
                        }, this)
                      ]
                    },
                    void 0,
                    true,
                    {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 856,
                      columnNumber: 19
                    },
                    this
                  )
                ] }, void 0, true, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 833,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 752,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "p-8 bg-zinc-900/80 border-t border-white/5 flex flex-col gap-3", children: [
                /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: installPWA,
                    disabled: isInstalled,
                    className: cn(
                      "w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95",
                      isInstalled ? "bg-zinc-800 text-zinc-500 cursor-default" : "bg-cyan-500 text-black hover:bg-cyan-400 shadow-cyan-500/20"
                    ),
                    children: [
                      /* @__PURE__ */ jsxDEV(ShieldCheck, { className: "w-5 h-5" }, void 0, false, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 879,
                        columnNumber: 19
                      }, this),
                      isInstalled ? "Aplicativo Já Instalado" : "Instalar Aplicativo Oficial (PWA)"
                    ]
                  },
                  void 0,
                  true,
                  {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 869,
                    columnNumber: 17
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV("div", { className: "relative", children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex items-center", "aria-hidden": "true", children: /* @__PURE__ */ jsxDEV("div", { className: "w-full border-t border-white/5" }, void 0, false, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 885,
                    columnNumber: 21
                  }, this) }, void 0, false, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 884,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { className: "relative flex justify-center text-[10px] uppercase tracking-widest text-zinc-600", children: /* @__PURE__ */ jsxDEV("span", { className: "bg-zinc-900 px-2", children: "Ou Experimental" }, void 0, false, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 888,
                    columnNumber: 21
                  }, this) }, void 0, false, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 887,
                    columnNumber: 19
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 883,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    disabled: isDownloading,
                    onClick: () => {
                      setIsDownloading(true);
                      setDownloadProgress(0);
                      addLog("AVISO: O APK é uma simulação de interface.", "warning");
                      addLog("Preparando ambiente de compilação...", "info");
                      const blob = new Blob(["emforma 4G Pro - Versão Mobile (Simulada)"], { type: "application/vnd.android.package-archive" });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      const progressInterval = setInterval(() => {
                        setDownloadProgress((prev) => {
                          if (prev >= 100) {
                            clearInterval(progressInterval);
                            return 100;
                          }
                          return prev + 5;
                        });
                      }, 150);
                      setTimeout(() => {
                        addLog("Compilando binários do túnel VPN...", "info");
                      }, 1e3);
                      setTimeout(() => {
                        addLog("Assinando APK com certificado de produção...", "success");
                        a.href = url;
                        a.download = "emforma_Pro_v4.0.1.apk";
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        addLog("Download iniciado com sucesso!", "success");
                        setIsDownloading(false);
                        setDownloadProgress(0);
                      }, 3e3);
                    },
                    className: cn(
                      "w-full py-4 rounded-2xl bg-zinc-800 border border-white/10 text-zinc-100 font-bold text-sm hover:bg-zinc-700 transition-all flex items-center justify-center gap-3 active:scale-95 group relative overflow-hidden",
                      isDownloading && "opacity-80 cursor-not-allowed"
                    ),
                    children: [
                      isDownloading && /* @__PURE__ */ jsxDEV(
                        motion.div,
                        {
                          className: "absolute bottom-0 left-0 h-1 bg-cyan-500",
                          initial: { width: 0 },
                          animate: { width: `${downloadProgress}%` }
                        },
                        void 0,
                        false,
                        {
                          fileName: "/app/applet/src/App.tsx",
                          lineNumber: 936,
                          columnNumber: 21
                        },
                        this
                      ),
                      /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors", children: isDownloading ? /* @__PURE__ */ jsxDEV(RefreshCw, { className: "w-4 h-4 text-cyan-400 animate-spin" }, void 0, false, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 944,
                        columnNumber: 23
                      }, this) : /* @__PURE__ */ jsxDEV(Download, { className: "w-4 h-4 text-cyan-400" }, void 0, false, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 946,
                        columnNumber: 23
                      }, this) }, void 0, false, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 942,
                        columnNumber: 19
                      }, this),
                      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-start", children: [
                        /* @__PURE__ */ jsxDEV("span", { children: isDownloading ? "Compilando APK..." : "Baixar Aplicativo (.APK)" }, void 0, false, {
                          fileName: "/app/applet/src/App.tsx",
                          lineNumber: 950,
                          columnNumber: 21
                        }, this),
                        /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-zinc-500 font-normal", children: isDownloading ? `${Math.round(downloadProgress)}% concluído` : "Versão 4.0.1 - 12.4 MB" }, void 0, false, {
                          fileName: "/app/applet/src/App.tsx",
                          lineNumber: 951,
                          columnNumber: 21
                        }, this)
                      ] }, void 0, true, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 949,
                        columnNumber: 19
                      }, this)
                    ]
                  },
                  void 0,
                  true,
                  {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 892,
                    columnNumber: 17
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    disabled: isZipping,
                    onClick: downloadProjectZip,
                    className: cn(
                      "w-full py-4 rounded-2xl bg-zinc-800 border border-white/10 text-zinc-100 font-bold text-sm hover:bg-zinc-700 transition-all flex items-center justify-center gap-3 active:scale-95 group",
                      isZipping && "opacity-80 cursor-not-allowed"
                    ),
                    children: [
                      /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors", children: isZipping ? /* @__PURE__ */ jsxDEV(RefreshCw, { className: "w-4 h-4 text-amber-400 animate-spin" }, void 0, false, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 967,
                        columnNumber: 23
                      }, this) : /* @__PURE__ */ jsxDEV(Database, { className: "w-4 h-4 text-amber-400" }, void 0, false, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 969,
                        columnNumber: 23
                      }, this) }, void 0, false, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 965,
                        columnNumber: 19
                      }, this),
                      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-start", children: [
                        /* @__PURE__ */ jsxDEV("span", { children: isZipping ? "Empacotando..." : "Baixar Código Fonte (.ZIP)" }, void 0, false, {
                          fileName: "/app/applet/src/App.tsx",
                          lineNumber: 973,
                          columnNumber: 21
                        }, this),
                        /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-zinc-500 font-normal", children: "Arquivos do projeto completo" }, void 0, false, {
                          fileName: "/app/applet/src/App.tsx",
                          lineNumber: 974,
                          columnNumber: 21
                        }, this)
                      ] }, void 0, true, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 972,
                        columnNumber: 19
                      }, this)
                    ]
                  },
                  void 0,
                  true,
                  {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 957,
                    columnNumber: 17
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: () => setShowAdvancedMenu(false),
                    className: "w-full py-4 rounded-2xl bg-cyan-500 text-black font-bold text-lg hover:bg-cyan-400 transition-all flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/20",
                    children: [
                      /* @__PURE__ */ jsxDEV(Save, { className: "w-5 h-5" }, void 0, false, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 982,
                        columnNumber: 19
                      }, this),
                      "Salvar Configurações"
                    ]
                  },
                  void 0,
                  true,
                  {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 978,
                    columnNumber: 17
                  },
                  this
                )
              ] }, void 0, true, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 868,
                columnNumber: 15
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 730,
            columnNumber: 13
          },
          this
        )
      },
      void 0,
      false,
      {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 724,
        columnNumber: 11
      },
      this
    ) }, void 0, false, {
      fileName: "/app/applet/src/App.tsx",
      lineNumber: 722,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(AnimatePresence, { children: showServerMenu && /* @__PURE__ */ jsxDEV(
      motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm",
        children: /* @__PURE__ */ jsxDEV(
          motion.div,
          {
            initial: { scale: 0.9, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            exit: { scale: 0.9, opacity: 0 },
            className: "glass w-full max-w-md rounded-3xl overflow-hidden border-white/10 shadow-2xl flex flex-col max-h-[80vh]",
            children: [
              /* @__PURE__ */ jsxDEV("div", { className: "px-6 py-4 border-b border-white/5 flex justify-between items-center bg-zinc-900/50", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
                  /* @__PURE__ */ jsxDEV(Server, { className: "text-cyan-400 w-5 h-5" }, void 0, false, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 1008,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("h2", { className: "text-lg font-bold text-white", children: "Selecionar Servidor" }, void 0, false, {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 1009,
                    columnNumber: 19
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 1007,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: () => setShowServerMenu(false),
                    className: "p-2 rounded-full hover:bg-white/5 transition-colors",
                    children: /* @__PURE__ */ jsxDEV(X, { className: "w-5 h-5 text-zinc-400" }, void 0, false, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 1015,
                      columnNumber: 19
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/app/applet/src/App.tsx",
                    lineNumber: 1011,
                    columnNumber: 17
                  },
                  this
                )
              ] }, void 0, true, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 1006,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "p-4 border-b border-white/5", children: /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: selectFastestServer,
                  className: "w-full py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-cyan-500/20 transition-all",
                  children: [
                    /* @__PURE__ */ jsxDEV(Zap, { className: "w-4 h-4" }, void 0, false, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 1024,
                      columnNumber: 19
                    }, this),
                    "Selecionar Servidor Mais Rápido"
                  ]
                },
                void 0,
                true,
                {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 1020,
                  columnNumber: 17
                },
                this
              ) }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 1019,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar", children: SERVERS.map((server) => /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => {
                    setSelectedServer(server);
                    setShowServerMenu(false);
                    addLog(`Servidor alterado para: ${server.name}`, "info");
                  },
                  className: cn(
                    "w-full p-4 rounded-2xl flex items-center justify-between transition-all border",
                    selectedServer.id === server.id ? "bg-cyan-500/10 border-cyan-500/50" : "bg-white/5 border-transparent hover:border-white/10"
                  ),
                  children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-4", children: [
                      /* @__PURE__ */ jsxDEV("span", { className: "text-2xl", children: server.flag }, void 0, false, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 1046,
                        columnNumber: 23
                      }, this),
                      /* @__PURE__ */ jsxDEV("div", { className: "text-left", children: [
                        /* @__PURE__ */ jsxDEV("div", { className: "text-sm font-bold text-white", children: server.name }, void 0, false, {
                          fileName: "/app/applet/src/App.tsx",
                          lineNumber: 1048,
                          columnNumber: 25
                        }, this),
                        /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-zinc-500 font-mono", children: [
                          "Ping: ",
                          server.latency,
                          "ms"
                        ] }, void 0, true, {
                          fileName: "/app/applet/src/App.tsx",
                          lineNumber: 1049,
                          columnNumber: 25
                        }, this)
                      ] }, void 0, true, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 1047,
                        columnNumber: 23
                      }, this)
                    ] }, void 0, true, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 1045,
                      columnNumber: 21
                    }, this),
                    /* @__PURE__ */ jsxDEV("div", { className: "text-right", children: [
                      /* @__PURE__ */ jsxDEV("div", { className: cn(
                        "text-[10px] font-bold",
                        server.load > 80 ? "text-rose-500" : server.load > 50 ? "text-amber-500" : "text-emerald-500"
                      ), children: [
                        server.load,
                        "%"
                      ] }, void 0, true, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 1053,
                        columnNumber: 23
                      }, this),
                      /* @__PURE__ */ jsxDEV("div", { className: "text-[8px] text-zinc-600 uppercase", children: "Carga" }, void 0, false, {
                        fileName: "/app/applet/src/App.tsx",
                        lineNumber: 1057,
                        columnNumber: 23
                      }, this)
                    ] }, void 0, true, {
                      fileName: "/app/applet/src/App.tsx",
                      lineNumber: 1052,
                      columnNumber: 21
                    }, this)
                  ]
                },
                server.id,
                true,
                {
                  fileName: "/app/applet/src/App.tsx",
                  lineNumber: 1031,
                  columnNumber: 19
                },
                this
              )) }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 1029,
                columnNumber: 15
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 1e3,
            columnNumber: 13
          },
          this
        )
      },
      void 0,
      false,
      {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 994,
        columnNumber: 11
      },
      this
    ) }, void 0, false, {
      fileName: "/app/applet/src/App.tsx",
      lineNumber: 992,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("footer", { className: "flex justify-between items-center px-4 py-2 glass rounded-xl border-white/5 text-[9px] text-zinc-500 font-mono uppercase tracking-widest", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-6", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV("div", { className: cn("w-1.5 h-1.5 rounded-full", isVpnActive ? "bg-emerald-500" : "bg-zinc-700") }, void 0, false, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 1071,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: "Core: v4.0.1-stable" }, void 0, false, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 1072,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 1070,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-1.5 h-1.5 rounded-full bg-cyan-500" }, void 0, false, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 1075,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: "Region: SA-EAST-1" }, void 0, false, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 1076,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 1074,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 1069,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-6", children: [
        /* @__PURE__ */ jsxDEV("span", { children: [
          "MTU: ",
          advancedConfig.mtu
        ] }, void 0, true, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 1080,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: [
          "DNS: ",
          advancedConfig.dnsPrimary
        ] }, void 0, true, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 1081,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-zinc-400", children: "© emforma Labs 2026" }, void 0, false, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 1082,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 1079,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/App.tsx",
      lineNumber: 1068,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("style", { dangerouslySetInnerHTML: { __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      ` } }, void 0, false, {
      fileName: "/app/applet/src/App.tsx",
      lineNumber: 1086,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/app/applet/src/App.tsx",
    lineNumber: 303,
    columnNumber: 5
  }, this);
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkFwcC50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QsIHVzZVJlZiB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IG1vdGlvbiwgQW5pbWF0ZVByZXNlbmNlIH0gZnJvbSAnbW90aW9uL3JlYWN0JztcbmltcG9ydCB7IFxuICBTaGllbGQsIFxuICBTaGllbGRDaGVjaywgXG4gIEFjdGl2aXR5LCBcbiAgR2xvYmUsIFxuICBaYXAsIFxuICBMb2NrLCBcbiAgQ3B1LCBcbiAgV2lmaSwgXG4gIFJlZnJlc2hDdyxcbiAgQ2hldnJvblJpZ2h0LFxuICBTZXR0aW5ncyxcbiAgSW5mbyxcbiAgU2lnbmFsLFxuICBUZXJtaW5hbCxcbiAgUGxheSxcbiAgU3F1YXJlLFxuICBTZWFyY2gsXG4gIERhdGFiYXNlLFxuICBTZXJ2ZXIsXG4gIFgsXG4gIFNsaWRlcnMsXG4gIFJhZGlvLFxuICBUb2dnbGVMZWZ0LFxuICBUb2dnbGVSaWdodCxcbiAgU2F2ZSxcbiAgRG93bmxvYWRcbn0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB7IFxuICBBcmVhQ2hhcnQsIFxuICBBcmVhLCBcbiAgWEF4aXMsIFxuICBZQXhpcywgXG4gIENhcnRlc2lhbkdyaWQsIFxuICBUb29sdGlwLCBcbiAgUmVzcG9uc2l2ZUNvbnRhaW5lciBcbn0gZnJvbSAncmVjaGFydHMnO1xuaW1wb3J0IHsgdXNlTmV0d29ya1N0YXRzLCBTRVJWRVJTLCBDQVJSSUVSUywgQ09OTkVDVElPTl9UWVBFUyB9IGZyb20gJy4vaG9va3MvdXNlTmV0d29ya1N0YXRzJztcbmltcG9ydCB7IGNuIH0gZnJvbSAnLi9saWIvdXRpbHMnO1xuaW1wb3J0IEpTWmlwIGZyb20gJ2pzemlwJztcblxuY29uc3QgUFJPVE9DT0xTID0gWydTU0gnLCAnU1NMJywgJ1VEUCcsICdWMlJBWSddIGFzIGNvbnN0O1xuXG5jb25zdCBQQVlMT0FEUyA9IFtcbiAgXCJHRVQgLyBIVFRQLzEuMVtjcmxmXUhvc3Q6IFtob3N0XVtjcmxmXUNvbm5lY3Rpb246IEtlZXAtQWxpdmVbY3JsZl1bY3JsZl1cIixcbiAgXCJDT05ORUNUIFtob3N0XSBIVFRQLzEuMVtjcmxmXUhvc3Q6IFtob3N0XVtjcmxmXVByb3h5LUNvbm5lY3Rpb246IEtlZXAtQWxpdmVbY3JsZl1bY3JsZl1cIixcbiAgXCJQT1NUIGh0dHA6Ly9baG9zdF0vIEhUVFAvMS4xW2NybGZdSG9zdDogW2hvc3RdW2NybGZdQ29udGVudC1MZW5ndGg6IDk5OTk5OTk5OVtjcmxmXVtjcmxmXVwiXG5dO1xuXG5jb25zdCBTTklTID0gW1xuICBcImZhY2Vib29rLmNvbVwiLFxuICBcIndoYXRzYXBwLm5ldFwiLFxuICBcImluc3RhZ3JhbS5jb21cIixcbiAgXCJ0aWt0b2suY29tXCIsXG4gIFwiZ29vZ2xlLmNvbVwiXG5dO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBBcHAoKSB7XG4gIGNvbnN0IHsgXG4gICAgc3RhdHMsIFxuICAgIGhpc3RvcnksIFxuICAgIHNldFN0YXRzLCBcbiAgICBsb2dzLCBcbiAgICBhZGRMb2csIFxuICAgIHNldExvZ3MsIFxuICAgIGFkdmFuY2VkQ29uZmlnLCBcbiAgICBzZXRBZHZhbmNlZENvbmZpZyxcbiAgICBzZWxlY3RlZFNlcnZlcixcbiAgICBzZXRTZWxlY3RlZFNlcnZlcixcbiAgICBoYW5kbGVDYXJyaWVyQ2hhbmdlLFxuICAgIGhhbmRsZUNvbm5lY3Rpb25UeXBlQ2hhbmdlXG4gIH0gPSB1c2VOZXR3b3JrU3RhdHMoKTtcbiAgY29uc3QgW2lzVnBuQWN0aXZlLCBzZXRJc1ZwbkFjdGl2ZV0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFtpc1NjYW5uaW5nLCBzZXRJc1NjYW5uaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW3NjYW5QaGFzZSwgc2V0U2NhblBoYXNlXSA9IHVzZVN0YXRlPCdpZGxlJyB8ICdzZWxlY3RpbmcnIHwgJ2Nvbm5lY3RpbmcnPignaWRsZScpO1xuICBjb25zdCBbc2VsZWN0ZWRQYXlsb2FkLCBzZXRTZWxlY3RlZFBheWxvYWRdID0gdXNlU3RhdGUoMCk7XG4gIGNvbnN0IFtzZWxlY3RlZFNuaSwgc2V0U2VsZWN0ZWRTbmldID0gdXNlU3RhdGUoMCk7XG4gIGNvbnN0IFtzY2FuUHJvZ3Jlc3MsIHNldFNjYW5Qcm9ncmVzc10gPSB1c2VTdGF0ZSgwKTtcbiAgY29uc3QgW3Nob3dBZHZhbmNlZE1lbnUsIHNldFNob3dBZHZhbmNlZE1lbnVdID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbc2hvd1NlcnZlck1lbnUsIHNldFNob3dTZXJ2ZXJNZW51XSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2lzRG93bmxvYWRpbmcsIHNldElzRG93bmxvYWRpbmddID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbZG93bmxvYWRQcm9ncmVzcywgc2V0RG93bmxvYWRQcm9ncmVzc10gPSB1c2VTdGF0ZSgwKTtcbiAgY29uc3QgW2RlZmVycmVkUHJvbXB0LCBzZXREZWZlcnJlZFByb21wdF0gPSB1c2VTdGF0ZTxhbnk+KG51bGwpO1xuICBjb25zdCBbaXNJbnN0YWxsZWQsIHNldElzSW5zdGFsbGVkXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2lzWmlwcGluZywgc2V0SXNaaXBwaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3Qgc2Nhbm5pbmdSZWYgPSB1c2VSZWYoZmFsc2UpO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgaGFuZGxlQmVmb3JlSW5zdGFsbFByb21wdCA9IChlOiBhbnkpID0+IHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHNldERlZmVycmVkUHJvbXB0KGUpO1xuICAgIH07XG5cbiAgICBjb25zdCBoYW5kbGVBcHBJbnN0YWxsZWQgPSAoKSA9PiB7XG4gICAgICBzZXRJc0luc3RhbGxlZCh0cnVlKTtcbiAgICAgIHNldERlZmVycmVkUHJvbXB0KG51bGwpO1xuICAgICAgYWRkTG9nKFwiQXBsaWNhdGl2byBpbnN0YWxhZG8gY29tIHN1Y2Vzc28hXCIsIFwic3VjY2Vzc1wiKTtcbiAgICB9O1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2JlZm9yZWluc3RhbGxwcm9tcHQnLCBoYW5kbGVCZWZvcmVJbnN0YWxsUHJvbXB0KTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignYXBwaW5zdGFsbGVkJywgaGFuZGxlQXBwSW5zdGFsbGVkKTtcblxuICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW4gc3RhbmRhbG9uZSBtb2RlXG4gICAgaWYgKHdpbmRvdy5tYXRjaE1lZGlhKCcoZGlzcGxheS1tb2RlOiBzdGFuZGFsb25lKScpLm1hdGNoZXMgfHwgKHdpbmRvdy5uYXZpZ2F0b3IgYXMgYW55KS5zdGFuZGFsb25lKSB7XG4gICAgICBzZXRJc0luc3RhbGxlZCh0cnVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2JlZm9yZWluc3RhbGxwcm9tcHQnLCBoYW5kbGVCZWZvcmVJbnN0YWxsUHJvbXB0KTtcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdhcHBpbnN0YWxsZWQnLCBoYW5kbGVBcHBJbnN0YWxsZWQpO1xuICAgIH07XG4gIH0sIFtdKTtcblxuICBjb25zdCBpbnN0YWxsUFdBID0gYXN5bmMgKCkgPT4ge1xuICAgIGlmIChpc0luc3RhbGxlZCkge1xuICAgICAgYWRkTG9nKFwiTyBhcGxpY2F0aXZvIGrDoSBlc3TDoSBpbnN0YWxhZG8hXCIsIFwiaW5mb1wiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWRlZmVycmVkUHJvbXB0KSB7XG4gICAgICAvLyBDaGVjayBpZiBpdCdzIGlPU1xuICAgICAgY29uc3QgaXNJT1MgPSAvaVBhZHxpUGhvbmV8aVBvZC8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSAmJiAhKHdpbmRvdyBhcyBhbnkpLk1TU3RyZWFtO1xuICAgICAgaWYgKGlzSU9TKSB7XG4gICAgICAgIGFkZExvZyhcIkluc3RhbGHDp8OjbyBubyBpT1M6IFRvcXVlIG5vIMOtY29uZSBkZSAnQ29tcGFydGlsaGFyJyBlIHNlbGVjaW9uZSAnQWRpY2lvbmFyIMOgIFRlbGEgZGUgSW7DrWNpbydcIiwgXCJ3YXJuaW5nXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWRkTG9nKFwiSW5zdGFsYcOnw6NvOiBVc2UgbyBtZW51IGRvIG5hdmVnYWRvciAodHLDqnMgcG9udG9zKSBlIHNlbGVjaW9uZSAnSW5zdGFsYXIgQXBsaWNhdGl2bycgb3UgJ0FkaWNpb25hciDDoCB0ZWxhIGRlIGluw61jaW8nXCIsIFwid2FybmluZ1wiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgYWRkTG9nKFwiU29saWNpdGFuZG8gcGVybWlzc8OjbyBkZSBpbnN0YWxhw6fDo28gYW8gc2lzdGVtYS4uLlwiLCBcImluZm9cIik7XG4gICAgICBkZWZlcnJlZFByb21wdC5wcm9tcHQoKTtcbiAgICAgIGNvbnN0IHsgb3V0Y29tZSB9ID0gYXdhaXQgZGVmZXJyZWRQcm9tcHQudXNlckNob2ljZTtcbiAgICAgIGlmIChvdXRjb21lID09PSAnYWNjZXB0ZWQnKSB7XG4gICAgICAgIGFkZExvZyhcIkluc3RhbGHDp8OjbyBhY2VpdGEgcGVsbyB1c3XDoXJpbyFcIiwgXCJzdWNjZXNzXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWRkTG9nKFwiSW5zdGFsYcOnw6NvIGNhbmNlbGFkYSBwZWxvIHVzdcOhcmlvLlwiLCBcIndhcm5pbmdcIik7XG4gICAgICB9XG4gICAgICBzZXREZWZlcnJlZFByb21wdChudWxsKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGFkZExvZyhcIkVycm8gYW8gZGlzcGFyYXIgcHJvbXB0LiBVc2UgbyBtZW51IGRvIG5hdmVnYWRvciBwYXJhIGluc3RhbGFyLlwiLCBcImVycm9yXCIpO1xuICAgICAgY29uc29sZS5lcnJvcihcIlBXQSBQcm9tcHQgRXJyb3I6XCIsIGVycik7XG4gICAgfVxuICB9O1xuICBjb25zdCBsb2dFbmRSZWYgPSB1c2VSZWY8SFRNTERpdkVsZW1lbnQ+KG51bGwpO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgbG9nRW5kUmVmLmN1cnJlbnQ/LnNjcm9sbEludG9WaWV3KHsgYmVoYXZpb3I6ICdzbW9vdGgnIH0pO1xuICB9LCBbbG9nc10pO1xuXG4gIGNvbnN0IHNlbGVjdEZhc3Rlc3RTZXJ2ZXIgPSAoKSA9PiB7XG4gICAgY29uc3QgZmFzdGVzdCA9IFsuLi5TRVJWRVJTXS5zb3J0KChhLCBiKSA9PiBhLmxhdGVuY3kgLSBiLmxhdGVuY3kpWzBdO1xuICAgIHNldFNlbGVjdGVkU2VydmVyKGZhc3Rlc3QpO1xuICAgIGFkZExvZyhgQXV0by1zZWxlw6fDo286IFNlcnZpZG9yIG1haXMgcsOhcGlkbyBlbmNvbnRyYWRvICgke2Zhc3Rlc3QubmFtZX0gLSAke2Zhc3Rlc3QubGF0ZW5jeX1tcylgLCBcInN1Y2Nlc3NcIik7XG4gICAgc2V0U2hvd1NlcnZlck1lbnUoZmFsc2UpO1xuICB9O1xuXG4gIGNvbnN0IHN0YXJ0QXV0b1NjYW4gPSBhc3luYyAoKSA9PiB7XG4gICAgaWYgKGlzU2Nhbm5pbmcgfHwgaXNWcG5BY3RpdmUpIHJldHVybjtcbiAgICBcbiAgICBzZXRJc1NjYW5uaW5nKHRydWUpO1xuICAgIHNldFNjYW5QaGFzZSgnc2VsZWN0aW5nJyk7XG4gICAgc2Nhbm5pbmdSZWYuY3VycmVudCA9IHRydWU7XG4gICAgc2V0U3RhdHMocHJldiA9PiAoeyAuLi5wcmV2LCBzdGF0dXM6ICdzY2FubmluZycgfSkpO1xuICAgIHNldExvZ3MoW10pO1xuICAgIGFkZExvZyhcIkluaWNpYW5kbyBFc2PDom5lciBBdXRvbcOhdGljbyA0Ry4uLlwiLCBcImluZm9cIik7XG4gICAgYWRkTG9nKFwiT3BlcmFkb3JhIHNlbGVjaW9uYWRhOiBcIiArIHN0YXRzLmNhcnJpZXIsIFwiaW5mb1wiKTtcbiAgICBcbiAgICAvLyBQaGFzZSAxOiBTZXJ2ZXIgU2VsZWN0aW9uXG4gICAgYWRkTG9nKFwiT3RpbWl6YW5kbyByb3RhOiBUZXN0YW5kbyBsYXTDqm5jaWEgZG9zIHNlcnZpZG9yZXMuLi5cIiwgXCJ3YXJuaW5nXCIpO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCAxMDAwKSk7XG4gICAgXG4gICAgbGV0IGZhc3Rlc3QgPSBTRVJWRVJTWzBdO1xuICAgIGZvciAoY29uc3Qgc2VydmVyIG9mIFNFUlZFUlMpIHtcbiAgICAgIGlmICghc2Nhbm5pbmdSZWYuY3VycmVudCkge1xuICAgICAgICBzZXRTY2FuUGhhc2UoJ2lkbGUnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYWRkTG9nKGBQaW5nIFske3NlcnZlci5uYW1lfV0uLi4gJHtzZXJ2ZXIubGF0ZW5jeX1tc2AsIFwiaW5mb1wiKTtcbiAgICAgIGlmIChzZXJ2ZXIubGF0ZW5jeSA8IGZhc3Rlc3QubGF0ZW5jeSkge1xuICAgICAgICBmYXN0ZXN0ID0gc2VydmVyO1xuICAgICAgfVxuICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDQwMCkpO1xuICAgIH1cbiAgICBcbiAgICBzZXRTZWxlY3RlZFNlcnZlcihmYXN0ZXN0KTtcbiAgICBhZGRMb2coYE1lbGhvciBzZXJ2aWRvciBpZGVudGlmaWNhZG86ICR7ZmFzdGVzdC5uYW1lfSAoJHtmYXN0ZXN0LmxhdGVuY3l9bXMpYCwgXCJzdWNjZXNzXCIpO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCA4MDApKTtcblxuICAgIC8vIFBoYXNlIDI6IENvbm5lY3Rpb24gQXR0ZW1wdHNcbiAgICBzZXRTY2FuUGhhc2UoJ2Nvbm5lY3RpbmcnKTtcbiAgICBhZGRMb2coXCJDb25maWd1cmHDp8O1ZXMgYXZhbsOnYWRhcyBjYXJyZWdhZGFzLlwiLCBcImluZm9cIik7XG4gICAgXG4gICAgbGV0IGNvbm5lY3RlZCA9IGZhbHNlO1xuICAgIGxldCBhdHRlbXB0ID0gMTtcblxuICAgIHdoaWxlICghY29ubmVjdGVkICYmIGF0dGVtcHQgPD0gMTAgJiYgc2Nhbm5pbmdSZWYuY3VycmVudCkgeyBcbiAgICAgIGNvbnN0IGN1cnJlbnRTbmkgPSBhZHZhbmNlZENvbmZpZy5zbmkgfHwgU05JU1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBTTklTLmxlbmd0aCldO1xuICAgICAgXG4gICAgICBhZGRMb2coYFRlbnRhdGl2YSAjJHthdHRlbXB0fTogQWJyaW5kbyBzb2NrZXQgVENQL0lQLi4uYCwgXCJpbmZvXCIpO1xuICAgICAgYWRkTG9nKGBIYW5kc2hha2UgVExTIDEuMyBpbmljaWFkbyBjb20gJHtjdXJyZW50U25pfS4uLmAsIFwid2FybmluZ1wiKTtcbiAgICAgIHNldFNjYW5Qcm9ncmVzcygoYXR0ZW1wdCAvIDEwKSAqIDEwMCk7XG4gICAgICBcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCAxNTAwKSk7XG4gICAgICBcbiAgICAgIGlmICghc2Nhbm5pbmdSZWYuY3VycmVudCkgYnJlYWs7XG5cbiAgICAgIGlmIChNYXRoLnJhbmRvbSgpID4gMC42IHx8IGF0dGVtcHQgPT09IDMpIHtcbiAgICAgICAgYWRkTG9nKGBDb25leMOjbyBlc3RhYmVsZWNpZGEhIEluaWNpYW5kbyB0dW5lbGFtZW50byAke2FkdmFuY2VkQ29uZmlnLnByb3RvY29sfS4uLmAsIFwic3VjY2Vzc1wiKTtcbiAgICAgICAgYWRkTG9nKGBJbmpldGFuZG8gUGF5bG9hZDogJHthZHZhbmNlZENvbmZpZy5wYXlsb2FkLnN1YnN0cmluZygwLCAyMCl9Li4uYCwgXCJpbmZvXCIpO1xuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgODAwKSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXNjYW5uaW5nUmVmLmN1cnJlbnQpIGJyZWFrO1xuXG4gICAgICAgIGFkZExvZyhgRW5jYXBzdWxhbWVudG8gZGUgcGFjb3RlcyBhdGl2byAoTVRVOiAke2FkdmFuY2VkQ29uZmlnLm10dX0gYnl0ZXMpLmAsIFwic3VjY2Vzc1wiKTtcbiAgICAgICAgYWRkTG9nKGBDcmlwdG9ncmFmaWEgQUVTLTI1Ni1HQ00gaGFiaWxpdGFkYS5gLCBcImluZm9cIik7XG4gICAgICAgIGFkZExvZyhgVlBOIFR1bmVsYWRhIGNvbSBzdWNlc3NvIHZpYSAke3N0YXRzLmNhcnJpZXJ9IWAsIFwic3VjY2Vzc1wiKTtcbiAgICAgICAgY29ubmVjdGVkID0gdHJ1ZTtcbiAgICAgICAgc2V0SXNWcG5BY3RpdmUodHJ1ZSk7XG4gICAgICAgIHNldFN0YXRzKHByZXYgPT4gKHsgLi4ucHJldiwgc3RhdHVzOiAnY29ubmVjdGVkJyB9KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhZGRMb2coYEVycm8gZGUgUHJvdG9jb2xvOiBSZXNwb3N0YSBpbmVzcGVyYWRhIGRvIFByb3h5ICg0MDMgRm9yYmlkZGVuKS5gLCBcImVycm9yXCIpO1xuICAgICAgICBhdHRlbXB0Kys7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmICghY29ubmVjdGVkICYmIGF0dGVtcHQgPiAxMCAmJiBzY2FubmluZ1JlZi5jdXJyZW50KSB7XG4gICAgICAgIGFkZExvZyhcIkVzY8OibmVyIGZpbmFsaXphZG86IE5lbmh1bSBob3N0IHZ1bG5lcsOhdmVsIGVuY29udHJhZG8uXCIsIFwiZXJyb3JcIik7XG4gICAgICAgIHNldElzU2Nhbm5pbmcoZmFsc2UpO1xuICAgICAgICBzY2FubmluZ1JlZi5jdXJyZW50ID0gZmFsc2U7XG4gICAgICAgIHNldFN0YXRzKHByZXYgPT4gKHsgLi4ucHJldiwgc3RhdHVzOiAnZGlzY29ubmVjdGVkJyB9KSk7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIHNldElzU2Nhbm5pbmcoZmFsc2UpO1xuICAgIHNldFNjYW5QaGFzZSgnaWRsZScpO1xuICAgIHNjYW5uaW5nUmVmLmN1cnJlbnQgPSBmYWxzZTtcbiAgICBzZXRTY2FuUHJvZ3Jlc3MoMCk7XG4gIH07XG5cbiAgY29uc3Qgc3RvcFNjYW4gPSAoKSA9PiB7XG4gICAgc2V0SXNTY2FubmluZyhmYWxzZSk7XG4gICAgc2V0U2NhblBoYXNlKCdpZGxlJyk7XG4gICAgc2Nhbm5pbmdSZWYuY3VycmVudCA9IGZhbHNlO1xuICAgIHNldElzVnBuQWN0aXZlKGZhbHNlKTtcbiAgICBzZXRTdGF0cyhwcmV2ID0+ICh7IC4uLnByZXYsIHN0YXR1czogJ2Rpc2Nvbm5lY3RlZCcgfSkpO1xuICAgIGFkZExvZyhcIkNvbmV4w6NvIGludGVycm9tcGlkYSBwZWxvIHVzdcOhcmlvLlwiLCBcIndhcm5pbmdcIik7XG4gIH07XG5cbiAgY29uc3QgZG93bmxvYWRQcm9qZWN0WmlwID0gYXN5bmMgKCkgPT4ge1xuICAgIHNldElzWmlwcGluZyh0cnVlKTtcbiAgICBhZGRMb2coXCJJbmljaWFuZG8gZW1wYWNvdGFtZW50byBkbyBwcm9qZXRvLi4uXCIsIFwiaW5mb1wiKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgemlwID0gbmV3IEpTWmlwKCk7XG5cbiAgICAgIGNvbnN0IGZpbGVzID0gW1xuICAgICAgICAncGFja2FnZS5qc29uJyxcbiAgICAgICAgJ3NyYy9BcHAudHN4JyxcbiAgICAgICAgJ3NyYy9tYWluLnRzeCcsXG4gICAgICAgICdzcmMvaW5kZXguY3NzJyxcbiAgICAgICAgJ2luZGV4Lmh0bWwnLFxuICAgICAgICAncHVibGljL21hbmlmZXN0Lmpzb24nLFxuICAgICAgICAncHVibGljL3N3LmpzJyxcbiAgICAgICAgJ3ZpdGUuY29uZmlnLnRzJyxcbiAgICAgICAgJ3RzY29uZmlnLmpzb24nLFxuICAgICAgICAnbWV0YWRhdGEuanNvbicsXG4gICAgICAgICcuZW52LmV4YW1wbGUnLFxuICAgICAgICAnLmdpdGlnbm9yZSdcbiAgICAgIF07XG5cbiAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYC8ke2ZpbGV9YCk7XG4gICAgICAgICAgaWYgKHJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xuICAgICAgICAgICAgemlwLmZpbGUoZmlsZSwgY29udGVudCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihgRXJybyBhbyBiYWl4YXIgJHtmaWxlfTpgLCBlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgemlwLmdlbmVyYXRlQXN5bmMoeyB0eXBlOiBcImJsb2JcIiB9KTtcbiAgICAgIGNvbnN0IHVybCA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKGNvbnRlbnQpO1xuICAgICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuICAgICAgYS5ocmVmID0gdXJsO1xuICAgICAgYS5kb3dubG9hZCA9IFwiZW1mb3JtYV9wcm9qZWN0X3NvdXJjZS56aXBcIjtcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYSk7XG4gICAgICBhLmNsaWNrKCk7XG4gICAgICB3aW5kb3cuVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuICAgICAgYWRkTG9nKFwiUHJvamV0byBlbXBhY290YWRvIGUgZG93bmxvYWQgaW5pY2lhZG8hXCIsIFwic3VjY2Vzc1wiKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgYWRkTG9nKFwiRXJybyBhbyBnZXJhciBaSVAgZG8gcHJvamV0by5cIiwgXCJlcnJvclwiKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBzZXRJc1ppcHBpbmcoZmFsc2UpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLWgtc2NyZWVuIHAtNCBtZDpwLTYgZmxleCBmbGV4LWNvbCBnYXAtNCBtYXgtdy03eGwgbXgtYXV0byBmb250LXNhbnMgdGV4dC16aW5jLTIwMFwiPlxuICAgICAgey8qIFRvcCBOYXZpZ2F0aW9uIEJhciAqL31cbiAgICAgIDxoZWFkZXIgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIGdsYXNzIHJvdW5kZWQtMnhsIHB4LTYgcHktNCBib3JkZXItd2hpdGUvNVwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC00XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTEwIGgtMTAgYmctY3lhbi01MDAvMTAgcm91bmRlZC14bCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBib3JkZXIgYm9yZGVyLWN5YW4tNTAwLzMwXCI+XG4gICAgICAgICAgICA8WmFwIGNsYXNzTmFtZT1cInRleHQtY3lhbi00MDAgdy02IGgtNlwiIC8+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtYm9sZCB0cmFja2luZy10aWdodCB0ZXh0LXdoaXRlXCI+ZW1mb3JtYSA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWN5YW4tNDAwXCI+NEcgUHJvPC9zcGFuPjwvaDE+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xLjUgaC0xLjUgcm91bmRlZC1mdWxsIGJnLWN5YW4tNTAwIGFuaW1hdGUtcHVsc2VcIiAvPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXppbmMtNTAwIHVwcGVyY2FzZSB0cmFja2luZy13aWRlc3QgZm9udC1tb25vXCI+RW5naW5lIHY0LjAuMSAtIEFkdmFuY2VkIEluamVjdG9yPC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICBcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtNlwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaGlkZGVuIG1kOmZsZXggZmxleC1jb2wgaXRlbXMtZW5kXCI+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXppbmMtNTAwIHVwcGVyY2FzZSBmb250LW1vbm9cIj5TaW5hbCB7c3RhdHMuY2Fycmllcn08L3NwYW4+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTAuNSBpdGVtcy1lbmQgaC0zXCI+XG4gICAgICAgICAgICAgIHtbMSwgMiwgMywgNCwgNV0ubWFwKChpKSA9PiAoXG4gICAgICAgICAgICAgICAgPGRpdiBcbiAgICAgICAgICAgICAgICAgIGtleT17aX0gXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2NuKFxuICAgICAgICAgICAgICAgICAgICBcInctMSByb3VuZGVkLXQtc20gdHJhbnNpdGlvbi1hbGxcIixcbiAgICAgICAgICAgICAgICAgICAgaSA8PSA0ID8gXCJiZy1jeWFuLTUwMFwiIDogXCJiZy16aW5jLTgwMFwiXG4gICAgICAgICAgICAgICAgICApfSBcbiAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGhlaWdodDogYCR7aSAqIDIwfSVgIH19XG4gICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImgtOCB3LXB4IGJnLXppbmMtODAwXCIgLz5cbiAgICAgICAgICB7IWlzVnBuQWN0aXZlICYmICFpc1NjYW5uaW5nICYmIChcbiAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgIG9uQ2xpY2s9e3N0YXJ0QXV0b1NjYW59XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHB4LTQgcHktMiBiZy1jeWFuLTUwMCB0ZXh0LWJsYWNrIHJvdW5kZWQteGwgdGV4dC14cyBmb250LWJvbGQgaG92ZXI6YmctY3lhbi00MDAgdHJhbnNpdGlvbi1hbGwgc2hhZG93LWxnIHNoYWRvdy1jeWFuLTUwMC8yMCBhY3RpdmU6c2NhbGUtOTVcIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8U2hpZWxkQ2hlY2sgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICAgIENvbmVjdGFyXG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICApfVxuICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRTaG93QWR2YW5jZWRNZW51KHRydWUpfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwicC0yIHJvdW5kZWQteGwgaG92ZXI6Ymctd2hpdGUvNSB0cmFuc2l0aW9uLWNvbG9ycyBib3JkZXIgYm9yZGVyLXRyYW5zcGFyZW50IGhvdmVyOmJvcmRlci13aGl0ZS8xMFwiXG4gICAgICAgICAgPlxuICAgICAgICAgICAgPFNsaWRlcnMgY2xhc3NOYW1lPVwidy01IGgtNSB0ZXh0LXppbmMtNDAwXCIgLz5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2hlYWRlcj5cblxuICAgICAgey8qIE1haW4gRGFzaGJvYXJkIExheW91dCAqL31cbiAgICAgIDxtYWluIGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgbGc6Z3JpZC1jb2xzLTEyIGdhcC00IGZsZXgtMVwiPlxuICAgICAgICBcbiAgICAgICAgey8qIExlZnQgQ29sdW1uOiBDb25uZWN0aW9uIENvbnRyb2xzICovfVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImxnOmNvbC1zcGFuLTQgZmxleCBmbGV4LWNvbCBnYXAtNFwiPlxuICAgICAgICAgIFxuICAgICAgICAgIHsvKiBNYWluIENvbm5lY3Rpb24gQ2FyZCAqL31cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdsYXNzIHJvdW5kZWQtM3hsIHAtNiBmbGV4IGZsZXgtY29sIGdhcC02IHJlbGF0aXZlIG92ZXJmbG93LWhpZGRlbiBib3JkZXItd2hpdGUvNVwiPlxuICAgICAgICAgICAge2lzU2Nhbm5pbmcgJiYgKFxuICAgICAgICAgICAgICA8bW90aW9uLmRpdiBcbiAgICAgICAgICAgICAgICBpbml0aWFsPXt7IHg6ICctMTAwJScgfX1cbiAgICAgICAgICAgICAgICBhbmltYXRlPXt7IHg6ICcxMDAlJyB9fVxuICAgICAgICAgICAgICAgIHRyYW5zaXRpb249e3sgZHVyYXRpb246IDIsIHJlcGVhdDogSW5maW5pdHksIGVhc2U6IFwibGluZWFyXCIgfX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJhYnNvbHV0ZSB0b3AtMCBsZWZ0LTAgdy1mdWxsIGgtMC41IGJnLWdyYWRpZW50LXRvLXIgZnJvbS10cmFuc3BhcmVudCB2aWEtY3lhbi01MDAgdG8tdHJhbnNwYXJlbnQgb3BhY2l0eS01MFwiXG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICApfVxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlclwiPlxuICAgICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNob3dTZXJ2ZXJNZW51KHRydWUpfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInAtMyBiZy16aW5jLTkwMC81MCByb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLXdoaXRlLzUgaG92ZXI6Ym9yZGVyLWN5YW4tNTAwLzMwIHRyYW5zaXRpb24tYWxsIGZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxTZXJ2ZXIgY2xhc3NOYW1lPVwidy02IGgtNiB0ZXh0LWN5YW4tNDAwXCIgLz5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtbGVmdFwiPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOHB4XSB0ZXh0LXppbmMtNTAwIHVwcGVyY2FzZSBmb250LW1vbm8gYmxvY2tcIj5NdWRhciBTZXJ2aWRvcjwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1ib2xkIHRleHQtd2hpdGUgdHJ1bmNhdGUgbWF4LXctWzEwMHB4XSBibG9ja1wiPntzZWxlY3RlZFNlcnZlci5uYW1lfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtZW5kIGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC16aW5jLTUwMCB1cHBlcmNhc2UgZm9udC1tb25vXCI+VlBOPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17aXNWcG5BY3RpdmUgfHwgaXNTY2FubmluZyA/IHN0b3BTY2FuIDogc3RhcnRBdXRvU2Nhbn1cbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtjbihcbiAgICAgICAgICAgICAgICAgICAgICBcInctMTIgaC02IHJvdW5kZWQtZnVsbCBwLTEgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tMzAwIHJlbGF0aXZlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgKGlzVnBuQWN0aXZlIHx8IGlzU2Nhbm5pbmcpID8gXCJiZy1jeWFuLTUwMCBzaGFkb3ctWzBfMF8xMHB4X3JnYmEoMCwyNDIsMjU1LDAuNCldXCIgOiBcImJnLXppbmMtODAwXCJcbiAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgPG1vdGlvbi5kaXYgXG4gICAgICAgICAgICAgICAgICAgICAgYW5pbWF0ZT17eyB4OiAoaXNWcG5BY3RpdmUgfHwgaXNTY2FubmluZykgPyAyNCA6IDAgfX1cbiAgICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uPXt7IHR5cGU6IFwic3ByaW5nXCIsIHN0aWZmbmVzczogNTAwLCBkYW1waW5nOiAzMCB9fVxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctNCBoLTQgYmctd2hpdGUgcm91bmRlZC1mdWxsIHNoYWRvdy1tZFwiXG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtcmlnaHRcIj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzhweF0gdGV4dC16aW5jLTUwMCB1cHBlcmNhc2UgZm9udC1tb25vIGJsb2NrXCI+Q2FyZ2EgZG8gU2VydmVyPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPXtjbihcbiAgICAgICAgICAgICAgICAgICAgXCJ0ZXh0LVsxMHB4XSBmb250LWJvbGRcIixcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRTZXJ2ZXIubG9hZCA+IDgwID8gXCJ0ZXh0LXJvc2UtNTAwXCIgOiBzZWxlY3RlZFNlcnZlci5sb2FkID4gNTAgPyBcInRleHQtYW1iZXItNTAwXCIgOiBcInRleHQtZW1lcmFsZC01MDBcIlxuICAgICAgICAgICAgICAgICAgKX0+e3NlbGVjdGVkU2VydmVyLmxvYWR9JTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBweS00XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVsYXRpdmVcIj5cbiAgICAgICAgICAgICAgICA8bW90aW9uLmRpdiBcbiAgICAgICAgICAgICAgICAgIGFuaW1hdGU9e3sgXG4gICAgICAgICAgICAgICAgICAgIHNjYWxlOiBpc1ZwbkFjdGl2ZSA/IFsxLCAxLjA4LCAxXSA6IDEsXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZTogaXNWcG5BY3RpdmUgPyAzNjAgOiAwXG4gICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgdHJhbnNpdGlvbj17eyBcbiAgICAgICAgICAgICAgICAgICAgc2NhbGU6IHsgZHVyYXRpb246IDMsIHJlcGVhdDogSW5maW5pdHkgfSxcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlOiB7IGR1cmF0aW9uOiAzMCwgcmVwZWF0OiBJbmZpbml0eSwgZWFzZTogXCJsaW5lYXJcIiB9XG4gICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtjbihcbiAgICAgICAgICAgICAgICAgICAgXCJ3LTQ0IGgtNDQgcm91bmRlZC1mdWxsIGJvcmRlci0yIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHRyYW5zaXRpb24tYWxsIGR1cmF0aW9uLTcwMFwiLFxuICAgICAgICAgICAgICAgICAgICBpc1ZwbkFjdGl2ZSA/IFwiYm9yZGVyLWN5YW4tNTAwIHNoYWRvdy1bMF8wXzQwcHhfcmdiYSgwLDI0MiwyNTUsMC4yKV1cIiA6IFwiYm9yZGVyLXppbmMtODAwXCJcbiAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2NuKFxuICAgICAgICAgICAgICAgICAgICBcInctMzYgaC0zNiByb3VuZGVkLWZ1bGwgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tNzAwXCIsXG4gICAgICAgICAgICAgICAgICAgIGlzVnBuQWN0aXZlID8gXCJiZy1jeWFuLTUwMC81XCIgOiBcImJnLXppbmMtOTAwLzUwXCJcbiAgICAgICAgICAgICAgICAgICl9PlxuICAgICAgICAgICAgICAgICAgICB7aXNWcG5BY3RpdmUgPyAoXG4gICAgICAgICAgICAgICAgICAgICAgPFNoaWVsZENoZWNrIGNsYXNzTmFtZT1cInctMTYgaC0xNiB0ZXh0LWN5YW4tNDAwIG1iLTJcIiAvPlxuICAgICAgICAgICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICAgICAgICAgIDxTaGllbGQgY2xhc3NOYW1lPVwidy0xNiBoLTE2IHRleHQtemluYy03MDAgbWItMlwiIC8+XG4gICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT17Y24oXG4gICAgICAgICAgICAgICAgICAgICAgXCJ0ZXh0LVsxMHB4XSBmb250LWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVzdFwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzVnBuQWN0aXZlID8gXCJ0ZXh0LWN5YW4tNDAwXCIgOiBcInRleHQtemluYy02MDBcIlxuICAgICAgICAgICAgICAgICAgICApfT5cbiAgICAgICAgICAgICAgICAgICAgICB7aXNWcG5BY3RpdmUgPyBcIlByb3RlZ2lkb1wiIDogXCJJbmF0aXZvXCJ9XG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvbW90aW9uLmRpdj5cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB7aXNTY2FubmluZyAmJiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LTAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTUyIGgtNTIgcm91bmRlZC1mdWxsIGJvcmRlciBib3JkZXItY3lhbi01MDAvMjAgYW5pbWF0ZS1waW5nXCIgLz5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtM1wiPlxuICAgICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9e2lzVnBuQWN0aXZlIHx8IGlzU2Nhbm5pbmcgPyBzdG9wU2NhbiA6IHN0YXJ0QXV0b1NjYW59XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtjbihcbiAgICAgICAgICAgICAgICAgIFwidy1mdWxsIHB5LTQgcm91bmRlZC0yeGwgZm9udC1ib2xkIHRleHQtbGcgdHJhbnNpdGlvbi1hbGwgYWN0aXZlOnNjYWxlLTk1IGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0zIHJlbGF0aXZlIG92ZXJmbG93LWhpZGRlbiBncm91cFwiLFxuICAgICAgICAgICAgICAgICAgaXNWcG5BY3RpdmUgXG4gICAgICAgICAgICAgICAgICAgID8gXCJiZy16aW5jLTgwMCB0ZXh0LXdoaXRlIGJvcmRlciBib3JkZXItd2hpdGUvMTBcIiBcbiAgICAgICAgICAgICAgICAgICAgOiBcImJnLWN5YW4tNTAwIHRleHQtYmxhY2sgaG92ZXI6YmctY3lhbi00MDAgc2hhZG93LWxnIHNoYWRvdy1jeWFuLTUwMC8yMFwiXG4gICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIHtpc1NjYW5uaW5nID8gKFxuICAgICAgICAgICAgICAgICAgPD5cbiAgICAgICAgICAgICAgICAgICAgPFNxdWFyZSBjbGFzc05hbWU9XCJ3LTUgaC01IGZpbGwtY3VycmVudFwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPntzY2FuUGhhc2UgPT09ICdzZWxlY3RpbmcnID8gJ090aW1pemFuZG8gUm90YS4uLicgOiAnUGFyYXIgRXNjw6JuZXInfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvPlxuICAgICAgICAgICAgICAgICkgOiBpc1ZwbkFjdGl2ZSA/IChcbiAgICAgICAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgICAgICAgIDxSZWZyZXNoQ3cgY2xhc3NOYW1lPVwidy01IGgtNVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPkRlc2NvbmVjdGFyPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPC8+XG4gICAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgICAgICAgIDxQbGF5IGNsYXNzTmFtZT1cInctNSBoLTUgZmlsbC1jdXJyZW50XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+SW5pY2lhciBDb25leMOjbzwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvPlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICB7LyogT3BlcmF0b3IgU2VsZWN0b3IgKi99XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJnbGFzcyByb3VuZGVkLTN4bCBwLTUgZmxleCBmbGV4LWNvbCBnYXAtNCBib3JkZXItd2hpdGUvNVwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBtYi0xXCI+XG4gICAgICAgICAgICAgIDxSYWRpbyBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtY3lhbi00MDBcIiAvPlxuICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC14cyBmb250LWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyIHRleHQtemluYy00MDBcIj5PcGVyYWRvcmEgZGUgUmVkZTwvaDM+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0zIGdhcC0yXCI+XG4gICAgICAgICAgICAgIHtDQVJSSUVSUy5tYXAoKGNhcnJpZXIpID0+IChcbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICBrZXk9e2NhcnJpZXJ9XG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBoYW5kbGVDYXJyaWVyQ2hhbmdlKGNhcnJpZXIpfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtjbihcbiAgICAgICAgICAgICAgICAgICAgXCJweS0yLjUgcm91bmRlZC14bCB0ZXh0LVsxMHB4XSBmb250LWJvbGQgdHJhbnNpdGlvbi1hbGwgYm9yZGVyXCIsXG4gICAgICAgICAgICAgICAgICAgIHN0YXRzLmNhcnJpZXIgPT09IGNhcnJpZXIgXG4gICAgICAgICAgICAgICAgICAgICAgPyBcImJnLWN5YW4tNTAwLzEwIGJvcmRlci1jeWFuLTUwMCB0ZXh0LWN5YW4tNDAwXCIgXG4gICAgICAgICAgICAgICAgICAgICAgOiBcImJnLXppbmMtOTAwLzUwIGJvcmRlci13aGl0ZS81IHRleHQtemluYy01MDAgaG92ZXI6Ym9yZGVyLXdoaXRlLzEwXCJcbiAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAge2NhcnJpZXJ9XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICB7LyogQ29ubmVjdGlvbiBUeXBlIFNlbGVjdG9yICovfVxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3Mgcm91bmRlZC0zeGwgcC01IGZsZXggZmxleC1jb2wgZ2FwLTQgYm9yZGVyLXdoaXRlLzVcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgbWItMVwiPlxuICAgICAgICAgICAgICA8U2lnbmFsIGNsYXNzTmFtZT1cInctNCBoLTQgdGV4dC1jeWFuLTQwMFwiIC8+XG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXIgdGV4dC16aW5jLTQwMFwiPlRpcG8gZGUgQ29uZXjDo288L2gzPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtNCBnYXAtMlwiPlxuICAgICAgICAgICAgICB7Q09OTkVDVElPTl9UWVBFUy5tYXAoKHR5cGUpID0+IChcbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICBrZXk9e3R5cGV9XG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBoYW5kbGVDb25uZWN0aW9uVHlwZUNoYW5nZSh0eXBlKX1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17Y24oXG4gICAgICAgICAgICAgICAgICAgIFwicHktMi41IHJvdW5kZWQteGwgdGV4dC1bMTBweF0gZm9udC1ib2xkIHRyYW5zaXRpb24tYWxsIGJvcmRlclwiLFxuICAgICAgICAgICAgICAgICAgICBzdGF0cy5jb25uZWN0aW9uVHlwZSA9PT0gdHlwZSBcbiAgICAgICAgICAgICAgICAgICAgICA/IFwiYmctY3lhbi01MDAvMTAgYm9yZGVyLWN5YW4tNTAwIHRleHQtY3lhbi00MDBcIiBcbiAgICAgICAgICAgICAgICAgICAgICA6IFwiYmctemluYy05MDAvNTAgYm9yZGVyLXdoaXRlLzUgdGV4dC16aW5jLTUwMCBob3Zlcjpib3JkZXItd2hpdGUvMTBcIlxuICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICB7dHlwZX1cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIHsvKiBDb25maWd1cmF0aW9uIFNlbGVjdG9ycyAqL31cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdsYXNzIHJvdW5kZWQtM3hsIHAtNSBmbGV4IGZsZXgtY29sIGdhcC00IGJvcmRlci13aGl0ZS81XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIG1iLTFcIj5cbiAgICAgICAgICAgICAgPERhdGFiYXNlIGNsYXNzTmFtZT1cInctNCBoLTQgdGV4dC1jeWFuLTQwMFwiIC8+XG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXIgdGV4dC16aW5jLTQwMFwiPk3DqXRvZG9zIGRlIEluamXDp8OjbzwvaDM+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTNcIj5cbiAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC16aW5jLTUwMCB1cHBlcmNhc2UgbWItMS41IGJsb2NrIG1sLTFcIj5QYXlsb2FkIE1ldGhvZDwvbGFiZWw+XG4gICAgICAgICAgICAgICAgPHNlbGVjdCBcbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBiZy16aW5jLTkwMC84MCBib3JkZXIgYm9yZGVyLXdoaXRlLzUgcm91bmRlZC14bCBweC00IHB5LTIuNSB0ZXh0LXhzIG91dGxpbmUtbm9uZSBmb2N1czpib3JkZXItY3lhbi01MDAvNTAgdHJhbnNpdGlvbi1jb2xvcnNcIlxuICAgICAgICAgICAgICAgICAgdmFsdWU9e3NlbGVjdGVkUGF5bG9hZH1cbiAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0U2VsZWN0ZWRQYXlsb2FkKE51bWJlcihlLnRhcmdldC52YWx1ZSkpfVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9ezB9PkhUVFAgQ3VzdG9tIEluamVjdG9yPC9vcHRpb24+XG4gICAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPXsxfT5TU0wvVExTIEhhbmRzaGFrZTwvb3B0aW9uPlxuICAgICAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT17Mn0+RGlyZWN0IFByb3h5IFR1bm5lbDwvb3B0aW9uPlxuICAgICAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtemluYy01MDAgdXBwZXJjYXNlIG1iLTEuNSBibG9jayBtbC0xXCI+U05JIEhvc3RuYW1lPC9sYWJlbD5cbiAgICAgICAgICAgICAgICA8c2VsZWN0IFxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGJnLXppbmMtOTAwLzgwIGJvcmRlciBib3JkZXItd2hpdGUvNSByb3VuZGVkLXhsIHB4LTQgcHktMi41IHRleHQteHMgb3V0bGluZS1ub25lIGZvY3VzOmJvcmRlci1jeWFuLTUwMC81MCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICAgICAgICB2YWx1ZT17c2VsZWN0ZWRTbml9XG4gICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldFNlbGVjdGVkU25pKE51bWJlcihlLnRhcmdldC52YWx1ZSkpfVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIHtTTklTLm1hcCgoc25pLCBpZHgpID0+IChcbiAgICAgICAgICAgICAgICAgICAgPG9wdGlvbiBrZXk9e2lkeH0gdmFsdWU9e2lkeH0+e3NuaX08L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICB7LyogUmlnaHQgQ29sdW1uOiBMb2dzICYgUmVhbC10aW1lIERhdGEgKi99XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibGc6Y29sLXNwYW4tOCBmbGV4IGZsZXgtY29sIGdhcC00XCI+XG4gICAgICAgICAgXG4gICAgICAgICAgey8qIFRvcCBTdGF0cyBSb3cgKi99XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0yIG1kOmdyaWQtY29scy00IGdhcC00XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdsYXNzIHJvdW5kZWQtMnhsIHAtNCBib3JkZXItd2hpdGUvNVwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHRleHQtemluYy01MDAgbWItMVwiPlxuICAgICAgICAgICAgICAgIDxTaWduYWwgY2xhc3NOYW1lPVwidy0zIGgtM1wiIC8+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSBmb250LW1vbm8gdXBwZXJjYXNlXCI+U2luYWw8L3NwYW4+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtbGcgZm9udC1ib2xkIGZvbnQtbW9ubyB0ZXh0LXdoaXRlXCI+e3N0YXRzLnNpZ25hbFN0cmVuZ3RofSA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXppbmMtNTAwXCI+ZEJtPC9zcGFuPjwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdsYXNzIHJvdW5kZWQtMnhsIHAtNCBib3JkZXItd2hpdGUvNVwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHRleHQtemluYy01MDAgbWItMVwiPlxuICAgICAgICAgICAgICAgIDxaYXAgY2xhc3NOYW1lPVwidy0zIGgtM1wiIC8+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSBmb250LW1vbm8gdXBwZXJjYXNlXCI+UGluZzwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LWJvbGQgZm9udC1tb25vIHRleHQtd2hpdGVcIj57c3RhdHMubGF0ZW5jeSB8fCAnLS0nfSA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXppbmMtNTAwXCI+bXM8L3NwYW4+PC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3Mgcm91bmRlZC0yeGwgcC00IGJvcmRlci13aGl0ZS81XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgdGV4dC16aW5jLTUwMCBtYi0xXCI+XG4gICAgICAgICAgICAgICAgPEdsb2JlIGNsYXNzTmFtZT1cInctMyBoLTNcIiAvPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzlweF0gZm9udC1tb25vIHVwcGVyY2FzZVwiPlJlZGU8L3NwYW4+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtc20gZm9udC1ib2xkIHRleHQtd2hpdGUgdHJ1bmNhdGVcIj57c3RhdHMuY29ubmVjdGlvblR5cGV9IC8ge3N0YXRzLmNhcnJpZXJ9PC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3Mgcm91bmRlZC0yeGwgcC00IGJvcmRlci13aGl0ZS81XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgdGV4dC16aW5jLTUwMCBtYi0xXCI+XG4gICAgICAgICAgICAgICAgPExvY2sgY2xhc3NOYW1lPVwidy0zIGgtM1wiIC8+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSBmb250LW1vbm8gdXBwZXJjYXNlXCI+SVA8L3NwYW4+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtc20gZm9udC1ib2xkIHRleHQtY3lhbi00MDAgZm9udC1tb25vIHRydW5jYXRlXCI+e3N0YXRzLmlwfTwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICB7LyogQ29ubmVjdGlvbiBMb2dzICovfVxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3Mgcm91bmRlZC0zeGwgcC01IGZsZXgtMSBmbGV4IGZsZXgtY29sIG1pbi1oLVs0MDBweF0gYm9yZGVyLXdoaXRlLzUgcmVsYXRpdmUgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBtYi00XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICA8VGVybWluYWwgY2xhc3NOYW1lPVwidGV4dC1jeWFuLTQwMCB3LTQgaC00XCIgLz5cbiAgICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC14cyBmb250LWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyXCI+TG9nIGRlIENvbmV4w6NvIGVtIFRlbXBvIFJlYWw8L2gzPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTIgaC0yIHJvdW5kZWQtZnVsbCBiZy1yZWQtNTAwLzIwXCIgLz5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMiBoLTIgcm91bmRlZC1mdWxsIGJnLXllbGxvdy01MDAvMjBcIiAvPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0yIGgtMiByb3VuZGVkLWZ1bGwgYmctZ3JlZW4tNTAwLzIwXCIgLz5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgYmctYmxhY2svNDAgcm91bmRlZC0yeGwgcC00IGZvbnQtbW9ubyB0ZXh0LVsxMXB4XSBvdmVyZmxvdy15LWF1dG8gY3VzdG9tLXNjcm9sbGJhciBib3JkZXIgYm9yZGVyLXdoaXRlLzVcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTEuNVwiPlxuICAgICAgICAgICAgICAgIHtsb2dzLmxlbmd0aCA9PT0gMCAmJiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtemluYy02MDAgaXRhbGljXCI+QWd1YXJkYW5kbyBpbsOtY2lvIGRhIGNvbmV4w6NvLi4uPC9kaXY+XG4gICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICB7bG9ncy5tYXAoKGxvZykgPT4gKFxuICAgICAgICAgICAgICAgICAgPGRpdiBrZXk9e2xvZy5pZH0gY2xhc3NOYW1lPVwiZmxleCBnYXAtMyBhbmltYXRlLWluIGZhZGUtaW4gc2xpZGUtaW4tZnJvbS1sZWZ0LTIgZHVyYXRpb24tMzAwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtemluYy02MDAgc2hyaW5rLTBcIj5be2xvZy50aW1lc3RhbXB9XTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPXtjbihcbiAgICAgICAgICAgICAgICAgICAgICBcImJyZWFrLWFsbFwiLFxuICAgICAgICAgICAgICAgICAgICAgIGxvZy50eXBlID09PSAnc3VjY2VzcycgJiYgXCJ0ZXh0LWVtZXJhbGQtNDAwXCIsXG4gICAgICAgICAgICAgICAgICAgICAgbG9nLnR5cGUgPT09ICdlcnJvcicgJiYgXCJ0ZXh0LXJvc2UtNDAwXCIsXG4gICAgICAgICAgICAgICAgICAgICAgbG9nLnR5cGUgPT09ICd3YXJuaW5nJyAmJiBcInRleHQtYW1iZXItNDAwXCIsXG4gICAgICAgICAgICAgICAgICAgICAgbG9nLnR5cGUgPT09ICdpbmZvJyAmJiBcInRleHQtY3lhbi00MDBcIlxuICAgICAgICAgICAgICAgICAgICApfT5cbiAgICAgICAgICAgICAgICAgICAgICB7bG9nLm1lc3NhZ2V9XG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgIDxkaXYgcmVmPXtsb2dFbmRSZWZ9IC8+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxBbmltYXRlUHJlc2VuY2U+XG4gICAgICAgICAgICAgIHtpc1NjYW5uaW5nICYmIChcbiAgICAgICAgICAgICAgICA8bW90aW9uLmRpdiBcbiAgICAgICAgICAgICAgICAgIGluaXRpYWw9e3sgb3BhY2l0eTogMCwgeTogMTAgfX1cbiAgICAgICAgICAgICAgICAgIGFuaW1hdGU9e3sgb3BhY2l0eTogMSwgeTogMCB9fVxuICAgICAgICAgICAgICAgICAgZXhpdD17eyBvcGFjaXR5OiAwLCB5OiAxMCB9fVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYWJzb2x1dGUgYm90dG9tLTggbGVmdC04IHJpZ2h0LThcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gdGV4dC1bOXB4XSB1cHBlcmNhc2UgZm9udC1tb25vIG1iLTEuNSB0ZXh0LWN5YW4tNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPkVzY2FuZWFuZG8gSG9zdHMgVnVsbmVyw6F2ZWlzLi4uPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj57TWF0aC5yb3VuZChzY2FuUHJvZ3Jlc3MpfSU8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaC0xIHctZnVsbCBiZy16aW5jLTkwMCByb3VuZGVkLWZ1bGwgb3ZlcmZsb3ctaGlkZGVuIGJvcmRlciBib3JkZXItd2hpdGUvNVwiPlxuICAgICAgICAgICAgICAgICAgICA8bW90aW9uLmRpdiBcbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJoLWZ1bGwgYmctY3lhbi01MDAgc2hhZG93LVswXzBfMTBweF9yZ2JhKDAsMjQyLDI1NSwwLjUpXVwiXG4gICAgICAgICAgICAgICAgICAgICAgaW5pdGlhbD17eyB3aWR0aDogMCB9fVxuICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGU9e3sgd2lkdGg6IGAke3NjYW5Qcm9ncmVzc30lYCB9fVxuICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9tb3Rpb24uZGl2PlxuICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgPC9BbmltYXRlUHJlc2VuY2U+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICB7LyogVHJhZmZpYyBNb25pdG9yICovfVxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2xhc3Mgcm91bmRlZC0zeGwgcC01IGJvcmRlci13aGl0ZS81XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBtYi00XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICA8QWN0aXZpdHkgY2xhc3NOYW1lPVwidGV4dC1jeWFuLTQwMCB3LTQgaC00XCIgLz5cbiAgICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC14cyBmb250LWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyXCI+TW9uaXRvciBkZSBUcsOhZmVnbzwvaDM+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTQgdGV4dC1bOXB4XSBmb250LW1vbm9cIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjVcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xLjUgaC0xLjUgcm91bmRlZC1mdWxsIGJnLWN5YW4tNTAwXCIgLz5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtemluYy00MDBcIj5ETDoge3N0YXRzLmRvd25sb2FkLnRvRml4ZWQoMSl9IE1icHM8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41XCI+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMS41IGgtMS41IHJvdW5kZWQtZnVsbCBiZy16aW5jLTYwMFwiIC8+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXppbmMtNDAwXCI+VUw6IHtzdGF0cy51cGxvYWQudG9GaXhlZCgxKX0gTWJwczwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaC0zMiB3LWZ1bGxcIj5cbiAgICAgICAgICAgICAgPFJlc3BvbnNpdmVDb250YWluZXIgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMTAwJVwiPlxuICAgICAgICAgICAgICAgIDxBcmVhQ2hhcnQgZGF0YT17aGlzdG9yeX0+XG4gICAgICAgICAgICAgICAgICA8ZGVmcz5cbiAgICAgICAgICAgICAgICAgICAgPGxpbmVhckdyYWRpZW50IGlkPVwiY29sb3JEb3dubG9hZFwiIHgxPVwiMFwiIHkxPVwiMFwiIHgyPVwiMFwiIHkyPVwiMVwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxzdG9wIG9mZnNldD1cIjUlXCIgc3RvcENvbG9yPVwiIzAwZjJmZlwiIHN0b3BPcGFjaXR5PXswLjN9Lz5cbiAgICAgICAgICAgICAgICAgICAgICA8c3RvcCBvZmZzZXQ9XCI5NSVcIiBzdG9wQ29sb3I9XCIjMDBmMmZmXCIgc3RvcE9wYWNpdHk9ezB9Lz5cbiAgICAgICAgICAgICAgICAgICAgPC9saW5lYXJHcmFkaWVudD5cbiAgICAgICAgICAgICAgICAgICAgPGxpbmVhckdyYWRpZW50IGlkPVwiY29sb3JVcGxvYWRcIiB4MT1cIjBcIiB5MT1cIjBcIiB4Mj1cIjBcIiB5Mj1cIjFcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8c3RvcCBvZmZzZXQ9XCI1JVwiIHN0b3BDb2xvcj1cIiM3MTcxN2FcIiBzdG9wT3BhY2l0eT17MC4zfS8+XG4gICAgICAgICAgICAgICAgICAgICAgPHN0b3Agb2Zmc2V0PVwiOTUlXCIgc3RvcENvbG9yPVwiIzcxNzE3YVwiIHN0b3BPcGFjaXR5PXswfS8+XG4gICAgICAgICAgICAgICAgICAgIDwvbGluZWFyR3JhZGllbnQ+XG4gICAgICAgICAgICAgICAgICA8L2RlZnM+XG4gICAgICAgICAgICAgICAgICA8QXJlYSBcbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cIm1vbm90b25lXCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGFLZXk9XCJkb3dubG9hZFwiIFxuICAgICAgICAgICAgICAgICAgICBzdHJva2U9XCIjMDBmMmZmXCIgXG4gICAgICAgICAgICAgICAgICAgIHN0cm9rZVdpZHRoPXsyfVxuICAgICAgICAgICAgICAgICAgICBmaWxsT3BhY2l0eT17MX1cbiAgICAgICAgICAgICAgICAgICAgZmlsbD1cInVybCgjY29sb3JEb3dubG9hZClcIiBcbiAgICAgICAgICAgICAgICAgICAgaXNBbmltYXRpb25BY3RpdmU9e2ZhbHNlfVxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgIDxBcmVhIFxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwibW9ub3RvbmVcIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YUtleT1cInVwbG9hZFwiIFxuICAgICAgICAgICAgICAgICAgICBzdHJva2U9XCIjNzE3MTdhXCIgXG4gICAgICAgICAgICAgICAgICAgIHN0cm9rZVdpZHRoPXsyfVxuICAgICAgICAgICAgICAgICAgICBmaWxsT3BhY2l0eT17MX1cbiAgICAgICAgICAgICAgICAgICAgZmlsbD1cInVybCgjY29sb3JVcGxvYWQpXCIgXG4gICAgICAgICAgICAgICAgICAgIGlzQW5pbWF0aW9uQWN0aXZlPXtmYWxzZX1cbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgPC9BcmVhQ2hhcnQ+XG4gICAgICAgICAgICAgIDwvUmVzcG9uc2l2ZUNvbnRhaW5lcj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvbWFpbj5cblxuICAgICAgey8qIEFkdmFuY2VkIE1lbnUgTW9kYWwgKi99XG4gICAgICA8QW5pbWF0ZVByZXNlbmNlPlxuICAgICAgICB7c2hvd0FkdmFuY2VkTWVudSAmJiAoXG4gICAgICAgICAgPG1vdGlvbi5kaXYgXG4gICAgICAgICAgICBpbml0aWFsPXt7IG9wYWNpdHk6IDAgfX1cbiAgICAgICAgICAgIGFuaW1hdGU9e3sgb3BhY2l0eTogMSB9fVxuICAgICAgICAgICAgZXhpdD17eyBvcGFjaXR5OiAwIH19XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJmaXhlZCBpbnNldC0wIHotNTAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcC00IGJnLWJsYWNrLzgwIGJhY2tkcm9wLWJsdXItc21cIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxtb3Rpb24uZGl2IFxuICAgICAgICAgICAgICBpbml0aWFsPXt7IHNjYWxlOiAwLjksIG9wYWNpdHk6IDAgfX1cbiAgICAgICAgICAgICAgYW5pbWF0ZT17eyBzY2FsZTogMSwgb3BhY2l0eTogMSB9fVxuICAgICAgICAgICAgICBleGl0PXt7IHNjYWxlOiAwLjksIG9wYWNpdHk6IDAgfX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZ2xhc3Mgdy1mdWxsIG1heC13LTJ4bCByb3VuZGVkLTN4bCBvdmVyZmxvdy1oaWRkZW4gYm9yZGVyLXdoaXRlLzEwIHNoYWRvdy0yeGwgZmxleCBmbGV4LWNvbCBtYXgtaC1bOTB2aF1cIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInB4LTggcHktNiBib3JkZXItYiBib3JkZXItd2hpdGUvNSBmbGV4IGp1c3RpZnktYmV0d2VlbiBpdGVtcy1jZW50ZXIgYmctemluYy05MDAvNTBcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgICAgICAgICA8U2xpZGVycyBjbGFzc05hbWU9XCJ0ZXh0LWN5YW4tNDAwIHctNiBoLTZcIiAvPlxuICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQteGwgZm9udC1ib2xkIHRleHQtd2hpdGVcIj5NZW51IEF2YW7Dp2FkbzwvaDI+XG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC16aW5jLTUwMCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0IGZvbnQtbW9ub1wiPkNvbmZpZ3VyYcOnw7VlcyBkbyBDb3JlPC9wPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNob3dBZHZhbmNlZE1lbnUoZmFsc2UpfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicC0yIHJvdW5kZWQtZnVsbCBob3ZlcjpiZy13aGl0ZS81IHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8WCBjbGFzc05hbWU9XCJ3LTYgaC02IHRleHQtemluYy00MDBcIiAvPlxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBvdmVyZmxvdy15LWF1dG8gcC04IHNwYWNlLXktOCBjdXN0b20tc2Nyb2xsYmFyXCI+XG4gICAgICAgICAgICAgICAgey8qIFBheWxvYWQgU2VjdGlvbiAqL31cbiAgICAgICAgICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJzcGFjZS15LTRcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICAgICAgPFRlcm1pbmFsIGNsYXNzTmFtZT1cInctNCBoLTQgdGV4dC1jeWFuLTQwMFwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYm9sZCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXJcIj5DdXN0b20gUGF5bG9hZDwvaDM+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGJnLWJsYWNrLzQwIGJvcmRlciBib3JkZXItd2hpdGUvNSByb3VuZGVkLTJ4bCBwLTQgZm9udC1tb25vIHRleHQteHMgb3V0bGluZS1ub25lIGZvY3VzOmJvcmRlci1jeWFuLTUwMC81MCB0cmFuc2l0aW9uLWNvbG9ycyBoLTI0IHJlc2l6ZS1ub25lXCJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU9e2FkdmFuY2VkQ29uZmlnLnBheWxvYWR9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0QWR2YW5jZWRDb25maWcoey4uLmFkdmFuY2VkQ29uZmlnLCBwYXlsb2FkOiBlLnRhcmdldC52YWx1ZX0pfVxuICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIkluc2lyYSBzZXUgcGF5bG9hZCBhcXVpLi4uXCJcbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgPC9zZWN0aW9uPlxuXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMSBtZDpncmlkLWNvbHMtMiBnYXAtOFwiPlxuICAgICAgICAgICAgICAgICAgey8qIFByb3RvY29sIFNlY3Rpb24gKi99XG4gICAgICAgICAgICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJzcGFjZS15LTRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxTaGllbGQgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LWN5YW4tNDAwXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyXCI+UHJvdG9jb2xvIFZQTjwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICAgICAgICB7UFJPVE9DT0xTLm1hcCgocHJvdG8pID0+IChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAga2V5PXtwcm90b31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0QWR2YW5jZWRDb25maWcoey4uLmFkdmFuY2VkQ29uZmlnLCBwcm90b2NvbDogcHJvdG99KX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtjbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInB5LTIuNSByb3VuZGVkLXhsIHRleHQtWzEwcHhdIGZvbnQtYm9sZCB0cmFuc2l0aW9uLWFsbCBib3JkZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZHZhbmNlZENvbmZpZy5wcm90b2NvbCA9PT0gcHJvdG8gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IFwiYmctY3lhbi01MDAvMTAgYm9yZGVyLWN5YW4tNTAwIHRleHQtY3lhbi00MDBcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogXCJiZy16aW5jLTkwMC81MCBib3JkZXItd2hpdGUvNSB0ZXh0LXppbmMtNTAwIGhvdmVyOmJvcmRlci13aGl0ZS8xMFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHtwcm90b31cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgICAgICAgICAgICAgey8qIFNOSSBTZWN0aW9uICovfVxuICAgICAgICAgICAgICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwic3BhY2UteS00XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8R2xvYmUgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LWN5YW4tNDAwXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyXCI+Q3VzdG9tIFNOSTwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBiZy1ibGFjay80MCBib3JkZXIgYm9yZGVyLXdoaXRlLzUgcm91bmRlZC14bCBweC00IHB5LTMgZm9udC1tb25vIHRleHQteHMgb3V0bGluZS1ub25lIGZvY3VzOmJvcmRlci1jeWFuLTUwMC81MCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWU9e2FkdmFuY2VkQ29uZmlnLnNuaX1cbiAgICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldEFkdmFuY2VkQ29uZmlnKHsuLi5hZHZhbmNlZENvbmZpZywgc25pOiBlLnRhcmdldC52YWx1ZX0pfVxuICAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwiZXg6IG0uZmFjZWJvb2suY29tXCJcbiAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgIDwvc2VjdGlvbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIHsvKiBETlMgU2VjdGlvbiAqL31cbiAgICAgICAgICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJzcGFjZS15LTRcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICAgICAgPFNlYXJjaCBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtY3lhbi00MDBcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyXCI+RE5TIEN1c3RvbWl6YWRvPC9oMz5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0yIGdhcC00XCI+XG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dCBcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwidGV4dFwiXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGJnLWJsYWNrLzQwIGJvcmRlciBib3JkZXItd2hpdGUvNSByb3VuZGVkLXhsIHB4LTQgcHktMyBmb250LW1vbm8gdGV4dC14cyBvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLWN5YW4tNTAwLzUwIHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgICAgICAgICAgICB2YWx1ZT17YWR2YW5jZWRDb25maWcuZG5zUHJpbWFyeX1cbiAgICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldEFkdmFuY2VkQ29uZmlnKHsuLi5hZHZhbmNlZENvbmZpZywgZG5zUHJpbWFyeTogZS50YXJnZXQudmFsdWV9KX1cbiAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIlByaW3DoXJpb1wiXG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dCBcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwidGV4dFwiXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGJnLWJsYWNrLzQwIGJvcmRlciBib3JkZXItd2hpdGUvNSByb3VuZGVkLXhsIHB4LTQgcHktMyBmb250LW1vbm8gdGV4dC14cyBvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLWN5YW4tNTAwLzUwIHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgICAgICAgICAgICB2YWx1ZT17YWR2YW5jZWRDb25maWcuZG5zU2Vjb25kYXJ5fVxuICAgICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0QWR2YW5jZWRDb25maWcoey4uLmFkdmFuY2VkQ29uZmlnLCBkbnNTZWNvbmRhcnk6IGUudGFyZ2V0LnZhbHVlfSl9XG4gICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJTZWN1bmTDoXJpb1wiXG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L3NlY3Rpb24+XG5cbiAgICAgICAgICAgICAgICB7LyogVG9nZ2xlcyAqL31cbiAgICAgICAgICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0xIG1kOmdyaWQtY29scy0yIGdhcC00XCI+XG4gICAgICAgICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRBZHZhbmNlZENvbmZpZyh7Li4uYWR2YW5jZWRDb25maWcsIHVkcEZvcndhcmRpbmc6ICFhZHZhbmNlZENvbmZpZy51ZHBGb3J3YXJkaW5nfSl9XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBwLTQgcm91bmRlZC0yeGwgYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLXdoaXRlLzUgaG92ZXI6Ymctd2hpdGUvMTAgdHJhbnNpdGlvbi1hbGxcIlxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtc3RhcnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZFwiPlVEUCBGb3J3YXJkaW5nPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtemluYy01MDBcIj5NZWxob3JhIHBlcmZvcm1hbmNlIGVtIGpvZ29zPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAge2FkdmFuY2VkQ29uZmlnLnVkcEZvcndhcmRpbmcgPyA8VG9nZ2xlUmlnaHQgY2xhc3NOYW1lPVwidGV4dC1jeWFuLTQwMCB3LTggaC04XCIgLz4gOiA8VG9nZ2xlTGVmdCBjbGFzc05hbWU9XCJ0ZXh0LXppbmMtNjAwIHctOCBoLThcIiAvPn1cbiAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuXG4gICAgICAgICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRBZHZhbmNlZENvbmZpZyh7Li4uYWR2YW5jZWRDb25maWcsIGNvbXByZXNzaW9uOiAhYWR2YW5jZWRDb25maWcuY29tcHJlc3Npb259KX1cbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIHAtNCByb3VuZGVkLTJ4bCBiZy13aGl0ZS81IGJvcmRlciBib3JkZXItd2hpdGUvNSBob3ZlcjpiZy13aGl0ZS8xMCB0cmFuc2l0aW9uLWFsbFwiXG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBpdGVtcy1zdGFydFwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1ib2xkXCI+Q29tcHJlc3PDo28gZGUgRGFkb3M8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC16aW5jLTUwMFwiPkVjb25vbWl6YSBkYWRvcyBtw7N2ZWlzPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAge2FkdmFuY2VkQ29uZmlnLmNvbXByZXNzaW9uID8gPFRvZ2dsZVJpZ2h0IGNsYXNzTmFtZT1cInRleHQtY3lhbi00MDAgdy04IGgtOFwiIC8+IDogPFRvZ2dsZUxlZnQgY2xhc3NOYW1lPVwidGV4dC16aW5jLTYwMCB3LTggaC04XCIgLz59XG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIHAtNCByb3VuZGVkLTJ4bCBiZy1yb3NlLTUwMC81IGJvcmRlciBib3JkZXItcm9zZS01MDAvMTAgaG92ZXI6Ymctcm9zZS01MDAvMTAgdHJhbnNpdGlvbi1hbGxcIlxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtc3RhcnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LXJvc2UtNDAwXCI+S2lsbCBTd2l0Y2g8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1yb3NlLTUwMC83MFwiPkJsb3F1ZWlhIGludGVybmV0IHNlIFZQTiBjYWlyPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPFRvZ2dsZVJpZ2h0IGNsYXNzTmFtZT1cInRleHQtcm9zZS01MDAgdy04IGgtOFwiIC8+XG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8L3NlY3Rpb24+XG4gICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicC04IGJnLXppbmMtOTAwLzgwIGJvcmRlci10IGJvcmRlci13aGl0ZS81IGZsZXggZmxleC1jb2wgZ2FwLTNcIj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgICAgICAgb25DbGljaz17aW5zdGFsbFBXQX1cbiAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXtpc0luc3RhbGxlZH1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17Y24oXG4gICAgICAgICAgICAgICAgICAgIFwidy1mdWxsIHB5LTQgcm91bmRlZC0yeGwgZm9udC1ib2xkIHRleHQtc20gdHJhbnNpdGlvbi1hbGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTMgc2hhZG93LWxnIGFjdGl2ZTpzY2FsZS05NVwiLFxuICAgICAgICAgICAgICAgICAgICBpc0luc3RhbGxlZCBcbiAgICAgICAgICAgICAgICAgICAgICA/IFwiYmctemluYy04MDAgdGV4dC16aW5jLTUwMCBjdXJzb3ItZGVmYXVsdFwiIFxuICAgICAgICAgICAgICAgICAgICAgIDogXCJiZy1jeWFuLTUwMCB0ZXh0LWJsYWNrIGhvdmVyOmJnLWN5YW4tNDAwIHNoYWRvdy1jeWFuLTUwMC8yMFwiXG4gICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxTaGllbGRDaGVjayBjbGFzc05hbWU9XCJ3LTUgaC01XCIgLz5cbiAgICAgICAgICAgICAgICAgIHtpc0luc3RhbGxlZCA/IFwiQXBsaWNhdGl2byBKw6EgSW5zdGFsYWRvXCIgOiBcIkluc3RhbGFyIEFwbGljYXRpdm8gT2ZpY2lhbCAoUFdBKVwifVxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyZWxhdGl2ZVwiPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIGZsZXggaXRlbXMtY2VudGVyXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy1mdWxsIGJvcmRlci10IGJvcmRlci13aGl0ZS81XCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVsYXRpdmUgZmxleCBqdXN0aWZ5LWNlbnRlciB0ZXh0LVsxMHB4XSB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0IHRleHQtemluYy02MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiYmctemluYy05MDAgcHgtMlwiPk91IEV4cGVyaW1lbnRhbDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXtpc0Rvd25sb2FkaW5nfVxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBzZXRJc0Rvd25sb2FkaW5nKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBzZXREb3dubG9hZFByb2dyZXNzKDApO1xuICAgICAgICAgICAgICAgICAgICBhZGRMb2coXCJBVklTTzogTyBBUEsgw6kgdW1hIHNpbXVsYcOnw6NvIGRlIGludGVyZmFjZS5cIiwgXCJ3YXJuaW5nXCIpO1xuICAgICAgICAgICAgICAgICAgICBhZGRMb2coXCJQcmVwYXJhbmRvIGFtYmllbnRlIGRlIGNvbXBpbGHDp8Ojby4uLlwiLCBcImluZm9cIik7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBibG9iID0gbmV3IEJsb2IoW1wiZW1mb3JtYSA0RyBQcm8gLSBWZXJzw6NvIE1vYmlsZSAoU2ltdWxhZGEpXCJdLCB7IHR5cGU6IFwiYXBwbGljYXRpb24vdm5kLmFuZHJvaWQucGFja2FnZS1hcmNoaXZlXCIgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9ncmVzc0ludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIHNldERvd25sb2FkUHJvZ3Jlc3MocHJldiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJldiA+PSAxMDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChwcm9ncmVzc0ludGVydmFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDEwMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwcmV2ICsgNTtcbiAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTUwKTtcblxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBhZGRMb2coXCJDb21waWxhbmRvIGJpbsOhcmlvcyBkbyB0w7puZWwgVlBOLi4uXCIsIFwiaW5mb1wiKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBhZGRMb2coXCJBc3NpbmFuZG8gQVBLIGNvbSBjZXJ0aWZpY2FkbyBkZSBwcm9kdcOnw6NvLi4uXCIsIFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICBhLmhyZWYgPSB1cmw7XG4gICAgICAgICAgICAgICAgICAgICAgYS5kb3dubG9hZCA9IFwiZW1mb3JtYV9Qcm9fdjQuMC4xLmFwa1wiO1xuICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYSk7XG4gICAgICAgICAgICAgICAgICAgICAgYS5jbGljaygpO1xuICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5VUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgYWRkTG9nKFwiRG93bmxvYWQgaW5pY2lhZG8gY29tIHN1Y2Vzc28hXCIsIFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICBzZXRJc0Rvd25sb2FkaW5nKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICBzZXREb3dubG9hZFByb2dyZXNzKDApO1xuICAgICAgICAgICAgICAgICAgICB9LCAzMDAwKTtcbiAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2NuKFxuICAgICAgICAgICAgICAgICAgICBcInctZnVsbCBweS00IHJvdW5kZWQtMnhsIGJnLXppbmMtODAwIGJvcmRlciBib3JkZXItd2hpdGUvMTAgdGV4dC16aW5jLTEwMCBmb250LWJvbGQgdGV4dC1zbSBob3ZlcjpiZy16aW5jLTcwMCB0cmFuc2l0aW9uLWFsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMyBhY3RpdmU6c2NhbGUtOTUgZ3JvdXAgcmVsYXRpdmUgb3ZlcmZsb3ctaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgICAgIGlzRG93bmxvYWRpbmcgJiYgXCJvcGFjaXR5LTgwIGN1cnNvci1ub3QtYWxsb3dlZFwiXG4gICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIHtpc0Rvd25sb2FkaW5nICYmIChcbiAgICAgICAgICAgICAgICAgICAgPG1vdGlvbi5kaXYgXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYWJzb2x1dGUgYm90dG9tLTAgbGVmdC0wIGgtMSBiZy1jeWFuLTUwMFwiXG4gICAgICAgICAgICAgICAgICAgICAgaW5pdGlhbD17eyB3aWR0aDogMCB9fVxuICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGU9e3sgd2lkdGg6IGAke2Rvd25sb2FkUHJvZ3Jlc3N9JWAgfX1cbiAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctOCBoLTggcm91bmRlZC1sZyBiZy1jeWFuLTUwMC8xMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBncm91cC1ob3ZlcjpiZy1jeWFuLTUwMC8yMCB0cmFuc2l0aW9uLWNvbG9yc1wiPlxuICAgICAgICAgICAgICAgICAgICB7aXNEb3dubG9hZGluZyA/IChcbiAgICAgICAgICAgICAgICAgICAgICA8UmVmcmVzaEN3IGNsYXNzTmFtZT1cInctNCBoLTQgdGV4dC1jeWFuLTQwMCBhbmltYXRlLXNwaW5cIiAvPlxuICAgICAgICAgICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICAgICAgICAgIDxEb3dubG9hZCBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtY3lhbi00MDBcIiAvPlxuICAgICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtc3RhcnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+e2lzRG93bmxvYWRpbmcgPyBcIkNvbXBpbGFuZG8gQVBLLi4uXCIgOiBcIkJhaXhhciBBcGxpY2F0aXZvICguQVBLKVwifTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC16aW5jLTUwMCBmb250LW5vcm1hbFwiPlxuICAgICAgICAgICAgICAgICAgICAgIHtpc0Rvd25sb2FkaW5nID8gYCR7TWF0aC5yb3VuZChkb3dubG9hZFByb2dyZXNzKX0lIGNvbmNsdcOtZG9gIDogXCJWZXJzw6NvIDQuMC4xIC0gMTIuNCBNQlwifVxuICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgICAgICBkaXNhYmxlZD17aXNaaXBwaW5nfVxuICAgICAgICAgICAgICAgICAgb25DbGljaz17ZG93bmxvYWRQcm9qZWN0WmlwfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtjbihcbiAgICAgICAgICAgICAgICAgICAgXCJ3LWZ1bGwgcHktNCByb3VuZGVkLTJ4bCBiZy16aW5jLTgwMCBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHRleHQtemluYy0xMDAgZm9udC1ib2xkIHRleHQtc20gaG92ZXI6YmctemluYy03MDAgdHJhbnNpdGlvbi1hbGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTMgYWN0aXZlOnNjYWxlLTk1IGdyb3VwXCIsXG4gICAgICAgICAgICAgICAgICAgIGlzWmlwcGluZyAmJiBcIm9wYWNpdHktODAgY3Vyc29yLW5vdC1hbGxvd2VkXCJcbiAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTggaC04IHJvdW5kZWQtbGcgYmctYW1iZXItNTAwLzEwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdyb3VwLWhvdmVyOmJnLWFtYmVyLTUwMC8yMCB0cmFuc2l0aW9uLWNvbG9yc1wiPlxuICAgICAgICAgICAgICAgICAgICB7aXNaaXBwaW5nID8gKFxuICAgICAgICAgICAgICAgICAgICAgIDxSZWZyZXNoQ3cgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LWFtYmVyLTQwMCBhbmltYXRlLXNwaW5cIiAvPlxuICAgICAgICAgICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICAgICAgICAgIDxEYXRhYmFzZSBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtYW1iZXItNDAwXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGl0ZW1zLXN0YXJ0XCI+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPntpc1ppcHBpbmcgPyBcIkVtcGFjb3RhbmRvLi4uXCIgOiBcIkJhaXhhciBDw7NkaWdvIEZvbnRlICguWklQKVwifTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC16aW5jLTUwMCBmb250LW5vcm1hbFwiPkFycXVpdm9zIGRvIHByb2pldG8gY29tcGxldG88L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0U2hvd0FkdmFuY2VkTWVudShmYWxzZSl9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgcHktNCByb3VuZGVkLTJ4bCBiZy1jeWFuLTUwMCB0ZXh0LWJsYWNrIGZvbnQtYm9sZCB0ZXh0LWxnIGhvdmVyOmJnLWN5YW4tNDAwIHRyYW5zaXRpb24tYWxsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0zIHNoYWRvdy1sZyBzaGFkb3ctY3lhbi01MDAvMjBcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxTYXZlIGNsYXNzTmFtZT1cInctNSBoLTVcIiAvPlxuICAgICAgICAgICAgICAgICAgU2FsdmFyIENvbmZpZ3VyYcOnw7Vlc1xuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvbW90aW9uLmRpdj5cbiAgICAgICAgICA8L21vdGlvbi5kaXY+XG4gICAgICAgICl9XG4gICAgICA8L0FuaW1hdGVQcmVzZW5jZT5cblxuICAgICAgey8qIFNlcnZlciBNZW51IE1vZGFsICovfVxuICAgICAgPEFuaW1hdGVQcmVzZW5jZT5cbiAgICAgICAge3Nob3dTZXJ2ZXJNZW51ICYmIChcbiAgICAgICAgICA8bW90aW9uLmRpdiBcbiAgICAgICAgICAgIGluaXRpYWw9e3sgb3BhY2l0eTogMCB9fVxuICAgICAgICAgICAgYW5pbWF0ZT17eyBvcGFjaXR5OiAxIH19XG4gICAgICAgICAgICBleGl0PXt7IG9wYWNpdHk6IDAgfX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT1cImZpeGVkIGluc2V0LTAgei01MCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBwLTQgYmctYmxhY2svODAgYmFja2Ryb3AtYmx1ci1zbVwiXG4gICAgICAgICAgPlxuICAgICAgICAgICAgPG1vdGlvbi5kaXYgXG4gICAgICAgICAgICAgIGluaXRpYWw9e3sgc2NhbGU6IDAuOSwgb3BhY2l0eTogMCB9fVxuICAgICAgICAgICAgICBhbmltYXRlPXt7IHNjYWxlOiAxLCBvcGFjaXR5OiAxIH19XG4gICAgICAgICAgICAgIGV4aXQ9e3sgc2NhbGU6IDAuOSwgb3BhY2l0eTogMCB9fVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJnbGFzcyB3LWZ1bGwgbWF4LXctbWQgcm91bmRlZC0zeGwgb3ZlcmZsb3ctaGlkZGVuIGJvcmRlci13aGl0ZS8xMCBzaGFkb3ctMnhsIGZsZXggZmxleC1jb2wgbWF4LWgtWzgwdmhdXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJweC02IHB5LTQgYm9yZGVyLWIgYm9yZGVyLXdoaXRlLzUgZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIGJnLXppbmMtOTAwLzUwXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxuICAgICAgICAgICAgICAgICAgPFNlcnZlciBjbGFzc05hbWU9XCJ0ZXh0LWN5YW4tNDAwIHctNSBoLTVcIiAvPlxuICAgICAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtbGcgZm9udC1ib2xkIHRleHQtd2hpdGVcIj5TZWxlY2lvbmFyIFNlcnZpZG9yPC9oMj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0U2hvd1NlcnZlck1lbnUoZmFsc2UpfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicC0yIHJvdW5kZWQtZnVsbCBob3ZlcjpiZy13aGl0ZS81IHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8WCBjbGFzc05hbWU9XCJ3LTUgaC01IHRleHQtemluYy00MDBcIiAvPlxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInAtNCBib3JkZXItYiBib3JkZXItd2hpdGUvNVwiPlxuICAgICAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXtzZWxlY3RGYXN0ZXN0U2VydmVyfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIHB5LTMgcm91bmRlZC0yeGwgYmctY3lhbi01MDAvMTAgYm9yZGVyIGJvcmRlci1jeWFuLTUwMC8zMCB0ZXh0LWN5YW4tNDAwIGZvbnQtYm9sZCB0ZXh0LXhzIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIGhvdmVyOmJnLWN5YW4tNTAwLzIwIHRyYW5zaXRpb24tYWxsXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8WmFwIGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgICAgICAgICAgU2VsZWNpb25hciBTZXJ2aWRvciBNYWlzIFLDoXBpZG9cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgb3ZlcmZsb3cteS1hdXRvIHAtNCBzcGFjZS15LTIgY3VzdG9tLXNjcm9sbGJhclwiPlxuICAgICAgICAgICAgICAgIHtTRVJWRVJTLm1hcCgoc2VydmVyKSA9PiAoXG4gICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIGtleT17c2VydmVyLmlkfVxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgc2V0U2VsZWN0ZWRTZXJ2ZXIoc2VydmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICBzZXRTaG93U2VydmVyTWVudShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgYWRkTG9nKGBTZXJ2aWRvciBhbHRlcmFkbyBwYXJhOiAke3NlcnZlci5uYW1lfWAsIFwiaW5mb1wiKTtcbiAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtjbihcbiAgICAgICAgICAgICAgICAgICAgICBcInctZnVsbCBwLTQgcm91bmRlZC0yeGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIHRyYW5zaXRpb24tYWxsIGJvcmRlclwiLFxuICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkU2VydmVyLmlkID09PSBzZXJ2ZXIuaWQgXG4gICAgICAgICAgICAgICAgICAgICAgICA/IFwiYmctY3lhbi01MDAvMTAgYm9yZGVyLWN5YW4tNTAwLzUwXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICA6IFwiYmctd2hpdGUvNSBib3JkZXItdHJhbnNwYXJlbnQgaG92ZXI6Ym9yZGVyLXdoaXRlLzEwXCJcbiAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtNFwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtMnhsXCI+e3NlcnZlci5mbGFnfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtbGVmdFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LXdoaXRlXCI+e3NlcnZlci5uYW1lfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXppbmMtNTAwIGZvbnQtbW9ub1wiPlBpbmc6IHtzZXJ2ZXIubGF0ZW5jeX1tczwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXJpZ2h0XCI+XG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2NuKFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0ZXh0LVsxMHB4XSBmb250LWJvbGRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlci5sb2FkID4gODAgPyBcInRleHQtcm9zZS01MDBcIiA6IHNlcnZlci5sb2FkID4gNTAgPyBcInRleHQtYW1iZXItNTAwXCIgOiBcInRleHQtZW1lcmFsZC01MDBcIlxuICAgICAgICAgICAgICAgICAgICAgICl9PntzZXJ2ZXIubG9hZH0lPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LVs4cHhdIHRleHQtemluYy02MDAgdXBwZXJjYXNlXCI+Q2FyZ2E8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L21vdGlvbi5kaXY+XG4gICAgICAgICAgPC9tb3Rpb24uZGl2PlxuICAgICAgICApfVxuICAgICAgPC9BbmltYXRlUHJlc2VuY2U+XG5cbiAgICAgIHsvKiBGb290ZXIgU3RhdHVzIEJhciAqL31cbiAgICAgIDxmb290ZXIgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIHB4LTQgcHktMiBnbGFzcyByb3VuZGVkLXhsIGJvcmRlci13aGl0ZS81IHRleHQtWzlweF0gdGV4dC16aW5jLTUwMCBmb250LW1vbm8gdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVzdFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTZcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17Y24oXCJ3LTEuNSBoLTEuNSByb3VuZGVkLWZ1bGxcIiwgaXNWcG5BY3RpdmUgPyBcImJnLWVtZXJhbGQtNTAwXCIgOiBcImJnLXppbmMtNzAwXCIpfSAvPlxuICAgICAgICAgICAgPHNwYW4+Q29yZTogdjQuMC4xLXN0YWJsZTwvc3Bhbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMS41IGgtMS41IHJvdW5kZWQtZnVsbCBiZy1jeWFuLTUwMFwiIC8+XG4gICAgICAgICAgICA8c3Bhbj5SZWdpb246IFNBLUVBU1QtMTwvc3Bhbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtNlwiPlxuICAgICAgICAgIDxzcGFuPk1UVToge2FkdmFuY2VkQ29uZmlnLm10dX08L3NwYW4+XG4gICAgICAgICAgPHNwYW4+RE5TOiB7YWR2YW5jZWRDb25maWcuZG5zUHJpbWFyeX08L3NwYW4+XG4gICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC16aW5jLTQwMFwiPsKpIGVtZm9ybWEgTGFicyAyMDI2PC9zcGFuPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZm9vdGVyPlxuXG4gICAgICA8c3R5bGUgZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUw9e3sgX19odG1sOiBgXG4gICAgICAgIC5jdXN0b20tc2Nyb2xsYmFyOjotd2Via2l0LXNjcm9sbGJhciB7XG4gICAgICAgICAgd2lkdGg6IDRweDtcbiAgICAgICAgfVxuICAgICAgICAuY3VzdG9tLXNjcm9sbGJhcjo6LXdlYmtpdC1zY3JvbGxiYXItdHJhY2sge1xuICAgICAgICAgIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50O1xuICAgICAgICB9XG4gICAgICAgIC5jdXN0b20tc2Nyb2xsYmFyOjotd2Via2l0LXNjcm9sbGJhci10aHVtYiB7XG4gICAgICAgICAgYmFja2dyb3VuZDogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA1KTtcbiAgICAgICAgICBib3JkZXItcmFkaXVzOiAxMHB4O1xuICAgICAgICB9XG4gICAgICAgIC5jdXN0b20tc2Nyb2xsYmFyOjotd2Via2l0LXNjcm9sbGJhci10aHVtYjpob3ZlciB7XG4gICAgICAgICAgYmFja2dyb3VuZDogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjEpO1xuICAgICAgICB9XG4gICAgICBgfX0gLz5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbiJdLCJtYXBwaW5ncyI6IkFBbVRZLFNBMkpNLFVBM0pOO0FBblRaLFNBQWdCLFVBQVUsV0FBVyxjQUFjO0FBQ25ELFNBQVMsUUFBUSx1QkFBdUI7QUFDeEM7QUFBQSxFQUNFO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUdBO0FBQUEsRUFJQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxPQUNLO0FBQ1A7QUFBQSxFQUNFO0FBQUEsRUFDQTtBQUFBLEVBS0E7QUFBQSxPQUNLO0FBQ1AsU0FBUyxpQkFBaUIsU0FBUyxVQUFVLHdCQUF3QjtBQUNyRSxTQUFTLFVBQVU7QUFDbkIsT0FBTyxXQUFXO0FBRWxCLE1BQU0sWUFBWSxD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
