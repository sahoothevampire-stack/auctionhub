import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import config from "@/common/constants"; // Import the config
import { _requestFile } from "@/common/api/propertyapi";

interface KycState {
  currentStep: 1 | 2 | 3;
  panVerified: boolean;
  emdVerified: boolean;
  aadhaarVerified: boolean;
  panNumber: string;
  // removed duplicate panDocS3Url; single source is formData.pan_proof
  // Form data for final submission
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

const initialState: KycState = {
  currentStep: 1,
  panVerified: false,
  emdVerified: false,
  aadhaarVerified: false,
  panNumber: "",
  formData: null,
  panNameMatched: false,
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
    setKycStep: (state, action: PayloadAction<1 | 2 | 3>) => {
      state.currentStep = action.payload;
    },
    setPanNumber: (state, action: PayloadAction<string>) => {
      state.panNumber = action.payload;
    },
    setPanNameMatched: (state, action: PayloadAction<boolean>) => {
      state.panNameMatched = action.payload;
    },
    setPanVerificationStatus: (state, action: PayloadAction<{ verified: boolean }>) => {
      state.panVerified = action.payload.verified;
      // update formData with verification status
      state.formData = {
        ...(state.formData || {}),
        pan_verification_step_1: action.payload.verified,
        pan_failure_reason: state.formData?.pan_failure_reason || null,
      };
      if (action.payload.verified) {
        state.currentStep = 2;
      }
    },
    
    setEmdVerificationStatus: (state, action: PayloadAction<boolean>) => {
      state.emdVerified = action.payload;
      if (action.payload) {
        state.currentStep = 3;
      }
    },
    setAadhaarVerificationStatus: (state, action: PayloadAction<boolean>) => {
      state.aadhaarVerified = action.payload;
    },
    setFormData: (state, action: PayloadAction<KycState['formData']>) => {
      state.formData = action.payload;
    },
    resetKycState: (state) => {
      state.currentStep = 1;
      state.panVerified = false;
      state.emdVerified = false;
      state.aadhaarVerified = false;
      state.panNumber = "";
      state.formData = null;
      state.panNameMatched = false;
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

          if (field === 'pan') {
            // merge pan upload url into formData
            state.formData = {
              ...(state.formData || {}),
              pan_proof: url,
              pan_no: state.panNumber || state.formData?.pan_no || null,
            };

            // Only mark PAN verified and move to next step if name matched
            if (state.panNameMatched) {
              state.panVerified = true;
              state.currentStep = 2;
              // set verification flag in formData
              state.formData = {
                ...(state.formData || {}),
                pan_verification_step_1: true,
                pan_failure_reason: state.formData?.pan_failure_reason || null,
              };
            }
          } else if (field === 'emd') {
            // store emd url in formData
            state.formData = {
              ...(state.formData || {}),
              emd_proof: url,
            };
          }
        }
      })
      .addCase(uploadPanDocument.rejected, (state, action) => {
        state.panVerified = false;
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
} = kycSlice.actions;

export default kycSlice.reducer;