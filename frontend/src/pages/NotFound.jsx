import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, BookOpen, Search } from "lucide-react";
import usePageTitle from "@/lib/usePageTitle";

export default function NotFound() {
  usePageTitle("Page not found");
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center page-enter">
      <p className="font-mono-stat text-7xl sm:text-8xl font-bold text-gray-200">404</p>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 mt-4">
        Page not found
      </h1>
      <p className="mt-2 text-gray-600 font-gujarati">
        જે page શોધી રહ્યા છો તે અહીં નથી. નીચેના links useful હોઈ શકે.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to="/">
          <Button className="bg-blue-600 hover:bg-blue-700 btn-lift">
            <Home className="h-4 w-4 mr-1.5" /> Home
          </Button>
        </Link>
        <Link to="/browse">
          <Button variant="outline">
            <Search className="h-4 w-4 mr-1.5" /> Browse Questions
          </Button>
        </Link>
        <Link to="/practice">
          <Button variant="outline">
            <BookOpen className="h-4 w-4 mr-1.5" /> Start Practice
          </Button>
        </Link>
      </div>
    </div>
  );
}
