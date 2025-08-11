import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MyTeam = ({ user, draftState }) => {
  const [manager, setManager] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchManagerAndPlayers = async () => {
      try {
        const managerResponse = await axios.get(`https://fpl-draft-app.onrender.com/api/managers/${user.uid}`, { timeout: 5000 });
        const managerData = managerResponse.data;
        setManager(managerData);

        if (managerData.playersOwned && managerData.playersOwned.length > 0) {
          const playersResponse = await axios.post(
            'https://fpl-draft-app.onrender.com/api/players/multiple',
            { ids: managerData.playersOwned },
            { timeout: 5000 }
          );
          setPlayers(playersResponse.data);
        } else {
          setPlayers([]);
        }
        setError(null);
      } catch (err) {
        console.error('MyTeam fetch error:', err, 'Response:', err.response);
        setError(`Failed to fetch team data: ${err.message}${err.response ? ` (Status: ${err.response.status}, Data: ${JSON.stringify(err.response.data)})` : ''}`);
      }
    };
    fetchManagerAndPlayers();
  }, [user.uid, draftState.status, draftState.totalPicks]);

  return (
    <div className="container py-4">
      <div className="card p-4">
        <h2 className="card-title text-primary mb-4">My Team</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        {manager ? (
          <>
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
            {players.length > 0 ? (
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
                    {players.map(player => (
                      <tr key={player._id}>
                        <td>{player.position}</td>
                        <td>{player.web_name}</td>
                        <td>{player.team}</td>
                        <td>{player.currentBid || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No players drafted yet.</p>
            )}
          </>
        ) : (
          <p>Loading team data...</p>
        )}
      </div>
    </div>
  );
};

export default MyTeam;