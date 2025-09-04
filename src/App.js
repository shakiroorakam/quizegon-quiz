import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/config";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import CandidateLogin from "./pages/CandidateLogin";
import Quiz from "./pages/Quiz";

// Helper to check for admin status
const isAdmin = async (user) => {
  if (!user) return false;
  // This identifies the admin by a specific email.
  return user.email === "shakirokm@gmail.com";
};

function App() {
  const [page, setPage] = useState("loading"); // loading, adminLogin, adminDashboard, candidateLogin, quiz
  const [quizId, setQuizId] = useState(null);
  const [candidate, setCandidate] = useState(null);

  // This effect runs only ONCE to determine the initial route.
  useEffect(() => {
    const hash = window.location.hash.slice(1); // remove # from "#/quiz/id" to get "/quiz/id"
    const pathSegments = hash.split("/"); // results in ["", "quiz", "id"]

    // This listener determines if the user is an admin or not.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && (await isAdmin(user))) {
        setPage("adminDashboard");
        return;
      }

      // If not an admin, we check the URL hash to decide the page.
      // Corrected check: segments are ["", "quiz", "id"]
      if (pathSegments[1] === "quiz" && pathSegments[2]) {
        setQuizId(pathSegments[2]);
        setPage("candidateLogin");
      } else {
        setPage("adminLogin");
      }
    });

    // Cleanup the listener when the component unmounts
    return () => unsubscribe();
  }, []); // The empty array ensures this effect runs only once on mount.

  const handleLoginSuccess = (candidateData) => {
    setCandidate(candidateData);
    setPage("quiz");
  };

  const handleLogout = () => {
    setCandidate(null);
    // Go back to the correct login page based on the original hash
    const hash = window.location.hash.slice(1);
    const pathSegments = hash.split("/");
    if (pathSegments[1] === "quiz" && pathSegments[2]) {
      setPage("candidateLogin");
    } else {
      setPage("adminLogin");
    }
  };

  const handleAdminLogout = () => {
    setPage("adminLogin");
  };

  const renderPage = () => {
    switch (page) {
      case "adminLogin":
        return <AdminLogin onAdminLogin={() => setPage("adminDashboard")} />;
      case "adminDashboard":
        return <AdminDashboard onLogout={handleAdminLogout} />;
      case "candidateLogin":
        return (
          <CandidateLogin quizId={quizId} onLoginSuccess={handleLoginSuccess} />
        );
      case "quiz":
        // Final safety check: If we're on the quiz page but have no candidate,
        // something went wrong, so we safely redirect to the login page.
        if (!candidate) {
          handleLogout(); // This resets to the correct login page
          return <div>Redirecting to login...</div>;
        }
        return (
          <Quiz
            quizId={quizId}
            candidate={candidate}
            onQuizComplete={handleLogout}
          />
        );
      case "loading":
      default:
        return <div className='loading-container'>Loading Application...</div>;
    }
  };

  return <div className='app-container'>{renderPage()}</div>;
}

export default App;
