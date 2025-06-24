import React, { useState } from 'react';
import { Eye, EyeOff, User, Lock } from 'lucide-react';
import Poke from '../assets/Poke.jpg'; // Ensure this path is correct
import { useNavigate } from 'react-router-dom';
const Home_Page = () => {
    const [user, setUser] = useState({
        Username: "",
        Password: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const API = "https://chengam.vercel.app/api/waiter";

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUser({
            ...user,
            [name.charAt(0).toUpperCase() + name.slice(1)]: value, // Match 'Username' and 'Password'
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(`${API}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(user)
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Login Successful", data);
                navigate('/billing')
            } else {
                console.error("Login Failed", data.error);
            }

             if (data.token) {
                localStorage.setItem('token', data.token);
            }
        } catch (error) {
            console.error("Error during login:", error);
        } finally {
            setIsLoading(false);
        }
        // Navigate to the billing page after successful login
    };

    return (
        <div style={{ backgroundImage: `url(${Poke})` }} className="min-h-screen flex items-center justify-center p-4">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-10 -left-10 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-violet-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
            </div>

            {/* Glassmorphism container */}
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 w-full max-w-md shadow-2xl">
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-white/5 to-white/10 pointer-events-none"></div>

                <div className="relative z-10">
                    {/* Header */}
                    <div className="text-center mb-8">

                        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                        <p className="text-white/70">Sign in to your account</p>
                    </div>

                    {/* Form */}
                    <div className="space-y-6">
                        {/* Username field */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-white/50" />
                            </div>
                            <input
                                type="text"
                                name="username"
                                value={user.Username}
                                onChange={handleChange}
                                placeholder="Username"
                                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                                required
                            />
                        </div>

                        {/* Password field */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-white/50" />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={user.Password}
                                onChange={handleChange}
                                placeholder="Password"
                                className="w-full pl-12 pr-12 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/50 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="w-full py-4 px-6 bg-white/10 border border-white/20 text-white font-semibold rounded-2xl backdrop-blur-md hover:bg-white/20 hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                                    Signing in...
                                </div>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <svg
                                        className="w-5 h-5 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                    Sign In
                                </span>
                            )}
                        </button>

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/20"></div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home_Page;