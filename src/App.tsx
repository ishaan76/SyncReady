import React, { useState, useEffect } from "react";
import { 
  Zap, 
  Download, 
  Copy, 
  Check, 
  Info, 
  Monitor, 
  ShieldAlert, 
  ExternalLink,
  Laptop,
  CheckSquare,
  MessageSquare,
  RefreshCw,
  Search,
  Wifi,
  ChevronRight,
  Lock,
  Unlock,
  Trash2,
  Filter,
  Wrench,
  Database,
  ArrowLeft,
  Settings,
  User
} from "lucide-react";
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "./lib/firebase";
import { motion, AnimatePresence } from "motion/react";

// Local storage keys
const STATE_KEYS = {
  OS: "syncready_os",
  Browser: "syncready_browser",
  Adapter: "syncready_adapter",
  Phone: "syncready_phone",
  Name: "syncready_name",
  AdminPasscode: "syncready_admin_passcode"
};

interface SupportIssue {
  id?: string;
  name: string;
  phone: string;
  adapterName: string;
  os: string;
  browser: string;
  notes: string;
  status?: "Open" | "In-Progress" | "Resolved";
  timestamp: string;
}

export default function App() {
  // Page Routing (Determined dynamically by hash #admin or URL query parameter)
  const [currentView, setCurrentView] = useState<"client" | "admin">("client");
  const [adminPasscodeInput, setAdminPasscodeInput] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return localStorage.getItem("syncready_admin_authenticated") === "true";
  });
  const [adminError, setAdminError] = useState("");

  // Client selection states
  const [selectedOS, setSelectedOS] = useState<"win11" | "win10" | "mac" | "linux">(() => {
    return (localStorage.getItem(STATE_KEYS.OS) as any) || "win11";
  });
  const [selectedBrowser, setSelectedBrowser] = useState<"chrome" | "edge" | "safari" | "firefox">(() => {
    return (localStorage.getItem(STATE_KEYS.Browser) as any) || "chrome";
  });
  const [customAdapterName, setCustomAdapterName] = useState(() => {
    return localStorage.getItem(STATE_KEYS.Adapter) || "Realtek RTL8821CE 802.11ac PCIe Adapter";
  });

  // User input states for feedback/support logs
  const [ticketName, setTicketName] = useState(() => localStorage.getItem(STATE_KEYS.Name) || "");
  const [ticketPhone, setTicketPhone] = useState(() => localStorage.getItem(STATE_KEYS.Phone) || "");
  const [issueNotes, setIssueNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Copied text notification states
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Firebase Live feeds of registered disconnections log
  const [liveTickets, setLiveTickets] = useState<SupportIssue[]>([]);
  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState(false);

  // Search & Filters state for the Admin view
  const [adminSearch, setAdminSearch] = useState("");
  const [adminFilterOS, setAdminFilterOS] = useState("all");
  const [adminFilterBrowser, setAdminFilterBrowser] = useState("all");
  const [adminFilterStatus, setAdminFilterStatus] = useState("all");

  // Stress Testing Simulation State
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [stressSuccessMessage, setStressSuccessMessage] = useState<string | null>(null);

  // Sync state changes to local storage
  useEffect(() => {
    localStorage.setItem(STATE_KEYS.OS, selectedOS);
  }, [selectedOS]);

  useEffect(() => {
    localStorage.setItem(STATE_KEYS.Browser, selectedBrowser);
  }, [selectedBrowser]);

  useEffect(() => {
    localStorage.setItem(STATE_KEYS.Adapter, customAdapterName);
  }, [customAdapterName]);

  useEffect(() => {
    localStorage.setItem(STATE_KEYS.Name, ticketName);
  }, [ticketName]);

  useEffect(() => {
    localStorage.setItem(STATE_KEYS.Phone, ticketPhone);
  }, [ticketPhone]);

  // Sync hash routing
  useEffect(() => {
    const handleHashRouter = () => {
      const hash = window.location.hash;
      if (hash === "#admin" || hash === "#dashboard" || hash === "#telemetry") {
        setCurrentView("admin");
      } else {
        setCurrentView("client");
      }
    };

    handleHashRouter(); // Initialize
    window.addEventListener("hashchange", handleHashRouter);
    return () => window.removeEventListener("hashchange", handleHashRouter);
  }, []);

  // Connect listener to Firebase with higher list scope for admin management support
  useEffect(() => {
    if (!db) {
      console.warn("Firestore database configuration is missing.");
      return;
    }

    try {
      const q = query(
        collection(db, "issues"),
        orderBy("timestamp", "desc"),
        limit(150) // Larger volume limit for full developer review
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const issuesList: SupportIssue[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          issuesList.push({
            id: doc.id,
            name: data.reportedBy || data.name || "Anonymous User",
            phone: data.phone || "No phone added",
            adapterName: data.adapterName || "Default Wi-Fi Card",
            os: data.os || "Unknown OS",
            browser: data.browser || "Unknown Browser",
            notes: data.notes || "",
            status: data.status || "Open",
            timestamp: data.timestamp || new Date().toLocaleString()
          });
        });
        setLiveTickets(issuesList);
        setIsFirebaseLoaded(true);
      }, (err) => {
        console.error("Firestore listener error:", err);
        handleFirestoreError(err, OperationType.GET, "issues");
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Could not mount Firestore listener: ", e);
    }
  }, []);

  // Copy-to-clipboard trigger helper
  const triggerCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // One-Click batch file fixer downloader for Windows
  const downloadBatchScript = () => {
    const escapedAdapterName = customAdapterName.replace(/[^a-zA-Z0-9\s\.\-\(\)]/g, "");
    
    const batScriptContent = `@echo off
:: ====================================================================
::                   SyncReady OS Network Sleep Fixer
::            Enforces Continuous Sleep-Guard Protection for Sockets
:: ====================================================================
:: Automatically configures network adapter and link power management state.
:: Mode: Administrator Deployment Package
:: Target Wi-Fi Card: ${escapedAdapterName}
:: ====================================================================

echo [1/3] Elevating permissions. Verifying Administrator state...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ❌ ERROR: You must right-click this script and choose "Run as Administrator"!
    echo ❌ This is required to disable hardware power throttling parameters in Windows registry.
    echo.
    pause
    exit /b
)

echo.
echo 🛡️ [2/3] Configuring Network Card Sleep settings...
echo Target Card Name: "${escapedAdapterName}"
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Write-Host 'Inhibiting Windows Sleep State...' -ForegroundColor Cyan; Get-NetAdapter -Name '${escapedAdapterName}' | Set-NetAdapterPowerManagement -AllowComputerToTurnOffDevice Disabled" 2>nul

if %errorLevel% neq 0 (
    echo.
    echo ⚠️ Note: Precise driver string matching failed. 
    echo ⚠️ Applying power-saving rules to ALL active wireless adaptors instead...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetAdapter | Set-NetAdapterPowerManagement -AllowComputerToTurnOffDevice Disabled" 2>nul
)

echo.
echo 🔋 [3/3] PCI Express Link State Protection (Prevents active connection drops)...
powercfg /SETACVALUEINDEX SCHEME_CURRENT SUB_PCIEXPRESS ASAPM 0
powercfg /SETDCVALUEINDEX SCHEME_CURRENT SUB_PCIEXPRESS ASAPM 0
powercfg /SETACVALUEINDEX SCHEME_CURRENT SUB_NONE preventdispsleep 1

echo.
echo ====================================================================
:: Dynamic completion banner
echo 🎉 SUCCESS! All SyncReady Tweaks have been written to your Windows registry!
echo Your '${escapedAdapterName}' card won't switch off in sleep mode.
echo ====================================================================
echo.
echo Recommended Action: Restart your Laptop PC, then enjoy drop-free logins!
echo.
pause
`;

    const blob = new Blob([batScriptContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "SyncReady_WiFi_Wake_Fix.bat";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Send a troubleshooting/disconnection ticket to firebase Firestore
  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueNotes.trim()) return;

    setIsSubmitting(true);
    const timestamp = new Date().toLocaleString();

    if (db) {
      try {
        await addDoc(collection(db, "issues"), {
          reportedBy: ticketName.trim() || "Anonymous User",
          phone: ticketPhone.trim() || "No phone provided",
          adapterName: customAdapterName.trim(),
          os: selectedOS,
          browser: selectedBrowser,
          notes: issueNotes.trim(),
          status: "Open",
          timestamp
        });

        setIssueNotes("");
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3500);
      } catch (err) {
        console.error("Firestore push failed:", err);
        handleFirestoreError(err, OperationType.CREATE, "issues");
      }
    } else {
      console.warn("Firestore not configured, saving to console only.");
    }
    setIsSubmitting(false);
  };

  // Administrative login trigger
  const handleAdminAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasscodeInput.trim() === "7777") {
      setIsAdminAuthenticated(true);
      setAdminError("");
      setAdminPasscodeInput("");
      localStorage.setItem("syncready_admin_authenticated", "true");
    } else {
      setAdminError("Invalid authorization code. Please check your workspace security credentials.");
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem("syncready_admin_authenticated");
  };

  // Administrative status and direct deletion handlers
  const handleUpdateStatus = async (ticketId: string, newStatus: "Open" | "In-Progress" | "Resolved") => {
    if (!db) return;
    try {
      const docRef = doc(db, "issues", ticketId);
      await updateDoc(docRef, { status: newStatus });
    } catch (err) {
      console.error("Firestore status modification failed:", err);
      handleFirestoreError(err, OperationType.UPDATE, `issues/${ticketId}`);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!db) return;
    try {
      const docRef = doc(db, "issues", ticketId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Firestore document deletion failed:", err);
      handleFirestoreError(err, OperationType.DELETE, `issues/${ticketId}`);
    }
  };

  // Stress-testing database simulator
  const triggerStressTestSimulation = async () => {
    if (!db || isStressTesting) return;
    setIsStressTesting(true);
    setStressSuccessMessage(null);

    const syntheticDisconnections = [
      {
        name: "Aarav Sharma",
        phone: "919988776655",
        adapterName: "Intel Wi-Fi 6 AX201 160MHz",
        os: "win11",
        browser: "chrome",
        notes: "Power State Drop: Connection cuts off exact 3 mins after sleep timer. Device Manager reports adapter enter low current d3 state.",
        status: "Open"
      },
      {
        name: "Max Greenfield",
        phone: "14155552671",
        adapterName: "Realtek RTL8822CE PCIe",
        os: "win10",
        browser: "edge",
        notes: "Browser Snooze: Edge sleep-tab active. Tab memory saver forces IndexedDB socket thread freeze on standby.",
        status: "Open"
      },
      {
        name: "Sarah Jenkins",
        phone: "447700900077",
        adapterName: "Apple MacBook Airport Extreme",
        os: "mac",
        browser: "safari",
        notes: "Mac standby: Safari cookies clean rules delete indexedDB credentials because the pinned tab is considered dormant.",
        status: "In-Progress"
      },
      {
        name: "Dave Miller",
        phone: "491701234567",
        adapterName: "Atheros Qualcomm QCA6174",
        os: "linux",
        browser: "firefox",
        notes: "NetworkManager configuration: wifi.powersave toggled on 3 automatically.",
        status: "Resolved"
      },
      {
        name: "Amelia Chen",
        phone: "6591234567",
        adapterName: "Killer Wi-Fi 6 AX1650s",
        os: "win11",
        browser: "chrome",
        notes: "PCIe Active Link ASPM power saving is causing direct socket thread starvation.",
        status: "Open"
      }
    ];

    try {
      const writesList = syntheticDisconnections.map((data) => {
        return addDoc(collection(db, "issues"), {
          reportedBy: data.name,
          phone: data.phone,
          adapterName: data.adapterName,
          os: data.os,
          browser: data.browser,
          notes: data.notes,
          status: data.status,
          timestamp: new Date().toLocaleString()
        });
      });

      await Promise.all(writesList);
      setStressSuccessMessage(`🎉 Successfully wrote 5 concurrent stress-test cases to Firestore at ${new Date().toLocaleTimeString()}!`);
    } catch (e) {
      console.error("Stress write error", e);
      alert("Error: check permissions or offline connectivity");
    } finally {
      setIsStressTesting(false);
    }
  };

  const handleBulkClearLogs = async () => {
    if (!db) return;
    if (liveTickets.length === 0) {
      alert("No on-screen records to delete.");
      return;
    }
    const count = liveTickets.length;
    if (!window.confirm(`⚠️ WARNING: This will request sequential erasure of the ${count} synchronized document IDs currently inside your view. Proceed?`)) {
      return;
    }

    try {
      const eraseOperations = liveTickets.map((tc) => {
        if (tc.id) {
          return deleteDoc(doc(db, "issues", tc.id));
        }
        return Promise.resolve();
      });

      await Promise.all(eraseOperations);
      alert("Bulk wipe complete. All logs evicted successfully.");
    } catch (err) {
      console.error("Eviction error", err);
    }
  };

  // Help guides
  const tweaksDatabase = {
    win11: {
      powerCmd: "Get-NetAdapter | Set-NetAdapterPowerManagement -AllowComputerToTurnOffDevice Disabled",
      powerDesc: "Paste this command in PowerShell (Run as Administrator) to stop Windows from disconnecting your active Wi-Fi card when the laptop screen dim or sleeps.",
      manualSteps: [
        "Right-click Windows Start Button ➔ Select Device Manager.",
        "Expand Network adapters ➔ Double-click your active Wi-Fi Driver.",
        "Go to the Power Management tab.",
        "Uncheck the checkbox: 'Allow the computer to turn off this device to save power' ➔ click OK."
      ],
      verifyCmd: "Get-NetAdapterPowerManagement -Name '*' | Select Name, AllowComputerToTurnOffDevice"
    },
    win10: {
      powerCmd: "Get-NetAdapter | Set-NetAdapterPowerManagement -AllowComputerToTurnOffDevice Disabled",
      powerDesc: "Powershell script to disable active battery saver throttles on your adapter card.",
      manualSteps: [
        "Open Device Manager (Search using Windows Key).",
        "Open Network Adapters section ➔ Find your WiFi card model.",
        "Right-click on it ➔ Select Properties.",
        "In the Power Management tab, turn off 'Allow computer to switch off connection to preserve power'."
      ],
      verifyCmd: "Get-NetAdapterPowerManagement | Select Name, AllowComputerToTurnOffDevice"
    },
    mac: {
      powerCmd: "sudo pmset -a tcpkeepalive 1 preventdisplay sleep 1",
      powerDesc: "Run in Terminal to keep your TCP network socket packets alive and warm in low battery standby states.",
      manualSteps: [
        "Open Terminal on your Mac (Cmd + Space, search 'Terminal').",
        "Copy and paste the command shown above and tap Enter.",
        "Enter your MacBook unlock password to authorize the change.",
        "To prevent Safari from throwing out keys, pin your WhatsApp Web tab."
      ],
      verifyCmd: "pmset -g custom | grep -E 'sleep|tcpkeepalive'"
    },
    linux: {
      powerCmd: "sudo sed -i 's/wifi.powersave = 3/wifi.powersave = 2/' /etc/NetworkManager/conf.d/default-wifi-powersave-on.conf",
      powerDesc: "Stop NetworkManager from entering aggressive power save throttling modes on inactivity.",
      manualSteps: [
        "Open terminal prompt.",
        "Run the sed script above to switch powersave mode from 3 (Active Energy Saver) to 2 (Always On Performance).",
        "Restart network rules: sudo systemctl restart NetworkManager.",
        "Confirm that NetworkManager rules have updated."
      ],
      verifyCmd: "cat /etc/NetworkManager/conf.d/default-wifi-powersave-on.conf"
    }
  };

  const browserDatabase = {
    chrome: {
      exclusionRule: "[*.]whatsapp.com",
      tip: "Go to Chrome Settings ➔ Performance. Turn OFF 'Memory Saver' for WhatsApp Web, or add web.whatsapp.com to the 'Always keep these sites active' list so background networks don't freeze."
    },
    edge: {
      exclusionRule: "[*.]whatsapp.com",
      tip: "Search Edge Settings for 'Sleeping Tabs'. Add http://web.whatsapp.com to your exclusion list. This stops Microsoft Edge from putting the WhatsApp background chat thread to sleep."
    },
    safari: {
      exclusionRule: "Always Allow cookies from WhatsApp",
      tip: "To secure IndexedDB cookie files, turn off 'Prevent cross-site tracking' & 'Block all cookies'. Ensure you open or pin the tab at least once every 7 days to bypass Safari's database auto-cleanup."
    },
    firefox: {
      exclusionRule: "add https://web.whatsapp.com to Exceptions",
      tip: "Go to Settings ➔ Privacy & Security ➔ Cookies and Site Data ➔ Manage Exceptions. Add web.whatsapp.com and allow it to keep databases indefinitely."
    }
  };

  // Render Admin View if currentView is "admin"
  if (currentView === "admin") {
    if (!isAdminAuthenticated) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans antialiased">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl"
          >
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-rose-500/10 text-rose-550 rounded-2xl mb-2">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight font-mono">SyncReady Admin Gate</h2>
              <p className="text-xs text-slate-400 leading-normal">
                An authorization passcode is required to access telemetry logs, stress simulations, and system commands.
              </p>
            </div>

            <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">
                  Security Passcode
                </label>
                <input
                  type="password"
                  required
                  value={adminPasscodeInput}
                  onChange={(e) => setAdminPasscodeInput(e.target.value)}
                  placeholder="Enter 4-digit administrative passcode"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center text-sm font-mono tracking-widest text-slate-200 focus:outline-none focus:border-emerald-500 placeholder-slate-700"
                />
              </div>

              {adminError && (
                <p className="text-xs text-rose-500 font-mono text-center bg-rose-500/10 border border-rose-500/20 py-2 px-3 rounded-lg">
                  {adminError}
                </p>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10 uppercase tracking-wider"
                >
                  Verify Credentials
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = "";
                    setCurrentView("client");
                  }}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-900 text-slate-400 border border-slate-850 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Client Tool
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      );
    }

    // Filtered Tickets for Admin Console
    const filteredTickets = liveTickets.filter((ticket) => {
      const matchSearch = 
        ticket.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
        ticket.phone.toLowerCase().includes(adminSearch.toLowerCase()) ||
        ticket.adapterName.toLowerCase().includes(adminSearch.toLowerCase()) ||
        ticket.notes.toLowerCase().includes(adminSearch.toLowerCase());

      const matchOS = adminFilterOS === "all" || ticket.os === adminFilterOS;
      const matchBrowser = adminFilterBrowser === "all" || ticket.browser === adminFilterBrowser;
      const matchStatus = adminFilterStatus === "all" || 
        (adminFilterStatus === "Open" && (ticket.status === "Open" || !ticket.status)) ||
        ticket.status === adminFilterStatus;

      return matchSearch && matchOS && matchBrowser && matchStatus;
    });

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
        <header className="border-b border-slate-900 bg-slate-950/80 sticky top-0 backdrop-blur-md z-40">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500 rounded-xl text-white">
                <Settings className="w-5 h-5 animate-spin" style={{ animationDuration: "8s" }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tracking-tight text-white font-mono">SyncReady</span>
                  <span className="text-[10px] uppercase font-mono text-rose-400 font-bold bg-rose-400/10 px-2 py-0.5 rounded border border-rose-400/20">
                    Admin Portal
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Real-time Firebase database query, control panel, and load simulator.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  window.location.hash = "";
                  setCurrentView("client");
                }}
                className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 rounded-xl hover:text-white transition-colors cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Client View</span>
              </button>
              <button
                onClick={handleAdminLogout}
                className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Console</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-grow max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl space-y-1">
              <div className="text-[10px] uppercase font-mono text-slate-500 font-bold">Total Logs Collected</div>
              <div className="text-2xl font-black text-white font-mono">{liveTickets.length}</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl space-y-1">
              <div className="text-[10px] uppercase font-mono text-slate-500 font-bold">Matching Filter</div>
              <div className="text-2xl font-black text-rose-400 font-mono">{filteredTickets.length}</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl space-y-1">
              <div className="text-[10px] uppercase font-mono text-slate-500 font-bold">Database Instance</div>
              <div className="text-xs font-bold text-white font-mono truncate select-all" title="ai-studio-d4d7fd82-8cdb-4893-935d-c79425c0b5c2">
                ai-studio-d4d7fd82...
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl space-y-1">
              <div className="text-[10px] uppercase font-mono text-slate-500 font-bold">Firebase Core</div>
              <div className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                <span>Connected (Live)</span>
              </div>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-900 pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-rose-500" />
                  System Operations
                </h3>
                <p className="text-xs text-slate-400">Direct write/delete actions executing at the database edge.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={isStressTesting}
                  onClick={triggerStressTestSimulation}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  {isStressTesting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Simulating...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-3.5 h-3.5" />
                      <span>Stress Test (Write 5 Items)</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleBulkClearLogs}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bulk Clear All Logs</span>
                </button>
              </div>
            </div>

            {stressSuccessMessage && (
              <div className="p-3 bg-emerald-950/40 text-emerald-400 text-xs rounded-xl border border-emerald-500/20 text-center font-mono">
                {stressSuccessMessage}
              </div>
            )}
          </div>

          {/* Search and Filters */}
          <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-4.5 grid grid-cols-1 md:grid-cols-12 gap-3.5">
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="Search ticket logs by name, card driver, notes..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500 placeholder-slate-600"
              />
            </div>

            <div className="md:col-span-2">
              <select
                value={adminFilterOS}
                onChange={(e) => setAdminFilterOS(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-rose-500 font-mono"
              >
                <option value="all">OS: All Systems</option>
                <option value="win11">Windows 11</option>
                <option value="win10">Windows 10</option>
                <option value="mac">Apple macOS</option>
                <option value="linux">Linux</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={adminFilterBrowser}
                onChange={(e) => setAdminFilterBrowser(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-rose-500 font-mono"
              >
                <option value="all">Browser: All</option>
                <option value="chrome">Chrome</option>
                <option value="edge">Edge</option>
                <option value="safari">Safari</option>
                <option value="firefox">Firefox</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={adminFilterStatus}
                onChange={(e) => setAdminFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-rose-500 font-mono"
              >
                <option value="all">Status: All Logs</option>
                <option value="Open">Status: Open</option>
                <option value="In-Progress">Status: In-Progress</option>
                <option value="Resolved">Status: Resolved</option>
              </select>
            </div>
          </div>

          {/* List section */}
          <div className="space-y-3">
            {filteredTickets.map((ticket, idx) => (
              <div 
                key={ticket.id || idx} 
                className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-800 transition-all"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white text-sm font-mono truncate">{ticket.name}</span>
                    {ticket.phone && ticket.phone !== "No phone added" && ticket.phone !== "No phone provided" && (
                      <span className="bg-slate-950 text-slate-400 border border-slate-850 px-1.5 py-0.5 rounded text-[10px] font-mono select-all">
                        {ticket.phone}
                      </span>
                    )}
                    <span className="text-slate-500 font-mono text-[10px]">{ticket.timestamp}</span>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-900 font-sans leading-relaxed">
                    "{ticket.notes}"
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="bg-slate-950 border border-slate-850 px-2 py-0.5 rounded font-mono text-slate-400 uppercase">{ticket.os}</span>
                    <span className="bg-slate-950 border border-slate-850 px-2 py-0.5 rounded font-mono text-slate-400 uppercase">{ticket.browser}</span>
                    <span className="text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10 font-bold truncate">
                      {ticket.adapterName}
                    </span>
                    
                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 rounded border font-mono font-bold uppercase ${
                      ticket.status === "Resolved" 
                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/20" 
                        : ticket.status === "In-Progress"
                          ? "bg-amber-950/40 text-amber-400 border-amber-500/20"
                          : "bg-rose-950/40 text-rose-400 border-rose-500/20"
                    }`}>
                      {ticket.status || "Open"}
                    </span>
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end gap-2 shrink-0 w-full md:w-auto pt-2 md:pt-0 border-t md:border-0 border-slate-900">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block font-bold hidden md:block">Update Registry:</span>
                  <div className="flex items-center gap-1">
                    {(["Open", "In-Progress", "Resolved"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => ticket.id && handleUpdateStatus(ticket.id, status)}
                        className={`px-2 py-1 text-[10px] font-mono font-bold rounded border transition-all cursor-pointer ${
                          (ticket.status === status || (!ticket.status && status === "Open"))
                            ? "bg-slate-800 border-slate-700 text-white"
                            : "bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-300 hover:border-slate-800"
                        }`}
                      >
                        {status}
                      </button>
                    ))}

                    <button
                      onClick={() => ticket.id && handleDeleteTicket(ticket.id)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-600 border border-rose-500/10 hover:border-rose-500 text-rose-400 hover:text-white rounded transition-all cursor-pointer ml-1"
                      title="Delete record from Cloud Database"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {isFirebaseLoaded && filteredTickets.length === 0 && (
              <div className="py-16 border border-dashed border-slate-900 rounded-xl text-center text-xs text-slate-500 space-y-2 font-mono">
                <Database className="w-6 h-6 mx-auto text-slate-700" />
                <p>No telemetry log found matching current filters.</p>
              </div>
            )}
          </div>
        </main>

        <footer className="border-t border-slate-900 bg-slate-950 py-5 text-center text-[10px] text-slate-500 font-mono mt-8">
          <span>SyncReady Administrative Session active. Data synchronized in real-time.</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      
      {/* Header segment */}
      <header className="border-b border-slate-900 bg-slate-950/80 sticky top-0 backdrop-blur-md z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-xl text-slate-950">
              <Zap className="w-5 h-5 fill-current animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white font-mono">SyncReady</span>
                <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                  Fixer Utility
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Stop WhatsApp Web logout and network disconnection issues on laptop wake.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Cloud Sync Active</span>
          </div>
        </div>
      </header>

      {/* Main Single Screen Layout Container with neat responsive bounds */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 py-8 space-y-10">
        
        {/* Intro Explanatory Hero Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-emerald-950/20 to-slate-900/30 border border-emerald-550/15 rounded-2xl p-6 md:p-8 space-y-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0 mt-1">
              <Info className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                Why does WhatsApp Web keep getting logged out or disconnected?
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
                When you don't log in for a few days, your computer's OS and browser put the connection to sleep to preserve energy. This severs the WebSocket holding your login. We fix this by updating two things: your **operating system power saving policy** and your **browser tab suspension flags**.
              </p>
            </div>
          </div>

          {/* Quick Identify driver instruction */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-900 space-y-2 text-xs md:text-sm">
            <h4 className="flex items-center gap-2 font-mono text-emerald-400 font-bold uppercase tracking-wider">
              <Laptop className="w-4 h-4" />
              How to identify your Wi-Fi Adapter card model for tweaks:
            </h4>
            <div className="text-slate-300 leading-relaxed text-xs">
              Open your Windows Device Manager, find <strong className="text-white">"Network adapters"</strong>, and inspect the main wireless listing. Usually, it's called something like <span className="bg-slate-900 text-emerald-400 px-1.5 py-0.5 rounded font-mono border border-slate-800">Realtek RTL8821CE</span>, <span className="text-white">Intel Wireless AX201</span>, or or <span className="text-white">Qualcomm Atheros</span>. Use this driver name below.
            </div>
          </div>
        </motion.div>

        {/* Tweak Steps Section: Stacked and Centered for Sequential Flow */}
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Step 1: OS Sleep Fixer */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-900 pb-4">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Monitor className="w-4.5 h-4.5 text-emerald-400" />
                  Step 1: Fix Operating System Network Sleep Rules
                </h2>
                <p className="text-xs text-slate-400">Select your active environment format to apply the corrective sleep rules.</p>
              </div>
            </div>

            {/* Tabs list */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { id: "win11", name: "Windows 11" },
                { id: "win10", name: "Windows 10" },
                { id: "mac", name: "Apple macOS" },
                { id: "linux", name: "Linux OS" }
              ].map((os) => (
                <button
                  key={os.id}
                  onClick={() => setSelectedOS(os.id as any)}
                  className={`px-4.5 py-2 rounded-xl text-xs font-semibold cursor-pointer select-none transition-all ${
                    selectedOS === os.id 
                      ? "bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/10" 
                      : "bg-slate-950 border border-slate-850 text-slate-400 hover:text-white"
                  }`}
                >
                  {os.name}
                </button>
              ))}
            </div>

            {/* Details and Actions for Selected OS */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedOS}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Dynamic bat script generator only on Windows setups */}
                {(selectedOS === "win11" || selectedOS === "win10") && (
                  <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-900 space-y-4">
                    <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-4 border-b border-slate-900 pb-4">
                      <div className="space-y-1">
                        <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                          Option A: Recommended One-Click Downloader
                        </h3>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          Generate and download a tailored Windows batch repair script with your Wi-Fi name preloaded.
                        </p>
                      </div>
                      
                      <button
                        onClick={downloadBatchScript}
                        className="px-4.5 py-2 bg-slate-50 hover:bg-white text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer select-none transition-all shadow-md shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        Download Fixer (.bat)
                      </button>
                    </div>

                    {/* Customize Card Driver Input Field */}
                    <div className="space-y-2">
                      <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500">
                        Target Wi-Fi Card Driver Name (Optional):
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={customAdapterName}
                          onChange={(e) => setCustomAdapterName(e.target.value)}
                          placeholder="e.g. Realtek RTL8821CE 802.11ac PCIe Adapter"
                          className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={() => setCustomAdapterName("Realtek RTL8821CE 802.11ac PCIe Adapter")}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-xs text-slate-300 font-mono rounded-lg border border-slate-850 cursor-pointer transition-all"
                        >
                          Reset default name
                        </button>
                      </div>
                      <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-4 mt-2">
                        <li>Run the downloaded batch utility by right-clicking it and choosing <strong className="text-white">"Run as Administrator"</strong>.</li>
                        <li>It runs PowerShell to instantly stop Windows PCI lanes from cutting off connection power to the chip.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Commands copy paste */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block font-bold">
                      {(selectedOS === "win11" || selectedOS === "win10") ? "Option B: Manual Terminal Command fixes" : "Pragmatic Direct Fix Terminal Command:"}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 space-y-3 relative">
                    <div className="flex items-center justify-between gap-3 bg-black/50 p-3 rounded-lg border border-slate-900">
                      <code className="text-[11px] md:text-xs font-mono text-emerald-400 overflow-x-auto block whitespace-nowrap scrollbar-none">
                        {tweaksDatabase[selectedOS].powerCmd}
                      </code>
                      
                      <button
                        onClick={() => triggerCopy(tweaksDatabase[selectedOS].powerCmd)}
                        className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-xs hover:text-white cursor-pointer select-none font-mono flex items-center gap-1.5 shrink-0 transition-colors"
                      >
                        {copiedText === tweaksDatabase[selectedOS].powerCmd ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed italic">
                      &rarr; {tweaksDatabase[selectedOS].powerDesc}
                    </p>
                  </div>
                </div>

                {/* Symmetrical step by step guide */}
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block font-bold">
                    Manual step-by-step visual configuration:
                  </span>
                  <ol className="space-y-2.5 text-xs text-slate-300 bg-slate-950/30 p-4.5 rounded-xl border border-slate-900">
                    {tweaksDatabase[selectedOS].manualSteps.map((step, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start">
                        <span className="text-emerald-400 font-mono font-bold shrink-0">{idx + 1}.</span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Verification guidelines */}
                <div className="bg-slate-950/40 p-4.5 rounded-xl border border-slate-900 space-y-1.5 font-sans">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
                    Checking if power saver is disabled:
                  </span>
                  <div className="flex items-center justify-between gap-4 p-2 bg-slate-950 rounded-lg border border-slate-900">
                    <code className="text-[11.5px] font-mono text-emerald-300 overflow-x-auto block">
                      {tweaksDatabase[selectedOS].verifyCmd}
                    </code>
                    <button
                      onClick={() => triggerCopy(tweaksDatabase[selectedOS].verifyCmd)}
                      className="text-slate-500 hover:text-white p-1"
                      title="Copy validation code"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-relaxed leading-[1.4]">
                    Run this in Terminal or PowerShell to ensure settings are correct. The property parameters returned should reflect "False" or "Disabled" for target adapter cards.
                  </p>
                </div>

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Symmetrical timeline connector */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="w-1 h-10 bg-gradient-to-b from-emerald-500 to-emerald-800/20 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
          </div>

          {/* Step 2: Web Browser Exception Setup */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 md:p-8 space-y-6">
            <div className="space-y-1 border-b border-slate-900 pb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Laptop className="w-4.5 h-4.5 text-emerald-400" />
                Step 2: Fix Browser Tab Snoozing & Cookie Preservation
              </h2>
              <p className="text-xs text-slate-400">Keep WhatsApp Web database caches active and prevent background suspension for IndexedDB safety.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Browser Tabs & Code Exception */}
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block font-bold mb-2.5">
                    Select your active desktop web browser:
                  </span>
                  <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-900">
                    {[
                      { id: "chrome", name: "Chrome" },
                      { id: "edge", name: "Edge" },
                      { id: "safari", name: "Safari" },
                      { id: "firefox", name: "Firefox" }
                    ].map((br) => (
                      <button
                        key={br.id}
                        onClick={() => setSelectedBrowser(br.id as any)}
                        className={`flex-1 text-center py-2 rounded-lg text-[11px] font-mono cursor-pointer select-none transition-all ${
                          selectedBrowser === br.id
                            ? "bg-slate-800 text-white font-bold border border-slate-700"
                            : "text-slate-500 hover:text-white"
                        }`}
                      >
                        {br.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-mono text-slate-500 text-[10px] uppercase block font-bold">
                    Cookie Allow Exception Rule:
                  </span>
                  <div className="flex items-center justify-between gap-1 bg-slate-950 px-3 py-2 rounded-xl border border-slate-900">
                    <code className="text-emerald-400 font-mono text-xs font-bold leading-normal">
                      {browserDatabase[selectedBrowser].exclusionRule}
                    </code>
                    <button
                      onClick={() => triggerCopy(browserDatabase[selectedBrowser].exclusionRule)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-xs hover:text-white cursor-pointer select-none font-mono flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      {copiedText === browserDatabase[selectedBrowser].exclusionRule ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Dormancy protection & Pro Tip */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-1.5 bg-slate-950/60 p-4 rounded-xl border border-slate-900 text-xs">
                  <span className="font-mono text-slate-500 text-[10px] uppercase block font-bold">Dormancy Protection Steps:</span>
                  <p className="text-slate-300 leading-relaxed font-sans mt-1">
                    {browserDatabase[selectedBrowser].tip}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/40 border border-slate-900 rounded-xl text-[11px] text-slate-400 leading-relaxed">
                  <p>
                    <strong>💡 Pro-Tip:</strong> Pinned tabs in Google Chrome and Microsoft Edge are given high networking priority by default and are less likely to suffer socket disconnection sleeps. **Pin your WhatsApp Web tab!**
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Real-time Community Telemetry Feedback / Issue Logger */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          
          {/* Support Ticket Submission form */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-5">
            <div className="space-y-1.5 border-b border-slate-900 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
                Disconnection Feedback Registry (Cloud DB)
              </h3>
              <p className="text-xs text-slate-400">
                Still losing connection? Log your hardware model and OS issues here directly to the Firebase database to build general solutions.
              </p>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={ticketName}
                    onChange={(e) => setTicketName(e.target.value)}
                    placeholder="e.g. Robin Singh"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500 placeholder-slate-600"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">
                    Phone Number (Optional Reference)
                  </label>
                  <input
                    type="text"
                    value={ticketPhone}
                    onChange={(e) => setTicketPhone(e.target.value)}
                    placeholder="e.g. 919876543210"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500 placeholder-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">
                  Hardware issues / Laptop Adapter description
                </label>
                <textarea
                  required
                  rows={4}
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="State your laptop model, WiFi adapter card name, or what happens when your laptop lid closes..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500 placeholder-slate-600 resize-none font-sans"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="text-[10px] text-slate-500 leading-tight">
                  Autofill context: <span className="text-slate-300 font-mono">{selectedOS} ({selectedBrowser})</span>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-rose-950/20"
                >
                  {isSubmitting ? "Submitting Log..." : "Log Issue to Cloud Team"}
                </button>
              </div>
            </form>

            <AnimatePresence>
              {showSuccessToast && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-3 bg-emerald-950/40 text-emerald-400 text-xs rounded-xl border border-emerald-500/20 text-center font-mono"
                >
                  ✔ Log successfully sent dynamically to Firebase Firestore. Admin can review.
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Live Tickets / Feed Feed */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-1.5 border-b border-slate-900 pb-3.5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <MessageSquare className="w-4.5 h-4.5 text-emerald-400" />
                Recent Reported Laptop Logs ({liveTickets.length})
              </h3>
              <p className="text-xs text-slate-400">
                Shared disconnections references with registered adapters and hardware specs logged in Cloud Firestore.
              </p>
            </div>

            {/* Scrollable list of issues */}
            <div className="flex-grow overflow-y-auto max-h-[290px] pr-1.5 space-y-3 scrollbar-thin">
              {liveTickets.map((t, idx) => (
                <div key={t.id || idx} className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-200 font-mono">{t.name}</span>
                    <span className="font-mono text-slate-500 text-[10px]">{t.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-300 bg-slate-950 p-2 rounded border border-slate-900 leading-relaxed font-sans">
                    "{t.notes}"
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 select-none">
                    <span className="bg-slate-950 border border-slate-850 px-1.5 py-0.2 rounded font-mono uppercase text-slate-400">{t.os}</span>
                    <span className="bg-slate-950 border border-slate-850 px-1.5 py-0.2 rounded font-mono uppercase text-slate-400">{t.browser}</span>
                    <span className="text-emerald-500 font-mono leading-none">&bull; {t.adapterName}</span>
                  </div>
                </div>
              ))}

              {!isFirebaseLoaded && (
                <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-600" />
                  <p>Loading real-time Cloud records from database...</p>
                </div>
              )}

              {isFirebaseLoaded && liveTickets.length === 0 && (
                <div className="py-12 border border-dashed border-slate-900 text-slate-500 rounded-xl text-center text-xs">
                  No disconnections issues logs registered yet. Submit your issue above to start.
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-600 bg-slate-950/40 p-2 rounded-lg text-center font-mono">
              ⚡ Real-time collaborative connection logs powered by high-performance Firestore edge DB.
            </div>
          </div>

        </div>

      </main>

      {/* Neat Clean Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-[11px] text-slate-500 font-mono mt-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© 2026 SyncReady Sandbox. Zero complex features, purely functional.</span>
          <span>Made for laptop sleep state drops. Powered by Firebase Firestore.</span>
        </div>
      </footer>
    </div>
  );
}
