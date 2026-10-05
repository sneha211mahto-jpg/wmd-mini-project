import { useCallback, useEffect, useState } from 'react';
import { RoomMateContext } from './roomMateContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const initialsFor = (name = '') =>
  name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'RM';

const normalizeRoom = (roomData, currentUserId, expenses, role) => {
  if (!roomData) return null;

  const members = (roomData.members || []).map((member) => ({
    id: member.id,
    name: member.name,
    initials: initialsFor(member.name),
    isOwner: false,
    role: 'Member',
  }));
  const owner = roomData.created_by ? {
    id: roomData.created_by,
    name: roomData.created_by_name || 'Room Owner',
    initials: initialsFor(roomData.created_by_name || 'Room Owner'),
    isOwner: true,
    role: 'Owner / Manager',
  } : null;
  const activeMembers = members;
  const rentFromExpenses = expenses
    .filter((expense) => expense.category?.toLowerCase() === 'rent')
    .reduce((total, expense) => total + Number(expense.amount || 0), 0);
  const monthlyRent = Number(roomData.monthly_rent ?? rentFromExpenses);

  return {
    id: roomData.id,
    name: roomData.room_name,
    createdBy: roomData.created_by,
    owner,
    monthlyRent,
    yourShare: role === 'Owner' || activeMembers.length === 0 ? 0 : monthlyRent / activeMembers.length,
    activeMemberCount: activeMembers.length,
    members,
  };
};

const normalizeExpense = (expense, members) => ({
  id: expense.id,
  title: expense.title,
  amount: Number(expense.amount || 0),
  paidBy: expense.paid_by,
  date: String(expense.expense_date || expense.created_at || '').slice(0, 10),
  category: expense.category,
  splitType: expense.split_type,
  splitBetween: members.map((member) => ({
    name: member.name,
    amount: members.length
      ? Number(expense.amount || 0) / members.length
      : 0,
  })),
});

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
  item: item.item_name || item.item,
  quantity: item.quantity || '1',
  status: item.status || 'Pending',
});

export const RoomMateProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('roommate_token') || '');
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

  const clearRoomData = useCallback(() => {
    setProfile(null);
    setRoom(null);
    setExpenses([]);
    setTasks([]);
    setShopping([]);
    setRemovedMembers([]);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('roommate_token');
    setToken('');
    setIsLoggedIn(false);
    setAuthLoading(false);
    setError('');
    clearRoomData();
  }, [clearRoomData]);

  const apiRequest = useCallback(async (endpoint, currentToken = token, options = {}) => {
    let response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
          ...options.headers,
        },
      });
    } catch {
      throw new Error('Cannot reach the RoomMate backend. Check that the backend server is running.');
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 || (response.status === 403 && data.message === 'Invalid token')) {
        logout();
        throw new Error('Your session expired. Please log in again.');
      }
      throw new Error(data.message || 'Request failed. Please try again.');
    }
    return data;
  }, [logout, token]);

  const loadDashboardData = useCallback(async (currentToken = token) => {
    if (!currentToken) {
      setAuthLoading(false);
      return false;
    }

    try {
      const [userResponse, roomResponse, expenseResponse, taskResponse, shoppingResponse] = await Promise.all([
        apiRequest('/auth/me', currentToken),
        apiRequest('/rooms', currentToken),
        apiRequest('/expenses', currentToken),
        apiRequest('/tasks', currentToken),
        apiRequest('/shopping', currentToken),
      ]);
      const user = userResponse.user;
      const roomData = roomResponse.rooms?.[0] || null;
      const memberList = roomData?.members || [];
      const expenseRows = expenseResponse.expenses || [];
      const role = user.role === 'owner' ? 'Owner' : 'Member';
      const removedResponse = role === 'Owner' && roomData
        ? await apiRequest(`/rooms/${roomData.id}/removed-members`, currentToken)
        : { members: [] };

      setProfile({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: initialsFor(user.name),
        room: roomData?.room_name || 'No room yet',
        role: roomData ? role : user.role === 'owner' ? 'Owner' : 'Member',
      });
      setRoom(normalizeRoom(roomData, user.id, expenseRows, role));
      setExpenses(expenseRows.map((expense) => normalizeExpense(expense, memberList)));
      setRemovedMembers(removedResponse.members || []);
      setTasks((taskResponse.tasks || []).map(normalizeTask));
      setShopping((shoppingResponse.shoppingItems || []).map(normalizeShopping));
      setIsLoggedIn(true);
      setError('');
      return true;
    } catch (loadError) {
      logout();
      setError(loadError.message || 'Could not load your account data.');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, [apiRequest, logout, token]);

  useEffect(() => {
    if (token) {
      loadDashboardData(token);
    }
  }, [loadDashboardData, token]);

  const setAuthSession = (authData) => {
    localStorage.setItem('roommate_token', authData.token);
    setToken(authData.token);
    setIsLoggedIn(true);
    setAuthLoading(true);
    setError('');
    setProfile({
      id: authData.user.id,
      name: authData.user.name,
      email: authData.user.email,
      avatar: initialsFor(authData.user.name),
      room: 'No room yet',
      role: authData.user.role === 'owner' ? 'Owner' : 'Member',
    });
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

  const createRoom = (roomData) => runMutation(async () => {
    const result = await apiRequest('/rooms', token, {
      method: 'POST',
      body: JSON.stringify({
        room_name: roomData.name.trim(),
        monthly_rent: Number(roomData.monthlyRent),
      }),
    });
    await loadDashboardData(token);
    return result.room;
  });

  const joinRoom = (roomId) => runMutation(async () => {
    const result = await apiRequest('/rooms/join', token, {
      method: 'POST',
      body: JSON.stringify({ room_id: Number(roomId) }),
    });
    await loadDashboardData(token);
    return result;
  });

  const leaveRoom = (roomId) => runMutation(async () => {
    const result = await apiRequest(`/rooms/${roomId}/members/me`, token, { method: 'DELETE' });
    await loadDashboardData(token);
    return result;
  });

  const removeRoomMember = (roomId, userId) => runMutation(async () => {
    const result = await apiRequest(`/rooms/${roomId}/members/${userId}`, token, { method: 'DELETE' });
    await loadDashboardData(token);
    return result;
  });

  const updateRoom = (roomId, updates) => runMutation(async () => {
    const result = await apiRequest(`/rooms/${roomId}`, token, {
      method: 'PUT',
      body: JSON.stringify({
        room_name: updates.name,
        monthly_rent: Number(updates.monthlyRent),
      }),
    });
    await loadDashboardData(token);
    return result;
  });

  const updateProfile = (updates) => runMutation(async () => {
    const result = await apiRequest('/auth/profile', token, {
      method: 'PUT',
      body: JSON.stringify({ name: updates.name, email: updates.email }),
    });
    setProfile((current) => current ? {
      ...current,
      name: result.user.name,
      email: result.user.email,
      avatar: initialsFor(result.user.name),
    } : current);
    return result.user;
  });

  const changePassword = (passwords) => runMutation(() => apiRequest('/auth/change-password', token, {
    method: 'PUT',
    body: JSON.stringify({
      current_password: passwords.currentPassword,
      new_password: passwords.newPassword,
      confirm_password: passwords.confirmPassword,
    }),
  }));

  const addRoomMember = (roomId, email) => runMutation(async () => {
    const result = await apiRequest(`/rooms/${roomId}/members`, token, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    await loadDashboardData(token);
    return result;
  });

  const addExpense = (newExpense) => runMutation(async () => {
      const roomId = requireRoom();
      const payload = {
        room_id: roomId,
        title: newExpense.title,
        amount: Number(newExpense.amount),
        category: newExpense.category,
        paid_by: newExpense.paidBy,
        split_type: 'equal',
        date: newExpense.date,
      };
      const response = await apiRequest('/expenses', token, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await loadDashboardData(token);
      return response.expense;
  });

  const updateExpense = (updatedExpense) => runMutation(async () => {
      const result = await apiRequest(`/expenses/${updatedExpense.id}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          title: updatedExpense.title,
          amount: Number(updatedExpense.amount),
          category: updatedExpense.category,
          paid_by: updatedExpense.paidBy,
          split_type: 'equal',
          date: updatedExpense.date,
        }),
      });
      await loadDashboardData(token);
      return result;
  });

  const deleteExpense = (expenseId) => runMutation(async () => {
    const result = await apiRequest(`/expenses/${expenseId}`, token, { method: 'DELETE' });
    await loadDashboardData(token);
    return result;
  });

  const addTask = (newTask) => runMutation(async () => {
      const roomId = requireRoom();
      const response = await apiRequest('/tasks', token, {
        method: 'POST',
        body: JSON.stringify({
          room_id: roomId,
          title: newTask.title,
          assigned_to: newTask.assignee,
          due_date: newTask.dueDate,
          status: newTask.status || 'Pending',
          priority: newTask.priority || 'Medium',
        }),
      });
      await loadDashboardData(token);
      return response.task;
  });

  const updateTask = (taskId, updates) => runMutation(async () => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task) throw new Error('Task not found. Refresh the page and try again.');
      const result = await apiRequest(`/tasks/${taskId}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          title: updates.title ?? task.title,
          assigned_to: updates.assignee ?? task.assignee,
          status: updates.status ?? task.status,
          due_date: updates.dueDate ?? task.dueDate,
          priority: updates.priority ?? task.priority,
        }),
      });
      await loadDashboardData(token);
      return result;
  });

  const deleteTask = (taskId) => runMutation(async () => {
    const result = await apiRequest(`/tasks/${taskId}`, token, { method: 'DELETE' });
    await loadDashboardData(token);
    return result;
  });

  const addShoppingItem = (newItem) => runMutation(async () => {
      const roomId = requireRoom();
      const response = await apiRequest('/shopping', token, {
        method: 'POST',
        body: JSON.stringify({
          room_id: roomId,
          item_name: newItem.item,
          quantity: newItem.quantity,
          added_by: profile.name,
          status: newItem.status || 'Pending',
        }),
      });
      await loadDashboardData(token);
      return response.item;
  });

  const updateShopping = (itemId, updates) => runMutation(async () => {
      const item = shopping.find((entry) => entry.id === itemId);
      if (!item) throw new Error('Shopping item not found. Refresh the page and try again.');
      const result = await apiRequest(`/shopping/${itemId}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          item_name: updates.item ?? item.item,
          quantity: updates.quantity ?? item.quantity,
          status: updates.status ?? item.status,
          added_by: profile.name,
        }),
      });
      await loadDashboardData(token);
      return result;
  });

  const deleteShopping = (itemId) => runMutation(async () => {
    const result = await apiRequest(`/shopping/${itemId}`, token, { method: 'DELETE' });
    await loadDashboardData(token);
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
      joinRoom,
      leaveRoom,
      updateRoom,
      removeRoomMember,
      updateProfile,
      changePassword,
      addRoomMember,
    };

  return <RoomMateContext.Provider value={value}>{children}</RoomMateContext.Provider>;
};
