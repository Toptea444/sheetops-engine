import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupServiceWorker } from "./registerSW";

createRoot(document.getElementById("root")!).render(<App />);

setupServiceWorker();
