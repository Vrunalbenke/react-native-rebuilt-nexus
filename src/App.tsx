
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DatabaseProvider } from "./contexts/DatabaseContext";
import HomePage from "./pages/HomePage";
import JoggingPage from "./pages/JoggingPage";
import HistoryPage from "./pages/HistoryPage";
import JoggingDetailPage from "./pages/JoggingDetailPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DatabaseProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/jogging" element={<JoggingPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/jogging-detail/:sessionId" element={<JoggingDetailPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </DatabaseProvider>
  </QueryClientProvider>
);

export default App;
