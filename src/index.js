import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css'; 

import App from './App';

// --- ADD THIS CODE ---
// This code handles the redirect from the 404.html page.
(function() {
  var redirect = sessionStorage.redirect;
  delete sessionStorage.redirect;
  if (redirect && redirect !== window.location.href) {
    history.replaceState(null, null, redirect);
  }
})();
// --- END OF ADDED CODE ---

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);