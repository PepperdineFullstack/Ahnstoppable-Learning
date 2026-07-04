import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

//connects to the index.html file
const root = createRoot(document.getElementById('root'));


//renders app in html file: inserts <App /> code
root.render(
    <StrictMode>
    <App />
    </StrictMode>
);