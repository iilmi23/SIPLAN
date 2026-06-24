import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { asset } from '@/utils';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});
    const [resendClicked, setResendClicked] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        setResendClicked(true);
        post(route('verification.send'), {
            onSuccess: () => {
                setTimeout(() => setResendClicked(false), 3000);
            }
        });
    };

    return (
        <>
            <Head title="Verify Email - SIPLAN" />

            {/* Background Image Full Screen - SAMA DENGAN HALAMAN LAIN */}
            <div 
                className="auth-page min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
                style={{
                    backgroundImage: `url(${asset('images/coba.jpg')})`,
                }}
            >
                {/* Overlay tipis */}
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                
                {/* Card Verify Email */}
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
                        <div className="text-center mb-4">
                            <h1 className="text-2xl font-bold text-gray-800">
                                Verify Your Email
                            </h1>
                            <p className="text-gray-600 text-sm mt-2">
                                Almost there! Please verify your email address.
                            </p>
                        </div>

                        {/* Icon Email Verification */}
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-[#1D6F42]/10 rounded-full flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#1D6F42" className="w-10 h-10">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.981l7.5-4.039a2.25 2.25 0 012.134 0l7.5 4.039a2.25 2.25 0 011.183 1.98V19.5z" />
                                </svg>
                            </div>
                        </div>

                        {/* Info Card - Penjelasan */}
                        <div className="bg-blue-50 border-l-4 border-[#1D6F42] p-4 mb-6 rounded-r-lg">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-[#1D6F42]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-gray-700">
                                        Thanks for signing up! Before getting started, please verify your email address by clicking the link we sent to your inbox.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Success Message */}
                        {status === 'verification-link-sent' && (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-green-800">
                                            A new verification link has been sent to your email address!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Resend Success Message (local) */}
                        {resendClicked && !processing && (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-700 text-center">
                                    ✓ Verification email sent! Please check your inbox.
                                </p>
                            </div>
                        )}

                        <form onSubmit={submit}>
                            {/* Tips Box */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-6">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Didn't receive the email?</h3>
                                <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                                    <li>Check your spam or junk folder</li>
                                    <li>Make sure you entered the correct email address</li>
                                    <li>Wait a few minutes - emails can sometimes be delayed</li>
                                </ul>
                            </div>

                            {/* BUTTON RESEND & LOGOUT */}
                            <div className="space-y-3">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full bg-[#1D6F42] hover:bg-green-800 text-white py-3 rounded-xl font-semibold transition disabled:opacity-60 shadow-lg shadow-[#1D6F42]/30 flex items-center justify-center"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.57 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                            </svg>
                                            Resend Verification Email
                                        </>
                                    )}
                                </button>

                                <Link
                                    href={route('logout')}
                                    method="post"
                                    as="button"
                                    className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-medium transition flex items-center justify-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                    </svg>
                                    Log Out
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