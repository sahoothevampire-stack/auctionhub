import { Building2, Landmark, ShieldCheck, Grid3x3 } from "lucide-react";

export const SEOContent = () => {
  return (
    <section className="bg-muted/30 py-12 md:py-16">
      <div className="container px-4">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* About Auction Site */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold">About Our Auction Platform</h2>
            </div>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Welcome to India's most trusted online auction marketplace for vehicles, properties, and assets. 
              We simplify the auction process by bringing together buyers and sellers on a transparent, secure platform. 
              Whether you're looking for bank-auctioned vehicles, insurance salvage, or commercial properties, 
              we provide verified listings with complete documentation and competitive bidding opportunities. 
              Our platform ensures a seamless experience from registration to final purchase.
            </p>
          </div>

          {/* Three Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Bank Auction */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Landmark className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                <h3 className="text-lg md:text-xl font-semibold">Bank Auctions</h3>
              </div>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Discover bank-seized vehicles and properties at unbeatable prices. Our platform features 
                auctions from leading banks including SBI, HDFC, ICICI, and more. All listings are 
                verified with clear titles and legal documentation. Bid on cars, bikes, commercial 
                vehicles, and real estate assets recovered from loan defaults.
              </p>
            </div>

            {/* Insurance Auction */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                <h3 className="text-lg md:text-xl font-semibold">Insurance Auctions</h3>
              </div>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Browse salvage and insurance claim vehicles from top insurance companies. These auctions 
                include accidental vehicles, flood-damaged assets, and total loss claims available at 
                significant discounts. Perfect for spare parts dealers, refurbishment businesses, or 
                buyers looking for budget-friendly options with transparent damage reports.
              </p>
            </div>

            {/* Auction by Category */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Grid3x3 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                <h3 className="text-lg md:text-xl font-semibold">Auction by Category</h3>
              </div>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Explore auctions across multiple categories: Residential apartments, commercial buildings, 
                agricultural land, industrial properties, vehicles, machinery, and equipment. Filter by 
                location, price range, and seller type. Each category offers detailed specifications, 
                inspection reports, and flexible payment terms to suit your investment needs.
              </p>
            </div>
          </div>

          {/* Keywords Section */}
          <div className="pt-8 border-t border-border">
            <p className="text-xs md:text-sm text-muted-foreground text-center leading-relaxed">
              <strong className="font-semibold text-foreground">Popular Searches:</strong> Bank auction vehicles, 
              insurance salvage cars, seized property auction, bank repo cars, SARFAESI auction, 
              e-auction portal, online bidding platform, foreclosure properties, liquidation sale, 
              asset recovery auction, vehicle auction India
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
