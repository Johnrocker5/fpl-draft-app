import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PlayersList from './PlayersList';

const DraftDashboard = ({ user, draftState, socket }) => {
  const [players, setPlayers] = useState([]);
  const [manager, setManager] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        await user.getIdToken(true);
        const idTokenResult = await user.getIdTokenResult();
        setIsAdmin(idTokenResult.claims.isAdmin || false);
        console.log('Admin status:', idTokenResult.claims.isAdmin);
        setError(null);
      } catch (err) {
        console.error('Admin check error:', err);
        setError(`Failed to check admin status: ${err.message}`);
      }
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/players', { timeout: 5000 });
        setPlayers(response.data.sort((a, b) => b.now_cost - a.now_cost));
        setError(null);
      } catch (err) {
        console.error('Player fetch error:', err);
        setError(`Failed to fetch players: ${err.message}${err.response ? ` (Status: ${err.response.status})` : ''}`);
      }
    };
    fetchPlayers();
  }, [draftState.status, draftState.totalPicks]);

  useEffect(() => {
    const fetchManager = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/api/managers/${user.uid}`, { timeout: 5000 });
        setManager(response.data);
        setError(null);
      } catch (err) {
        console.error('Manager fetch error:', err);
        setError(`Failed to fetch manager data: ${err.message}${err.response ? ` (Status: ${err.response.status})` : ''}`);
      }
    };
    fetchManager();
  }, [user.uid]);

  return (
    <div className="card p-4">
      <h2 className="card-title text-primary mb-4">FPL Draft Dashboard</h2>
      {error && (
        <div className="alert alert-danger" role="alert">{error}</div>
      )}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="card-title">Welcome, {manager?.name || user.email}</h3>
          <p><strong>Budget:</strong> R{manager?.budget || 1000}</p>
          <p><strong>Players Required:</strong> {manager?.playersRequired || 15}</p>
          <p><strong>Players Owned:</strong> {manager?.playersOwned.length || 0}</p>
          <p><strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <h3 className="card-title">Draft Status</h3>
          <p><strong>Status:</strong> {draftState.status === 'active' ? 'Active' : draftState.status === 'completed' ? 'Completed' : 'Pending'}</p>
          <p><strong>Current Player:</strong> {draftState.currentPlayer?.web_name || 'None'}</p>
          <p><strong>Current Bid:</strong> R{draftState.currentBid || 0}</p>
          <p><strong>Highest Bidder:</strong> {draftState.highestBidder ? (manager?._id === draftState.highestBidder ? manager.name : 'Another Manager') : 'None'}</p>
          <p><strong>Timer:</strong> {draftState.timer || 30} seconds</p>
        </div>
      </div>
      <PlayersList players={players} />
    </div>
  );
};

export default DraftDashboard;