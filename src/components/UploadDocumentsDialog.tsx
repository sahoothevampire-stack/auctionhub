"use client";

import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { CheckCircle2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import type { AuctionCardProps } from "./AuctionCard";
import type { RootState, AppDispatch } from "@/store/store";
import { fetchPanDetails, fetchDigiLockerUrl } from "@/common/api/kyc";
import { useUser } from "@/contexts/UserContext";
import {
  setPanNumber,
  setPanVerificationStatus,
  setEmdVerificationStatus,
  setAadhaarVerificationStatus,
  resetKycState,
  uploadPanDocument,
  setPanNameMatched,
  setFormData,
} from "@/store/kycSlice";

interface UploadDocumentsDialogProps {
  property: AuctionCardProps;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 1 | 2 | 3;

export function UploadDocumentsDialog({ property, open, onOpenChange }: UploadDocumentsDialogProps) {
  const itemId = property.item_id ?? property.id; // Use item_id as unique key for KYC state
  
  const [panLoading, setPanLoading] = useState(false);
  const [panDocFile, setPanDocFile] = useState<File | null>(null);
  const [emdLoading, setEmdLoading] = useState(false);
  const [emdDocFile, setEmdDocFile] = useState<File | null>(null);
  const [emdAmountLocal, setEmdAmountLocal] = useState<string>("");
  const [aadhaarLoading, setAadhaarLoading] = useState(false);
  
  const dispatch: AppDispatch = useDispatch();
  const authState = useSelector((state: RootState) => state.auth);
  
  // Get item-specific KYC state
  const itemState = useSelector((state: RootState) => (state.kyc.itemStates?.[itemId] || {
    currentStep: 1,
    panVerified: false,
    emdVerified: false,
    aadhaarVerified: false,
    panNumber: "",
    aadhaarNumber: "",
    formData: null,
    panNameMatched: false,
  }));
  
  const { currentStep, panVerified, emdVerified, aadhaarVerified, panNumber, panNameMatched, formData } = itemState;
  const { userPhone } = useUser();

  // Listen for webhook callback via postMessage from popup
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      try {
        if (event.origin !== window.location.origin) return;
        const data = event.data || {};
        if (data.type !== 'aadhaarVerification') return;
        const payload = data.payload || {};
        if (!payload) return;

        // Handle API failure response (statusCode !== 200 or success: false)
        if (!payload.success) {
          toast.error(payload.error || 'Aadhaar verification failed');
          // Reset Aadhaar state and formData so user can retry
          dispatch(setAadhaarVerificationStatus({ itemId, verified: false }));
          dispatch(setFormData({
            itemId,
            formData: {
              ...(formData || {}),
              aadhar_verification_step_1: false,
              aadhar_failure_reason: 'verification_failed',
            }
          }));
          return;
        }

        // Success: fetch returned payload.data with Aadhaar info
        if (payload.data) {
          const response = payload.data;
          const aadhaarData = response.data || response;
          const aadhaarName = (aadhaarData && (aadhaarData.userName || aadhaarData.name)) || '';
          const aadhaarNo = (aadhaarData && (aadhaarData.maskedAadhaarNo || aadhaarData.aadhar_no || aadhaarData.aadhaar_no)) || '';
          const authUserName = authState.name || '';
          const nameMatches = authUserName && aadhaarName && authUserName.trim().toLowerCase() === aadhaarName.trim().toLowerCase();

          // Update formData and verification status
          dispatch(setFormData({
            itemId,
            formData: {
              ...(formData || {}),
              item_id: itemId,
              user_id: authState.user_id,
              name_on_aadhar: aadhaarName,
              aadhar_no: aadhaarNo,
              aadhar_verification_step_1: !!nameMatches,
              aadhar_failure_reason: nameMatches ? null : 'name_mismatch',
            }
          }));

          if (nameMatches) {
            toast.success("Aadhaar verification completed successfully ✅");
            setTimeout(() => {
              onOpenChange(false);
              dispatch(resetKycState({ itemId }));
            }, 1500);
          } else {
            toast.error("Aadhaar verification failed: Name mismatch. The name on your Aadhaar does not match your registered name.");
            dispatch(setAadhaarVerificationStatus({ itemId, verified: false }));
          }
        }
      } catch (err) {
        console.warn('Error handling aadhaar message', err);
      }
    }

    window.addEventListener('message', handleMessage, false);
    return () => window.removeEventListener('message', handleMessage, false);
  }, [dispatch, formData, authState.name, authState.user_id, itemId, onOpenChange]);

  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    dispatch(setPanNumber({ itemId, panNumber: value }));

    if (value.length === 10 && panNumber.length < 10) {
      callPanDetailsApi(value);
    }
  };

  const handlePanDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
    setPanDocFile(file);
    
    if (!file) {
      toast.error("Please upload PAN document (PDF/JPG/PNG)");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("PAN document must be less than 5MB");
      setPanDocFile(null);
      return;
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      toast.error("Only PDF, JPG or PNG PAN documents allowed");
      setPanDocFile(null);
      return;
    }

    if (!authState.user_id) {
      toast.error("User ID not found for document upload.");
      setPanDocFile(null);
      return;
    }

    setPanLoading(true);
    try {
      const resultAction = await dispatch(uploadPanDocument({ file, userId: authState.user_id, field: 'pan', itemId }));
      if (uploadPanDocument.fulfilled.match(resultAction)) {
        toast.success("PAN Document Uploaded Successfully ✅");
      } else {
        const payload = resultAction.payload;
        let errMsg = "Failed to upload PAN document.";
        if (typeof payload === "string") {
          errMsg = payload;
        } else if (payload && typeof payload === "object") {
          errMsg = (payload as any).message || (payload as any).error || JSON.stringify(payload);
        }
        toast.error(errMsg);
        setPanDocFile(null);
      }
    } catch (error) {
      console.error("PAN document upload error:", error);
      toast.error("Failed to upload PAN document. Please try again.");
      setPanDocFile(null);
    } finally {
      setPanLoading(false);
    }
  };

  const callPanDetailsApi = async (pan_no: string) => {
    if (!authState.user_id) {
      toast.error("User ID not found");
      return;
    }

    setPanLoading(true);
    try {
      const data = await fetchPanDetails(pan_no);
      
      const panName = data.name ? String(data.name).toLowerCase().trim() : '';
      const userName = authState.name ? String(authState.name).toLowerCase().trim() : '';

      if (panName !== userName) {
        toast.error("Name mismatch: Name on PAN does not match registered user name.");
        dispatch(setPanNameMatched({ itemId, matched: false }));
        dispatch(setFormData({
          itemId,
          formData: {
            ...(formData || {}),
            item_id: itemId,
            user_id: authState.user_id,
            name_on_pan: data.name || null,
            pan_no: pan_no,
            pan_verification_step_1: false,
            pan_failure_reason: 'name_mismatch',
          }
        }));
        return;
      }

      dispatch(setPanNameMatched({ itemId, matched: true }));
      dispatch(setFormData({
        itemId,
        formData: {
          ...(formData || {}),
          item_id: itemId,
          user_id: authState.user_id,
          name_on_pan: data.name || null,
          pan_no: pan_no,
          pan_verification_step_1: false,
          pan_failure_reason: null,
        }
      }));

      console.log('PAN details response:', data);
      toast.success("PAN details retrieved successfully");
    } catch (error) {
      console.error('PAN details API error:', error);
      toast.error("Failed to fetch PAN details. Please try again.");
    } finally {
      setPanLoading(false);
    }
  };

  const handlePanVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!panNumber || panNumber.length !== 10) {
      toast.error("Please enter a valid 10-character PAN number");
      return;
    }

    if (!formData?.pan_proof) {
      toast.error("Please upload PAN document first");
      return;
    }

    if (panNameMatched) {
      toast.error("PAN name did not match. Please verify PAN number.");
      return;
    }

    dispatch(setPanVerificationStatus({ itemId, verified: true }));
    toast.success("PAN Verified Successfully ✅");
  };

  const handleEmdDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
    setEmdDocFile(file);

    if (!file) {
      toast.error("Please upload EMD document (PDF/JPG/PNG)");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("EMD document must be less than 5MB");
      setEmdDocFile(null);
      return;
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      toast.error("Only PDF, JPG or PNG EMD documents allowed");
      setEmdDocFile(null);
      return;
    }

    if (!authState.user_id) {
      toast.error("User ID not found for document upload.");
      setEmdDocFile(null);
      return;
    }

    setEmdLoading(true);
    try {
      const resultAction = await dispatch(uploadPanDocument({ file, userId: authState.user_id, field: 'emd', itemId }));
      if (uploadPanDocument.fulfilled.match(resultAction)) {
        toast.success("EMD Document Uploaded Successfully ✅");
      } else {
        const payload = resultAction.payload;
        let errMsg = "Failed to upload EMD document.";
        if (typeof payload === "string") {
          errMsg = payload;
        } else if (payload && typeof payload === "object") {
          errMsg = (payload as any).message || (payload as any).error || JSON.stringify(payload);
        }
        toast.error(errMsg);
        setEmdDocFile(null);
      }
    } catch (error) {
      console.error("EMD document upload error:", error);
      toast.error("Failed to upload EMD document. Please try again.");
      setEmdDocFile(null);
    } finally {
      setEmdLoading(false);
    }
  };

  const handleEmdVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emdAmountLocal || emdAmountLocal.trim() === '') {
      toast.error('Please enter EMD amount');
      return;
    }

    if (!formData?.emd_proof) {
      toast.error('Please upload EMD document first');
      return;
    }

    dispatch(setFormData({
      itemId,
      formData: {
        ...(formData || {}),
        emdAmount: String(emdAmountLocal),
      }
    }));

    dispatch(setEmdVerificationStatus({ itemId, verified: true }));
    toast.success("EMD Verified Successfully ✅");
  };

  const handleAadhaarVerify = async () => {
    setAadhaarLoading(true);
    try {
      const response = await fetchDigiLockerUrl(authState.user_id);
      
      if (!response || !response.data || !response.data.url) {
        toast.error("Failed to generate DigiLocker URL");
        setAadhaarLoading(false);
        return;
      }

      window.open(response.data.url, '_blank');
      dispatch(setAadhaarVerificationStatus({ itemId, verified: true }));
      toast.success("DigiLocker window opened. Please complete the verification.");
    } catch (error) {
      console.error("DigiLocker verification error:", error);
      toast.error("Failed to initiate DigiLocker verification. Please try again.");
    } finally {
      setAadhaarLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Upload Documents</DialogTitle>
          <p className="text-sm text-muted-foreground">{property.name}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex justify-between items-center">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex items-center ${step < 3 ? "flex-1" : ""}`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep >= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {(step === 1 && panVerified) ||
                  (step === 2 && emdVerified) ||
                  (step === 3 && aadhaarVerified) ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    step
                  )}
                </div>
                {step < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      currentStep > step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: PAN Details */}
          {currentStep === 1 && (
            <form onSubmit={handlePanVerify} className="space-y-4">
              <h3 className="font-semibold text-lg">Step 1: PAN Details</h3>
              <div className="space-y-2">
                <Label htmlFor="pan">PAN Number *</Label>
                <Input
                  id="pan"
                  placeholder="ABCDE1234F"
                  value={panNumber}
                  onChange={handlePanChange}
                  maxLength={10}
                  disabled={panLoading}
                  required
                />
                {panLoading && <p className="text-xs text-muted-foreground">Fetching PAN details...</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan-doc">Upload PAN Document *</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="pan-doc" 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png" 
                    onChange={handlePanDocChange} 
                    disabled={panLoading}
                    required 
                  />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">PDF, JPG, or PNG (max 5MB)</p>
                {formData?.pan_proof && (
                  <p className="text-xs text-green-600 font-medium">✅ Document uploaded successfully</p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={!formData?.pan_proof || panLoading}
              >
                Verify PAN
              </Button>
            </form>
          )}

          {/* Step 2: EMD Details */}
          {currentStep === 2 && (
            <form onSubmit={handleEmdVerify} className="space-y-4">
              <h3 className="font-semibold text-lg">Step 2: EMD Details</h3>
              <div className="space-y-2">
                <Label htmlFor="emd-amount">EMD Amount (₹) *</Label>
                <Input
                  id="emd-amount"
                  type="number"
                  placeholder="Enter EMD amount"
                  required
                  value={emdAmountLocal}
                  onChange={(e) => setEmdAmountLocal(String(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emd-doc">Upload EMD Receipt / DD Copy *</Label>
                <div className="flex items-center gap-2">
                  <Input id="emd-doc" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleEmdDocChange} disabled={emdLoading} required />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">PDF, JPG, or PNG (max 5MB)</p>
                {formData?.emd_proof && (
                  <p className="text-xs text-green-600 font-medium">✅ EMD Document uploaded successfully</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={emdLoading || !formData?.emd_proof}>
                Verify EMD
              </Button>
            </form>
          )}

          {/* Step 3: Aadhaar Validation */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Step 3: Aadhaar Validation</h3>
              <div className="bg-muted p-6 rounded-lg text-center space-y-4">
                {!aadhaarVerified ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Verify your identity using DigiLocker for secure Aadhaar verification
                    </p>
                    <Button
                      onClick={handleAadhaarVerify}
                      className="w-full"
                      variant="action"
                      disabled={aadhaarLoading}
                    >
                      {aadhaarLoading ? "Opening DigiLocker..." : "Verify via DigiLocker"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      This will open DigiLocker in a new tab
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-primary">
                      ⏳ Verification in Progress
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Please complete the verification process in the DigiLocker window.
                    </p>
                    <p className="text-xs text-muted-foreground animate-pulse">
                      Waiting for verification response...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This dialog will automatically close once verification is complete.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
