import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './PageNotFound.jsx';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './ScrollToTop.jsx';
import Home from '@/pages/Home';
import Watch from '@/pages/Watch';
import Profile from '@/pages/Profile';
import PlayerLogin from '@/pages/PlayerLogin';
import Chats from '@/pages/Chats';
import Chat from '@/pages/Chat';
import { CallsignAuthProvider } from '@/lib/callsignAuth';
import { ChatNotificationsProvider } from '@/lib/chatNotifications';
import { PresenceProvider } from '@/lib/presence';
import { AppearanceProvider } from '@/lib/appearance';
import Friends from '@/pages/Friends';
import DirectMessages from '@/pages/DirectMessages';
import DM from '@/pages/DM';
import Events from '@/pages/Events';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Add your page Route elements here */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<PlayerLogin />} />
      <Route path="/watch/:id" element={<Watch />} />
      <Route path="/profile/:creator" element={<Profile />} />
      <Route path="/chats" element={<Chats />} />
      <Route path="/chat/:id" element={<Chat />} />
      <Route path="/friends" element={<Friends />} />
      <Route path="/events" element={<Events />} />
      <Route path="/dms" element={<DirectMessages />} />
      <Route path="/dm/:callsign" element={<DM />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <CallsignAuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <PresenceProvider>
              <ChatNotificationsProvider>
                <AppearanceProvider>
                  <AuthenticatedApp />
                </AppearanceProvider>
              </ChatNotificationsProvider>
            </PresenceProvider>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </CallsignAuthProvider>
    </AuthProvider>
  )
}

export default App
