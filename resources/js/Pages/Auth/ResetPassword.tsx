import { Head, useForm, Link } from '@inertiajs/react';
import { useState } from 'react';
import { asset } from '@/utils';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <Head title="Reset Password - SIPLAN" />

            {/* Background Image Full Screen - SAMA DENGAN HALAMAN LAIN */}
            <div 
                className="auth-page min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
                style={{
                    backgroundImage: `url(${asset('images/coba.jpg')})`,
                }}
            >
                {/* Overlay tipis */}
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                
                {/* Card Reset Password */}
                <div className="relative z-10 w-full max-w-md">
                    
                    {/* Card dengan background putih semi transparan */}
                    <div className="bg-white/90 backdrop-blur-sm shadow-2xl rounded-2xl p-10 border border-white/20">
                        
                        {/* LOGO - SAMA DENGAN HALAMAN LAIN */}
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
                                Reset Password
                            </h1>
                            <p className="text-gray-600 text-sm mt-2">
                                Please enter your new password below
                            </p>
                        </div>

                        {/* Info Card */}
                        <div className="bg-blue-50 border-l-4 border-[#1D6F42] p-4 mb-6 rounded-r-lg">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-[#1D6F42]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-gray-700">
                                        Password must be at least 8 characters long and include a mix of letters and numbers.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={submit}>
                            {/* EMAIL (Hidden - Tapi tetap ditampilkan untuk info) */}
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
                                        className="w-full pl-11 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-700 cursor-not-allowed"
                                        placeholder="Your email"
                                        readOnly
                                        disabled
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                                )}
                            </div>

                            {/* PASSWORD BARU - SAMA DENGAN REGISTER */}
                            <div className="mb-4">
                                <label className="text-sm text-gray-700 block mb-1 font-medium">
                                    New Password
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
                                        placeholder="Enter new password"
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

                            {/* KONFIRMASI PASSWORD BARU - SAMA DENGAN REGISTER */}
                            <div className="mb-6">
                                <label className="text-sm text-gray-700 block mb-1 font-medium">
                                    Confirm New Password
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
                                        placeholder="Confirm new password"
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

                            {/* BUTTON RESET PASSWORD */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full bg-[#1D6F42] hover:bg-green-800 text-white py-3 rounded-xl font-semibold transition disabled:opacity-60 shadow-lg shadow-[#1D6F42]/30 mb-4"
                            >
                                {processing ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Resetting...
                                    </span>
                                ) : 'Reset Password'}
                            </button>

                            {/* LINK KEMBALI KE LOGIN */}
                            <div className="text-center">
                                <Link
                                    href={route('login')}
                                    className="inline-flex items-center text-sm text-[#1D6F42] hover:text-[#166035] font-medium hover:underline transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                    </svg>
                                    Back to Login
                                </Link>
                            </div>
                        </form>

                        {/* FOOTER - SAMA DENGAN HALAMAN LAIN */}
                        {/*<p className="text-center text-xs text-gray-500 mt-6">
                            SIPLAN • PT Jatim Autocomp Indonesia
                        </p>*/}

                    </div>
                </div>
            </div>
        </>
    );
}