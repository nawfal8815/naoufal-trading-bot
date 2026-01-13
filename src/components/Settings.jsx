import { useState, useEffect } from "react";
import { auth } from "../../firebase/firebase";
import {
    updateEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    onAuthStateChanged,
    GithubAuthProvider,
    reauthenticateWithPopup,
    updateProfile,
    sendEmailVerification,
    verifyBeforeUpdateEmail
} from "firebase/auth";

import { api } from "../../src/server/frontendApi"; // Add this import
import { saveUserSettings, getUserIG } from "../../firebase/queries.client";
import { FaUserCircle, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Settings() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
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

    // AUTH LISTENER
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
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

    async function reauthGithub() {
        const provider = new GithubAuthProvider();
        await reauthenticateWithPopup(user, provider);
    }


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
                <button onClick={() => navigate("/")} className="px-4 py-2 rounded bg-blue-500 text-white">
                    Go to Login
                </button>
            </div>
        );
    }

    // ---------------- PROVIDER RULES ----------------

    const providers = user.providerData.map(p => p.providerId);

    const isGoogleUser = providers.includes("google.com");
    const isGithubUser = providers.includes("github.com");
    const isPasswordUser = providers.includes("password");

    const authEmail = user.email;
    const authName = user.displayName;

    const githubHasProfile = isGithubUser && authEmail !== null && authName !== null;

    const canEditEmail =
        isPasswordUser ||
        (isGithubUser && authEmail === null);


    const canEditName =
        isPasswordUser ||
        (isGithubUser && authName === null);

    const canEditPassword = isPasswordUser;

    // ---------------- PROFILE SAVE ----------------

    async function handleSaveProfile() {
        if (!user) return;
        try {
            if (isGoogleUser) return;
            // GITHUB USERS: check if they already have email/username
            if (isGithubUser && !isPasswordUser) {

                if (authEmail !== null && authName !== null) {
                    return;
                }

                // If either missing, allow adding
                if (newEmail || newName) {
                    if (newEmail) {
                        try {
                            await updateEmail(user, newEmail);
                        } catch (err) {
                            console.error("AUTH UPDATE ERROR:", err.message);
                            setProfileStatus("AUTH UPDATE ERROR")
                            return;
                        }
                    }

                    if (newName) {
                        try {
                            await updateProfile(user, { displayName: newName });
                        } catch (err) {
                            console.error("AUTH UPDATE ERROR:", err.message);
                            setProfileStatus("Failed to update username");
                            return;
                        }
                    }

                    setProfileStatus("GitHub profile updated successfully.");
                    setNewEmail("");
                    setNewName("");
                    return;
                } else {
                    alert("Nothing to update for GitHub user.");
                    return;
                }
            }

            // EMAIL/PASSWORD USERS: can update everything
            if (isPasswordUser) {
                let updated = false;

                if (newEmail !== null && newEmail !== user.email) {
                    try {
                        await sendEmailVerification(user);
                        await updateEmail(user, newEmail);
                        updated = true;
                    } catch (err) {
                        console.error("AUTH UPDATE ERROR:", err.message);
                        setProfileStatus("Failed to update email");
                    }
                }

                if (newName !== null && newName !== user.displayName) {
                    try {
                        await updateProfile(user, { displayName: newName });
                        updated = true;
                    } catch (err) {
                        console.error("AUTH UPDATE ERROR:", err.message);
                        setProfileStatus("Failed to update username");
                    }
                }

                if (updated) {
                    setProfileStatus("Profile updated successfully.");
                    setNewEmail("");
                    setNewName("");
                } else {
                    setProfileStatus("Nothing to update.");
                }
            }
        } catch (err) {
            console.error("AUTH UPDATE ERROR:", err.message);
            setProfileStatus("An unexpected error occurred");
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
        if (!telegramChatId.trim()) {
            setTelegramStatus({ type: "error", message: "Chat ID required." });
            return;
        }

        await saveUserSettings(user.uid, { telegramChatId, telegramChecked: false });
        setTelegramStatus({ type: "success", message: "Telegram saved." });
        setTelegramChatId("");
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
            await saveUserSettings(user.uid, { igAccount });

            const idToken = await user.getIdToken();
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

    // ---------------- UI ----------------

    const Spinner = () => (
        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
    );
    const card = "bg-[#11161d] border border-[#1f2933] rounded-xl p-5 w-full";
    const input = "w-full p-2 rounded bg-[#0b0f14] border border-[#1f2933]";
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
                        {!editingEmail ? (
                            <div className="flex gap-2 items-center">
                                <p>{authEmail || "No email"}</p>
                                {canEditEmail && (
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
                            <input
                                className={input}
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                placeholder="Email"
                            />
                        )}

                        {/* NAME */}
                        {!editingName ? (
                            <div className="flex gap-2 items-center">
                                <p>{authName || "No username"}</p>
                                {canEditName && (
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
                            <input
                                className={input}
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Username"
                            />
                        )}

                        {(editingEmail || editingName) && (
                            <div className="flex gap-2">
                                <button onClick={handleSaveProfile} className="text-green-400 text-xs">Save</button>
                                <button onClick={() => {
                                    setEditingEmail(false);
                                    setEditingName(false);
                                }} className="text-gray-400 text-xs">
                                    Cancel
                                </button>
                            </div>
                        )}

                        {statusBox(profileStatus)}
                    </div>
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

                {/* TELEGRAM */}
                <div className={card}>
                    <h2 className="text-sm text-gray-400 mb-3">Connect Telegram</h2>
                    <input className={input} value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} placeholder="Chat ID" />
                    <button onClick={handleTelegramSave} className={`${btn} mt-3 text-blue-400`}>Save</button>
                    {statusBox(telegramStatus)}
                </div>

                {/* IG */}
                <div className={card}>
                    <h2 className="text-sm text-gray-400 mb-3">Connect IG</h2>
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
                        className={`${btn} mt-3 text-purple-400 flex items-center justify-center gap-2 ${igLoading ? "opacity-60 cursor-not-allowed" : ""
                            }`}
                    >
                        {igLoading ? (
                            <>
                                <Spinner />
                                Connecting...
                            </>
                        ) : (
                            "Connect"
                        )}
                    </button>

                    {statusBox(igStatus)}
                </div>

            </div>
        </div>
    );
}