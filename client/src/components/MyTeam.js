import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MyTeam = ({ user, draftState }) => {
  const [manager, setManager] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchManager = async () => {
      try {
        const response = await axios.get(`https://fpl-draft-app.onrender.com/api/managers/${user.uid}`, { timeout: 5000 });
        setManager(response.data);
        setError(null);
      } catch (err) {
        console.error('Manager fetch error:', err);
        setError(`Failed to fetch manager data: ${err.message}${err.response ? ` (Status: ${err.response.status})` : ''}`);
      }
    };

    const fetchDraftedPlayers = async () => {
      try {
        const managerResponse = await axios.get(`https://fpl-draft-app.onrender.com/api/managers/${user.uid}`, { timeout: 5000 });
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
    };

    fetchManager();
    fetchDraftedPlayers();
  }, [user.uid, draftState.totalPicks]);

  const positionLimits = { GKP: 2, DEF: 5, MID: 5, FWD: 3 };

  const renderPositionSlots = (position) => {
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
          <li key={`open-${position}-${i}`} className="list-group-item"></li>
        );
      }
    }
    return slots;
  };

  return (
    <div className="card p-4">
      <h2 className="card-title text-primary mb-4">My Team</h2>
      {error && (
        <div className="alert alert-danger" role="alert">{error}</div>
      )}
      {manager ? (
        <div>
          <h3 className="card-title">{manager.name}'s Team</h3>
          <p><strong>Budget:</strong> R{manager.budget}</p>
          <p><strong>Players Required:</strong> {manager.playersRequired}</p>
          <h4 className="h5 mt-3">Roster</h4>
          <div className="mb-3">
            <h5>Goalkeepers (2 slots)</h5>
            <ul className="list-group">{renderPositionSlots('GKP')}</ul>
          </div>
          <div className="mb-3">
            <h5>Defenders (5 slots)</h5>
            <ul className="list-group">{renderPositionSlots('DEF')}</ul>
          </div>
          <div className="mb-3">
            <h5>Midfielders (5 slots)</h5>
            <ul className="list-group">{renderPositionSlots('MID')}</ul>
          </div>
          <div className="mb-3">
            <h5>Forwards (3 slots)</h5>
            <ul className="list-group">{renderPositionSlots('FWD')}</ul>
          </div>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default MyTeam;