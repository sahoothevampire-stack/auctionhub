import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import config from "@/common/constants"; // Import the config
import { _requestFile } from "@/common/api/propertyapi";

interface KycItemState {
  currentStep: 1 | 2 | 3;
  panVerified: boolean;
  emdVerified: boolean;
  aadhaarVerified: boolean;
  panNumber: string;
  formData: {
    // final submission fields
    item_id?: string | number | null;
    user_id?: string | null;
    name_on_pan?: string | null;
    pan_no?: string | null;
    pan_verification_step_1?: boolean;
    pan_failure_reason?: string | null;
    name_on_aadhar?: string | null;
    aadhar_no?: string | null;
    aadhar_verification_step_1?: boolean;
    aadhar_failure_reason?: string | null;
    emd_proof?: string | null;
    address_proof?: string | null;
    pan_proof?: string | null;
    emdAmount?: string;
  } | null;
  panNameMatched: boolean;
}

interface KycState {
  itemStates: Record<string | number, KycItemState>;
}

const createDefaultItemState = (): KycItemState => ({
  currentStep: 1,
  panVerified: false,
  emdVerified: false,
  aadhaarVerified: false,
  panNumber: "",
  formData: null,
  panNameMatched: false,
});

const initialState: KycState = {
  itemStates: {},
};

export const uploadPanDocument = createAsyncThunk(
  'kyc/uploadPanDocument',
  async (
    { file, userId, field }: { file: File; userId: string; field?: 'pan' | 'emd' },
    { rejectWithValue }
  ) => {
    try {
      const url = `auctions/upload-file?user_id=${userId}`;
      const response = await _requestFile('POST', url, file, userId);

      if (!response || !response.success) {
        return rejectWithValue(response || { message: 'Upload failed' });
      }

      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'File upload error');
    }
  }
);

const kycSlice = createSlice({
  name: 'kyc',
  initialState,
  reducers: {
    setKycStep: (state, action: PayloadAction<{ itemId: string | number; step: 1 | 2 | 3 }>) => {
      if (!state.itemStates[action.payload.itemId]) {
        state.itemStates[action.payload.itemId] = createDefaultItemState();
      }
      state.itemStates[action.payload.itemId].currentStep = action.payload.step;
    },
    setPanNumber: (state, action: PayloadAction<{ itemId: string | number; panNumber: string }>) => {
      if (!state.itemStates[action.payload.itemId]) {
        state.itemStates[action.payload.itemId] = createDefaultItemState();
      }
      state.itemStates[action.payload.itemId].panNumber = action.payload.panNumber;
    },
    setPanNameMatched: (state, action: PayloadAction<{ itemId: string | number; matched: boolean }>) => {
      if (!state.itemStates[action.payload.itemId]) {
        state.itemStates[action.payload.itemId] = createDefaultItemState();
      }
      state.itemStates[action.payload.itemId].panNameMatched = action.payload.matched;
    },
    setPanVerificationStatus: (state, action: PayloadAction<{ itemId: string | number; verified: boolean }>) => {
      if (!state.itemStates[action.payload.itemId]) {
        state.itemStates[action.payload.itemId] = createDefaultItemState();
      }
      const itemState = state.itemStates[action.payload.itemId];
      itemState.panVerified = action.payload.verified;
      itemState.formData = {
        ...(itemState.formData || {}),
        pan_verification_step_1: action.payload.verified,
        pan_failure_reason: itemState.formData?.pan_failure_reason || null,
      };
      if (action.payload.verified) {
        itemState.currentStep = 2;
      }
    },
    setEmdVerificationStatus: (state, action: PayloadAction<{ itemId: string | number; verified: boolean }>) => {
      if (!state.itemStates[action.payload.itemId]) {
        state.itemStates[action.payload.itemId] = createDefaultItemState();
      }
      const itemState = state.itemStates[action.payload.itemId];
      itemState.emdVerified = action.payload.verified;
      if (action.payload.verified) {
        itemState.currentStep = 3;
      }
    },
    setAadhaarVerificationStatus: (state, action: PayloadAction<{ itemId: string | number; verified: boolean }>) => {
      if (!state.itemStates[action.payload.itemId]) {
        state.itemStates[action.payload.itemId] = createDefaultItemState();
      }
      state.itemStates[action.payload.itemId].aadhaarVerified = action.payload.verified;
    },
    setFormData: (state, action: PayloadAction<{ itemId: string | number; formData: KycItemState['formData'] }>) => {
      if (!state.itemStates[action.payload.itemId]) {
        state.itemStates[action.payload.itemId] = createDefaultItemState();
      }
      state.itemStates[action.payload.itemId].formData = action.payload.formData;
    },
    resetKycState: (state, action: PayloadAction<{ itemId: string | number }>) => {
      state.itemStates[action.payload.itemId] = createDefaultItemState();
    },
    resetAllKycState: (state) => {
      state.itemStates = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadPanDocument.pending, (state) => {
        // Handle pending state if needed
      })
      .addCase(uploadPanDocument.fulfilled, (state, action) => {
        if (action.payload && action.payload.success && action.payload.result) {
          const url = action.payload.result as string;
          const field = (action.meta && (action.meta.arg as any)?.field) || 'pan';
          // Note: uploadPanDocument doesn't have itemId context, so we can't track it here
          // You may need to handle this differently or add itemId to the thunk arg
        }
      })
      .addCase(uploadPanDocument.rejected, (state, action) => {
        // Handle error state if needed
      });
  },
});

export const {
  setKycStep,
  setPanNumber,
  setPanNameMatched,
  setPanVerificationStatus,
  setEmdVerificationStatus,
  setAadhaarVerificationStatus,
  setFormData,
  resetKycState,
  resetAllKycState,
} = kycSlice.actions;

export default kycSlice.reducer;