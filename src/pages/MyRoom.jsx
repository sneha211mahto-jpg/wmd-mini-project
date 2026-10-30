import { useState } from 'react';
import Modal from '../components/Modal';
import { useRoomMate } from '../context/useRoomMate';

export default function MyRoom() {
  const { room, profile, removedMembers, saving, error, clearError, createRoom, leaveRoom, updateRoom, addRoomMember, removeRoomMember } = useRoomMate();
  const isOwner = profile?.role === 'Owner';
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [roomForm, setRoomForm] = useState({ name: '', monthlyRent: '' });
  const [memberEmail, setMemberEmail] = useState('');
  const [memberMessage, setMemberMessage] = useState('');

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    const result = await createRoom({ name: roomForm.name, monthlyRent: roomForm.monthlyRent });
    if (!result) return;
    setShowCreate(false);
  };

  const handleUpdateRoom = async (event) => {
    event.preventDefault();
    const result = await updateRoom(room.id, roomForm);
    if (!result) return;
    setShowEdit(false);
  };

  const openCreate = () => {
    setRoomForm({ name: '', monthlyRent: '' });
    setShowCreate(true);
  };

  const openEdit = () => {
    setRoomForm({ name: room.name, monthlyRent: String(room.monthlyRent) });
    setShowEdit(true);
  };

  const handleLeave = async () => {
    if (window.confirm('Leave this room?')) {
      const result = await leaveRoom(room.id);
      if (result) {
        setMemberMessage(result.message || 'You have left the room successfully.');
      }
    }
  };

  const openMemberDialog = () => {
    clearError();
    setMemberEmail('');
    setMemberMessage('');
    setShowInvite(true);
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    setMemberMessage('');
    const result = await addRoomMember(room.id, memberEmail);
    if (!result) return;
    setMemberMessage(result.message);
    setMemberEmail('');
  };

  const handleRemoveMember = async (memberId, memberName) => {
    const confirmed = window.confirm(`Remove ${memberName} from this room?`);
    if (!confirmed) return;

    const result = await removeRoomMember(room.id, memberId);
    if (!result) return;

    setMemberMessage(result.message);
  };

  const handleRestoreMember = async (member) => {
    const result = await addRoomMember(room.id, member.email);
    if (result) setMemberMessage(result.message);
  };

  if (!room) {
    return (
      <div className="page-panel empty-room-page">
        <h1>You don&apos;t have a room yet.</h1>
        <div className="empty-actions">
          <button type="button" className="primary-btn" onClick={openCreate}>Create Room</button>
        </div>

        <Modal open={showCreate} title="Create Room" onClose={() => setShowCreate(false)}>
          <form className="form-grid" onSubmit={handleCreateRoom}>
            <label>
              <span>Room Name</span>
              <input value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} required />
            </label>
            <label>
              <span>Monthly Rent</span>
              <input type="number" min="0" step="0.01" value={roomForm.monthlyRent} onChange={(e) => setRoomForm({ ...roomForm, monthlyRent: e.target.value })} required />
            </label>
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
          </form>
        </Modal>

      </div>
    );
  }

  return (
    <div className="page-panel">
      <div className="page-header-row">
        <div>
          <h1>{room.name}</h1>
          <p>Monthly Rent: ₹{Number(room.monthlyRent).toLocaleString('en-IN')}</p>
        </div>
        <div className="compact-actions">
          {isOwner && <button type="button" className="secondary-btn" onClick={openMemberDialog} disabled={saving}>Add Member</button>}
          {isOwner && <button type="button" className="secondary-btn" onClick={openEdit} disabled={saving}>Edit Room</button>}
          <button type="button" className="tertiary-btn" onClick={handleLeave} disabled={saving}>Leave Room</button>
        </div>
      </div>

      <div className="room-summary-grid">
        <div className="card-block">
          <div className="subheader-row">
            <h3>Roommates</h3>
          </div>
          {room.owner && (
            <div className="member-pill">
              <div className="avatar small">{room.owner.initials}</div>
              <div>
                <strong>{room.owner.name}</strong>
                <small>Owner / Manager</small>
              </div>
            </div>
          )}
          <div className="member-list flex-wrap">
            {room.members.map((member) => (
              <div key={member.id} className="member-pill">
                <div className="avatar small">{member.initials}</div>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.role}</small>
                </div>
                {isOwner && !member.isOwner && (
                  <button type="button" className="tertiary-btn" onClick={() => handleRemoveMember(member.id, member.name)} disabled={saving}>
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          {memberMessage && <p className="success-message" role="status">{memberMessage}</p>}
          {isOwner && removedMembers.length > 0 && (
            <div className="removed-member-list">
              <h3>Previously Removed</h3>
              {removedMembers.map((member) => (
                <div key={member.id} className="member-pill">
                  <div className="avatar small">{member.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
                  <div>
                    <strong>{member.name}</strong>
                    <small>{member.email}</small>
                  </div>
                  <button type="button" className="secondary-btn" onClick={() => handleRestoreMember(member)} disabled={saving}>
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-block mini-stats">
          <div className="summary-box">
            <span>Total Rent</span>
            <strong>₹{Number(room.monthlyRent).toLocaleString('en-IN')}</strong>
          </div>
          {!isOwner && (
            <div className="summary-box">
              <span>Your Rent Contribution</span>
              <strong>₹{Number(room.yourShare).toLocaleString('en-IN')}</strong>
            </div>
          )}
        </div>
      </div>

      <Modal open={showEdit} title="Edit Room" onClose={() => setShowEdit(false)}>
        <form className="form-grid" onSubmit={handleUpdateRoom}>
          <label>
            <span>Room Name</span>
            <input value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} required />
          </label>
          <label>
            <span>Monthly Rent</span>
            <input type="number" min="0" step="0.01" value={roomForm.monthlyRent} onChange={(e) => setRoomForm({ ...roomForm, monthlyRent: e.target.value })} required />
          </label>
          <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </form>
      </Modal>

      <Modal open={showInvite} title="Add Roommate" onClose={() => setShowInvite(false)}>
        <form className="form-grid" onSubmit={handleAddMember}>
          <label>
            <span>Member Email Address</span>
            <input type="email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} placeholder="person@example.com" required />
          </label>
          {(error || memberMessage) && <p className={error ? 'auth-error' : 'success-message'} role={error ? 'alert' : 'status'}>{error || memberMessage}</p>}
          <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Adding...' : 'Add Member'}</button>
        </form>
      </Modal>

    </div>
  );
}
