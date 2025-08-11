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
  const [isAdmin, setIsAdmin] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showResumeConfirm, setShowResumeConfirm] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [reliefTime, setReliefTime] = useState(0);
  const [showReliefPopup, setShowReliefPopup] = useState(false);

  const positionLimits = { GKP: 2, DEF: 5, MID: 5, FWD: 3 };

  useEffect(() => {
    console.log('DraftRoom.js - Received draftState:', draftState);
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
        setError(`Failed to fetch players: ${err.message}`);
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
        setError(`Failed to fetch managers: ${err.message}`);
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
        setError(`Failed to fetch manager data: ${err.message}`);
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
          setError(`Failed to fetch current manager: ${err.message}`);
        }
      } else {
        setCurrentManager(null);
      }
    };
    fetchCurrentManager();
  }, [draftState.managerOrder, draftState.currentTurn]);

  useEffect(() => {
    socket.on('reliefPeriod', ({ reliefTime }) => {
      console.log('Received reliefPeriod:', reliefTime);
      setReliefTime(reliefTime);
      setShowReliefPopup(true);
      setTimeout(() => window.location.reload(), reliefTime * 1000); // Auto-refresh
    });
    socket.on('error', ({ message }) => {
      console.error('DraftRoom.js - Socket error:', message);
      setError(message);
    });
    return () => {
      socket.off('reliefPeriod');
      socket.off('error');
    };
  }, [socket]);

  useEffect(() => {
    if (showReliefPopup && reliefTime > 0) {
      const timer = setInterval(() => {
        setReliefTime(prev => {
          if (prev <= 1) {
            setShowReliefPopup(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showReliefPopup, reliefTime]);

  const handleStartDraft = () => {
    setShowStartConfirm(true);
  };

  const confirmStartDraft = () => {
    socket.emit('startDraft', { userId: user.uid });
    setShowStartConfirm(false);
  };

  const handlePauseTimer = () => {
    setShowPauseConfirm(true);
  };

  const confirmPauseTimer = () => {
    socket.emit('pauseTimer', { userId: user.uid });
    setShowPauseConfirm(false);
  };

  const handleResumeTimer = () => {
    setShowResumeConfirm(true);
  };

  const confirmResumeTimer = () => {
    socket.emit('resumeTimer', { userId: user.uid });
    setShowResumeConfirm(false);
  };

  const handleSkipTurn = () => {
    setShowSkipConfirm(true);
  };

  const confirmSkipTurn = () => {
    socket.emit('skipTurn', { userId: user.uid });
    setShowSkipConfirm(false);
  };

  const handleCloseBid = () => {
    setShowCloseConfirm(true);
  };

  const confirmCloseBid = () => {
    socket.emit('closeBid', { userId: user.uid });
    setShowCloseConfirm(false);
  };

  const handleRestartDraft = () => {
    setShowRestartConfirm(true);
  };

  const confirmRestartDraft = () => {
    socket.emit('restartDraft', { userId: user.uid });
    setShowRestartConfirm(false);
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const handleNominate = () => {
    if (!nomination) return;
    const bidValue = Math.max(10, Math.ceil(Number(bid) / 10) * 10);
    socket.emit('nominatePlayer', { playerId: nomination, bid: bidValue, userId: user.uid });
    setNomination('');
    setBid('');
  };

  const handleBid = () => {
    if (!bid || !draftState.currentPlayer) return;
    const bidValue = Math.max(draftState.currentBid + 10, Math.ceil(Number(bid) / 10) * 10);
    socket.emit('placeBid', { playerId: draftState.currentPlayer._id, bid: bidValue, userId: user.uid });
    setBid('');
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
    <div className="container py-4">
      <div className="card p-4">
        <h2 className="card-title text-primary mb-4">Draft Room</h2>
        {error && (
          <div className="alert alert-danger" role="alert">{error}</div>
        )}
        {/* Relief Period Popup */}
        {showReliefPopup && (
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Auto-Refreshing</h5>
                </div>
                <div className="modal-body">
                  <p>Auto-refreshing, will close in {reliefTime} seconds.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="row">
          <div className="col-md-4">
            <div className="card mb-4">
              <div className="card-body">
                <h3 className="card-title">Auction Status</h3>
                <p><strong>Status:</strong> {draftState.status}</p>
                <p><strong>Paused:</strong> {draftState.paused ? 'Yes' : 'No'}</p>
                <p><strong>Timer:</strong> {draftState.timer} seconds</p>
                <p><strong>Total Picks:</strong> {draftState.totalPicks}</p>
                {currentManager && (
                  <p><strong>Current Turn:</strong> {currentManager.name}</p>
                )}
                {draftState.currentPlayer && (
                  <>
                    <p><strong>Current Player:</strong> {draftState.currentPlayer.web_name} ({draftState.currentPlayer.team}, {draftState.currentPlayer.position})</p>
                    <p><strong>Current Bid:</strong> {draftState.currentBid}</p>
                    <p><strong>Highest Bidder:</strong> {managers.find(m => m._id === draftState.highestBidder)?.name || 'None'}</p>
                  </>
                )}
                {isAdmin && (
                  <div className="mt-3">
                    {draftState.status === 'pending' && (
                      <>
                        <button className="btn btn-primary me-2" onClick={handleStartDraft}>Start Draft</button>
                        <button className="btn btn-danger" onClick={handleRestartDraft}>Restart Draft</button>
                      </>
                    )}
                    {draftState.status === 'active' && !draftState.paused && (
                      <button className="btn btn-warning me-2" onClick={handlePauseTimer}>Pause Timer</button>
                    )}
                    {draftState.status === 'active' && draftState.paused && (
                      <button className="btn btn-success me-2" onClick={handleResumeTimer}>Resume Timer</button>
                    )}
                    {draftState.status === 'active' && !draftState.currentPlayer && (
                      <button className="btn btn-secondary me-2" onClick={handleSkipTurn}>Skip Turn</button>
                    )}
                    {draftState.status === 'active' && draftState.currentPlayer && draftState.highestBidder && (
                      <button className="btn btn-primary" onClick={handleCloseBid}>Close Bid</button>
                    )}
                  </div>
                )}
              </div>
            </div>
            {manager && (
              <div className="card mb-4">
                <div className="card-body">
                  <h3 className="card-title">Team Snapshot</h3>
                  <p><strong>Manager:</strong> {manager.name}</p>
                  <p><strong>Budget:</strong> {manager.budget}</p>
                  <p><strong>Players Required:</strong> {manager.playersRequired}</p>
                  <p><strong>Positions:</strong></p>
                  <ul className="list-group">
                    <li className="list-group-item">GKP: {manager.positionCounts?.GKP || 0}/{positionLimits.GKP}</li>
                    <li className="list-group-item">DEF: {manager.positionCounts?.DEF || 0}/{positionLimits.DEF}</li>
                    <li className="list-group-item">MID: {manager.positionCounts?.MID || 0}/{positionLimits.MID}</li>
                    <li className="list-group-item">FWD: {manager.positionCounts?.FWD || 0}/{positionLimits.FWD}</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
          <div className="col-md-8">
            <div className="card mb-4">
              <div className="card-body">
                <h3 className="card-title">Players</h3>
                <div className="row mb-3">
                  <div className="col">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Filter by name"
                      name="web_name"
                      value={filters.web_name}
                      onChange={handleFilterChange}
                    />
                  </div>
                  <div className="col">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Filter by team"
                      name="team"
                      value={filters.team}
                      onChange={handleFilterChange}
                    />
                  </div>
                  <div className="col">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Filter by position"
                      name="position"
                      value={filters.position}
                      onChange={handleFilterChange}
                    />
                  </div>
                  <div className="col">
                    <select className="form-control" value={sortBy} onChange={handleSortChange}>
                      <option value="now_cost">Sort by Cost</option>
                      <option value="web_name">Sort by Name</option>
                      <option value="team">Sort by Team</option>
                      <option value="position">Sort by Position</option>
                    </select>
                  </div>
                </div>
                {draftState.status === 'active' && draftState.managerOrder[draftState.currentTurn] === user.uid && !draftState.currentPlayer && (
                  <div className="mb-3">
                    <select
                      className="form-control mb-2"
                      value={nomination}
                      onChange={(e) => setNomination(e.target.value)}
                    >
                      <option value="">Select a player to nominate</option>
                      {filteredPlayers
                        .filter(player => !player.isDrafted)
                        .map(player => (
                          <option key={player._id} value={player._id}>
                            {player.web_name} ({player.team}, {player.position}, Cost: {player.now_cost})
                          </option>
                        ))
                      }
                    </select>
                    <input
                      type="number"
                      className="form-control mb-2"
                      placeholder="Enter bid amount"
                      value={bid}
                      onChange={(e) => setBid(e.target.value)}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={handleNominate}
                      disabled={!nomination || !bid}
                    >
                      Nominate Player
                    </button>
                  </div>
                )}
                {draftState.status === 'active' && draftState.currentPlayer && (
                  <div className="mb-3">
                    <input
                      type="number"
                      className="form-control mb-2"
                      placeholder={`Enter bid (min ${draftState.currentBid + 10}, max ${maxBid})`}
                      value={bid}
                      onChange={(e) => setBid(e.target.value)}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={handleBid}
                      disabled={!bid || Number(bid) <= draftState.currentBid || Number(bid) > maxBid}
                    >
                      Place Bid
                    </button>
                  </div>
                )}
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead className="table-primary">
                      <tr>
                        <th>Name</th>
                        <th>Team</th>
                        <th>Position</th>
                        <th>Cost</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlayers.map(player => (
                        <tr key={player._id}>
                          <td>{player.web_name}</td>
                          <td>{player.team}</td>
                          <td>{player.position}</td>
                          <td>{player.now_cost}</td>
                          <td>{player.isDrafted ? 'Drafted' : 'Available'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Confirmation Modals */}
        {showStartConfirm && (
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Start Draft</h5>
                  <button type="button" className="btn-close" onClick={() => setShowStartConfirm(false)}></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to start the draft?</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowStartConfirm(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={confirmStartDraft}>Confirm</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showPauseConfirm && (
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Pause Timer</h5>
                  <button type="button" className="btn-close" onClick={() => setShowPauseConfirm(false)}></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to pause the timer?</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPauseConfirm(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={confirmPauseTimer}>Confirm</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showResumeConfirm && (
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Resume Timer</h5>
                  <button type="button" className="btn-close" onClick={() => setShowResumeConfirm(false)}></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to resume the timer?</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowResumeConfirm(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={confirmResumeTimer}>Confirm</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showSkipConfirm && (
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Skip Turn</h5>
                  <button type="button" className="btn-close" onClick={() => setShowSkipConfirm(false)}></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to skip the current turn?</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowSkipConfirm(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={confirmSkipTurn}>Confirm</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showCloseConfirm && (
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Close Bid</h5>
                  <button type="button" className="btn-close" onClick={() => setShowCloseConfirm(false)}></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to close the current bid?</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCloseConfirm(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={confirmCloseBid}>Confirm</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showRestartConfirm && (
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Restart Draft</h5>
                  <button type="button" className="btn-close" onClick={() => setShowRestartConfirm(false)}></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to restart the draft? This will reset all teams and players.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowRestartConfirm(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={confirmRestartDraft}>Confirm</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftRoom;