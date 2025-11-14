import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

interface FilterBarProps {
  onFilterChange: (filters: any) => void;
}

export const FilterBar = ({ onFilterChange }: FilterBarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 20000000]);
  const [filters, setFilters] = useState({
    category: "",
    cityId: "",
    status: "",
    sellerId: "",
    sortBy: "latest",
  });

  const handleFilterChange = (key: string, value: any) => {
    // normalize city -> cityId for consistency with listings
    const normalizedKey = key === 'city' ? 'cityId' : key;
    const newFilters = { ...filters, [normalizedKey]: value };
    setFilters(newFilters);
    onFilterChange({ ...newFilters, priceRange });
  };

  const handlePriceChange = (value: number[]) => {
    setPriceRange(value);
    onFilterChange({ ...filters, priceRange: value });
  };

  return (
    <div className="bg-card border-b sticky top-16 z-40 backdrop-blur">
      <div className="container px-4 py-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center justify-between mb-4">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters {isOpen ? "▲" : "▼"}
              </Button>
            </CollapsibleTrigger>

            <Select value={filters.sortBy} onValueChange={(v) => handleFilterChange("sortBy", v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="ending-soon">Ending Soon</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CollapsibleContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4">
              <Select value={filters.category} onValueChange={(v) => handleFilterChange("category", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Property">Property</SelectItem>
                  <SelectItem value="Non-Motor">Non-Motor Assets</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.cityId} onValueChange={(v) => handleFilterChange("city", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="City" />
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

              <Select value={filters.status} onValueChange={(v) => handleFilterChange("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Live">Live</SelectItem>
                  <SelectItem value="Upcoming">Upcoming</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.sellerId} onValueChange={(v) => handleFilterChange("sellerId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seller Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sellers</SelectItem>
                  <SelectItem value="Bank">Bank</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                  <SelectItem value="Private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Price Range</label>
              <Slider
                min={0}
                max={20000000}
                step={100000}
                value={priceRange}
                onValueChange={handlePriceChange}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>₹{(priceRange[0] / 100000).toFixed(1)}L</span>
                <span>₹{(priceRange[1] / 100000).toFixed(1)}L</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};
