"use client";
import { Home, Tractor, Package, Apple } from "lucide-react";
import { useRouter } from "next/navigation";

interface CategoryIconsProps {
  onCategorySelect?: (category: string) => void;
}

export const CategoryIcons = ({ onCategorySelect }: CategoryIconsProps) => {
  const router = useRouter();
  
  const categories = [
    { icon: Home, label: "Property", value: "Property" },
    { icon: Tractor, label: "Agriculture", value: "Agriculture" },
    { icon: Package, label: "Non Motor", value: "Non-Motor" },
    { icon: Apple, label: "Perishable", value: "Perishable" },
  ];

  const handleCategoryClick = (value: string) => {
    router.push(`/listings?category=${encodeURIComponent(value)}`);
    onCategorySelect?.(value);
  };

  return (
    <div className="bg-background border-b py-3 md:py-4">
      <div className="container px-4">
        <div className="flex items-center justify-around gap-2 md:gap-4 max-w-3xl mx-auto">
          {categories.map(({ icon: Icon, label, value }) => (
            <button
              key={value}
              onClick={() => handleCategoryClick(value)}
              className="flex flex-col items-center gap-1.5 md:gap-2 px-2 md:px-4 py-1 md:py-2 rounded-lg hover:bg-secondary/50 transition-colors min-w-[70px] md:min-w-[100px]"
            >
              <div className="p-2 md:p-3 rounded-full bg-primary/10">
                <Icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <span className="text-xs md:text-sm font-medium text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
