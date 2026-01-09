import { useState, useEffect, useRef } from "react";
import { auth } from "../../firebase/firebase";
import {
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    onAuthStateChanged
} from "firebase/auth";
import { saveUserSettings, getUserInfo, getUserIG } from "../../firebase/queries.client";
import { FaUserCircle, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Settings() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [editingEmail, setEditingEmail] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newName, setNewName] = useState("");
    const [igLoading, setIgLoading] = useState(false);

    const [profileStatus, setProfileStatus] = useState(null);

    // Password
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [passwordStatus, setPasswordStatus] = useState(null);

    // Telegram
    const [telegramChatId, setTelegramChatId] = useState("");
    const [telegramStatus, setTelegramStatus] = useState(null);

    // IG
    const [igAccount, setIgAccount] = useState({
        apiKey: "",
        username: "",
        password: "",
        accountID: "",
        accountType: "CFD"
    });
    const [igStatus, setIgStatus] = useState(null);

    useEffect(() => {
        if (!user) return; // exit early if user not loaded

        const fetchUser = async () => {
            try {
                const { email, displayName } = await getUserInfo(user.uid);
                setEmail(email);
                setName(displayName);
            } catch (err) {
                console.error("DB fetch failed:", err);
                setEmail("");
                setName("");
            }
        };

        fetchUser(); // initial fetch
        const interval = setInterval(fetchUser, 60 * 1000); // optional auto-refresh

        return () => clearInterval(interval); // cleanup
    }, [user]); // run effect whenever `user` changes



    // Listen for user auth state
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);     // null or user
            setAuthLoading(false);     // auth resolved
        });

        return () => unsub();
    }, []);


    useEffect(() => {
        if (profileStatus?.type === "success") {
            const t = setTimeout(() => setProfileStatus(null), 5000);
            return () => clearTimeout(t);
        }
    }, [profileStatus]);


    const isPasswordUser = user?.providerData.some(
        p => p.providerId === "password"
    );

    // Auto-clear success messages after 5s
    useEffect(() => {
        let timeout;
        if (passwordStatus?.type === "success") {
            timeout = setTimeout(() => setPasswordStatus(null), 5000);
        }
        return () => clearTimeout(timeout);
    }, [passwordStatus]);

    useEffect(() => {
        let timeout;
        if (telegramStatus?.type === "success") {
            timeout = setTimeout(() => setTelegramStatus(null), 5000);
        }
        return () => clearTimeout(timeout);
    }, [telegramStatus]);

    useEffect(() => {
        let timeout;
        if (igStatus?.type === "success") {
            timeout = setTimeout(() => setIgStatus(null), 5000);
        }
        return () => clearTimeout(timeout);
    }, [igStatus]);

    // Password reset handler
    async function handlePasswordReset() {
        setPasswordStatus(null);

        if (!oldPassword || !newPassword || !repeatPassword) {
            setPasswordStatus({ type: "error", message: "All password fields are required." });
            return;
        }

        if (newPassword !== repeatPassword) {
            setPasswordStatus({ type: "error", message: "New passwords do not match." });
            return;
        }

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            setPasswordStatus({ type: "error", message: passwordError });
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(user.email, oldPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);

            setPasswordStatus({ type: "success", message: "Password updated successfully." });
            setOldPassword(""); setNewPassword(""); setRepeatPassword("");
        } catch (err) {
            let msg = "Password update failed.";
            if (err.code === "auth/wrong-password") msg = "Old password is incorrect.";
            if (err.code === "auth/weak-password") msg = "Password is too weak. Use a stronger password.";
            if (err.code === "auth/requires-recent-login") msg = "Please re-login and try again.";
            setPasswordStatus({ type: "error", message: msg });
        }
    }

    // Telegram save handler
    async function handleTelegramSave() {
        setTelegramStatus(null);

        if (!telegramChatId.trim()) {
            setTelegramStatus({ type: "error", message: "Telegram Chat ID cannot be empty." });
            return;
        }

        try {
            await saveUserSettings(auth.currentUser.uid, { telegramChatId, telegramChecked: false });
            setTelegramStatus({ type: "success", message: "Telegram Chat ID saved successfully. You will receive a check message in 5 secs" });
            setTelegramChatId("");
        } catch {
            setTelegramStatus({ type: "error", message: "Failed to save Telegram Chat ID." });
        }
    }

    // IG connect handler
    async function handleIGConnect() {
        setIgStatus(null);
        setIgLoading(true);

        const missing = Object.entries(igAccount).filter(([_, v]) => !v).map(([k]) => k);
        if (missing.length) {
            setIgLoading(false);
            setIgStatus({ type: "error", message: "All IG account fields are required." });
            return;
        }

        try {
            await saveUserSettings(auth.currentUser.uid, { igAccount, igChecked: false, igUndefiened: false });
            await new Promise(r => setTimeout(r, 6000));
            const confirmation = await getUserIG(user.uid);
            if (confirmation.igChecked) {
                setIgStatus({ type: "success", message: "IG account connected." });
                setIgAccount({
                    apiKey: "",
                    username: "",
                    password: "",
                    accountID: "",
                    accountType: "CFD"
                });
            }
            else setIgStatus({ type: "error", message: "IG account data is not valid or server problem." });
        } catch (err) {
            console.log(err);
        } finally {
            setIgLoading(false);
        }

    }

    function validatePassword(password) {
        if (password.length < 8) return "Password must be at least 8 characters long.";
        if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
        if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter.";
        if (!/[0-9]/.test(password)) return "Password must include at least one number.";
        if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) return "Password must include at least one special character.";
        return null;
    }

    async function handleSaveProfile() {
        if (!newEmail.trim() && !newName.trim()) {
            setProfileStatus({ type: "error", message: "Nothing to update." });
            return;
        }

        try {
            await saveUserSettings(auth.currentUser.uid, { email: newEmail, displayName: newName });

            setProfileStatus({ type: "success", message: "Profile updated successfully." });
            setEditingEmail(false);
            setEditingName(false);
            setNewEmail("");
            setNewName("");
        } catch {
            setProfileStatus({ type: "error", message: "Failed to save profile settings." });
        }
    }


    const providers = user?.providerData.map(p => p.providerId) || [];
    const isGoogleUser = providers.includes("google.com");
    const canEditProfile = providers.includes("password") || providers.includes("github.com");

    // Tailwind classes
    const card = "bg-[#11161d] border border-[#1f2933] rounded-xl p-5 w-full";
    const input = "w-full sm:w-[70%] lg:w-[60%] p-2 rounded bg-[#0b0f14] border border-[#1f2933] text-gray-100 block";
    const btn = "w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded border border-[#1f2933] transition";

    const statusBox = (s) =>
        s && (
            <div className={`mt-3 p-3 rounded border text-sm transition-opacity duration-500 ${s.type === "success" ? "border-green-500 text-green-400" : "border-red-500 text-red-400"}`}>
                {s.message}
            </div>
        );

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0b0f14] text-gray-400">
                Checking authentication…
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0f14] text-gray-400">
                <p className="mb-4">You must be logged in to access settings.</p>
                <button
                    onClick={() => navigate("/")}
                    className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                >
                    Go to Login
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b0f14] text-gray-100 p-4 sm:p-6">
            <div className="mx-auto w-full max-w-md sm:max-w-lg lg:max-w-[60%] space-y-6">

                {/* HEADER */}
                <div className="flex items-center gap-3 border-b border-[#1f2933] pb-4">
                    <button onClick={() => navigate("/")} className="text-gray-400 hover:text-gray-200"><FaArrowLeft /></button>
                    <h1 className="text-2xl font-extrabold">Settings</h1>
                </div>

                {/* USER */}
                <div className={`${card} flex items-center gap-4`}>
                    {user.photoURL ? (
                        <img src={user.photoURL} alt="Avatar" className="w-16 h-16 rounded-full border border-[#1f2933]" />
                    ) : (
                        <FaUserCircle className="w-16 h-16 text-gray-500" />
                    )}

                    <div className="flex-1 space-y-2">

                        {/* EMAIL */}
                        <div className="flex items-center gap-2">
                            {!editingEmail ? (
                                <>
                                    <p className="font-semibold">
                                        {user.email || email || "No email provided"}
                                    </p>

                                    {canEditProfile && (
                                        <button
                                            onClick={() => {
                                                setEditingEmail(true);
                                                setNewEmail(user.email || "");
                                            }}
                                            className="text-xs text-blue-400 hover:text-blue-300"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </>
                            ) : (
                                <input
                                    type="email"
                                    className="p-1 rounded bg-[#0b0f14] border border-[#1f2933] text-sm w-full"
                                    placeholder="Enter email"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                />
                            )}
                        </div>

                        {/* USERNAME */}
                        <div className="flex items-center gap-2">
                            {!editingName ? (
                                <>
                                    <p className="font-semibold">
                                        {user.displayName || name || "No username provided"}
                                    </p>

                                    {canEditProfile && (
                                        <button
                                            onClick={() => {
                                                setEditingName(true);
                                                setNewName(user.displayName || "");
                                            }}
                                            className="text-xs text-blue-400 hover:text-blue-300"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </>
                            ) : (
                                <input
                                    type="text"
                                    className="p-1 rounded bg-[#0b0f14] border border-[#1f2933] text-sm w-full"
                                    placeholder="Enter username"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                />
                            )}
                        </div>

                        {(editingEmail || editingName) && (
                            <div className="flex gap-2">
                                <button onClick={handleSaveProfile} className="text-xs text-green-400">
                                    Save
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingEmail(false);
                                        setEditingName(false);
                                    }}
                                    className="text-xs text-gray-400"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        {statusBox(profileStatus)}
                    </div>
                </div>


                {/* PASSWORD */}
                {isPasswordUser && (
                    <div className={card}>
                        <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-3">Reset Password</h2>
                        <input type="password" placeholder="Old password" className={`${input} mb-2`} value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                        <input type="password" placeholder="New password" className={`${input} mb-2`} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        <input type="password" placeholder="Repeat new password" className={`${input} mb-2`} value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} />
                        <p className="text-xs text-gray-500 mt-2">
                            Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
                        </p>
                        <button onClick={handlePasswordReset} className={`${btn} mt-3 text-green-400 hover:text-green-300`}>Save Password</button>
                        {statusBox(passwordStatus)}
                    </div>
                )}

                {/* NOTES */}
                <div className={card}>
                    <span className="mt-1 text-[15px] text-red-500 italic">IMPORTANT! </span>
                    <span className="block mt-1 text-[15px] text-teal-500 italic">
                        Before submitting your id search for @naoufal_trading_bot and send a message or click /start
                    </span>
                    <span className="block mt-1 text-[15px] text-teal-500 italic">
                        Request to join the telegram channel if you would like to 
                        <a
                            href="https://t.me/+zy1JgGTQZcs2MTU0"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-gray-400 hover:text-gray-300 transition-colors"
                        >
                            {` `}https://t.me/+zy1JgGTQZcs2MTU0
                        </a>
                    </span>
                    <span className="block mt-1 text-[15px] text-teal-500 italic">
                        To get your chat ID use @userinfobot Telegram bots, once you submit you will receive a check message!
                    </span>
                    <span className="block mt-1 text-[15px] text-teal-500 italic">
                        To get your IG Markets data login or create an account on
                        <a
                            href="https://www.ig.com/uk"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-gray-400 hover:text-gray-300 transition-colors"
                        >
                            {` `}ig.com
                        </a>
                    </span>
                </div>

                {/* TELEGRAM */}
                <div className={card}>
                    <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-3">Connect Telegram</h2>
                    <input type="text" placeholder="Telegram Chat ID" className={input} value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} />
                    <button onClick={handleTelegramSave} className={`${btn} mt-3 text-blue-400 hover:text-blue-300`}>Save Chat ID</button>
                    {statusBox(telegramStatus)}
                </div>

                {/* IG */}
                <div className={card}>
                    <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-3">Connect IG Markets</h2>
                    {["apiKey", "username", "password", "accountID", "accountType"].map(f => (
                        <input
                            key={f}
                            type={f === "password" ? "password" : "text"}
                            placeholder={f.replace(/([A-Z])/g, " $1")}
                            className={`${input} mb-2`}
                            value={igAccount[f]}
                            onChange={e => setIgAccount({ ...igAccount, [f]: e.target.value })}
                        />
                    ))}
                    <button
                        onClick={handleIGConnect}
                        disabled={igLoading}
                        className={`${btn} text-purple-400 hover:text-purple-300 flex items-center gap-2 ${igLoading ? "opacity-60 cursor-not-allowed" : ""
                            }`}
                    >
                        {igLoading && (
                            <span className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        )}
                        {igLoading ? "Connecting..." : "Connect IG Account"}
                    </button>

                    {statusBox(igStatus)}
                </div>

            </div>
        </div>
    );
}
