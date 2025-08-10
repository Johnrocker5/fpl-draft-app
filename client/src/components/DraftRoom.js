import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const DraftRoom = ({ user, draftState, socket }) => {
  const [players, setPlayers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [manager, setManager] = useState(null);
  const [filters, setFilters] = useState({ web_name: '', team: '', position: '' });
  const [sortBy, setSortBy] = useState('now_cost');
  const [bid, setBid] = useState('');
  const [nomination, setNomination] = useState('');
  const [error, setError] = useState(null);
  const [currentManager, setCurrentManager] = useState(null);
  const [nextManager, setNextManager] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showResumeConfirm, setShowResumeConfirm] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  const positionLimits = { GKP: 2, DEF: 5, MID: 5, FWD: 3 };

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        await user.getIdToken(true);
        const idTokenResult = await user.getIdTokenResult();
        setIsAdmin(idTokenResult.claims.isAdmin || false);
        console.log('DraftRoom.js - Admin status:', idTokenResult.claims.isAdmin);
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
        const response = await axios.get('https://fpl-draft-app.onrender.com/api/players', { timeout: 5000 });
        setPlayers(response.data);
        setError(null);
      } catch (err) {
        console.error('Player fetch error:', err);
        setError(`Failed to fetch players: ${err.message}${err.response ? ` (Status: ${err.response.status})` : ''}`);
      }
    };
    fetchPlayers();
  }, [draftState.status, draftState.totalPicks]);

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
    fetchManager();
  }, [user.uid]);

  useEffect(() => {
    const fetchCurrentManager = async () => {
      if (draftState.managerOrder && draftState.managerOrder.length > 0 && draftState.currentTurn >= 0) {
        try {
          const response = await axios.get(`https://fpl-draft-app.onrender.com/api/managers/${draftState.managerOrder[draftState.currentTurn]}`, { timeout: 5000 });
          setCurrentManager(response.data);
          setError(null);
        } catch (err) {
          console.error('Current manager fetch error:', err);
          setError(`Failed to fetch current manager: ${err.message}${err.response ? ` (Status: ${err.response.status})` : ''}`);
        }
      } else {
        console.log('Skipping current manager fetch: invalid managerOrder or currentTurn');
        setCurrentManager(null);
      }
    };
    const fetchNextManager = async () => {
      if (draftState.managerOrder && draftState.managerOrder.length > 0 && draftState.currentTurn >= 0) {
        const nextIndex = (draftState.currentTurn + 1) % draftState.managerOrder.length;
        try {
          const response = await axios.get(`https://fpl-draft-app.onrender.com/api/managers/${draftState.managerOrder[nextIndex]}`, { timeout: 5000 });
          setNextManager(response.data);
          setError(null);
        } catch (err) {
          console.error('Next manager fetch error:', err);
          setError(`Failed to fetch next manager: ${err.message}${err.response ? ` (Status: ${err.response.status})` : ''}`);
        }
      } else {
        console.log('Skipping next manager fetch: invalid managerOrder or currentTurn');
        setNextManager(null);
      }
    };
    fetchCurrentManager();
    fetchNextManager();
  }, [draftState.managerOrder, draftState.currentTurn]);

  useEffect(() => {
    socket.on('draftState', state => {
      console.log('DraftRoom received draftState:', state);
    });
    socket.on('error', ({ message }) => setError(message));
    return () => {
      socket.off('draftState');
      socket.off('error');
    };
  }, [socket]);

  useEffect(() => {
    if (draftState.status === 'active' && draftState.currentPlayer && draftState.currentBid) {
      const maxBid = manager ? manager.budget - (manager.playersRequired - 1) * 10 : 0;
      const minBid = draftState.currentBid + 10;
      setBid(Math.min(minBid, maxBid).toString());
    } else {
      setBid('');
    }
  }, [draftState.currentBid, draftState.currentPlayer, draftState.status, manager]);

  const handleStartDraft = () => {
    if (window.confirm('Are you sure you want to start the draft?')) {
      socket.emit('startDraft', { userId: user.uid });
      setShowStartConfirm(false);
    }
  };

  const handlePauseTimer = () => {
    if (window.confirm('Are you sure you want to pause the timer?')) {
      socket.emit('pauseTimer', { userId: user.uid });
      setShowPauseConfirm(false);
    }
  };

  const handleResumeTimer = () => {
    if (window.confirm('Are you sure you want to resume the timer?')) {
      socket.emit('resumeTimer', { userId: user.uid });
      setShowResumeConfirm(false);
    }
  };

  const handleSkipTurn = () => {
    if (window.confirm('Are you sure you want to skip the next turn?')) {
      socket.emit('skipTurn', { userId: user.uid });
      setShowSkipConfirm(false);
    }
  };

  const handleCloseBid = () => {
    if (window.confirm(`Are you sure you want to close the bid for ${draftState.currentPlayer?.web_name} and allocate to ${managers.find(m => m._id === draftState.highestBidder)?.name || 'Unknown'}?`)) {
      socket.emit('closeBid', { userId: user.uid });
      setShowCloseConfirm(false);
    }
  };

  const handleRestartDraft = () => {
    if (window.confirm('Are you sure you want to restart the draft? This will reset all managers, players, and draft state.')) {
      socket.emit('restartDraft', { userId: user.uid });
      setShowRestartConfirm(false);
    }
  };

  const handleNominate = (playerId, bidValue) => {
    if (bidValue && draftState.status === 'active' && draftState.managerOrder[draftState.currentTurn] === user.uid) {
      socket.emit('nominatePlayer', { playerId, bid: Number(bidValue), userId: user.uid });
      setNomination('');
    } else {
      setError('Cannot nominate: Not your turn or invalid bid');
    }
  };

  const handleBid = (e) => {
    e.preventDefault();
    if (bid && draftState.status === 'active' && draftState.currentPlayer) {
      socket.emit('placeBid', { playerId: draftState.currentPlayer._id, bid: Number(bid), userId: user.uid });
      const maxBid = manager ? manager.budget - (manager.playersRequired - 1) * 10 : 0;
      setBid(Math.min(Number(bid) + 10, maxBid).toString());
    } else {
      setError('Cannot place bid: No player selected or draft not active');
    }
  };

  const filteredPlayers = useMemo(() =>
    players
      .filter(player =>
        player.web_name.toLowerCase().includes(filters.web_name.toLowerCase()) &&
        player.team.toLowerCase().includes(filters.team.toLowerCase()) &&
        player.position.toLowerCase().includes(filters.position.toLowerCase())
      )
      .sort((a, b) => (sortBy === 'now_cost' ? b.now_cost - a.now_cost : a[sortBy].localeCompare(b[sortBy]))),
    [players, filters, sortBy]
  );

  const maxBid = manager ? manager.budget - (manager.playersRequired - 1) * 10 : 0;

  return (
    <div className="card p-4">
      <h2 className="card-title text-primary mb-4">Draft Room</h2>
      {error && (
        <div className="alert alert-danger" role="alert">{error}</div>
      )}
      <div className="row">
        <div className="col-md-4">
          <div className="card mb-4">
            <div className="card-body">
              <h3 className="card-title">Auction Status</h3>
              {draftState.status === 'active' ? (
                <>
                  <p><strong>Current Turn:</strong> {currentManager?.name || 'Unknown'}</p>
                  <p><strong>Next Turn:</strong> {nextManager?.name || 'Unknown'}</p>
                  <p><strong>Current Player:</strong> {draftState.currentPlayer?.web_name || 'None'}</p>
                  <p><strong>Team:</strong> {draftState.currentPlayer?.team || 'N/A'}</p>
                  <p><strong>Position:</strong> {draftState.currentPlayer?.position || 'N/A'}</p>
                  <p><strong>Current Bid:</strong> {draftState.currentBid || 0}</p>
                  <p><strong>Highest Bidder:</strong> {draftState.highestBidder ? (managers.find(m => m._id === draftState.highestBidder)?.name || 'Unknown') : 'None'}</p>
                  <p><strong>Timer:</strong> {draftState.timer || 30} seconds</p>
                  {draftState.paused && (
                    <p className="text-danger fw-bold">Draft Paused</p>
                  )}
                  {draftState.managerOrder[draftState.currentTurn] === user.uid && !draftState.currentPlayer && !draftState.paused && (
                    <div className="mt-3">
                      <h4 className="h5">Nominate a Player</h4>
                      <input
                        type="number"
                        value={nomination}
                        onChange={(e) => setNomination(e.target.value)}
                        placeholder="Enter initial bid"
                        min="10"
                        step="10"
                        max={maxBid}
                        className="form-control mt-2"
                      />
                    </div>
                  )}
                  <form onSubmit={handleBid} className="mt-3">
                    <div className="input-group">
                      <input
                        type="number"
                        value={bid}
                        onChange={(e) => setBid(e.target.value)}
                        placeholder="Enter bid amount"
                        min={draftState.currentBid + 10}
                        max={maxBid}
                        step="10"
                        disabled={!draftState.currentPlayer || draftState.status !== 'active' || draftState.paused}
                        className="form-control"
                      />
                      <button
                        type="submit"
                        disabled={!draftState.currentPlayer || draftState.status !== 'active' || draftState.paused}
                        className="btn btn-success"
                      >
                        Place Bid
                      </button>
                    </div>
                  </form>
                  {isAdmin && draftState.status === 'active' && !draftState.paused && (
                    <button
                      onClick={() => setShowPauseConfirm(true)}
                      className="btn btn-warning w-100 mt-2"
                    >
                      Pause Timer
                    </button>
                  )}
                  {isAdmin && draftState.status === 'active' && draftState.paused && (
                    <button
                      onClick={() => setShowResumeConfirm(true)}
                      className="btn btn-success w-100 mt-2"
                    >
                      Resume Timer
                    </button>
                  )}
                  {isAdmin && draftState.status === 'active' && !draftState.currentPlayer && !draftState.paused && (
                    <button
                      onClick={() => setShowSkipConfirm(true)}
                      className="btn btn-danger w-100 mt-2"
                    >
                      Skip Next Turn
                    </button>
                  )}
                  {isAdmin && draftState.status === 'active' && draftState.currentPlayer && draftState.highestBidder && !draftState.paused && (
                    <button
                      onClick={() => setShowCloseConfirm(true)}
                      className="btn btn-danger w-100 mt-2"
                    >
                      Close Bid
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => setShowRestartConfirm(true)}
                      className="btn btn-danger w-100 mt-2"
                    >
                      Restart Draft
                    </button>
                  )}
                  {showPauseConfirm && (
                    <div className="card mt-3">
                      <div className="card-body">
                        <p>Confirm: Pause the timer?</p>
                        <button
                          onClick={handlePauseTimer}
                          className="btn btn-warning me-2"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowPauseConfirm(false)}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {showResumeConfirm && (
                    <div className="card mt-3">
                      <div className="card-body">
                        <p>Confirm: Resume the timer?</p>
                        <button
                          onClick={handleResumeTimer}
                          className="btn btn-success me-2"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowResumeConfirm(false)}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {showSkipConfirm && (
                    <div className="card mt-3">
                      <div className="card-body">
                        <p>Confirm: Skip next turn for {nextManager?.name || 'Unknown'}?</p>
                        <button
                          onClick={handleSkipTurn}
                          className="btn btn-danger me-2"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowSkipConfirm(false)}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {showCloseConfirm && (
                    <div className="card mt-3">
                      <div className="card-body">
                        <p>Confirm: Close bid for {draftState.currentPlayer?.web_name} and allocate to {managers.find(m => m._id === draftState.highestBidder)?.name || 'Unknown'}?</p>
                        <button
                          onClick={handleCloseBid}
                          className="btn btn-danger me-2"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowCloseConfirm(false)}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {showRestartConfirm && (
                    <div className="card mt-3">
                      <div className="card-body">
                        <p>Confirm: Restart the draft? This will reset all managers, players, and draft state.</p>
                        <button
                          onClick={handleRestartDraft}
                          className="btn btn-danger me-2"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowRestartConfirm(false)}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : draftState.status === 'completed' ? (
                <>
                  <p className="text-success">Draft has completed!</p>
                  {isAdmin && (
                    <button
                      onClick={() => setShowRestartConfirm(true)}
                      className="btn btn-danger w-100 mt-3"
                    >
                      Restart Draft
                    </button>
                  )}
                  {showRestartConfirm && (
                    <div className="card mt-3">
                      <div className="card-body">
                        <p>Confirm: Restart the draft? This will reset all managers, players, and draft state.</p>
                        <button
                          onClick={handleRestartDraft}
                          className="btn btn-danger me-2"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowRestartConfirm(false)}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-muted">Waiting for admin to start the draft</p>
                  {isAdmin && (
                    <button
                      onClick={() => setShowStartConfirm(true)}
                      className="btn btn-primary w-100 mt-3"
                    >
                      Start Draft
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => setShowRestartConfirm(true)}
                      className="btn btn-danger w-100 mt-2"
                    >
                      Restart Draft
                    </button>
                  )}
                  {showStartConfirm && (
                    <div className="card mt-3">
                      <div className="card-body">
                        <p>Confirm: Start the draft?</p>
                        <button
                          onClick={handleStartDraft}
                          className="btn btn-primary me-2"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowStartConfirm(false)}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {showRestartConfirm && (
                    <div className="card mt-3">
                      <div className="card-body">
                        <p>Confirm: Restart the draft? This will reset all managers, players, and draft state.</p>
                        <button
                          onClick={handleRestartDraft}
                          className="btn btn-danger me-2"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowRestartConfirm(false)}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          {manager && (
            <div className="card mb-4">
              <div className="card-body">
                <h3 className="card-title">Team Snapshot</h3>
                <p><strong>Your Budget:</strong> {manager.budget}</p>
                <p><strong>Players Remaining:</strong> {manager.playersRequired}</p>
                <p><strong>Maximum Bid:</strong> {maxBid}</p>
                <p><strong>Position Counts:</strong></p>
                <ul className="list-group">
                  <li className="list-group-item">GKP: {manager.positionCounts.GKP || 0}/{positionLimits.GKP}</li>
                  <li className="list-group-item">DEF: {manager.positionCounts.DEF || 0}/{positionLimits.DEF}</li>
                  <li className="list-group-item">MID: {manager.positionCounts.MID || 0}/{positionLimits.MID}</li>
                  <li className="list-group-item">FWD: {manager.positionCounts.FWD || 0}/{positionLimits.FWD}</li>
                </ul>
              </div>
            </div>
          )}
        </div>
        <div className="col-md-8">
          <h3 className="card-title">Available Players</h3>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <input
              type="text"
              value={filters.web_name}
              onChange={(e) => setFilters({ ...filters, web_name: e.target.value })}
              placeholder="Filter by name"
              className="form-control w-auto"
            />
            <input
              type="text"
              value={filters.team}
              onChange={(e) => setFilters({ ...filters, team: e.target.value })}
              placeholder="Filter by team"
              className="form-control w-auto"
            />
            <select
              value={filters.position}
              onChange={(e) => setFilters({ ...filters, position: e.target.value })}
              className="form-select w-auto"
            >
              <option value="">All Positions</option>
              <option value="GKP">Goalkeeper</option>
              <option value="DEF">Defender</option>
              <option value="MID">Midfielder</option>
              <option value="FWD">Forward</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select w-auto"
            >
              <option value="now_cost">Sort by Cost</option>
              <option value="web_name">Sort by Name</option>
              <option value="team">Sort by Team</option>
              <option value="position">Sort by Position</option>
            </select>
          </div>
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead className="table-primary">
                <tr>
                  <th>Name</th>
                  <th>Team</th>
                  <th>Position</th>
                  <th>Cost</th>
                  {draftState.status === 'active' && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.length > 0 ? (
                  filteredPlayers.map(player => {
                    const positionCount = manager?.positionCounts[player.position] || 0;
                    const canNominate = positionCount < positionLimits[player.position];
                    return (
                      <tr key={player._id} className="align-middle">
                        <td>{player.web_name}</td>
                        <td>{player.team}</td>
                        <td>{player.position}</td>
                        <td>{player.now_cost}</td>
                        {draftState.status === 'active' && (
                          <td>
                            {draftState.managerOrder[draftState.currentTurn] === user.uid && !draftState.currentPlayer && canNominate && !draftState.paused ? (
                              <div className="d-flex gap-2">
                                <input
                                  type="number"
                                  placeholder="Initial bid"
                                  min="10"
                                  max={maxBid}
                                  step="10"
                                  onChange={(e) => setNomination(e.target.value)}
                                  className="form-control w-auto"
                                />
                                <button
                                  onClick={() => handleNominate(player._id, nomination)}
                                  className="btn btn-success"
                                >
                                  Nominate
                                </button>
                              </div>
                            ) : !canNominate ? (
                              <span className="text-danger">Position Full</span>
                            ) : null}
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={draftState.status === 'active' ? 5 : 4} className="text-center">
                      No players match filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraftRoom;