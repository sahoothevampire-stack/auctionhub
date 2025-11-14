"use client";

import { useState, useEffect } from "react";
import { Minus, Plus, Edit2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import _request from '@/common/api/propertyapi';
import type { AuctionCardProps } from "./AuctionCard";

interface PlaceBidDialogProps {
  property: AuctionCardProps;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBidPlaced?: (bidAmount: number, userId: string) => void;
}

export function PlaceBidDialog({ property, open, onOpenChange, onBidPlaced }: PlaceBidDialogProps) {
  const incrementAmount = property.increment_amount || 10000;
  const [currentBid, setCurrentBid] = useState(property.winner_amount || 0);
  const [bidAmount, setBidAmount] = useState((property.winner_amount || property.reserve_price || 0) + incrementAmount);
  const [isEditing, setIsEditing] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);
  const [currentWinnerId, setCurrentWinnerId] = useState(property.winner_id);
  const userId = useSelector((state: RootState) => state.auth.user_id);

  // Update states when property changes
  useEffect(() => {
    setCurrentBid(property.winner_amount || 0);
    setBidAmount((property.winner_amount || property.reserve_price || 0) + incrementAmount);
    setCurrentWinnerId(property.winner_id);
  }, [property.winner_amount, property.winner_id, open]);

  // Mock top bids
  const topBids: Array<{ bidder: string; amount: number; isUser: boolean }> = [];
  if(currentWinnerId){
    let user = parseInt(userId || "0");
    if(currentWinnerId == user) {
      topBids.push({ bidder: "You", amount: currentBid, isUser: true });
    }
    else {
      topBids.push({ bidder: `Bidder #${currentWinnerId}`, amount: currentBid, isUser: false });
    }
  }


  // Calculate remaining time from end_datetime
  const calculateTimeLeft = () => {
    if (!property.end_datetime) {
      setIsExpired(true);
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;    
    }

    try {
      // Parse "YYYY-MM-DD HH:mm:ss" format
      const endDate = new Date(property.end_datetime);
      const now = new Date();
      const diffMs = endDate.getTime() - now.getTime();

      if (diffMs <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setIsExpired(false);
      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / (24 * 3600));
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({ days, hours, minutes, seconds });
    } catch (err) {
      console.error('Error parsing end_datetime:', err);
    }
  };

  useEffect(() => {
    // Initial calculation when dialog opens
    calculateTimeLeft();

    if (!open) return;
    
    // Update timer every second
    const timer = setInterval(() => {
      calculateTimeLeft();
    }, 1000);

    return () => clearInterval(timer);
  }, [open, property.end_datetime]);

  const handleIncrease = () => {
    setBidAmount((prev) => prev + incrementAmount);
  };

  const handleDecrease = () => {
    setBidAmount((prev) => Math.max(currentBid + incrementAmount, prev - incrementAmount));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (bidAmount <= currentBid) {
      toast.error("Invalid bid amount — your bid must be higher than the current bid.");
      return;
    }

    try {
      // Build payload as required by the API
      const payload = {
        item_id: property.item_id,
        auction_id: property.auction_id,
        bid_amount: bidAmount,
      } as any;

      const endpoint = `auctions/bid?user_id=${userId ?? ""}`;
      const resp = await _request('POST', endpoint, payload);

      if (!resp) {
        toast.error('Failed to place bid. Please try again.');
        return;
      }

      // If backend returns success flag, respect it
      if (typeof resp === 'object' && 'success' in resp && !resp.success) {
        const msg = (resp as any).error || (resp as any).message || 'Failed to place bid';
        toast.error(msg);
        return;
      }

      // Update the current bid with the newly placed bid
      setCurrentBid(bidAmount);
      setCurrentWinnerId(parseInt(userId || "0"));
      
      // Set next minimum bid amount
      const nextMinBid = bidAmount + incrementAmount;
      setBidAmount(nextMinBid);

      toast.success(`Bid placed successfully! 🎉 Your bid of ₹${bidAmount.toLocaleString("en-IN")} has been placed.`);
      
      // Notify parent component to update auction state
      if (onBidPlaced) {
        onBidPlaced(bidAmount, userId || "0");
      }
      
      // Keep dialog open - do not close it
    } catch (err) {
      console.error('Place bid error:', err);
      toast.error('Failed to place bid. Please try again later.');
    }
  };

  const formatTime = (value: number) => value.toString().padStart(2, "0");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Place Your Bid</DialogTitle>
          <p className="text-sm text-muted-foreground">{property.name}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bid Deadline */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-destructive">
              <Clock className="h-5 w-5" />
              <span className="font-semibold">Bid Deadline</span>
            </div>
            <div className="mt-2">
              {isExpired ? (
                <div className="text-2xl font-bold text-destructive">
                  Auction Expired
                </div>
              ) : (
                <div className="flex gap-2 text-2xl font-bold text-destructive">
                  <span>{formatTime(timeLeft.days)}d</span>
                  <span>:</span>
                  <span>{formatTime(timeLeft.hours)}h</span>
                  <span>:</span>
                  <span>{formatTime(timeLeft.minutes)}m</span>
                  <span>:</span>
                  <span>{formatTime(timeLeft.seconds)}s</span>
                </div>
              )}
            </div>
          </div>

          {/* Current Bid */}
          {currentBid > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Current Highest Bid</p>
              <p className="text-2xl font-bold text-primary">
                ₹{currentBid.toLocaleString("en-IN")}
              </p>
            </div>
          )}

          {/* Bid Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="bid-amount">Your Bid Amount (₹)</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleDecrease}
                disabled={isEditing}
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <div className="relative flex-1">
                <Input
                  id="bid-amount"
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  disabled={!isEditing}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleIncrease}
                disabled={isEditing}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Increment: ₹10,000 per step
            </p>
          </div>

          {/* Top Bids */}
          {topBids.length > 0 && (
            <div className="space-y-2">
              <Label>Top Bids</Label>
              <div className="space-y-2">
                {topBids.map((bid, index) => (
                  <div
                    key={index}
                    className={`flex justify-between items-center p-3 rounded-lg ${
                      bid.isUser
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-muted"
                    }`}
                  >
                    <span className="font-medium">
                      {index + 1}. {bid.bidder}
                    </span>
                    <span className="font-bold">
                      ₹{bid.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" variant="action" className="flex-1" disabled={isExpired}>
              Submit Bid
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
