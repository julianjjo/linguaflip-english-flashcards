
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Import GoogleGenAI here if it were to be used directly or passed as prop,
// but for now, App.tsx handles its own import.
// import { GoogleGenAI } from "@google/genai"; 

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
