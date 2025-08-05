import React from 'react';

export default function NotFound() {
    return (
        <div className="text-center mt-5">
            <h1>404 - Not Found</h1>
            <p>The page you are looking for does not exist.</p>
            <a href="/" className="btn btn-primary">Go to Homepage</a>
        </div>
    );
}
