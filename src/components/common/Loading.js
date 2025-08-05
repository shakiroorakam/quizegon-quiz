import React from 'react';

export default function Loading({ text = 'Loading...' }) {
    return (
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: '80vh' }}>
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <h4 className="mt-3">{text}</h4>
        </div>
    );
}
