"use client";

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import type { RootState, AppDispatch } from '@/store/store';
import { fetchFiltersData } from '@/store/filtersSlice';
import { ApiLoader } from "@/components/ApiLoader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HeroSearchProps {
  onSearch?: (main_category_id: string, city_id: string) => void;
}

export const HeroSearch = ({ onSearch }: HeroSearchProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [main_category_id, setMaincategoryId] = useState("");
  const [city_id, setCityId] = useState("");

  const filtersState = useSelector((state: RootState) => state.filters);
  const filtersLoading = filtersState?.loading ?? false;
  // Keep the original API objects so we can use ids as select values
  // Use a fixed list of auction types (numeric ids) — option B
  const AUCTION_TYPES: { id: string; name: string }[] = [
    { id: '1', name: 'Property' },
    { id: '2', name: 'Non-Motor Assets' },
    { id: '3', name: 'Agriculture' },
  ];
  // const propertyTypes = AUCTION_TYPES;
  const citiesList = filtersState?.data?.cities ?? [];

  useEffect(() => {
    // fetch filters data once on mount
    dispatch(fetchFiltersData());
  }, [dispatch]);

  const handleSearch = () => {
    if (onSearch) {
      onSearch(main_category_id, city_id);
    } else {
      // Fallback: navigate to listings with the selected filters
      const params = new URLSearchParams();
      if (main_category_id) params.set('main_category_id', main_category_id);
      if (city_id) params.set('city_id', city_id);
      router.push(`/listings?${params.toString()}`);
    }
  };

  return (
    <>
      <ApiLoader loading={filtersLoading} />
      <section className="relative h-[280px] md:h-[320px] flex items-end overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10">
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&h=900&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(2px)",
          opacity: 0.6,
        }}
      />
      
      <div className="container relative z-10 px-4 pb-4 md:pb-6">
        <div className="max-w-md md:max-w-2xl mx-auto bg-background rounded-lg shadow-lg p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <Select value={main_category_id} onValueChange={setMaincategoryId}>
              <SelectTrigger className="w-full h-12 bg-background">
                <SelectValue placeholder="Select Auction Type" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {(
                  // fallback options while loading (disabled with non-empty sentinel values)
                  <>
                    <SelectItem value="1">Property</SelectItem>
                    <SelectItem value="2">Non-Motor Assets</SelectItem>
                    <SelectItem value="3">Agriculture</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            <Select value={city_id} onValueChange={setCityId}>
              <SelectTrigger className="w-full h-12 bg-background">
                <SelectValue placeholder="Select a city..." />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {citiesList.length === 0 ? (
                  // fallback list (disabled sentinel values)
                  <>
                    <SelectItem value="loading-city-1" disabled>Jaipur</SelectItem>
                    <SelectItem value="loading-city-2" disabled>Delhi</SelectItem>
                    <SelectItem value="loading-city-3" disabled>Mumbai</SelectItem>
                    <SelectItem value="loading-city-4" disabled>Bangalore</SelectItem>
                    <SelectItem value="loading-city-5" disabled>Chennai</SelectItem>
                    <SelectItem value="loading-city-6" disabled>Hyderabad</SelectItem>
                  </>
                ) : (
                  citiesList.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.display_name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleSearch}
            className="w-full h-12 md:h-14 bg-[#FF5722] hover:bg-[#FF5722]/90 text-white font-semibold text-base md:text-lg mt-3 md:mt-4"
          >
            Search
          </Button>
        </div>
      </div>
    </section>
    </>
  );
};
