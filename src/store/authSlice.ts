import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import _request from '@/common/api/propertyapi';

interface AuthState {
  loading: boolean;
  error: string | null;
  access_token: string | null;
  phone: string | null;
  user_id: string | null;
  name:  string | null;
  email:  string | null;
  new_user: boolean;
}

const initialState: AuthState = {
  loading: false,
  error: null,
  access_token: null,
  phone: null,
  user_id: null,
  name: null,
  email: null,
  new_user: false
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ phone, otp }: { phone: string; otp: string }) => {
    try {
      const anyData: any = await _request('POST', 'auth/login', { 
        login_type : 'otpLogin',
        role : 'buyer',
        otp_code: otp,
        phone: phone
      });

      if(!anyData || !anyData.success) {
        const msg = anyData?.message || 'Login failed';
        throw new Error(msg);
      }
      console.log('Login API response:', anyData);
      const response = anyData.result;

      const access_token = response.access_token ? response.access_token.access_token : null;
      const user_id = response.user ? response.user.id : '';
      if(response && response.new_user) {
        return { new_user : response.new_user, access_token: access_token, phone: phone, user_id: user_id, name : '', email : '' }; // New user flow handling
      }
      
      const name = response.user ? response.user.name : '';
      const email = response.user ? response.user.email : '';

      console.log('Extracted auth data:', { access_token, phone, user_id, name, email });
      
      if (!access_token) {
        const msg = response.message || 'Login failed';
        throw new Error(msg);
      }

      return { new_user: false, access_token, phone, user_id, name, email };
    } catch (error: any) {
      console.log('API Error (login):', error);
      throw error;
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.access_token = null;
      state.phone = null;
      state.user_id = null;
      state.name = null;
      state.email = null;
      state.error = null;
      state.loading = false;
      state.new_user = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.access_token = action.payload.access_token;
        state.phone = action.payload.phone;
        state.name = action.payload.name;
        state.email = action.payload.email;
        state.user_id = action.payload.user_id;
        state.new_user = action.payload.new_user;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
