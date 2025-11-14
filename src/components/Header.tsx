import { Home, Menu, Bell, Search, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelector, useDispatch } from 'react-redux';
import { useState } from 'react';
import type { RootState } from '@/store/store';
import { logout } from '@/store/authSlice';
import { useRouter } from 'next/navigation';
import { OtpLogInDialog } from "@/components/OtpLogInDialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  scrolled?: boolean;
}

export const Header = ({ scrolled = false }: HeaderProps) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const auth = useSelector((state: RootState) => state.auth);
  const isLoggedIn = !!auth?.access_token && auth.new_user === false;
  const displayName = auth?.name || '';
  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()
    : (auth?.phone ? auth.phone.slice(-2) : 'RN');

  const handleLogout = () => {
    dispatch(logout());
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 gap-2">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <nav className="flex flex-col gap-4 mt-8">
                <Link href="/" className="text-lg font-medium hover:text-primary transition-colors">
                  Home
                </Link>
                <Link href="/listings?status=Live" className="text-lg font-medium hover:text-primary transition-colors">
                  Live Auctions
                </Link>
                <Link href="/listings?status=Upcoming" className="text-lg font-medium hover:text-primary transition-colors">
                  Upcoming
                </Link>
                <Link href="/profile" className="text-lg font-medium hover:text-primary transition-colors">
                  My Profile
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          
          {(
            <Link href="/" className="flex items-center gap-1 font-bold text-base">
              <span className="text-foreground">Auction Hub</span>
            </Link>
          )}
        </div>

        {scrolled ? (
          <div className="flex-1 max-w-xl mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search city, locality, projects..." 
                className="pl-9 h-9"
              />
            </div>
          </div>
        ) : (
          isLoggedIn ? (
            <Link href="/profile" className="ml-auto">
              <Button variant="default" size="sm" className="h-8 text-xs px-3">
                Your Auctions
              </Button>
            </Link>
          ) : (
            <div className="ml-auto" />
          )
        )}

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full" />
          </Button>
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs px-3 bg-[#FF5722] hover:bg-[#FF5722]/90 font-semibold text-white"
                onClick={() => setShowLoginDialog(true)}
              >
                Log In
              </Button>
              <OtpLogInDialog
                open={showLoginDialog}
                onOpenChange={setShowLoginDialog}
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
};
