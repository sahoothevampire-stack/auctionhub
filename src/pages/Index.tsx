"use client";
import { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Header } from "@/components/Header";
import { CategoryIcons } from "@/components/CategoryIcons";
import { HeroSearch } from "@/components/HeroSearch";
import { AuctionCard } from "@/components/AuctionCard";
import { ApiLoader } from "@/components/ApiLoader";
import { SellPropertySection } from "@/components/SellPropertySection";
import { SEOContent } from "@/components/SEOContent";
import { RootState } from "@/store/store";
import { fetchLiveListings, fetchUpcomingListings } from "@/store/listingsSlice";
import { AppDispatch } from "@/store/store";
import type { PropertyStage } from "@/components/AuctionCard";

const Index = () => {
  const [scrolled, setScrolled] = useState(false);
  // No local filters on the home page; searches navigate to the Listings page
  
  const dispatch = useDispatch<AppDispatch>();
  const { live, upcoming } = useSelector((state: RootState) => state.listings);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 450);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // On mount, always fetch live and upcoming listings once.
    dispatch(fetchLiveListings({ page: 1, records: 20 }));
    dispatch(fetchUpcomingListings({ page: 1, records: 20 }));
  }, [dispatch]);

  const handleSearch = (main_category_id: string, city_id: string) => {
    const params = new URLSearchParams();
    if (main_category_id) params.set('main_category_id', main_category_id);
    if (city_id) params.set('city_id', city_id);
    router.push(`/listings?${params.toString()}`);
  };

  const handleCategorySelect = (category: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    router.push(`/listings?${params.toString()}`);
  };

  const filteredLiveAuctions = useMemo(() => {
    // Map and normalize live items and sort by id (desc)
    const liveData = Array.isArray(live?.data) ? live.data : [];
    const mapped = liveData.map(auction => ({
      ...auction,
      stage: (['enquiry', 'verification', 'bidding'].includes(auction.stage) ? auction.stage : 'enquiry') as PropertyStage
    }));
    mapped.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    return mapped;
  }, [live.data]);
  const filteredUpcomingAuctions = useMemo(() => {
    const upcomingData = Array.isArray(upcoming?.data) ? upcoming.data : [];
    const mapped = upcomingData.map(auction => ({
      ...auction,
      stage: (['enquiry', 'verification', 'bidding'].includes(auction.stage) ? auction.stage : 'enquiry') as PropertyStage
    }));
    mapped.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    return mapped;
  }, [upcoming.data]);

  return (
    <div className="min-h-screen bg-background">
      <Header scrolled={scrolled} />
      {<CategoryIcons onCategorySelect={handleCategorySelect} />}
      {<HeroSearch onSearch={handleSearch} />}

      <ApiLoader loading={live.loading || upcoming.loading} />
      <main className="container px-4 py-6 md:py-8">
        <section className="mb-8 md:mb-12">
          <h2 className="text-lg md:text-2xl font-bold mb-4 md:mb-6">Live Auctions</h2>
          {live.loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : live.error ? (
            <div className="text-center py-8 text-red-500">{live.error}</div>
          ) : filteredLiveAuctions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredLiveAuctions.slice(0, 6).map((auction) => (
                <AuctionCard
                  key={auction.id}
                  {...(auction as any)}
                  item_id={auction.item_id ? String(auction.item_id) : undefined}
                />
              ))}
              {filteredLiveAuctions.length > 6 && (
                <Link href="/listings?item_status=2" className="md:col-span-2 lg:col-span-3">
                  <button className="w-full py-3 md:py-4 text-primary font-medium flex items-center justify-center gap-2 hover:bg-secondary/50 rounded-lg transition-colors">
                    View more
                    <span className="text-xl">→</span>
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-8">No live auctions found</div>
          )}
        </section>

        <section className="mb-8 md:mb-12">
          <h2 className="text-lg md:text-2xl font-bold mb-4 md:mb-6">Upcoming Auctions</h2>
          {upcoming.loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : upcoming.error ? (
            <div className="text-center py-8 text-red-500">{upcoming.error}</div>
          ) : filteredUpcomingAuctions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredUpcomingAuctions.slice(0, 6).map((auction) => (
                <AuctionCard
                  key={auction.id}
                  {...(auction as any)}
                  item_id={auction.item_id ? String(auction.item_id) : undefined}
                />
              ))}
              {filteredUpcomingAuctions.length > 6 && (
                <Link href="/listings?item_status=3" className="md:col-span-2 lg:col-span-3">
                  <button className="w-full py-3 md:py-4 text-primary font-medium flex items-center justify-center gap-2 hover:bg-secondary/50 rounded-lg transition-colors">
                    View more
                    <span className="text-xl">→</span>
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-8">No upcoming auctions found</div>
          )}
        </section>

        {filteredLiveAuctions.length === 0 && filteredUpcomingAuctions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              No auctions found matching your criteria.
            </p>
          </div>
        )}
      </main>

      <SellPropertySection />

      <SEOContent />
    </div>
  );
};

export default Index;
