import React from 'react';

function PlayersList({ players }) {
  return (
    <div className="card">
      <div className="card-body">
        <h3 className="card-title">Available Players</h3>
        <ul className="list-group">
          {players.map(player => (
            <li key={player._id} className="list-group-item">
              {player.web_name} ({player.position}, {player.team})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default PlayersList;