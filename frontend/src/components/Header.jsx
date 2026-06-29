import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navClass = ({ isActive }) =>
  `text-sm font-medium transition-colors ${
    isActive ? "text-blue-600" : "text-gray-600 hover:text-gray-900"
  }`;

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="glass-header sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
          <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            G
          </div>
          <span className="font-semibold tracking-tight text-gray-900">GPSC PYQ</span>
          <span className="text-xs text-gray-500 hidden sm:inline">ગુજરાત</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <NavLink to="/browse" className={navClass} data-testid="nav-browse">Browse</NavLink>
          <NavLink to="/practice" className={navClass} data-testid="nav-practice">Practice</NavLink>
          <NavLink to="/mock" className={navClass} data-testid="nav-mock">Mock Test</NavLink>
          {user && (
            <NavLink to="/dashboard" className={navClass} data-testid="nav-dashboard">Dashboard</NavLink>
          )}
          {user?.role === "admin" && (
            <NavLink to="/admin" className={navClass} data-testid="nav-admin">Admin</NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {!user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login")}
                data-testid="header-login-btn"
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
                  <span className="max-w-[120px] truncate">{user.name}</span>
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
