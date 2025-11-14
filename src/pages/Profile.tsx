import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, FileText, Gavel, Heart, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import Link from 'next/link';

const Profile = () => {
  const handleLogout = () => {
    toast.success("Logged out successfully");
  };

  const auth = useSelector((state: RootState) => state.auth);
  const isLoggedIn = !!auth?.access_token;
  const displayName = auth?.name || '';
  const initials = displayName ? displayName.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() : 'RN';

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />

      <main className="container px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {!isLoggedIn ? (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                  {initials}
                </div>
                <h2 className="text-xl font-semibold">Please log in to view your profile</h2>
                <p className="text-sm text-muted-foreground">You need to be logged in to access your profile and enquiries.</p>
                <div className="flex gap-2 pt-4">
                  <Link href="/">
                    <Button>Go to Home</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                      {initials}
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{auth.name || 'Your Name'}</CardTitle>
                      <p className="text-sm text-muted-foreground">{auth.email || ''}</p>
                      <Badge variant="secondary" className="mt-2">
                        Basic Lead Account
                      </Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </CardHeader>
              </Card>

              <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="profile">
                    <User className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Profile</span>
                  </TabsTrigger>
                  <TabsTrigger value="enquiries">
                    <FileText className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Enquiries</span>
                  </TabsTrigger>
                  <TabsTrigger value="bids">
                    <Gavel className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">My Bids</span>
                  </TabsTrigger>
                  <TabsTrigger value="saved">
                    <Heart className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Saved</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <Card>
                    <CardHeader>
                      <CardTitle>Profile Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Name</label>
                          <p className="text-lg">{auth.name || ''}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Email</label>
                          <p className="text-lg">{auth.email || ''}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Mobile</label>
                          <p className="text-lg">{auth.phone || ''}</p>
                        </div>
                        {/* City is not stored on auth slice by design */}
                      </div>

                      <div className="pt-4 border-t">
                        <h3 className="font-semibold mb-2">Account Verification</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Verify your account to participate in bidding
                        </p>
                        <Button variant="hero">Upload Verification Documents</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="enquiries">
                  <Card>
                    <CardHeader>
                      <CardTitle>My Enquiries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-center text-muted-foreground py-8">
                        No enquiries yet. Browse auctions and submit enquiries to get started!
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="bids">
                  <Card>
                    <CardHeader>
                      <CardTitle>My Bids</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">
                          You need to verify your account to participate in bidding
                        </p>
                        <Button variant="hero">Get Verified</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="saved">
                  <Card>
                    <CardHeader>
                      <CardTitle>Saved Auctions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-center text-muted-foreground py-8">
                        No saved auctions yet. Start saving auctions to track them here!
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;
