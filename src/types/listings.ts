// Export type definitions for listings
export type Listing = {
  id: number;
  title: string;
  city: string;
  state: string;
  category: string;
  price: string;
  basePrice: number;
  auctionType: string;
  image: string;
  status: string;
  stage: string;
  sellerId: string;
  endDate: string;
  description: string;
  item_id: number;
  specifications: {
    [key: string]: string;
  };
};

// API response type
export type ListingsResponse = {
  data: Listing[];
  total: number;
  page: number;
  records: number;
};

// Redux state type
export type ListingsState = {
  live: {
    data: Listing[];
    loading: boolean;
    error: string | null;
    lastFetched: string | null;
  };
  upcoming: {
    data: Listing[];
    loading: boolean;
    error: string | null;
    lastFetched: string | null;
  };
  filtered: {
    data: Listing[];
    page: number;
    records: number;
    total: number;
    hasMore: boolean;
    loading: boolean;
    error: string | null;
    lastFetched: string | null;
  };
};