import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import _request from '@/common/api/propertyapi';

/**
 * Shape matches the exact API response in src/data/filterdata.json
 */
export type Region = { id: number; display_name: string };
export type CityItem = { id: number; display_name: string };
export type PropertyType = { id: number; name: string };
export type PriceRange = { min: number; max: number };
export type Seller = { id: number; name: string };

export type FiltersData = {
  regions: Region[];
  price_range: PriceRange[];
  cities: CityItem[];
  property_types: PropertyType[];
  sellers?: Seller[];
};

type FiltersState = {
  data: FiltersData | null;
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
};

export const fetchFiltersData = createAsyncThunk('filters/fetchData', async () => {
  try {
    const response = await _request('GET', 'home/filters-data');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyResp: any = response;

    const payload = anyResp.result ?? anyResp.data ?? anyResp;

    const regions: Region[] = Array.isArray(payload.regions) ? payload.regions : [];
    const price_range: PriceRange[] = Array.isArray(payload.price_range) ? payload.price_range : [];
    const cities: CityItem[] = Array.isArray(payload.cities) ? payload.cities : [];
    const property_types: PropertyType[] = Array.isArray(payload.property_types)
      ? payload.property_types
      : [];
    const sellers: Seller[] = Array.isArray(payload.sellers) ? payload.sellers : [];

    return { regions, price_range, cities, property_types, sellers } as FiltersData;
  } catch (err) {
    console.error('Failed to fetch filters data', err);
    throw err;
  }
});

const initialState: FiltersState = {
  data: null,
  loading: false,
  error: null,
  lastFetched: null,
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFiltersData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFiltersData.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
        state.lastFetched = new Date().toISOString();
      })
      .addCase(fetchFiltersData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to fetch filters';
      });
  },
});

export default filtersSlice.reducer;
