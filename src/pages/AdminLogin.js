import React, { useState } from 'react';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

export default function AdminLogin({ setPage }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resetMessage, setResetMessage] = useState(''); // For success message

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setResetMessage('');
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged in App.js will handle redirect
        } catch (err) {
            setError('Failed to login. Please check your credentials.');
            console.error(err);
        }
        setIsLoading(false);
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Please enter your email address to reset your password.');
            return;
        }
        setError('');
        setResetMessage('');
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setResetMessage('Password reset email sent! Please check your inbox.');
        } catch (err) {
            setError('Failed to send reset email. Please check the email address.');
            console.error(err);
        }
        setIsLoading(false);
    };

    return (
        <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6 col-xl-5">
                <div className="card mt-5">
                    <div className="card-body p-4 p-sm-5">
                        <div className="text-center">
                            <h3 className="mb-1">Admin Login</h3>
                            <p className="text-muted mb-4">Sign in to manage your quizzes.</p>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label">Email address</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="mb-4">
                                <div className="d-flex justify-content-between align-items-center">
                                    <label className="form-label mb-0">Password</label>
                                    <button 
                                        type="button" 
                                        className="btn btn-link btn-sm p-0" 
                                        onClick={handleForgotPassword}
                                        disabled={isLoading}
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            {error && <div className="alert alert-danger">{error}</div>}
                            {resetMessage && <div className="alert alert-success">{resetMessage}</div>}
                            <div className="d-grid">
                                <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
                                    {isLoading ? 'Signing In...' : 'Sign In'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
