import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { Sidebar } from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import RealtimeWrapper from "@/components/RealtimeWrapper";
import Index from "./pages/Index";
import Tickets from "./pages/Tickets";
import Chat from "./pages/Chat";
import Analytics from "./pages/Analytics";
import Customers from "./pages/Customers";
import AdminDashboard from "./pages/AdminDashboard";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Logout from "./pages/Logout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <RealtimeWrapper>
            <DataProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/*" element={
                    <ProtectedRoute>
                      <div className="flex min-h-screen w-full">
                        <Sidebar />
                        <div className="flex-1">
                          <ErrorBoundary>
                            <Routes>
                              <Route path="/" element={<Index />} />
                              <Route path="/tickets" element={<Tickets />} />
                              <Route path="/chat" element={<Chat />} />
                              <Route path="/analytics" element={<Analytics />} />
                              <Route path="/customers" element={<Customers />} />
                              <Route path="/admin" element={<AdminDashboard />} />
                              <Route path="/settings" element={<Settings />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </ErrorBoundary>
                        </div>
                      </div>
                    </ProtectedRoute>
                  } />
                </Routes>
              </BrowserRouter>
            </DataProvider>
          </RealtimeWrapper>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;