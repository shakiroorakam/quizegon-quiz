import React from 'react';

export default function Result({ onLogout }) {
    return (
        <div className="card mx-auto mt-5 text-center" style={{ maxWidth: '600px' }}>
            <div className="card-header">
                <h3>Quiz Complete</h3>
            </div>
            <div className="card-body p-5">
                <h4 className="card-title">You have successfully submitted the quiz.</h4>
                <p className="lead mt-4">Thank you for participating.</p>
                <p>You may now close this window or log out.</p>
                <button className="btn btn-primary mt-3" onClick={onLogout}>Logout</button>
            </div>
        </div>
    );
}
