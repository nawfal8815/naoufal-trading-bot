import { useState, useEffect, useRef } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function UserMenu() {
    const [open, setOpen] = useState(false);
    const [user, setUser] = useState(null);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, setUser);
        return () => unsub();
    }, []);

    // ✅ CLOSE ON CLICK OUTSIDE
    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false);
            }
        }

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    async function logout() {
        try {
            await signOut(auth);
        } catch (err) {
            console.error("Logout failed:", err);
        }
    }

    return (
        <div ref={menuRef} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="text-gray-400 hover:text-white transition"
            >
                {user?.photoURL ? (
                    <img
                        src={user.photoURL}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full border border-[#1f2933]"
                    />
                ) : (
                    <FaUserCircle className="w-10 h-10 text-gray-500" />
                )}
            </button>

            {open && (
                <div
                    className="
                        absolute right-0 mt-2 w-40
                        bg-[#11161d] border border-[#1f2933]
                        rounded-lg shadow-lg z-50
                    "
                >
                    <button
                        onClick={() => {
                            setOpen(false);
                            navigate("/settings");
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[#1f2933]"
                    >
                        Settings
                    </button>

                    <button
                        onClick={logout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[#1f2933]"
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}
