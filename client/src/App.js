import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { auth, signOut } from './firebase';
import { io } from 'socket.io-client';
import Login from './components/Login';
import DraftRoom from './components/DraftRoom';
import MyTeam from './components/MyTeam';
import ManagersTeams from './components/ManagersTeams';
import './index.css';

const socket = io('https://fpl-draft-app.onrender.com', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

console.log('Socket.IO connecting to:', 'https://fpl-draft-app.onrender.com'); // Add this line

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <div className="alert alert-danger text-center">{this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

function App() {
  const [user, setUser] = useState(null);
  const [draftState, setDraftState] = useState({});
  const [socketError, setSocketError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    console.log('App.js - Initializing auth');
    const unsubscribe = auth.onAuthStateChanged(async u => {
      console.log('App.js - Auth state changed:', u?.uid);
      setUser(u);
      if (u) {
        try {
          await u.getIdToken(true);
          const idTokenResult = await u.getIdTokenResult();
          setIsAdmin(idTokenResult.claims.isAdmin || false);
          console.log('App.js - Admin status:', idTokenResult.claims.isAdmin);
        } catch (err) {
          console.error('App.js - Admin check error:', err);
        }
      } else {
        setIsAdmin(false);
      }
    });
    socket.on('connect', () => console.log('Socket.IO connected'));
    socket.on('draftState', state => {
      console.log('Draft state updated:', state);
      setDraftState(state);
    });
    socket.on('error', ({ message }) => {
      console.error('Socket.IO error:', message);
      setSocketError(message);
    });
    socket.on('connect_error', (err) => {
      console.error('Socket.IO connect error:', err.message);
      setSocketError(`Socket connection failed: ${err.message}`);
    });
    return () => {
      unsubscribe();
      socket.off('connect');
      socket.off('draftState');
      socket.off('error');
      socket.off('connect_error');
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User logged out');
      setUser(null);
      setIsAdmin(false);
    } catch (err) {
      console.error('Logout error:', err);
      setSocketError('Failed to logout: ' + err.message);
    }
  };

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-vh-100 bg-light">
          {socketError && (
            <div className="alert alert-danger text-center">{socketError}</div>
          )}
          {user ? (
            <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
              <div className="container-fluid">
                <span className="navbar-brand">FPL Draft</span>
                <div className="navbar-nav">
                  <Link className="nav-link" to="/my-team">My Team</Link>
                  <Link className="nav-link" to="/managers-teams">Managers' Teams</Link>
                  <Link className="nav-link" to="/draft-room">Draft Room</Link>
                </div>
                <div className="navbar-text">
                  {isAdmin ? 'Admin' : 'User'}
                  <button
                    className="btn btn-outline-light ms-3"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </nav>
          ) : (
            <Login setUser={setUser} />
          )}
          <div className="container py-4">
            {user ? (
              <Routes>
                <Route path="/my-team" element={<MyTeam user={user} draftState={draftState} />} />
                <Route path="/managers-teams" element={<ManagersTeams user={user} draftState={draftState} />} />
                <Route path="/draft-room" element={<DraftRoom user={user} draftState={draftState} socket={socket} />} />
                <Route path="/" element={<DraftRoom user={user} draftState={draftState} socket={socket} />} />
                <Route path="/login" element={<Login setUser={setUser} />} />
              </Routes>
            ) : (
              <Login setUser={setUser} />
            )}
          </div>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;