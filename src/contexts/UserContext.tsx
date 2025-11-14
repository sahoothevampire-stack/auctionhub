import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserContextType {
  isLoggedIn: boolean;
  userPhone: string | null;
  watchlist: number[];
  yourAuctions: number[];
  verifiedAuctions: number[];
  bids: Record<number, number>;
  login: (phone: string) => void;
  logout: () => void;
  toggleWatchlist: (auctionId: number) => void;
  addToYourAuctions: (auctionId: number) => void;
  markAsVerified: (auctionId: number) => void;
  placeBid: (auctionId: number, amount: number) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<number[]>([]);
  const [yourAuctions, setYourAuctions] = useState<number[]>([]);
  const [verifiedAuctions, setVerifiedAuctions] = useState<number[]>([]);
  const [bids, setBids] = useState<Record<number, number>>({});

  // Load from localStorage on mount
  useEffect(() => {
    const savedLogin = localStorage.getItem('isLoggedIn');
    const savedPhone = localStorage.getItem('userPhone');
    const savedWatchlist = localStorage.getItem('watchlist');
    const savedYourAuctions = localStorage.getItem('yourAuctions');
    const savedVerifiedAuctions = localStorage.getItem('verifiedAuctions');
    const savedBids = localStorage.getItem('bids');

    if (savedLogin === 'true' && savedPhone) {
      setIsLoggedIn(true);
      setUserPhone(savedPhone);
    }
    if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));
    if (savedYourAuctions) setYourAuctions(JSON.parse(savedYourAuctions));
    if (savedVerifiedAuctions) setVerifiedAuctions(JSON.parse(savedVerifiedAuctions));
    if (savedBids) setBids(JSON.parse(savedBids));
  }, []);

  const login = (phone: string) => {
    setIsLoggedIn(true);
    setUserPhone(phone);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userPhone', phone);
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUserPhone(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userPhone');
  };

  const toggleWatchlist = (auctionId: number) => {
    setWatchlist(prev => {
      const newWatchlist = prev.includes(auctionId)
        ? prev.filter(id => id !== auctionId)
        : [...prev, auctionId];
      localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
      return newWatchlist;
    });
  };

  const addToYourAuctions = (auctionId: number) => {
    setYourAuctions(prev => {
      if (prev.includes(auctionId)) return prev;
      const newAuctions = [...prev, auctionId];
      localStorage.setItem('yourAuctions', JSON.stringify(newAuctions));
      return newAuctions;
    });
  };

  const markAsVerified = (auctionId: number) => {
    setVerifiedAuctions(prev => {
      if (prev.includes(auctionId)) return prev;
      const newVerified = [...prev, auctionId];
      localStorage.setItem('verifiedAuctions', JSON.stringify(newVerified));
      return newVerified;
    });
  };

  const placeBid = (auctionId: number, amount: number) => {
    setBids(prev => {
      const newBids = { ...prev, [auctionId]: amount };
      localStorage.setItem('bids', JSON.stringify(newBids));
      return newBids;
    });
  };

  return (
    <UserContext.Provider value={{
      isLoggedIn,
      userPhone,
      watchlist,
      yourAuctions,
      verifiedAuctions,
      bids,
      login,
      logout,
      toggleWatchlist,
      addToYourAuctions,
      markAsVerified,
      placeBid
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};
