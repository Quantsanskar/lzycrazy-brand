import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from '../lib/axios/axiosInstance';
import Loader from '../components/common/Spinner';

const UserContext = createContext();
export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const DEFAULT_PROFILE_PIC = 'https://i.ibb.co/2kR5zq0/default-avatar.png';

  const [user, setUser] = useState(null);
  const [profilePic, setProfilePic] = useState(DEFAULT_PROFILE_PIC);
  const [displayName, setDisplayName] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  const fetchUser = async () => {
    try {
      const res = await axios.get('/v1/users/me', { withCredentials: true });
      const data = res.data;
      setUser(data);
      setDisplayName(data?.profile?.name || '');
      setProfilePic(`${data?.profile?.photoURL || DEFAULT_PROFILE_PIC}?t=${Date.now()}`);
    } catch (error) {
      console.warn("Auth check failed:", error?.response?.data || error);
      logout1(); // logout clears user + storage
    } finally {
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    // NEW: Check if hiring is in progress before auto-fetching user
    const hiringInProgress = localStorage.getItem('hiringInProgress') === 'true';
    
    if (!hiringInProgress) {
      // Only fetch user if not in hiring process
      fetchUser();
    } else {
      // If hiring in progress, just mark auth as checked without fetching user
      console.log('Hiring in progress - skipping auto authentication');
      setAuthChecked(true);
    }
  }, []);

  const logout1 = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setUser(null);
    setProfilePic(DEFAULT_PROFILE_PIC);
    setDisplayName('');
  };

  return (
    <UserContext.Provider
      value={{
        user,
        profilePic,
        displayName,
        fetchUser,
        logout1,
        authChecked,
      }}
    >
      {authChecked ? children : <Loader/>}
    </UserContext.Provider>
  );
};