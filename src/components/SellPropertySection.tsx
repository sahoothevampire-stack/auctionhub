export const SellPropertySection = () => {
  const cities = [
    "Agra", "Ahmedabad", "Bangalore", "Bhubaneswar", "Chandigarh",
    "Chennai", "Dehradun", "Ghaziabad", "Gurugram", "Hyderabad",
    "Jaipur", "Jodhpur", "Kanpur", "Kolkata", "Kota",
    "Lucknow", "Ludhiana", "Meerut", "Mohali", "Mumbai",
    "Nagpur", "New delhi", "Noida", "Pune", "Rajkot",
    "Surat", "Udaipur", "Vadodara"
  ];

  return (
    <section className="bg-muted/30 py-8 md:py-12 mt-12 border-t">
      <div className="container px-4">
        <h2 className="text-xl md:text-2xl font-bold mb-6 md:mb-8">Sell Your Property</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
          {cities.map((city) => (
            <button
              key={city}
              className="text-left text-sm text-muted-foreground hover:text-primary transition-colors py-1"
            >
              Sell property in {city}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
