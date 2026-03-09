import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PwaManifestManager } from "@/components/PwaManifestManager";
import { RestrictedRoute } from "@/components/RestrictedRoute";

import Index from "./pages/Index";
import TL from "./pages/TL";
import AdminPinReset from "./pages/AdminPinReset";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import { GlobalSessionMonitor } from "./components/GlobalSessionMonitor";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <GlobalSessionMonitor />
      
      <BrowserRouter>
        <PwaManifestManager />
        <Routes>
          <Route path="/" element={<RestrictedRoute><Index /></RestrictedRoute>} />
          <Route path="/tl" element={<RestrictedRoute><TL /></RestrictedRoute>} />
          <Route path="/install" element={<Install />} />
          <Route path="/admin/pin-reset" element={<AdminPinReset />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<RestrictedRoute><NotFound /></RestrictedRoute>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
