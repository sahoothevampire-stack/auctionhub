"use client";

import { useState, useEffect } from "react";
import _request from '@/common/api/propertyapi';
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import type { AuctionCardProps } from "./AuctionCard";
import type { UserCardProps } from "./UserCard";
import { OtpVerifyDialog } from "./OtpVerifyDialog";

interface OtpLogInDialogProps {
  property?: AuctionCardProps;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OtpLogInDialog({ property = null, open, onOpenChange }: OtpLogInDialogProps) {
  const [formData, setFormData] = useState({
    mobile: ""
  });

  const userProps: UserCardProps = {
    mobile: formData.mobile,
    otp: ""
  };

  const [showOTPVerify, setShowOTPVerify] = useState(false);
  const mobileLength = 10;

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.mobile) {
      toast.error("Please enter mobile number");
      return;
    }
    
    const mobile = parseInt(formData.mobile).toString();
    if (mobile.length !== mobileLength) {
      toast.error(`Please enter valid ${mobileLength}-digit mobile number`);
      return;
    }

    try {
      setLoading(true);
      setApiError(null);
      // call shared API helper (same style as listingsSlice)
      const resp = await _request('POST', 'auth/send-otp', { phone: mobile });

      // propertyapi.js returns `response.result` or `response.message` for POST
      // Treat any truthy `resp` as success, but adapt if your backend returns a specific shape.
      console.log('response', resp);
      if (!resp) {
        setApiError('Failed to send OTP');
        toast.error('Failed to send OTP');
        return;
      }

      // If backend returns an object like { success: true } use that check
      if (typeof resp === 'object' && 'success' in resp && !resp.success) {
        const msg = (resp as any).message || 'Failed to send OTP';
        setApiError(msg);
        toast.error(msg);
        return;
      }

      // Success path
      toast.success('OTP sent successfully');
      onOpenChange(false);
      setShowOTPVerify(true);
    } catch (err: any) {
      console.error('Failed to send OTP:', err);
      const message = err?.message || 'Failed to send OTP';
      setApiError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold mb-1">
                  {property ? 'Enquire About This Auction' : 'Login to Auction Hub'}
                </DialogTitle>
                {property && (
                  <p className="text-sm text-muted-foreground">{property.name}</p>
                )}
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="mobile">Enter {mobileLength}-digit Mobile Number</Label>
              <Input
                id="mobile"
                type="tel"
                inputMode="numeric"
                maxLength={mobileLength}
                value={formData.mobile}
                onChange={(e) => {
                  const onlyNums = e.target.value.replace(/\D/g, ''); // remove non-digits
                  setFormData({ ...formData, mobile: onlyNums });
                }}              
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={formData.mobile.length !== mobileLength}>
                Send OTP
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <OtpVerifyDialog
        property={property}
        user={userProps}
        open={showOTPVerify}
        onOpenChange={setShowOTPVerify}
      />
    </>
  );
}
