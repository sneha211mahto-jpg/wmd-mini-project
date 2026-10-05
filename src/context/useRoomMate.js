import { useContext } from 'react';
import { RoomMateContext } from './roomMateContext';

export const useRoomMate = () => {
  const context = useContext(RoomMateContext);

  if (!context) {
    throw new Error('useRoomMate must be used inside RoomMateProvider');
  }

  return context;
};