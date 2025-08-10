import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManagersTeams = ({ user, draftState }) => {
  const [managers, setManagers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const response = await axios.get('https://fpl-draft-app.onrender.com/api/managers', { timeout: 5000 });
        setManagers(response.data);
        setError(null);
      } catch (err) {
        console.error('Manager fetch error:', err);
        setError(`Failed to fetch managers: ${err.message}${err.response ? ` (Status: ${err.response.status})` : ''}`);
      }
    };
    fetchManagers();
  }, []);

  useEffect(() => {
    const fetchDraftedPlayers = async () => {
      if (selectedManagerId) {
        try {
          const managerResponse = await axios.get(`https://fpl-draft-app.onrender.com/api/managers/${selectedManagerId}`, { timeout: 5000 });
          const playerIds = managerResponse.data.playersOwned || [];
          if (playerIds.length > 0) {
            const response = await axios.post('https://fpl-draft-app.onrender.com/api/players/multiple', { ids: playerIds }, { timeout: 5000 });
            setPlayers(response.data);
          } else {
            setPlayers([]);
          }
          setError(null);
        } catch (err) {
          console.error('Player fetch error:', err);
          setError(`Failed to fetch players: ${err.message}${err.response ? ` (Status: ${err.response.status})` : ''}`);
        }
      } else {
        setPlayers([]);
      }
    };
    fetchDraftedPlayers();
  }, [selectedManagerId, draftState.totalPicks]);

  const positionLimits = { GKP: 2, DEF: 5, MID: 5, FWD: 3 };

  const renderPositionSlots = (manager, position) => {
    const ownedPlayers = players.filter(player => player?.position === position) || [];
    const slots = [];
    for (let i = 0; i < positionLimits[position]; i++) {
      if (i < ownedPlayers.length) {
        const player = ownedPlayers[i];
        slots.push(
          <li key={player._id} className="list-group-item">
            {player.web_name} ({player.team})
          </li>
        );
      } else {
        slots.push(
          <li key={`open-${manager._id}-${position}-${i}`} className="list-group-item"></li>
        );
      }
    }
    return slots;
  };

  const selectedManager = managers.find(m => m._id === selectedManagerId);

  return (
    <div className="card p-4">
      <h2 className="card-title text-primary mb-4">Managers' Teams</h2>
      {error && (
        <div className="alert alert-danger" role="alert">{error}</div>
      )}
      <div className="mb-3">
        <label htmlFor="managerFilter" className="form-label">Select Manager</label>
        <select
          id="managerFilter"
          value={selectedManagerId}
          onChange={(e) => setSelectedManagerId(e.target.value)}
          className="form-select"
        >
          <option value="">Select a manager</option>
          {managers.map(manager => (
            <option key={manager._id} value={manager._id}>{manager.name}</option>
          ))}
        </select>
      </div>
      {selectedManager ? (
        <div>
          <h3 className="card-title">{selectedManager.name}'s Team</h3>
          <p><strong>Budget:</strong> R{selectedManager.budget}</p>
          <p><strong>Players Required:</strong> {selectedManager.playersRequired}</p>
          <h4 className="h5 mt-3">Roster</h4>
          <div className="mb-3">
            <h5>Goalkeepers (2 slots)</h5>
            <ul className="list-group">{renderPositionSlots(selectedManager, 'GKP')}</ul>
          </div>
          <div className="mb-3">
            <h5>Defenders (5 slots)</h5>
            <ul className="list-group">{renderPositionSlots(selectedManager, 'DEF')}</ul>
          </div>
          <div className="mb-3">
            <h5>Midfielders (5 slots)</h5>
            <ul className="list-group">{renderPositionSlots(selectedManager, 'MID')}</ul>
          </div>
          <div className="mb-3">
            <h5>Forwards (3 slots)</h5>
            <ul className="list-group">{renderPositionSlots(selectedManager, 'FWD')}</ul>
          </div>
        </div>
      ) : (
        <p className="text-muted">Select a manager to view their team.</p>
      )}
    </div>
  );
};

export default ManagersTeams;