import { useState } from "react";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    updateProfile
} from "firebase/auth";
import { auth, googleProvider, githubProvider } from "../../firebase/firebase";
import { FaGoogle, FaGithub } from "react-icons/fa";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [error, setError] = useState("");

    async function submit(e) {
        e.preventDefault(); // ✅ IMPORTANT

        setError("");

        if (!email || !password || (!isLogin && !username)) {
            setError("All fields are required.");
            return;
        }

        if (!isLogin && password !== repeatPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const res = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(res.user, {
                    displayName: username
                });
            }
        } catch (err) {
            setError("Authentication failed. Check your credentials.");
        }
    }

    async function socialLogin(provider) {
        try {
            await signInWithPopup(auth, provider);
        } catch (err) {
            setError("Social login failed.");
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0b0f14] text-gray-100">
            <form
                onSubmit={submit}
                className="w-full max-w-md bg-[#11161d] border border-[#1f2933] rounded-xl p-6 space-y-4"
            >
                <h1 className="text-2xl font-extrabold text-center">
                    Trading Bot
                </h1>

                {error && (
                    <p className="text-red-400 text-sm text-center">{error}</p>
                )}

                {!isLogin && (
                    <input
                        type="text"
                        placeholder="Username"
                        className="w-full p-2 bg-[#0b0f14] border border-[#1f2933] rounded text-sm"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                    />
                )}

                <input
                    type="email"
                    placeholder="Email"
                    className="w-full p-2 bg-[#0b0f14] border border-[#1f2933] rounded text-sm"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Password"
                    className="w-full p-2 bg-[#0b0f14] border border-[#1f2933] rounded text-sm"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />

                {!isLogin && (
                    <input
                        type="password"
                        placeholder="Repeat password"
                        className="w-full p-2 bg-[#0b0f14] border border-[#1f2933] rounded text-sm"
                        value={repeatPassword}
                        onChange={e => setRepeatPassword(e.target.value)}
                    />
                )}

                <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded font-semibold transition"
                >
                    {isLogin ? "Login" : "Register"}
                </button>

                {/* SOCIAL LOGIN */}
                <div className="flex justify-center gap-4 pt-2">
                    <button
                        type="button"
                        onClick={() => socialLogin(googleProvider)}
                        className="p-3 rounded-full border border-[#1f2933] hover:bg-[#1f2933]"
                    >
                        <FaGoogle />
                    </button>

                    <button
                        type="button"
                        onClick={() => socialLogin(githubProvider)}
                        className="p-3 rounded-full border border-[#1f2933] hover:bg-[#1f2933]"
                    >
                        <FaGithub />
                    </button>
                </div>

                <p className="text-xs text-center text-gray-400">
                    {isLogin ? "No account?" : "Already have an account?"}{" "}
                    <span
                        className="text-blue-400 cursor-pointer"
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        {isLogin ? "Register" : "Login"}
                    </span>
                </p>
            </form>
        </div>
    );
}
