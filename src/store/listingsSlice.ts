import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { ListingsState, ListingsResponse } from '@/types/listings';
import _request from "@/common/api/propertyapi";

// Default records per-page. Make configurable via env var for flexibility.
const DEFAULT_RECORDS = Number(process.env.NEXT_PUBLIC_LISTINGS_PER_PAGE) || 21;

export const fetchLiveListings = createAsyncThunk(
  'listings/fetchLive',
  async ({ page = 1, records = DEFAULT_RECORDS }: { page?: number; records?: number } = {}) => {
    try {
      // Use the shared API helper which prepends the configured API_URL
      const responseData = await _request(
        'GET',
        `home/1/details?item_status=2&page=${page}&records=${records}`
      );
      // Normalize known API shapes:
      // 1) { data: [...] }
      // 2) [...] (array)
      // 3) { result: { items: [...] } } (current API)
      // 4) { result: { totalItems, items } }
      // Fallback to empty array
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyData: any = responseData;
      const items = Array.isArray(anyData)
        ? anyData
        : Array.isArray(anyData.data)
        ? anyData.data
        : Array.isArray(anyData.result?.items)
        ? anyData.result.items
        : [];

        const total = anyData.total ?? anyData.result?.totalItems ?? 0;
        const respPage = anyData.page ?? 1;
        const respRecords = anyData.records ?? items.length;

        return { data: items, total, page: respPage, records: respRecords };
    } catch (error) {
      console.error('API Error (live):', error);
      throw error;
    }
  }
);

export const fetchUpcomingListings = createAsyncThunk(
  'listings/fetchUpcoming',
  async ({ page = 1, records = DEFAULT_RECORDS }: { page?: number; records?: number } = {}) => {
    try {
        const responseData = await _request(
          'GET',
          `home/1/details?item_status=3&page=${page}&records=${records}`
        );
        // Normalize shapes (see fetchLiveListings)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyData: any = responseData;
        const items = Array.isArray(anyData)
        ? anyData
        : Array.isArray(anyData.data)
        ? anyData.data
        : Array.isArray(anyData.result?.items)
        ? anyData.result.items
        : [];

        const total = anyData.total ?? anyData.result?.totalItems ?? 0;
        const respPage = anyData.page ?? 1;
        const respRecords = anyData.records ?? items.length;

        return { data: items, total, page: respPage, records: respRecords };
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
);

/**
 * Fetch filtered listings with pagination (supports infinite scroll).
 *
 * Notes / assumptions:
 * - The API endpoint is the same as live/upcoming: `home/1/details`.
 * - We append additional query parameters for filters. Keys used here are reasonable
 *   guesses based on UI names: `category`, `city`, `seller_id`, `search`, `sort_by`.
 *   If the backend expects different parameter names, adjust the mapping below.
 */
export const fetchFilteredListings = createAsyncThunk(
  'listings/fetchFiltered',
  async (
    {
      filters = {},
      page = 1,
      records = DEFAULT_RECORDS,
      item_status, // optional numeric item_status (2=live,3=upcoming)
    }: {
      filters?: Record<string, string>;
      page?: number;
      records?: number;
      item_status?: number | string;
    }
  ) => {
    try {
      // Build query string
      const params: string[] = [];
      if (item_status) params.push(`item_status=${encodeURIComponent(String(item_status))}`);
      params.push(`page=${page}`);
      params.push(`records=${records}`);

      // Map UI filter keys to API parameters. Adjust here if backend differs.
      if (filters) {
        if (filters.maincategoryId && filters.maincategoryId !== '' && filters.maincategoryId !== 'all') {
          params.push(`main_category_id=${encodeURIComponent(filters.maincategoryId)}`);
        }
        if (filters.categoryId && filters.categoryId !== '' && filters.categoryId !== 'all') {
          params.push(`category_id=${encodeURIComponent(filters.categoryId)}`);
        }
        if (filters.sellerId && filters.sellerId !== '' && filters.sellerId !== 'all') {
          params.push(`seller_id=${encodeURIComponent(filters.sellerId)}`);
        }
        if (filters.cityId && filters.cityId !== '' && filters.cityId !== 'all') {
          params.push(`city_id=${encodeURIComponent(filters.cityId)}`);
        }
        // Map status (UI) to item_status for the API if not already supplied
        // Support UI values like 'Live' | 'Upcoming' or numeric strings '2' | '3'.
        if (!item_status && filters.status && filters.status !== '' && filters.status !== 'all') {
          const s = String(filters.status).toLowerCase();
          if (s === 'live' || s === '2') {
            params.push(`item_status=2`);
          } else if (s === 'upcoming' || s === '3') {
            params.push(`item_status=3`);
          }
        }
        if (filters.searchQuery && filters.searchQuery !== '') {
          params.push(`search=${encodeURIComponent(filters.searchQuery)}`);
        }
        if (filters.sortBy && filters.sortBy !== '') {
          params.push(`sort_by=${encodeURIComponent(filters.sortBy)}`);
        }
      }

      const query = params.length ? `?${params.join('&')}` : '';

      const responseData = await _request('GET', `home/1/details${query}`);

      // Normalize shapes (re-using logic from live/upcoming thunks)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyData: any = responseData;
      const items = Array.isArray(anyData)
        ? anyData
        : Array.isArray(anyData.data)
        ? anyData.data
        : Array.isArray(anyData.result?.items)
        ? anyData.result.items
        : [];

      const total = anyData.total ?? anyData.result?.totalItems ?? 0;
      const respPage = anyData.page ?? page;
      const respRecords = anyData.records ?? items.length;

      return { data: items, total, page: respPage, records: respRecords };
    } catch (error) {
      console.error('API Error (filtered):', error);
      throw error;
    }
  }
);

const initialState: ListingsState = {
  live: {
    data: [],
    loading: false,
    error: null,
    lastFetched: null,
  },
  upcoming: {
    data: [],
    loading: false,
    error: null,
    lastFetched: null,
  },
  // filtered supports infinite scroll and filter combinations
  filtered: {
    data: [],
    page: 1,
    records: DEFAULT_RECORDS,
    total: 0,
    hasMore: true,
    loading: false,
    error: null,
    lastFetched: null,
  },
};

const listingsSlice = createSlice({
  name: 'listings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // helper to ensure we always have a filtered sub-state (handles persisted/old state)
    const ensureFiltered = (state: Partial<ListingsState> & Record<string, any>) => {
      if (!state.filtered) {
        state.filtered = {
          data: [],
          page: 1,
          records: DEFAULT_RECORDS,
          total: 0,
          hasMore: true,
          loading: false,
          error: null,
          lastFetched: null,
        };
      }
    };
    // Live listings
    builder
      .addCase(fetchLiveListings.pending, (state) => {
        state.live.loading = true;
        state.live.error = null;
      })
      .addCase(fetchLiveListings.fulfilled, (state, action) => {
        // API may return either { data: Listing[] } or Listing[] directly
        // Support both shapes to avoid undefined data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: any = action.payload;
        console.log('Fetched live listings:', payload);
        state.live.data = payload?.data ?? payload ?? [];
        state.live.loading = false;
        state.live.lastFetched = new Date().toISOString();
      })
      .addCase(fetchLiveListings.rejected, (state, action) => {
        state.live.loading = false;
        state.live.error = action.error.message || 'Failed to fetch live listings';
      })
      // Upcoming listings
      .addCase(fetchUpcomingListings.pending, (state) => {
        state.upcoming.loading = true;
        state.upcoming.error = null;
      })
      .addCase(fetchUpcomingListings.fulfilled, (state, action) => {
        // Support both { data: Listing[] } and Listing[] response shapes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: any = action.payload;
        state.upcoming.data = payload?.data ?? payload ?? [];
        state.upcoming.loading = false;
        state.upcoming.lastFetched = new Date().toISOString();
      })
      .addCase(fetchUpcomingListings.rejected, (state, action) => {
        state.upcoming.loading = false;
        state.upcoming.error = action.error.message || 'Failed to fetch upcoming listings';
      });

    // Filtered listings (pagination mode)
    builder
      .addCase(fetchFilteredListings.pending, (state) => {
        ensureFiltered(state);
        state.filtered.loading = true;
        state.filtered.error = null;
      })
      .addCase(fetchFilteredListings.fulfilled, (state, action) => {
        ensureFiltered(state);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: any = action.payload;
        console.log('Fetched filtered listings:', payload);
        const page = payload?.page ?? 1;
        const items = payload?.data ?? [];
        const total = payload?.total ?? 0;

        // Determine the authoritative page size (records per page):
        // 1) Prefer the `records` requested in the thunk call (action.meta.arg.records)
        // 2) Fallback to the `records` value returned in payload (payload.records)
        // 3) Fallback to existing state or default 20
        // This prevents using the last-page returned item count (which may be smaller)
        // as the page size for computing total pages.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requestedRecords = (action as any)?.meta?.arg?.records;
        const pageSize = requestedRecords ?? payload?.records ?? state.filtered.records ?? DEFAULT_RECORDS;

        // Always replace data for pagination (never append)
        state.filtered.data = items;

        state.filtered.page = page;
        state.filtered.records = pageSize;
        state.filtered.total = total;
        // hasMore if there are more pages to load
        state.filtered.hasMore = (page * pageSize) < total;
        state.filtered.loading = false;
        state.filtered.lastFetched = new Date().toISOString();
      })
      .addCase(fetchFilteredListings.rejected, (state, action) => {
        ensureFiltered(state);
        state.filtered.loading = false;
        state.filtered.error = action.error.message || 'Failed to fetch filtered listings';
      });
  },
});

export default listingsSlice.reducer;