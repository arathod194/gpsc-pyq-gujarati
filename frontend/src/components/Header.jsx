import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, ChevronDown, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const navClass = ({ isActive }) =>
  `text-sm font-medium transition-colors ${
    isActive ? "text-blue-600" : "text-gray-600 hover:text-gray-900"
  }`;

const mobileNavClass = ({ isActive }) =>
  `block px-4 py-3 rounded-md text-base font-medium transition-colors ${
    isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
  }`;

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const closeDrawer = () => setOpen(false);

  const handleLogout = () => {
    logout();
    closeDrawer();
    navigate("/");
  };

  return (
    <header className="glass-header sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mobile hamburger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className="md:hidden -ml-2 p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Open menu"
                data-testid="mobile-menu-trigger"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col" data-testid="mobile-drawer">
              <SheetHeader className="px-5 py-5 border-b border-gray-200">
                <SheetTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    G
                  </div>
                  <span className="font-semibold tracking-tight text-gray-900">GPSC PYQ</span>
                  <span className="text-xs text-gray-500">ગુજરાત</span>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                <NavLink to="/daily" className={mobileNavClass} onClick={closeDrawer} data-testid="drawer-daily">Daily</NavLink>
                <NavLink to="/browse" className={mobileNavClass} onClick={closeDrawer} data-testid="drawer-browse">Browse</NavLink>
                <NavLink to="/practice" className={mobileNavClass} onClick={closeDrawer} data-testid="drawer-practice">Practice</NavLink>
                <NavLink to="/mock" className={mobileNavClass} onClick={closeDrawer} data-testid="drawer-mock">Mock Test</NavLink>
                <NavLink to="/leaderboard" className={mobileNavClass} onClick={closeDrawer} data-testid="drawer-leaderboard">Leaderboard</NavLink>
                {user && (
                  <>
                    <div className="my-3 border-t border-gray-200" />
                    <NavLink to="/dashboard" className={mobileNavClass} onClick={closeDrawer} data-testid="drawer-dashboard">Dashboard</NavLink>
                    <NavLink to="/bookmarks" className={mobileNavClass} onClick={closeDrawer} data-testid="drawer-bookmarks">Bookmarks</NavLink>
                    {user.role === "admin" && (
                      <NavLink to="/admin" className={mobileNavClass} onClick={closeDrawer} data-testid="drawer-admin">Admin Panel</NavLink>
                    )}
                  </>
                )}
              </nav>

              <div className="border-t border-gray-200 p-4">
                {!user ? (
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { closeDrawer(); navigate("/login"); }} data-testid="drawer-login">
                      Login
                    </Button>
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => { closeDrawer(); navigate("/signup"); }} data-testid="drawer-signup">
                      Sign up
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="px-2 mb-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                      onClick={handleLogout}
                      data-testid="drawer-logout"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2" data-testid="logo-link" onClick={closeDrawer}>
            <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              G
            </div>
            <span className="font-semibold tracking-tight text-gray-900">GPSC PYQ</span>
            <span className="text-xs text-gray-500 hidden sm:inline">ગુજરાત</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <NavLink to="/daily" className={navClass} data-testid="nav-daily">Daily</NavLink>
          <NavLink to="/browse" className={navClass} data-testid="nav-browse">Browse</NavLink>
          <NavLink to="/practice" className={navClass} data-testid="nav-practice">Practice</NavLink>
          <NavLink to="/mock" className={navClass} data-testid="nav-mock">Mock</NavLink>
          <NavLink to="/leaderboard" className={navClass} data-testid="nav-leaderboard">Leaderboard</NavLink>
          {user && (
            <NavLink to="/dashboard" className={navClass} data-testid="nav-dashboard">Dashboard</NavLink>
          )}
          {user?.role === "admin" && (
            <NavLink to="/admin" className={navClass} data-testid="nav-admin">Admin</NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {!user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login")}
                data-testid="header-login-btn"
                className="hidden sm:inline-flex"
              >
                Login
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 btn-lift"
                onClick={() => navigate("/signup")}
                data-testid="header-signup-btn"
              >
                Sign up
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="user-menu-trigger">
                  <UserIcon className="h-4 w-4 mr-1" />
                  <span className="max-w-[100px] truncate hidden sm:inline">{user.name}</span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard")} data-testid="menu-dashboard">
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/bookmarks")} data-testid="menu-bookmarks">
                  Bookmarks
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                  className="text-red-600 focus:text-red-700"
                  data-testid="menu-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
