'use client';

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { useInView } from "react-intersection-observer";
import { ArrowLeft, Search, Heart, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuctionCard } from "@/components/AuctionCard";
import { fetchFilteredListings } from "@/store/listingsSlice";
import { ApiLoader } from "@/components/ApiLoader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { RootState, AppDispatch } from "@/store/store";
import { fetchFiltersData } from "@/store/filtersSlice";
import type { PropertyStage } from "@/components/AuctionCard";

const Listings = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [mounted, setMounted] = useState(false);
  const initialRenderRef = useRef(true);
  
  // Redux state - wrap in try/catch for SSR safety
  let filteredAuctions: any[] = [], loading = false, hasMore = false;
  try {
    const filteredState = useSelector((state: RootState) => state.listings.filtered);
    filteredAuctions = filteredState?.data ?? [];
    loading = filteredState?.loading ?? false;
    hasMore = filteredState?.hasMore ?? false;
  } catch (err) {
    console.warn('Redux not initialized yet:', err);
  }
  
  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.5,
    delay: 100
  });

  useEffect(() => setMounted(true), []);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // helpers to map between UI status and API item_status
  const mapStatusToItemStatus = (s: string | null) => {
    if (!s) return '';
    const lower = String(s).toLowerCase();
    if (lower === 'live' || lower === '2') return '2';
    if (lower === 'upcoming' || lower === '3') return '3';
    return '';
  };
  const mapItemStatusToStatus = (v: string | null) => {
    if (!v) return '';
    if (String(v) === '2') return 'Live';
    if (String(v) === '3') return 'Upcoming';
    return String(v);
  };

  const initialItemStatus = searchParams.get('item_status') ?? searchParams.get('status');
  const [filters, setFilters] = useState({
    maincategoryId: searchParams.get("main_category_id") || "",
    categoryId: searchParams.get("category_id") || "",
    sellerId: searchParams.get("seller_id") || "",
    cityId: searchParams.get("city_id") || "",
    // store UI-friendly status (Live/Upcoming) but accept numeric item_status too
    status: mapItemStatusToStatus(initialItemStatus),
    sortBy: searchParams.get("sort_by") || "latest",
  });

  // filters data from API (property types / cities)
  const filtersState = useSelector((state: RootState) => state.filters);
  const propertyTypes = filtersState?.data?.property_types ?? [];
  
  const citiesList = filtersState?.data?.cities ?? [];

  // ensure filters data is available
  useEffect(() => {
    if (!filtersState?.data) {
      dispatch(fetchFiltersData());
    }
  }, [dispatch, filtersState?.data]);


  // Fetch initial data
  useEffect(() => {
    if (mounted && !initialRenderRef.current) {
      try {
        const params = new URLSearchParams();
        if (filters.maincategoryId) params.set('main_category_id', filters.maincategoryId);
        if (filters.categoryId) params.set('category_id', filters.categoryId);
        if (filters.sellerId) params.set('seller_id', filters.sellerId);
        if (filters.cityId) params.set('city_id', filters.cityId);
        // write numeric item_status for URL (better parity with API)
        const item_status = mapStatusToItemStatus(filters.status);
        if (item_status) params.set('item_status', item_status);
        if (filters.sortBy) params.set('sort_by', filters.sortBy);
        if (searchQuery) params.set('search', searchQuery);

        const query = params.toString();
        const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
        // use replace to avoid adding history entries on every tiny change
        router.replace(url);
      } catch (e) {
        // window may not be available in some edge cases; ignore URL sync then
        // eslint-disable-next-line no-console
        console.warn('Failed to sync filters to URL', e);
      }

      // Debounce API calls to avoid firing on rapid successive changes
      const debounceMs = 300;
      const timer = window.setTimeout(() => {
        dispatch(fetchFilteredListings({ 
          filters: { 
            ...filters,
            searchQuery,
          },
          page: 1 
        }));
      }, debounceMs);

      return () => window.clearTimeout(timer);
    }
  }, [dispatch, filters, searchQuery, mounted]);

  // Handle initial render
  useEffect(() => {
    if (initialRenderRef.current && mounted) {
      initialRenderRef.current = false;
      dispatch(fetchFilteredListings({ 
        filters: { 
          ...filters,
          searchQuery,
        },
        page: 1 
      }));
    }
  }, [mounted]);

  // If the page was opened with query params (from HeroSearch), ensure
  // our local `filters` state matches those params (they are ids as strings)
  useEffect(() => {
  const main_category_id = searchParams.get('main_category_id') ?? '';
  const category_id = searchParams.get('category_id') ?? '';
  const sellerIdFromParams = searchParams.get('seller_id') ?? '';
  const cityIdFromParams = searchParams.get('city_id') ?? '';
  const status = searchParams.get('status') ?? '';
    // Avoid creating a new object if values are unchanged to prevent
    // a feedback loop where URL->state->URL keeps firing requests.
    setFilters((prev) => {
      if (
        prev.maincategoryId === main_category_id &&
        prev.categoryId === category_id &&
        prev.sellerId === sellerIdFromParams &&
        prev.cityId === cityIdFromParams &&
        prev.status === status 
      ) {
        return prev;
      }
      return {
        ...prev,
        maincategoryId: main_category_id,
        categoryId: category_id,
        sellerId: sellerIdFromParams,
        cityId: cityIdFromParams,
        status,
      };
    });
  }, [searchParams]);

  // Load more when scrolling and inView
  useEffect(() => {
    if (inView && hasMore && !loading) {
      dispatch(fetchFilteredListings({
        filters: {
          ...filters,
          searchQuery,
        },
        page: Math.ceil(filteredAuctions.length / 20) + 1
      }));
    }
  }, [inView, hasMore, loading, dispatch, filters, searchQuery, filteredAuctions.length]);

  const activeFilterCount = [
    filters.maincategoryId,
    filters.categoryId,
    filters.sellerId,
    filters.cityId,
    filters.status,
  ].filter(Boolean).length;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search City/Locality/Project"
              className="pl-9 pr-4 h-10 rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <Heart className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-4 py-3 border-t bg-background">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0 rounded-full h-8 px-3"
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  {activeFilterCount > 0 && (
                    <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-6 pb-20">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Subtype</label>
                    <Select
                      value={filters.maincategoryId}
                      onValueChange={(v) =>
                        setFilters((prev) => ({ ...prev, maincategoryId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Subtype" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {propertyTypes.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">City</label>
                    <Select
                      value={filters.cityId}
                      onValueChange={(v) =>
                        setFilters((prev) => ({ ...prev, cityId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select City" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Cities</SelectItem>
                        <SelectItem value="Jaipur">Jaipur</SelectItem>
                        <SelectItem value="Delhi">Delhi</SelectItem>
                        <SelectItem value="Mumbai">Mumbai</SelectItem>
                        <SelectItem value="Bangalore">Bangalore</SelectItem>
                        <SelectItem value="Chennai">Chennai</SelectItem>
                        <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select
                      value={filters.status}
                      onValueChange={(v) =>
                        setFilters((prev) => ({ ...prev, status: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Live">Live</SelectItem>
                        <SelectItem value="Upcoming">Upcoming</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  

                  <div>
                    <label className="text-sm font-medium mb-2 block">Seller Type</label>
                    <Select
                      value={filters.sellerId}
                      onValueChange={(v) =>
                        setFilters((prev) => ({ ...prev, sellerId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Seller" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sellers</SelectItem>
                        {Array.isArray(filtersState?.data?.sellers) && filtersState.data.sellers.length > 0 ? (
                          filtersState.data.sellers.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))
                        ) : (
                          // fallback static options
                          <>
                            <SelectItem value="Bank">Bank</SelectItem>
                            <SelectItem value="Insurance">Insurance</SelectItem>
                            <SelectItem value="Private">Private</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setFilters({
                          maincategoryId: "",
                          categoryId: "",
                          sellerId: "",
                          cityId: "",
                          status: "",
                          sortBy: "latest",
                        });
                      }}
                    >
                      Clear All
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => setFiltersOpen(false)}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Select value={filters.maincategoryId} onValueChange={(v) =>
                setFilters((prev) => ({ ...prev, maincategoryId: v }))} required>
              <SelectTrigger className="w-40 h-8 rounded-full shrink-0 border-muted-foreground/30">
                <SelectValue placeholder="Select Auction Type" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                    <SelectItem value="1">Property</SelectItem>
                    <SelectItem value="2">Non-Motor Assets</SelectItem>
                    <SelectItem value="3">Agriculture</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.sellerId}
              onValueChange={(v) =>
                setFilters((prev) => ({ ...prev, sellerId: v }))
              }
            >
              <SelectTrigger className="w-24 h-8 rounded-full shrink-0 border-muted-foreground/30">
                <SelectValue placeholder="Seller" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Array.isArray(filtersState?.data?.sellers) && filtersState.data.sellers.length > 0 ? (
                  filtersState.data.sellers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="all">Bank</SelectItem>
                    <SelectItem value="Insurance">Insurance</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            <Select
              value={filters.cityId}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, cityId: v }))}
            >
              <SelectTrigger className="w-24 h-8 rounded-full shrink-0 border-muted-foreground/30">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {citiesList.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.categoryId}
              onValueChange={(v) =>
                setFilters((prev) => ({ ...prev, categoryId: v }))
              }
            >
                <SelectTrigger className="w-24 h-8 rounded-full shrink-0 border-muted-foreground/30">
                <SelectValue placeholder="Subtype" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {propertyTypes.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.sortBy}
              onValueChange={(v) =>
                setFilters((prev) => ({ ...prev, sortBy: v }))
              }
            >
              <SelectTrigger className="w-24 h-8 rounded-full shrink-0 border-muted-foreground/30">
                <SelectValue placeholder="Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="price-low">Price: Low</SelectItem>
                <SelectItem value="price-high">Price: High</SelectItem>
                <SelectItem value="ending-soon">Ending Soon</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

            <ApiLoader loading={loading} />
      <main className="container px-4 py-4 md:py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredAuctions.map((auction) => (
            <AuctionCard
              key={auction.id}
              {...auction}
            />
          ))}
        </div>

        {loading && filteredAuctions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Loading auctions...</p>
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              No auctions found matching your criteria.
            </p>
          </div>
        ) : (
          // Infinite scroll trigger
          <div 
            ref={loadMoreRef}
            className="py-8 text-center"
          >
            {loading ? (
              <p className="text-muted-foreground">Loading more auctions...</p>
            ) : hasMore ? (
              <p className="text-muted-foreground">Scroll for more</p>
            ) : (
              <p className="text-muted-foreground">No more auctions to load</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Listings;
