import { useState, useEffect, use } from "react";
import { auth } from "../../firebase/firebase";
import {
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    onAuthStateChanged,
    signOut
} from "firebase/auth";

import { api } from "../../src/server/frontendApi"; // Add this import
import { FaUserCircle, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Settings() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [idToken, setIdToken] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    const [editingEmail, setEditingEmail] = useState(false);
    const [editingName, setEditingName] = useState(false);

    const [newEmail, setNewEmail] = useState("");
    const [newName, setNewName] = useState("");

    const [profileStatus, setProfileStatus] = useState(null);

    // PASSWORD
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [passwordStatus, setPasswordStatus] = useState(null);

    // TELEGRAM
    const [telegramChatId, setTelegramChatId] = useState("");
    const [telegramStatus, setTelegramStatus] = useState(null);
    const [tgLoading, setTgLoading] = useState(false);

    // IG
    const [igLoading, setIgLoading] = useState(false);
    const [igStatus, setIgStatus] = useState(null);
    const [igAccount, setIgAccount] = useState({
        apiKey: "",
        username: "",
        password: "",
        accountID: "",
        accountType: "CFD"
    });


    const [userData, setUserData] = useState(null);
    const [userDataLoading, setUserDataLoading] = useState(true);

    const [confirmDisconnect, setConfirmDisconnect] = useState(null);
    // { type: "ig" | "telegram" } | null

    const [disconnectLoading, setDisconnectLoading] = useState(false);



    // AUTH LISTENER
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                const token = await firebaseUser.getIdToken();
                setIdToken(token); // now it's a string
            } else {
                setIdToken(null);
            }
            setAuthLoading(false);
        });
        return () => unsub();
    }, []);

    // AUTO CLEAR STATUS
    useEffect(() => {
        if (profileStatus?.type === "success") {
            const t = setTimeout(() => setProfileStatus(null), 5000);
            return () => clearTimeout(t);
        }
    }, [profileStatus]);

    useEffect(() => {
        if (passwordStatus?.type === "success") {
            const t = setTimeout(() => setPasswordStatus(null), 5000);
            return () => clearTimeout(t);
        }
    }, [passwordStatus]);

    useEffect(() => {
        if (telegramStatus?.type === "success") {
            const t = setTimeout(() => setTelegramStatus(null), 5000);
            return () => clearTimeout(t);
        }
    }, [telegramStatus]);

    useEffect(() => {
        if (igStatus?.type === "success") {
            const t = setTimeout(() => setIgStatus(null), 5000);
            return () => clearTimeout(t);
        }
    }, [igStatus]);

    useEffect(() => {
        if (!user) return;

        const fetchStatus = async () => {

            try {
                const res = await api.get(
                    `/api/get-account-status/${user.uid}`,
                    {
                        headers: {
                            Authorization: `Bearer ${idToken}`
                        }
                    }
                );
                if (res.status === 200) {
                    setUserData(res.data);
                } else {
                    console.error("Failed to fetch user data");
                }
                setUserDataLoading(false);
            } catch (err) {
                console.error("Error fetching user data:", err);
                setUserDataLoading(false);
            }

        };

        fetchStatus();
    }, [user]);

    if (!user && !authLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0f14] text-gray-400">
                <p className="mb-4">You must be logged in to access settings.</p>
                <button onClick={() => navigate("/")} className="px-4 py-2 rounded bg-blue-500 text-white">
                    Go to Login
                </button>
            </div>
        );
    }


    if (authLoading || userDataLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0b0f14] text-gray-400">
                Loading settings...
            </div>
        );
    }

    // ---------------- PROVIDER RULES ----------------

    const providers = user.providerData.map(p => p.providerId);

    const isGoogleUser = providers.includes("google.com");
    const isPasswordUser = providers.includes("password");
    const isGithubUser = providers.includes("github.com");


    const emailVerified = user.emailVerified || false;

    const authEmail = user.email;
    const authName = user.displayName;

    const hasProfile = isGithubUser && user.email !== null && user.displayName !== null;

    const canEdit =
        !isGoogleUser || !hasProfile;

    const canEditPassword = isPasswordUser;


    // ---------------- PROFILE SAVE ----------------

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    }



    async function handleSaveEmail() {
        setProfileStatus(null);

        if (!user || !canEdit) return;
        if (!isValidEmail(newEmail)) {
            setProfileStatus({ type: "error", message: "Invalid email format." });
            return;
        }

        try {
            const response = await api.post(
                "/api/update-profile",
                {
                    uid: user.uid,
                    type: "email",
                    changingData: newEmail
                },
                {
                    headers: {
                        Authorization: `Bearer ${idToken}`
                    }
                }
            );

            if (response.data.success) {
                setProfileStatus({ type: "success", message: response.data.message || "Email updated successfully." });
                setEditingEmail(false);
                setNewEmail("");
                setTimeout(() => {
                    signOut(auth);
                    navigate("/");
                }, 5000);
            } else {
                setProfileStatus({ type: "error", message: response.data.error || "Failed to update email." });
                return;
            }
        } catch (err) {
            console.error(err.message);
            setProfileStatus({ type: "error", message: "Failed to update email." });
        }
    }



    async function handleSaveName() {
        setProfileStatus(null);
        if (!user || !canEdit) return;

        try {
            const response = await api.post(
                "/api/update-profile",
                {
                    uid: user.uid,
                    type: "displayName",
                    changingData: newName
                },
                {
                    headers: {
                        Authorization: `Bearer ${idToken}`
                    }
                }
            );

            if (response.data.success) {
                setProfileStatus({ type: "success", message: response.data.message || "Name updated successfully." });
                setEditingName(false);
                setNewName("");
            } else {
                setProfileStatus({ type: "error", message: response.data.error || "Failed to update name." });
                return;
            }
        } catch (err) {
            console.error(err.message);
            setProfileStatus({ type: "error", message: "Failed to update name." });
        }
    }


    // ---------------- PASSWORD ----------------

    function validatePassword(password) {
        if (password.length < 8) return "Password must be at least 8 characters.";
        if (!/[A-Z]/.test(password)) return "Must include uppercase letter.";
        if (!/[a-z]/.test(password)) return "Must include lowercase letter.";
        if (!/[0-9]/.test(password)) return "Must include number.";
        if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) return "Must include special character.";
        return null;
    }

    async function handlePasswordReset() {
        setPasswordStatus(null);

        if (!oldPassword || !newPassword || !repeatPassword) {
            setPasswordStatus({ type: "error", message: "All fields required." });
            return;
        }

        if (newPassword !== repeatPassword) {
            setPasswordStatus({ type: "error", message: "Passwords do not match." });
            return;
        }

        const err = validatePassword(newPassword);
        if (err) {
            setPasswordStatus({ type: "error", message: err });
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(user.email, oldPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);

            setPasswordStatus({ type: "success", message: "Password updated." });
            setOldPassword(""); setNewPassword(""); setRepeatPassword("");
        } catch {
            setPasswordStatus({ type: "error", message: "Password update failed." });
        }
    }

    // ---------------- TELEGRAM ----------------

    async function handleTelegramSave() {
        setTgLoading(true);
        setTelegramStatus(null);
        if (!telegramChatId.trim()) {
            setTelegramStatus({ type: "error", message: "Chat ID required." });
            return;
        }
        try {
            const response = await api.post(
                "/api/verify-tg-chat-id",
                {
                    uid: user.uid,
                    telegramChatId
                },
                {
                    headers: {
                        Authorization: `Bearer ${idToken}`
                    }
                }
            );

            if (response.data.success) {
                setTelegramStatus({ type: "success", message: "Telegram saved." });
                setUserData(prev => ({
                    ...prev,
                    telegramChatId
                }));
                setTelegramChatId("");
            } else {
                setTelegramStatus({
                    type: "error",
                    message: response.data.message || "Telegram validation failed."
                });
            }
        } catch (error) {
            setTelegramStatus({
                type: "error",
                message: error.response?.data?.message || "Telegram validation failed."
            });
        } finally {
            setTgLoading(false);
        }



    }

    // ---------------- IG ----------------

    async function handleIGConnect() {
        setIgStatus(null);

        // 🔴 Validate inputs first
        const emptyField = Object.entries(igAccount).find(
            ([, value]) => !value || value.trim() === ""
        );

        if (emptyField) {
            setIgStatus({
                type: "error",
                message: "Please fill in all IG account fields."
            });
            return;
        }

        setIgLoading(true);

        try {
            const response = await api.post(
                "/api/verify-ig-account",
                {
                    uid: user.uid,
                    igAccount
                },
                {
                    headers: {
                        Authorization: `Bearer ${idToken}`
                    }
                }
            );

            if (response.data.success) {
                setUserData(prev => ({
                    ...prev,
                    igAccount: response.data.igAccount ?? igAccount
                }));
                setIgStatus({ type: "success", message: "IG connected." });
                setIgAccount({
                    apiKey: "",
                    username: "",
                    password: "",
                    accountID: "",
                    accountType: "CFD"
                });
            } else {
                setIgStatus({
                    type: "error",
                    message: response.data.message || "IG validation failed."
                });
            }
        } catch (error) {
            setIgStatus({
                type: "error",
                message: error.response?.data?.message || "IG validation failed."
            });
        } finally {
            setIgLoading(false);
        }
    }

    async function handleDisconnectConfirm() {
        if (!confirmDisconnect || !user) return;

        setDisconnectLoading(true);

        try {
            await api.delete(
                `/api/delete-account/${confirmDisconnect.type}/${user.uid}`,
                {
                    headers: {
                        Authorization: `Bearer ${idToken}`
                    }
                }
            );

            // Update local UI state
            if (confirmDisconnect.type === "ig") {
                setUserData(prev => ({
                    ...prev,
                    igAccount: null,
                    igChecked: false
                }));
            }

            if (confirmDisconnect.type === "telegram") {
                setUserData(prev => ({
                    ...prev,
                    telegramChatId: null
                }));
            }

            setConfirmDisconnect(null);
        } catch (err) {
            console.error("Disconnect failed:", err);
        } finally {
            setDisconnectLoading(false);
        }
    }


    // ---------------- UI ----------------

    const Spinner = (type) => (
        <div className={`w-4 h-4 border-2 ${type === "ig" ? "border-purple-400" : "border-blue-400"} border-t-transparent rounded-full animate-spin`} />
    );
    const card = "bg-[#11161d] border border-[#1f2933] rounded-xl p-5 w-full";
    const input = "w-full p-2 rounded bg-[#0b0f14] border border-[#1f2933] mb-2";
    const btn = "px-4 py-2 text-sm font-semibold rounded border border-[#1f2933]";

    const statusBox = (s) =>
        s && (
            <div className={`mt-3 p-3 rounded text-sm ${s.type === "success" ? "text-green-400" : "text-red-400"}`}>
                {s.message}
            </div>
        );

    return (
        <div className="min-h-screen bg-[#0b0f14] text-gray-100 p-6">
            <div className="mx-auto max-w-xl space-y-6">

                {/* HEADER */}
                <div className="flex items-center gap-3 border-b border-[#1f2933] pb-4">
                    <button onClick={() => navigate("/")}><FaArrowLeft /></button>
                    <h1 className="text-2xl font-bold">Settings</h1>
                </div>

                {/* USER */}
                <div className={`${card} flex gap-4`}>
                    {user.photoURL ? (
                        <img src={user.photoURL} className="w-16 h-16 rounded-full" />
                    ) : (
                        <FaUserCircle className="w-16 h-16 text-gray-500" />
                    )}
                    <div className="flex-1 space-y-2">

                        {/* EMAIL */}
                        <div className="space-y-1">
                            {!editingEmail ? (
                                <div className="flex gap-2 items-center">
                                    <p>{authEmail || "No email"}</p>
                                    {canEdit && (
                                        <button
                                            className="text-xs text-blue-400"
                                            onClick={() => {
                                                setEditingEmail(true);
                                                setNewEmail(authEmail || "");
                                            }}
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <input
                                        className={input}
                                        value={newEmail}
                                        onChange={e => setNewEmail(e.target.value)}
                                        placeholder="Email"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleSaveEmail} className="text-green-400 text-xs">
                                            Save Email
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingEmail(false);
                                                setNewEmail("");
                                            }}
                                            className="text-gray-400 text-xs"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            )}

                            {authEmail && !emailVerified && !isGoogleUser && (
                                <p className="text-xs text-yellow-400 mt-1">
                                    ⚠ Email not verified
                                </p>

                            )}

                        </div>

                        {/* NAME */}
                        <div className="space-y-1">
                            {!editingName ? (
                                <div className="flex gap-2 items-center">
                                    <p>{authName || "No username"}</p>
                                    {canEdit && (
                                        <button
                                            className="text-xs text-blue-400"
                                            onClick={() => {
                                                setEditingName(true);
                                                setNewName(authName || "");
                                            }}
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <input
                                        className={input}
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        placeholder="Username"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleSaveName} className="text-green-400 text-xs">
                                            Save Username
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingName(false);
                                                setNewName("");
                                            }}
                                            className="text-gray-400 text-xs"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {statusBox(profileStatus)}
                    </div>
                </div>

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

                {/* PASSWORD */}
                {canEditPassword && (
                    <div className={card}>
                        <h2 className="text-sm text-gray-400 mb-3">Reset Password</h2>
                        <input className={input} type="password" placeholder="Old password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                        <input className={input} type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        <input className={input} type="password" placeholder="Repeat new password" value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} />
                        <button onClick={handlePasswordReset} className={`${btn} mt-3 text-green-400`}>Save Password</button>
                        {statusBox(passwordStatus)}
                    </div>
                )}

                {/* ---------------- TELEGRAM ---------------- */}
                <div className={card}>
                    <h2 className="text-sm text-gray-400 mb-3">Connect Telegram</h2>

                    {userData?.telegramChatId ? (
                        <div className="flex flex-col gap-2">
                            <p><strong>Chat ID:</strong> {userData.telegramChatId}</p>
                            <button
                                className={`${btn} mt-2 text-red-400 w-max`}
                                onClick={() => setConfirmDisconnect({ type: "telegram" })}
                            >
                                Disconnect Telegram
                            </button>

                        </div>
                    ) : (
                        <>
                            <input
                                className={input}
                                value={telegramChatId}
                                onChange={e => setTelegramChatId(e.target.value)}
                                placeholder="Chat ID"
                            />
                            <button
                                onClick={handleTelegramSave}
                                className={`${btn} mt-3 text-blue-400 flex items-center justify-center gap-2 ${tgLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                                disabled={tgLoading}
                            >
                                {tgLoading ? (
                                    <>
                                        <Spinner type="tg" />
                                        Connecting...
                                    </>
                                ) : (
                                    "Save"
                                )}
                            </button>
                        </>
                    )}
                    {statusBox(telegramStatus)}
                </div>


                {/* ---------------- IG ---------------- */}
                <div className={card}>
                    <h2 className="text-sm text-gray-400 mb-3">Connect IG</h2>

                    {userData?.igAccount ? (
                        <div className="flex flex-col gap-2">
                            <p><strong>Account ID:</strong> {userData.igAccount?.accountID}</p>
                            <p><strong>Username:</strong> {userData.igAccount?.username}</p>
                            {typeof userData.igAccount?.balance === "number" ? (
                                <p>
                                    <strong>Balance:</strong> ${userData.igAccount.balance.toFixed(2)}
                                </p>
                            ) : (
                                <p className="text-gray-400 text-sm">Balance unavailable</p>
                            )}

                            <button
                                className={`${btn} mt-2 text-red-400 w-max`}
                                onClick={() => setConfirmDisconnect({ type: "ig" })}
                            >
                                Disconnect IG
                            </button>

                        </div>
                    ) : (
                        <>
                            {Object.keys(igAccount).map(k => (
                                <input
                                    key={k}
                                    className={input}
                                    type={k === "password" ? "password" : "text"}
                                    placeholder={k}
                                    value={igAccount[k]}
                                    onChange={e => setIgAccount({ ...igAccount, [k]: e.target.value })}
                                />
                            ))}
                            <button
                                onClick={handleIGConnect}
                                disabled={igLoading}
                                className={`${btn} mt-3 text-purple-400 flex items-center justify-center gap-2 ${igLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                            >
                                {igLoading ? (
                                    <>
                                        <Spinner type="ig" />
                                        Connecting...
                                    </>
                                ) : (
                                    "Connect"
                                )}
                            </button>
                        </>
                    )}
                    {statusBox(igStatus)}
                </div>


                {/* CONFIRM DISCONNECT MODAL */}
                {confirmDisconnect && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                        <div className="bg-[#11161d] border border-[#1f2933] rounded-xl p-6 w-full max-w-sm">
                            <h3 className="text-lg font-semibold mb-3">
                                Confirm Disconnect
                            </h3>

                            <p className="text-sm text-gray-400 mb-5">
                                Are you sure you want to disconnect your{" "}
                                <span className="text-red-400 font-semibold">
                                    {confirmDisconnect.type === "ig" ? "IG Markets" : "Telegram"}
                                </span>{" "}
                                account?
                            </p>

                            <div className="flex justify-end gap-3">
                                <button
                                    className={`${btn} text-gray-400`}
                                    onClick={() => setConfirmDisconnect(null)}
                                    disabled={disconnectLoading}
                                >
                                    Cancel
                                </button>

                                <button
                                    className={`${btn} text-red-400`}
                                    onClick={handleDisconnectConfirm}
                                    disabled={disconnectLoading}
                                >
                                    {disconnectLoading ? "Disconnecting..." : "Confirm"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}


            </div>
        </div>
    );
}