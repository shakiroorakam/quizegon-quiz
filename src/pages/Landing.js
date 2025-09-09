import React from "react";

export default function Landing({ setPage }) {
  return (
    <div
      className='d-flex flex-column align-items-center justify-content-center'
      style={{ height: "70vh" }}
    >
      <h1 className='mb-4'>Welcome to Quizegon</h1>
      <p className='lead mb-5'>Please select your login type.</p>
      <div className='d-grid gap-3 col-6 mx-auto'>
        <button
          className='btn btn-primary btn-lg'
          onClick={() => setPage("adminLogin")}
        >
          Admin Login
        </button>
        <button
          className='btn btn-success btn-lg'
          onClick={() => setPage("candidateLogin")}
        >
          Candidate Login
        </button>
      </div>
    </div>
  );
}
