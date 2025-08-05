import React, { useState, useEffect, useRef } from 'react';

export default function Timer({ duration, onTimeUp }) {
    const [timeLeft, setTimeLeft] = useState(duration);
    const onTimeUpRef = useRef(onTimeUp);

    // Update ref to avoid stale closure
    useEffect(() => {
        onTimeUpRef.current = onTimeUp;
    }, [onTimeUp]);

    useEffect(() => {
        if (timeLeft <= 0) {
            onTimeUpRef.current();
            return;
        }

        const intervalId = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [timeLeft]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const timerColorClass = timeLeft < 60 ? 'alert-danger' : 'alert-info';

    return (
        <div className={`alert ${timerColorClass} text-center sticky-top shadow-sm`}>
            <h4 className="mb-0">Time Left: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</h4>
        </div>
    );
}
