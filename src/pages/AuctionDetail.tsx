"use client";
import { useParams, useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Building, Calendar, ChevronLeft, ChevronRight, Phone, Heart, Bell } from "lucide-react";
import auctionsData from "@/data/auctions.json";
import { EnquiryModal } from "@/components/EnquiryModal";
import { AuctionCard } from "@/components/AuctionCard";
import { OtpLogInDialog } from "@/components/OtpLogInDialog";
import { UploadDocumentsDialog } from "@/components/UploadDocumentsDialog";
import { PlaceBidDialog } from "@/components/PlaceBidDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import _request from '@/common/api/propertyapi';
import { set } from "react-hook-form";

const AuctionDetail = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const [auction, setAuction] = useState<any | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [enquiryModal, setEnquiryModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [showBid, setShowBid] = useState(false);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const authState = useSelector((state: RootState) => state.auth);

  // Handle successful bid placement - update auction state
  const handleBidPlaced = (bidAmount: number, userId: string) => {
    setAuction((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        winner_amount: bidAmount,
        winner_id: parseInt(userId),
        bid_status: 'Winning',
        bidder_amount: bidAmount
      };
    });
  };

  useEffect(() => {
  },[auction]);


  // Extract item_id as a stable primitive before the effect dependency
  const itemIdFromQuery = searchParams?.get('item_id');

  // Fetch remote item details via the single API endpoint /home/item-details/:item_id
  useEffect(() => {
    let canceled = false;
    const fetchDetails = async () => {
      try {
        setLoadingDetails(true);
        // Prefer explicit query param item_id, otherwise fall back to the route id
        const itemId = itemIdFromQuery ?? id;
        console.log('itemId', itemId);
        if (!itemId) {
          // no identifier to fetch
          setAuction(null);
          return;
        }

        const itemResp = await _request('GET', 'auctions/item-details/', itemId);
        const details = itemResp && itemResp.result && itemResp.result.length ? itemResp.result[0] : null;
        if (!canceled && details) {
          const reserve = details.reserve_price ?? details.base_price ?? details.basePrice;
          const priceStr = details.price || (reserve ? `₹ ${Number(reserve).toLocaleString('en-IN')}` : undefined);

          const mapped = {
            title: details.name || '',
            auction_id: details.auction_id || '',
            description: details.attributes ? details.attributes.remarks || '' : '',
            possession: details.attributes ? details.attributes.status_of_possession || '' : '',
            address: details.address || '',
            city: details.city_name || '',
            state: details.state_name || '',
            category: details.category_name || '',
            auction_type: 'Property',
            last_tender_submission_date: details.attributes ? details.attributes.last_tender_submission_date || '' : '',
            bank_name: details.attributes ? details.attributes.bank_name || '' : '',
            bank_branch: details.attributes ? details.attributes.bank_branch || '' : '',
            property_area: details.attributes ? details.attributes.property_area || '' : '',
            property_area_type: details.attributes ? details.attributes.property_area_type || '' : '',
            status_of_possession: details.attributes ? details.attributes.status_of_possession || '' : '',
            fpr_contact_number: details.attributes ? details.attributes.fpr_contact_number || '' : '',
            fpr_contact_person: details.attributes ? details.attributes.fpr_contact_person || '' : '',
            guarantor_name: details.attributes ? details.attributes.guarantor_name || '' : '',
            inspection_date: details.attributes ? details.attributes.inspection_date || '' : '',
            cd_contact_person_name: details.cd_manager_details ? details.cd_manager_details.name || '' : '',
            cd_contact_person_phone: details.cd_manager_details ? details.cd_manager_details.phone || '' : '',
            price: priceStr || '',
            basePrice: details.base_price ?? details.basePrice ?? details.reserve_price ?? 0,
            reserve_price: details.reserve_price || 0,
            increment_amount: details.increment_amount || 0,
            auctionType: details.auction_format || details.auctionType || '',
            winner_amount: details.winner_amount || 0,
            winner_id: details.winner_id || 0,
            status: details.status || '',
            stage: details.stage || 'bidding',
            sellerType: details.seller_name || details.sellerType || '',
            endDate: details.end_datetime || '',
            startDate: details.start_datetime || '',
            bidder_amount: details.bidder_amount || 0,
            bid_status: details.bidder_amount && details.bidder_amount == details.winner_amount ? 'Winning' : 'Losing',
            specifications: details.attributes || [],
            images: details.images && details.images.length > 0 ? details.images : [],
            id: Number(id) || undefined,
          };

          setAuction(mapped as any);
        } else if (!canceled) {
          setAuction(null);
        }
      } catch (err) {
        console.warn('Failed to fetch remote item details', err);
        if (!canceled) {
          setAuction(null);
        }
      } finally {
        if (!canceled) {
          setLoadingDetails(false);
        }
      }
    };

    fetchDetails();
    return () => { canceled = true; };
  // Use stable primitives in dependency: id and itemIdFromQuery (both strings or null)
  }, [id, itemIdFromQuery]);

  // Render nothing until hydration completes (preserve previous behavior)
  if (!mounted) return null;

  // Show a loading state while the API call is in progress. Only display
  // "Not Found" after the fetch completes and we still have no data.
  if (!auction && loadingDetails) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Loading auction...</h1>
        </div>
      </div>
    );
  }

  if (!auction && !loadingDetails) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Auction Not Found</h1>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const images = auction.images && auction.images.length ? auction.images.map((img:any) => img.image_url) : ["https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=1200&h=600&fit=crop",
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1200&h=600&fit=crop",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=600&fit=crop"];
  console.log('images', images);
  // const images = [
  //   auction.category === "Property" 
  //     ? "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=600&fit=crop"
  //     : "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=1200&h=600&fit=crop",
  //   "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1200&h=600&fit=crop",
  //   "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=600&fit=crop",
  // ];

  const similarAuctions = auctionsData
    .filter(a => a.id !== auction.id && a.category === auction.category)
    .slice(0, 4);

  const handleEnquire = (title: string) => {
    setEnquiryModal(true);
  };

  const getStageConfig = () => {
    switch (auction.stage) {
      case "verification":
        return {
          buttonText: "Upload Documents",
          buttonVariant: "secondary" as const,
          onClick: () => setShowUpload(true),
        };
      case "bidding":
        return {
          buttonText: "Place Bid",
          buttonVariant: "action" as const,
          onClick: () => setShowBid(true),
        };
      default:
        return {
          buttonText: "Enquire Now",
          buttonVariant: "outline" as const,
          onClick: () => setShowEnquiry(true),
        };
    }
  };

  const config = getStageConfig();


  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-4 md:py-8 max-w-7xl mx-auto">
        {/* Title */}
        <h1 className="text-xl md:text-3xl font-bold mb-2 md:mb-4">{auction.title}</h1>
        <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6 leading-relaxed">
          {auction.description}
        </p>

        {/* Image Carousel */}
        {images.length > 0 && (
          <div className="relative mb-4 md:mb-8 rounded-lg overflow-hidden bg-muted">
            <div className="aspect-video md:aspect-[21/9] relative">
              <img 
                src={images[currentImageIndex]} 
                alt={auction.title} 
                className="w-full h-full object-cover"
              />
              <button 
                onClick={() => setCurrentImageIndex((prev) => prev === 0 ? images.length - 1 : prev - 1)}
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background p-1.5 md:p-2 rounded-full transition-colors"
              >
                <ChevronLeft className="h-4 w-4 md:h-6 md:w-6" />
              </button>
              <button 
                onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background p-1.5 md:p-2 rounded-full transition-colors"
              >
                <ChevronRight className="h-4 w-4 md:h-6 md:w-6" />
              </button>
            </div>
            <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 md:gap-2">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`h-1.5 md:h-2 rounded-full transition-all ${
                    idx === currentImageIndex ? "w-6 md:w-8 bg-primary" : "w-1.5 md:w-2 bg-background/60"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
        

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* About This Auction */}
            <section>
              <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4">About This Auction</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="border-b pb-2">
                  <p className="text-xs md:text-sm text-muted-foreground">Type of Possession</p>
                  <p className="text-sm md:text-base font-medium">{auction.possession}</p>
                </div>
                <div className="border-b pb-2">
                  <p className="text-xs md:text-sm text-muted-foreground">Property Address</p>
                  <p className="text-sm md:text-base font-medium">{auction.address}, {auction.city}, {auction.state}</p>
                </div>
              </div>
            </section>

            {/* Asset Details */}
            <section>
              <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4">Asset Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <Card>
                  <CardContent className="p-2 md:p-3">
                    <p className="text-xs text-muted-foreground mb-1">Auction Type</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <p className="text-xs md:text-sm font-medium">{auction.auction_type}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-2 md:p-3">
                    <p className="text-xs text-muted-foreground mb-1">Property Category</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <p className="text-xs md:text-sm font-medium">{auction.category}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
            </section>

            {/* Bank Details - only show if bank_name exists */}
            
            <section>
              <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4">Bank Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {auction.bank_name && (
                 <Card>
                  <CardContent className="p-2 md:p-3">
                    <p className="text-xs text-muted-foreground mb-1">Bank Name</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <p className="text-xs md:text-sm font-medium">{auction.bank_name}</p>
                    </div>
                  </CardContent>
                </Card>
                )}
                {auction.bank_branch && (
                <Card>
                  <CardContent className="p-2 md:p-3">
                    <p className="text-xs text-muted-foreground mb-1">Bank Branch</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <p className="text-xs md:text-sm font-medium">{auction.bank_branch}</p>
                    </div>
                  </CardContent>
                </Card>
                )}
              </div>
            </section>
            

            {/* Property Details - only show if property_area exists */}
            <section>
              <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4">Property Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {auction.property_area && (
                  <Card>
                  <CardContent className="p-2 md:p-3">
                    <p className="text-xs text-muted-foreground mb-1">Property Area</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <p className="text-xs md:text-sm font-medium">{auction.property_area} {auction.property_area_type}</p>
                    </div>
                  </CardContent>
                </Card>
                 )}
                {auction.status_of_possession && (
                <Card>
                  <CardContent className="p-2 md:p-3">
                    <p className="text-xs text-muted-foreground mb-1">Status of Possession</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <p className="text-xs md:text-sm font-medium">{auction.status_of_possession}</p>
                    </div>
                  </CardContent>
                </Card>
                )}
              </div>
            </section>
           

            {/* Contact Details */}
             <section>
              <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4">Contact Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {auction.fpr_contact_number && (
                <Card>
                  <CardContent className="p-2 md:p-3">
                    <p className="text-xs text-muted-foreground mb-1">FPR Contact Number</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <p className="text-xs md:text-sm font-medium">{auction.fpr_contact_number}</p>
                    </div>
                  </CardContent>
                </Card>
                )}
                {auction.fpr_contact_person && (
                <Card>
                  <CardContent className="p-2 md:p-3">
                    <p className="text-xs text-muted-foreground mb-1">FPR Contact Person</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <p className="text-xs md:text-sm font-medium">{auction.fpr_contact_person}</p>
                    </div>
                  </CardContent>
                </Card>
                )}
                {auction.guarantor_name && (
                <Card>
                  <CardContent className="p-2 md:p-3">
                    <p className="text-xs text-muted-foreground mb-1">Guarantor Name</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <p className="text-xs md:text-sm font-medium">{auction.guarantor_name}</p>
                    </div>
                  </CardContent>
                </Card>
                )}
                {auction.cd_contact_person_name && (
                <Card>
                  <CardContent className="p-2 md:p-3">
                    <p className="text-xs text-muted-foreground mb-1">CD Contact Person</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <p className="text-xs md:text-sm font-medium">{auction.cd_contact_person_name} ({auction.cd_contact_person_phone})</p>
                    </div>
                  </CardContent>
                </Card>
                )}
                {auction.inspection_date && (
                <Card>
                  <CardContent className="p-2 md:p-3">
                    <p className="text-xs text-muted-foreground mb-1">Inspection Date</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <p className="text-xs md:text-sm font-medium">{new Date(auction.inspection_date).toLocaleDateString('en-GB')}</p>
                    </div>
                  </CardContent>
                </Card>
                )}
              </div>
              
            </section>

            {/* Similar Auctions - Mobile/Tablet */}
            {/* <section className="lg:hidden">
              <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4">Similar Auctions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {similarAuctions.map((similarAuction) => (
                  <AuctionCard
                    key={similarAuction.id}
                    id={similarAuction.id}
                    name={similarAuction.title}
                    city_name={similarAuction.city}
                    category={similarAuction.category}
                    reserve_price={similarAuction.basePrice as any}
                    auctionType={similarAuction.auctionType}
                    status={similarAuction.status}
                    start_datetime={similarAuction.endDate}
                    end_datetime={similarAuction.endDate}
                    seller_name={similarAuction.sellerType}
                    stage={similarAuction.stage as any}
                    onEnquire={() => handleEnquire(similarAuction.title)}
                  />
                ))}
              </div>
            </section> */}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4 md:space-y-6">
            <Card className="sticky top-20">
              <CardContent className="p-4 md:p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base md:text-xl font-bold mb-1">Auction Details</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-xl md:text-3xl font-bold text-primary">{auction.price}</p>
                      <Badge variant={auction.status === "Live" ? "default" : "secondary"} className="text-[10px] md:text-xs">
                        {auction.status}
                      </Badge>
                    </div>
                    {!!auction.bid_status && !!auction.bidder_amount && (
                      <div className="flex items-center gap-3 md:gap-4 mt-2">
                        <p className="text-sm md:text-sm">
                          <b>Highest Bid</b> : ₹{(auction.bidder_amount).toLocaleString()}{' '}
                          <span className={
                            auction.bid_status && auction.bid_status.toLowerCase() === 'winning'
                              ? 'text-green-600 font-semibold'
                              : 'text-red-600 font-semibold'
                          }>
                            ({auction.bid_status})
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 md:gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
                      <Bell className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 md:space-y-3 pt-3 md:pt-4 border-t text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">City:</span>
                    <span className="font-medium">{auction.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">EMD:</span>
                    <span className="font-medium">₹{(auction.basePrice * 0.1).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bid Increment:</span>
                    <span className="font-medium">₹{(auction.increment_amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auction Date:</span>
                    <span className="font-medium">{new Date(auction.endDate).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inspection Date:</span>
                    <span className="font-medium">{new Date(auction.endDate).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submission Deadline:</span>
                    <span className="font-medium">{new Date(auction.endDate).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Tender Submission Date:</span>
                    <span className="font-medium">{new Date(auction.last_tender_submission_date).toLocaleDateString('en-GB')}</span>
                  </div>

                </div>

                <Button
                  onClick={config.onClick}
                  variant={config.buttonVariant}
                  className="w-full"
                  size="lg"
                >
                  {config.buttonText}
                </Button>

                {/* <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white" size="lg">
                  Download Auction Assets (Free)
                </Button>
                <p className="text-[10px] md:text-xs text-center text-muted-foreground">
                  3 free downloads remaining
                </p> */}

                <div className="pt-3 md:pt-4 border-t">
                  <p className="text-xs md:text-sm font-semibold mb-2 md:mb-3">NEED HELP?</p>
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white" size="lg">
                    <Phone className="h-4 w-4 mr-2" />
                    Talk to us on whatsapp
                  </Button>
                  <p className="text-[10px] md:text-xs text-center text-muted-foreground mt-2">
                    Get instant support and auction assistance
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Similar Auctions - Desktop */}
        {/* <section className="hidden lg:block mt-8 md:mt-12">
          <h2 className="text-lg md:text-2xl font-bold mb-4 md:mb-6">Similar Auctions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {similarAuctions.map((similarAuction) => (
              <AuctionCard
                key={similarAuction.id}
                id={similarAuction.id}
                name={similarAuction.title}
                city_name={similarAuction.city}
                category={similarAuction.category}
                reserve_price={similarAuction.basePrice as any}
                auctionType={similarAuction.auctionType}
                status={similarAuction.status}
                start_datetime={similarAuction.endDate}
                end_datetime={similarAuction.endDate}
                seller_name={similarAuction.sellerType}
                stage={similarAuction.stage as any}
                onEnquire={() => handleEnquire(similarAuction.title)}
              />
            ))}
          </div>
        </section> */}
      </main>

      <EnquiryModal
        open={enquiryModal}
        onClose={() => setEnquiryModal(false)}
        auctionTitle={auction.title}
      />

      {/* Stage-based Dialogs */}
      {!authState.access_token && (
        <OtpLogInDialog
          open={showEnquiry}
          onOpenChange={setShowEnquiry}
        />
      )}

      <UploadDocumentsDialog
        property={{
          id: auction.id || 0,
          name: auction.title,
          city_name: auction.city,
          category: auction.category,
          reserve_price: auction.price,
          auctionType: auction.auction_type,
          status: auction.status,
          start_datetime: auction.startDate,
          end_datetime: auction.endDate,
          seller_name: auction.sellerType,
          stage: auction.stage || 'bidding',
          item_id: id?.toString(),
          winner_amount: auction.winner_amount,
          winner_id: auction.winner_id,
          increment_amount: auction.increment_amount,
        }}
        open={showUpload}
        onOpenChange={setShowUpload}
      />

      <PlaceBidDialog
        property={{
          id: auction.id || 0,
          name: auction.title,
          city_name: auction.city,
          category: auction.category,
          reserve_price: auction.reserve_price,
          auctionType: auction.auction_type,
          status: auction.status,
          start_datetime: auction.startDate,
          end_datetime: auction.endDate,
          seller_name: auction.sellerType,
          stage: auction.stage || 'bidding',
          item_id: id?.toString(),
          auction_id: auction.auction_id,
          winner_amount: auction.winner_amount,
          bidder_amount: auction.bidder_amount,
          winner_id: auction.winner_id,
          increment_amount: auction.increment_amount,
        }}
        open={showBid}
        onOpenChange={setShowBid}
        onBidPlaced={handleBidPlaced}
      />

      <Dialog open={showSuccessPopup} onOpenChange={setShowSuccessPopup}>
        <DialogContent className="max-w-sm">
          <div className="text-center space-y-3">
            <p className="text-green-600 font-bold">✓ Enquiry Submitted Successfully</p>
            <p className="text-sm text-muted-foreground">Your enquiry has been submitted. We'll contact you shortly.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuctionDetail;
