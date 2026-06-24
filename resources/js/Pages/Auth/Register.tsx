import { Head, useForm, Link } from '@inertiajs/react';
import { useState } from 'react';
import { asset } from '@/utils';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <Head title="Register SIPLAN" />

            {/* Background Image Full Screen - SAMA DENGAN LOGIN */}
            <div 
                className="auth-page min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
                style={{
                    backgroundImage: `url(${asset('images/coba.jpg')})`,
                }}
            >
                {/* Overlay tipis */}
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                
                {/* Card Register */}
                <div className="relative z-10 w-full max-w-md">
                    
                    {/* Card dengan background putih semi transparan */}
                    <div className="bg-white/90 backdrop-blur-sm shadow-2xl rounded-2xl p-10 border border-white/20">
                        
                        {/* LOGO - SAMA DENGAN LOGIN */}
                        <div className="flex justify-between items-center mb-6">
                            <img
                                src={asset('images/jai.jpg')}
                                className="h-10 max-w-[90px] object-contain"
                                alt="JAI Logo"
                            />
                            <img
                                src={asset('images/kampus.png')}
                                className="h-10"
                                alt="Kampus Logo"
                            />
                        </div>

                        {/* TITLE */}
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-800">
                                Create Account
                            </h1>
                            <p className="text-gray-600 text-sm">
                                Please register to continue
                            </p>
                        </div>

                        <form onSubmit={submit}>
                            {/* NAME dengan icon */}
                            <div className="mb-4">
                                <label className="text-sm text-gray-700 block mb-1 font-medium">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                        </svg>
                                    </span>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D6F42] focus:border-[#1D6F42] transition-all shadow-sm"
                                        placeholder="Enter your full name"
                                        required
                                    />
                                </div>
                                {errors.name && (
                                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                                )}
                            </div>

                            {/* EMAIL dengan icon - SAMA DENGAN LOGIN */}
                            <div className="mb-4">
                                <label className="text-sm text-gray-700 block mb-1 font-medium">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.57 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                        </svg>
                                    </span>
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D6F42] focus:border-[#1D6F42] transition-all shadow-sm"
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                                )}
                            </div>

                            {/* PASSWORD dengan icon - SAMA DENGAN LOGIN */}
                            <div className="mb-4">
                                <label className="text-sm text-gray-700 block mb-1 font-medium">
                                    Password
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                        </svg>
                                    </span>
                                    
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D6F42] focus:border-[#1D6F42] transition-all shadow-sm"
                                        placeholder="Enter your password"
                                        required
                                    />
                                    
                                    {/* Tombol show/hide password */}
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-[#1D6F42] focus:outline-none transition-colors"
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                                )}
                            </div>

                            {/* CONFIRM PASSWORD dengan icon */}
                            <div className="mb-4">
                                <label className="text-sm text-gray-700 block mb-1 font-medium">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                        </svg>
                                    </span>
                                    
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D6F42] focus:border-[#1D6F42] transition-all shadow-sm"
                                        placeholder="Confirm your password"
                                        required
                                    />
                                    
                                    {/* Tombol show/hide confirm password */}
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-[#1D6F42] focus:outline-none transition-colors"
                                    >
                                        {showConfirmPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {errors.password_confirmation && (
                                    <p className="text-red-500 text-sm mt-1">{errors.password_confirmation}</p>
                                )}
                            </div>

                            {/* BUTTON REGISTER */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full bg-[#1D6F42] hover:bg-green-800 text-white py-3 rounded-xl font-semibold transition disabled:opacity-60 shadow-lg shadow-[#1D6F42]/30 mb-4"
                            >
                                {processing ? 'Registering...' : 'Register'}
                            </button>

                            {/* LINK KE LOGIN */}
                            <p className="text-center text-sm text-gray-600">
                                Already have an account?{' '}
                                <Link
                                    href={route('login')}
                                    className="text-[#1D6F42] hover:text-[#166035] font-semibold hover:underline transition-all"
                                >
                                    Login here
                                </Link>
                            </p>
                        </form>

                        {/* FOOTER - SAMA DENGAN LOGIN */}
                        {/*<p className="text-center text-xs text-gray-500 mt-6">
                            SIPLAN • PT Jatim Autocomp Indonesia
                        </p>*/}

                    </div>
                </div>
            </div>
        </>
    );
}