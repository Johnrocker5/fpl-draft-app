import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManagersTeams = ({ user, draftState }) => {
  const [managers, setManagers] = useState([]);
  const [playersMap, setPlayersMap] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchManagersAndPlayers = async () => {
      try {
        const managersResponse = await axios.get('https://fpl-draft-app.onrender.com/api/managers', { timeout: 5000 });
        const managersData = managersResponse.data;
        setManagers(managersData);

        const allPlayerIds = managersData.flatMap(manager => manager.playersOwned || []);
        if (allPlayerIds.length > 0) {
          const playersResponse = await axios.post(
            'https://fpl-draft-app.onrender.com/api/players/multiple',
            { ids: allPlayerIds },
            { timeout: 5000 }
          );
          const players = playersResponse.data;
          const playersById = players.reduce((acc, player) => {
            acc[player._id] = player;
            return acc;
          }, {});
          setPlayersMap(playersById);
        } else {
          setPlayersMap({});
        }
        setError(null);
      } catch (err) {
        console.error('ManagersTeams fetch error:', err, 'Response:', err.response);
        setError(`Failed to fetch managers' teams: ${err.message}${err.response ? ` (Status: ${err.response.status}, Data: ${JSON.stringify(err.response.data)})` : ''}`);
      }
    };
    fetchManagersAndPlayers();
  }, [draftState.status, draftState.totalPicks]);

  return (
    <div className="container py-4">
      <div className="card p-4">
        <h2 className="card-title text-primary mb-4">Managers' Teams</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        {managers.length > 0 ? (
          managers.map(manager => (
            <div key={manager._id} className="mb-4">
              <h3 className="mb-3">{manager.name}'s Team</h3>
              <p><strong>Budget:</strong> {manager.budget}</p>
              <p><strong>Players Remaining:</strong> {manager.playersRequired}</p>
              <p><strong>Position Counts:</strong></p>
              <ul className="list-group mb-3">
                <li className="list-group-item">GKP: {manager.positionCounts?.GKP || 0}/2</li>
                <li className="list-group-item">DEF: {manager.positionCounts?.DEF || 0}/5</li>
                <li className="list-group-item">MID: {manager.positionCounts?.MID || 0}/5</li>
                <li className="list-group-item">FWD: {manager.positionCounts?.FWD || 0}/3</li>
              </ul>
              <h4 className="mb-3">Drafted Players</h4>
              {manager.playersOwned && manager.playersOwned.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead className="table-primary">
                      <tr>
                        <th>Position</th>
                        <th>Name</th>
                        <th>Team</th>
                        <th>Auction Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manager.playersOwned.map(playerId => {
                        const player = playersMap[playerId];
                        return player ? (
                          <tr key={player._id}>
                            <td>{player.position}</td>
                            <td>{player.web_name}</td>
                            <td>{player.team}</td>
                            <td>{player.currentBid || 'N/A'}</td>
                          </tr>
                        ) : null;
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No players drafted yet.</p>
              )}
            </div>
          ))
        ) : (
          <p>Loading managers' teams...</p>
        )}
      </div>
    </div>
  );
};

export default ManagersTeams;