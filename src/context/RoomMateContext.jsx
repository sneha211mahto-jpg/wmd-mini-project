import { useCallback, useEffect, useState } from 'react';
import { RoomMateContext } from './roomMateContext';
import { apiRequest, clearStoredSession, storeAuthSession, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../services/api';

const initialsFor = (name = '') =>
  name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'RM';

const normalizeRoom = (roomData, currentUserId, expenses) => {
  if (!roomData) return null;

  const members = (roomData.members || []).map((member) => ({
    id: member.id,
    name: member.name,
    initials: initialsFor(member.name),
    isOwner: member.role === 'OWNER',
    role: member.role === 'OWNER' ? 'Owner / Manager' : 'Member',
  }));
  const owner = roomData.created_by ? {
    id: roomData.created_by,
    name: roomData.created_by_name || 'Room Owner',
    initials: initialsFor(roomData.created_by_name || 'Room Owner'),
    isOwner: true,
    role: 'Owner / Manager',
  } : null;
  const activeMembers = members.filter((member) => !member.isOwner);
  const rentFromExpenses = expenses
    .filter((expense) => expense.category?.toLowerCase() === 'rent')
    .reduce((total, expense) => total + Number(expense.amount || 0), 0);
  const monthlyRent = Number(roomData.monthly_rent ?? rentFromExpenses);
  const isCurrentUserOwner = Number(roomData.created_by) === Number(currentUserId);

  return {
    id: roomData.id,
    name: roomData.room_name,
    createdBy: roomData.created_by,
    owner,
    monthlyRent,
    yourShare: isCurrentUserOwner || activeMembers.length === 0 ? 0 : monthlyRent / activeMembers.length,
    activeMemberCount: activeMembers.length,
    members,
  };
};

const normalizeExpense = (expense, members) => {
  const memberNames = new Set(members.map((member) => member.name.toLowerCase()));
  const splitBetween = expense.split_between || members.map((member) => ({
    name: member.name,
    amount: members.length ? Number(expense.amount || 0) / members.length : 0,
  }));

  return {
    id: expense.id,
    roomId: expense.room_id,
    title: expense.title,
    amount: Number(expense.amount || 0),
    paidBy: expense.paid_by,
    date: String(expense.expense_date || expense.created_at || '').slice(0, 10),
    category: expense.category,
    splitType: expense.split_type,
    splitBetween: splitBetween
      .filter((share) => memberNames.has(share.name.toLowerCase()))
      .map((share) => ({ name: share.name, amount: Number(share.amount || 0) })),
  };
};

const normalizeTask = (task) => ({
  id: task.id,
  title: task.title,
  assignee: task.assigned_to,
  dueDate: String(task.due_date || '').slice(0, 10),
  priority: task.priority || 'Medium',
  status: task.status || 'Pending',
});

const normalizeShopping = (item) => ({
  id: item.id,
  item: item.item_name || item.itemName || item.item,
  quantity: item.quantity || '1',
  status: item.status || 'Pending',
});

const profileFor = (user, roomData) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatar: initialsFor(user.name),
  room: roomData?.room_name || 'No room yet',
  role: roomData && Number(roomData.created_by) === Number(user.id) ? 'Owner' : 'Member',
});

export const RoomMateProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || '');
  const [profile, setProfile] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(token));
  const [authLoading, setAuthLoading] = useState(Boolean(token));
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [room, setRoom] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [shopping, setShopping] = useState([]);
  const [removedMembers, setRemovedMembers] = useState([]);
  const isOwner = Boolean(profile && room && Number(room.createdBy) === Number(profile.id));
  const isMember = Boolean(profile && room && !isOwner && room.members.some((member) => Number(member.id) === Number(profile.id)));

  const clearRoomData = useCallback(() => {
    setProfile(null);
    setRoom(null);
    setExpenses([]);
    setTasks([]);
    setShopping([]);
    setRemovedMembers([]);
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    setToken('');
    setIsLoggedIn(false);
    setAuthLoading(false);
    setError('');
    clearRoomData();
  }, [clearRoomData]);

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener('roommate:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('roommate:unauthorized', handleUnauthorized);
  }, [logout]);

  const loadDashboardData = useCallback(async () => {
    try {
      const [user, roomResponse, expenseResponse, taskResponse, shoppingResponse] = await Promise.all([
        apiRequest('/profile'),
        apiRequest('/rooms'),
        apiRequest('/expenses'),
        apiRequest('/tasks'),
        apiRequest('/shopping'),
      ]);
      const rooms = roomResponse.rooms || [];
      const roomData = rooms.find((item) =>
        Number(item.created_by) === Number(user.id)
        || (item.members || []).some((member) => Number(member.id) === Number(user.id)),
      ) || null;
      const memberList = roomData?.members || [];
      const expenseRows = expenseResponse.expenses || [];
      const currentProfile = profileFor(user, roomData);

      setProfile(currentProfile);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      setRoom(normalizeRoom(roomData, user.id, expenseRows));
      setExpenses(expenseRows.map((expense) => normalizeExpense(expense, memberList)));
      setRemovedMembers([]);
      setTasks((taskResponse.tasks || []).map(normalizeTask));
      setShopping((shoppingResponse.shopping_items || shoppingResponse.shoppingItems || []).map(normalizeShopping));
      setIsLoggedIn(true);
      setError('');
      return true;
    } catch (loadError) {
      logout();
      setError(loadError.message || 'Could not load your account data.');
      return false;
    } finally {
      setAuthLoading(false);
      setDataLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (token) {
      Promise.resolve().then(loadDashboardData);
    }
  }, [loadDashboardData, token]);

  const setAuthSession = (authData) => {
    storeAuthSession(authData);
    setToken(authData.token);
    setIsLoggedIn(true);
    setAuthLoading(true);
    setError('');
    setProfile(profileFor(authData.user, null));
  };

  const runMutation = async (operation) => {
    setSaving(true);
    setDataLoading(true);
    setError('');
    try {
      return await operation();
    } catch (requestError) {
      setError(requestError.message || 'Request failed. Please try again.');
      return null;
    } finally {
      setSaving(false);
      setDataLoading(false);
    }
  };

  const requireRoom = () => {
    if (!room?.id) throw new Error('Create or join a room before adding shared items.');
    return room.id;
  };

  const requireMember = () => {
    if (!isMember) throw new Error('Only active Members can manage shared expenses, tasks, and shopping.');
    return profile.id;
  };

  const requireOwner = () => {
    if (!isOwner) throw new Error('Only the room Owner can manage room Members.');
    return profile.id;
  };

  const createRoom = (roomData) => runMutation(async () => {
    const result = await apiRequest('/rooms', {
      method: 'POST',
      body: {
        room_name: roomData.name.trim(),
        monthly_rent: Number(roomData.monthlyRent),
        created_by: profile.id,
      },
    });
    await loadDashboardData();
    return result.room;
  });

const leaveRoom = (roomId) => runMutation(async () => {
  requireRoom();
  const result = await apiRequest(`/rooms/${roomId}/members/${profile.id}`, {
    method: 'DELETE',
  });
  await loadDashboardData();
  return result;
});

const addRoomMember = (roomId, email) => runMutation(async () => {
  requireOwner();
  if (!roomId) {
    throw new Error('Room not found.');
  }

  if (!email?.trim()) {
    throw new Error('Please enter a member email address.');
  }

  const result = await apiRequest(`/rooms/${roomId}/members`, {
    method: 'POST',
    body: {
      email: email.trim(),
    },
  });

  await loadDashboardData();

  return result;
});

const removeRoomMember = (roomId, userId) => runMutation(async () => {
  requireOwner();
  if (!roomId) {
    throw new Error('Room not found.');
  }

  if (!userId) {
    throw new Error('Member not found.');
  }

  const result = await apiRequest(
    `/rooms/${roomId}/members/${userId}`,
    {
      method: 'DELETE',
    }
  );

  await loadDashboardData();

  return result;
});

  const updateRoom = (roomId, updates) => runMutation(async () => {
    requireOwner();
    const result = await apiRequest(`/rooms/${roomId}`, {
      method: 'PUT',
      body: {
        room_name: updates.name,
        monthly_rent: Number(updates.monthlyRent),
      },
    });
    await loadDashboardData();
    return result;
  });

  const updateProfile = (updates) => runMutation(async () => {
    if (updates.email.trim().toLowerCase() !== profile.email.toLowerCase()) {
      throw new Error('Email changes require a new login and are not available in this session.');
    }
    const result = await apiRequest(`/users/${profile.id}`, {
      method: 'PUT',
      body: { name: updates.name, email: profile.email },
    });
    const currentProfile = profileFor(result, room ? {
      created_by: room.createdBy,
      room_name: room.name,
    } : null);
    setProfile(currentProfile);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result));
    return result;
  });

  const addExpense = (newExpense) => runMutation(async () => {
      requireMember();
      const roomId = requireRoom();
      const response = await apiRequest('/expenses', {
        method: 'POST',
        body: {
        room_id: roomId,
        title: newExpense.title,
        amount: Number(newExpense.amount),
        category: newExpense.category,
        paid_by: newExpense.paidBy,
        split_type: 'equal',
        date: newExpense.date,
        },
      });
      await loadDashboardData();
      return response.expense;
  });

  const updateExpense = (updatedExpense) => runMutation(async () => {
      requireMember();
      const result = await apiRequest(`/expenses/${updatedExpense.id}`, {
        method: 'PUT',
        body: {
          title: updatedExpense.title,
          amount: Number(updatedExpense.amount),
          category: updatedExpense.category,
          paid_by: updatedExpense.paidBy,
          split_type: 'equal',
          date: updatedExpense.date,
        },
      });
      await loadDashboardData();
      return result;
  });

  const deleteExpense = (expenseId) => runMutation(async () => {
    requireMember();
    const result = await apiRequest(`/expenses/${expenseId}`, { method: 'DELETE' });
    await loadDashboardData();
    return result;
  });

  const addTask = (newTask) => runMutation(async () => {
      requireMember();
      const roomId = requireRoom();
      const response = await apiRequest(`/tasks/${profile.id}`, {
        method: 'POST',
        body: {
          room_id: roomId,
          title: newTask.title,
          assigned_to: newTask.assignee,
          due_date: newTask.dueDate,
          status: newTask.status || 'Pending',
          priority: newTask.priority || 'Medium',
        },
      });
      await loadDashboardData();
      return response.task;
  });

  const updateTask = (taskId, updates) => runMutation(async () => {
      requireMember();
      const task = tasks.find((item) => item.id === taskId);
      if (!task) throw new Error('Task not found. Refresh the page and try again.');
      const result = await apiRequest(`/tasks/${profile.id}/${taskId}`, {
        method: 'PUT',
        body: {
          title: updates.title ?? task.title,
          assigned_to: updates.assignee ?? task.assignee,
          status: updates.status ?? task.status,
          due_date: updates.dueDate ?? task.dueDate,
          priority: updates.priority ?? task.priority,
        },
      });
      await loadDashboardData();
      return result;
  });

  const deleteTask = (taskId) => runMutation(async () => {
    requireMember();
    const result = await apiRequest(`/tasks/${profile.id}/${taskId}`, { method: 'DELETE' });
    await loadDashboardData();
    return result;
  });

  const addShoppingItem = (newItem) => runMutation(async () => {
      requireMember();
      const roomId = requireRoom();
      const response = await apiRequest(`/shopping/${profile.id}`, {
        method: 'POST',
        body: {
          room_id: roomId,
          item_name: newItem.item,
          quantity: newItem.quantity,
          status: newItem.status || 'Pending',
        },
      });
      await loadDashboardData();
      return response.item;
  });

  const updateShopping = (itemId, updates) => runMutation(async () => {
      requireMember();
      const item = shopping.find((entry) => entry.id === itemId);
      if (!item) throw new Error('Shopping item not found. Refresh the page and try again.');
      const result = await apiRequest(`/shopping/${profile.id}/${itemId}`, {
        method: 'PUT',
        body: {
          item_name: updates.item ?? item.item,
          quantity: updates.quantity ?? item.quantity,
          status: updates.status ?? item.status,
        },
      });
      await loadDashboardData();
      return result;
  });

  const deleteShopping = (itemId) => runMutation(async () => {
    requireMember();
    const result = await apiRequest(`/shopping/${profile.id}/${itemId}`, { method: 'DELETE' });
    await loadDashboardData();
    return result;
  });

  const value = {
      token,
      profile,
      isLoggedIn,
      authLoading,
      dataLoading,
      saving,
      error,
      isOwner,
      isMember,
      clearError: () => setError(''),
      setAuthSession,
      room,
      removedMembers,
      expenses,
      addExpense,
      updateExpense,
      deleteExpense,
      tasks,
      addTask,
      updateTask,
      deleteTask,
      shopping,
      addShoppingItem,
      updateShopping,
      deleteShopping,
      logout,
      loadDashboardData,
      createRoom,
      leaveRoom,
      updateRoom,
      removeRoomMember,
      updateProfile,
      addRoomMember,
    };

  return <RoomMateContext.Provider value={value}>{children}</RoomMateContext.Provider>;
};
