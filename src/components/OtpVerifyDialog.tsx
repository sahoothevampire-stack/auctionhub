"use client";

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { login } from '@/store/authSlice';
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot, REGEXP_ONLY_DIGITS } from "@/components/ui/input-otp";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { EnquiryDialog } from "./EnquiryDialog";
import { AuctionCardProps } from "./AuctionCard";
import { UserCardProps } from "./UserCard";
import _request from "@/common/api/propertyapi";

interface OtpVerifyDialogProps {
  property?: AuctionCardProps;
  user: UserCardProps;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OtpVerifyDialog({ property = null, user, open, onOpenChange }: OtpVerifyDialogProps) {

  const [otp, setOtp] = useState("");
  const [successPopup, showSuccessPopup] = useState(false);
  const otpLength = 6;

  const [showEnquiry, setShowEnquiry] = useState(false);
  const dispatch = useDispatch();
  const authState = useSelector((state: RootState) => state.auth);

  // Monitor auth state changes
  useEffect(() => {
    // Only log when this dialog instance is open. Many `OtpVerifyDialog` instances
    // are mounted (one per card). Guarding with `open` prevents the same auth
    // update from being logged by every instance.
    if (!open) return;

    console.log('Auth state updated:', {
      isAuthenticated: authState.access_token,
      phone: authState.phone,
      user_id: authState.user_id,
      loading: authState.loading,
      error: authState.error,
    });
  }, [authState, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("OTP entered:", otp);
    if (!otp || otp.length != otpLength) {
      toast.error("Please enter the complete 6-digit OTP");
      return;
    }

    // call login API and store token+phone in app store
    (async () => {
      try {
        const phone = user.mobile;
        const result = await dispatch(login({ phone, otp }) as any);
        if (result.error) {
          const msg = result.error?.message || 'OTP verification failed';
          toast.error(msg);
          return;
        }

        if(result.payload.new_user) {
          toast.success('New user detected. Please complete registration.');
          if (property) {
            setShowEnquiry(true);
          }
          onOpenChange(false);
          setOtp("");
          return;
        }

        if (property) {
          const resp = await _request('POST', 'auctions/submit-enquiry', {
            item_id: property.id,
            product_id: property.id,
            name: result.payload.name,
            email: result.payload.email,
            phone: result.payload.phone
          });      
          console.log('Enquiry submission response after OTP login:', resp);  
          showSuccessPopup(true);
        } else {
          toast.success('Login successful');
        }
        
        onOpenChange(false);
        setOtp("");
      } catch (err: any) {
        const msg = err?.message || 'OTP verification failed';
        toast.error(msg);
      }
    })();

  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold mb-1">
                  {property ? 'Enquire About This Auction' : 'Verify OTP'}
                </DialogTitle>
                {property && (
                  <p className="text-sm text-muted-foreground">{property.name}</p>
                )}
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="mobile">Enter OTP sent to +91 {user.mobile}</Label>
              <InputOTP 
                id="otp"
                value={otp}
                onChange={(value) => setOtp(value)}
                maxLength={otpLength} 
                pattern={REGEXP_ONLY_DIGITS}
                required >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={otp.length !== otpLength}>
                Verify OTP
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {property && (
        <>
          <Dialog open={successPopup} onOpenChange={showSuccessPopup}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-2xl font-bold mb-1">
                      Enquiry submitted successfully ✅
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">We'll contact you soon with property details</p>
                  </div>
                </div>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          
          <EnquiryDialog
            property={property}
            user={user}
            open={showEnquiry}
            onOpenChange={setShowEnquiry}
          />
        </>
      )}
    </>
  );
}
