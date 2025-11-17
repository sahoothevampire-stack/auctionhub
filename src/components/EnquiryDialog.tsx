"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import _request from "@/common/api/propertyapi";
import type { AuctionCardProps } from "./AuctionCard";
import { UserCardProps } from "./UserCard";

interface EnquiryDialogProps {
  property: AuctionCardProps;
  user: UserCardProps;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnquiryDialog({ property, user, open, onOpenChange }: EnquiryDialogProps) {
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: user && user.mobile ? user.mobile : "",
    city: "",
    agreeToTerms: false,
  });
  

  const [loading, setLoading] = useState(false);
  const [successPopup, setSuccessPopup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agreeToTerms) {
      toast.error("Please accept terms & conditions");
      return;
    }

    try {
      setLoading(true);
      let resp = null;

      if(property && property.id) {
        resp = await _request('POST', 'auctions/submit-enquiry', {
          item_id: property && property.id ? property.id : null,
          product_id: property && property.id ? property.id : null,
          name: formData.fullName,
          email: formData.email,
          phone: user.mobile,
          new_user : true
        });
      }
      else {
        console.log("user", user);
        const ls = JSON.parse(localStorage.getItem('persist:root'));
        const loginData = ls && ls.auth? JSON.parse(ls.auth) : '';
        let userId = loginData ? loginData.user_id : 0;
        resp = await _request('POST', 'users/update-user', {
          id: userId,
          name: formData.fullName,
          email: formData.email,
          username: formData.email.split('@')[0] + '_' + Date.now(),
          phone: user.mobile
        });
      }
      
      if (!resp) {
        toast.error('Failed to submit enquiry');
        return;
      }

      // If backend returns an object like { success: true } use that check
      if (typeof resp === 'object' && 'success' in resp && !resp.success) {
        const msg = (resp as any).message || 'Failed to submit enquiry';
        toast.error(msg);
        return;
      }

      // Success path
      setSuccessPopup(true);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        fullName: "",
        email: "",
        mobile: "",
        city: "",
        agreeToTerms: false,
      });
    } catch (err: any) {
      console.error('Failed to submit enquiry:', err);
      const message = err?.message || 'Failed to submit enquiry';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          {!!property && (
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold mb-1">
                    Enquire About This Auction
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">{property.name}</p>
                </div>
              </div>
            </DialogHeader>
          )}
          {!property && (
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold mb-1">
                    Add your details
                  </DialogTitle>
                  {/* <p className="text-sm text-muted-foreground">{property.name}</p> */}
                </div>
              </div>
            </DialogHeader>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="Enter your name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number *</Label>
              <Input
                id="mobile"
                value={user.mobile}
                disabled={true}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                placeholder="Your city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={formData.agreeToTerms}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, agreeToTerms: checked as boolean })
                }
              />
              <label
                htmlFor="terms"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to receive updates and accept the terms & conditions
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Submitting..." : "Submit Enquiry"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {property && (
        <Dialog open={successPopup} onOpenChange={setSuccessPopup}>
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
      )}
      {!property && (
        <Dialog open={successPopup} onOpenChange={setSuccessPopup}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold mb-1">
                    User Registered Successfully ✅
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">We'll contact you soon.</p>
                </div>
              </div>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
