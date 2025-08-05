import React from 'react';

export default function QuestionGrid({ questions, answers, currentIndex, onSelectQuestion }) {
    const getStatus = (questionId, index) => {
        if (index === currentIndex) return 'btn-warning'; // Current question
        if (answers[questionId]) return 'btn-success'; // Answered
        return 'btn-outline-secondary'; // Not answered
    };

    return (
        <div className="card mt-4">
            <div className="card-header">Question Navigation</div>
            <div className="card-body">
                <div className="d-flex flex-wrap" style={{gap: '0.5rem'}}>
                    {questions.map((q, i) => (
                        <button
                            key={q.id}
                            className={`btn ${getStatus(q.id, i)}`}
                            style={{ width: '50px', height: '40px' }}
                            onClick={() => onSelectQuestion(i)}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
                 <div className="d-flex flex-wrap mt-3" style={{gap: '1rem'}}>
                    <small className="d-flex align-items-center"><span className="d-inline-block rounded-circle me-2" style={{width: '15px', height: '15px', backgroundColor: '#198754'}}></span> Answered</small>
                    <small className="d-flex align-items-center"><span className="d-inline-block border rounded-circle me-2" style={{width: '15px', height: '15px', backgroundColor: '#6c757d', opacity: '0.2'}}></span> Not Answered</small>
                    <small className="d-flex align-items-center"><span className="d-inline-block rounded-circle me-2" style={{width: '15px', height: '15px', backgroundColor: '#ffc107'}}></span> Current</small>
                </div>
            </div>
        </div>
    );
}
