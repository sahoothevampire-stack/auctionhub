"use client";

import { MapPin, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { UploadDocumentsDialog } from "./UploadDocumentsDialog";
import { OtpLogInDialog } from "./OtpLogInDialog";
import { PlaceBidDialog } from "./PlaceBidDialog";
import { useUser } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import _request from '@/common/api/propertyapi';

export type PropertyStage = "enquiry" | "verification" | "bidding";

export interface AuctionCardProps {
  id: number;
  name: string;
  city_name: string;
  category?: string;
  reserve_price?: number | string | null;
  basePrice?: number;
  images?: [{ image_url: string }];
  description?: string;
  auctionType: string;
  status: string;
  start_datetime: string;
  end_datetime: string;
  seller_name: string;
  stage: PropertyStage;
  onEnquire?: (name: string) => void;
  item_id?: string;
  auction_id?: string;
  winner_amount?: number;
  winner_id?: number;
  increment_amount?: number;
  allow_emd_upload?: number;
}

export const AuctionCard = ({
  id,
  name,
  city_name,
  category,
  reserve_price,
  images,
  auctionType,
  status,
  start_datetime,
  end_datetime,
  seller_name,
  stage,
  onEnquire,
  item_id,
  auction_id,
  winner_amount,
  winner_id,
  increment_amount,
  allow_emd_upload,
}: AuctionCardProps) => {
  const [timeLeft, setTimeLeft] = useState("");
  const { isLoggedIn, watchlist, toggleWatchlist } = useUser();
  const isWatchlisted = watchlist.includes(id);
  const authState = useSelector((state: RootState) => state.auth);

  const [showEnquiry, setShowEnquiry] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showBid, setShowBid] = useState(false);
  const router = useRouter();
  stage = allow_emd_upload === 1 ? "verification" : stage;

  const handleViewDetails = async () => {
    // navigate to detail page and include item_id in query if present
    if (item_id) {
      router.push(`/auction/${id}?item_id=${encodeURIComponent(item_id)}`);
    } else {
      router.push(`/auction/${id}`);
    }
  };

  const getStageConfig = () => {
    switch (stage) {
      case "verification":
        return {
          buttonText: "Upload Documents",
          buttonVariant: "secondary" as const,
          onClick: () => setShowUpload(true),
          badge: "Verification Pending",
          badgeVariant: "warning" as const,
        };
      case "bidding":
        return {
          buttonText: "Place Bid",
          buttonVariant: "action" as const,
          onClick: () => setShowBid(true),
          badge: "Bidding Open",
          badgeVariant: "success" as const,
        };
      default:
        return {
          buttonText: "Enquire Now",
          buttonVariant: "outline" as const,
          onClick: handleEnquiry,
          badge: "Live",
          badgeVariant: "default" as const,
        };
    }
  };

  const handleEnquiry = async () => {
    if (onEnquire) {
      onEnquire(name);
      return;
    }

    if (authState.access_token && !authState.new_user) {
      // User is already logged in, submit enquiry directly
      try {
        const resp = await _request('POST', 'auctions/submit-enquiry', {
          item_id: id,
          product_id: id,
          name: authState.name,
          email: authState.email,
          phone: authState.phone
        });
        console.log('Enquiry submission response:', resp);
        setShowSuccessPopup(true);
      } catch (error) {
        console.error('Failed to submit enquiry:', error);
        toast.error('Failed to submit enquiry. Please try again.');
      }
    } else {
      // User needs to log in first
      setShowEnquiry(true);
    }
  };

  const config = getStageConfig();

  useEffect(() => {
    if (status !== "Live") return;

    const calculateTimeLeft = () => {
      const difference = new Date(start_datetime).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setTimeLeft("Ended");
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);

      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);

    return () => clearInterval(timer);
  }, [start_datetime, status]);

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isLoggedIn) {
      toast.error("Please submit an enquiry to add items to watchlist");
      return;
    }
    
    toggleWatchlist(id);
    toast.success(isWatchlisted ? "Removed from watchlist" : "Added to watchlist");
  };

  const imageUrl = images && images.length > 0 ? images[0].image_url : "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop";
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
      <div className="relative h-48 md:h-56 overflow-hidden">
        <img 
          src={imageUrl} 
          alt={name}
          className="w-full h-full object-cover"
        />
        <Badge
          className={cn(
            "absolute top-4 left-4",
            config.badgeVariant === "warning" && "bg-warning text-warning-foreground",
            config.badgeVariant === "success" && "bg-success text-success-foreground",
            config.badgeVariant === "default" && "bg-primary text-primary-foreground"
          )}
        >
          {config.badge}
        </Badge>
        <button
          onClick={handleWatchlistToggle}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            isWatchlisted 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-background/90 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground'
          }`}
          aria-label={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
        >
          <Heart className={`w-4 h-4 ${isWatchlisted ? 'fill-current' : ''}`} />
        </button>
      </div>
      
      <CardContent className="p-4 md:p-5 space-y-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-base md:text-lg line-clamp-2">{name}</h3>
        
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">{city_name}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 py-2 border-t border-b flex-1">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Reserve Price</p>
            {reserve_price && (
              <p className="text-base md:text-lg font-bold text-[#FF5722]">₹ {Number(reserve_price).toLocaleString('en-IN')}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Auction Date</p>
            <p className="text-sm md:text-base font-semibold">{formatDate(start_datetime)}</p>
          </div>
        </div>

        <div className="mt-auto">
          <p className="text-xs text-muted-foreground mb-1">Seller</p>
          <p className="text-sm md:text-base font-bold">{seller_name}</p>
        </div>
      </CardContent>

      <CardFooter className="p-4 md:p-5 pt-0 flex gap-2 md:gap-3">
        <Button
          size="default"
          variant={config.buttonVariant}
          className="flex-1 h-10 md:h-11 font-semibold text-sm md:text-base"
          onClick={config.onClick}
        >
          {config.buttonText}
        </Button>
        <OtpLogInDialog
          property={{
            id,
            name,
            city_name,
            category,
            reserve_price,
            auctionType,
            status,
            images,
            start_datetime,
            end_datetime,
            seller_name,
            stage,
            winner_amount,
            winner_id,
            increment_amount
          }}
          open={showEnquiry}
          onOpenChange={setShowEnquiry}
        />
        <UploadDocumentsDialog
          property={{
            id,
            name,
            city_name,
            category,
            reserve_price,
            auctionType,
            status,
            images,
            start_datetime,
            end_datetime,
            seller_name,
            stage,
            winner_amount,
            winner_id,
            increment_amount
          }}
          open={showUpload}
          onOpenChange={setShowUpload}
        />
        <PlaceBidDialog
          property={{
            id,
            name,
            city_name,
            category,
            reserve_price,
            auctionType,
            status,
            images,
            start_datetime,
            end_datetime,
            seller_name,
            stage,
            auction_id,
            winner_amount,
            winner_id,
            increment_amount
          }}
          open={showBid}
          onOpenChange={setShowBid}
        />
        <Dialog open={showSuccessPopup} onOpenChange={setShowSuccessPopup}>
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
        <div className="flex-1">
          <Button
            onClick={handleViewDetails}
            className="w-full h-10 md:h-11 bg-[#FF5722] hover:bg-[#FF5722]/90 font-semibold text-sm md:text-base"
          >
            View Details
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
