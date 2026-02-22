"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { SearchBar } from "@/components/search/search-bar";
import { ItemGrid } from "@/components/items/item-grid";
import { ImageUpload } from "@/components/forms/image-upload";
import { Button } from "@/components/ui/button";
import { useSearch, useReverseImageSearch } from "@/lib/hooks/use-search";
import type { Item } from "@/lib/types";
import { CATEGORIES } from "@/lib/constants";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [imageResults, setImageResults] = useState<Item[] | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const { data: searchData, isLoading: searchLoading } = useSearch(query);
  const reverseSearch = useReverseImageSearch();

  async function handleImageSearch(file: File) {
    const result = await reverseSearch.mutateAsync(file);
    setImageResults(result.items);
  }

  const displayItems = imageResults ?? searchData?.items ?? [];
  const filteredItems =
    activeCategory === "all"
      ? displayItems
      : displayItems.filter((item) => item.category === activeCategory);
  const isLoading = searchLoading || reverseSearch.isPending;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Search</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Find similar items quickly with text or image search.
        </p>
      </div>

      <SearchBar
        value={query}
        onChange={(val) => {
          setQuery(val);
          setImageResults(null);
        }}
        autoFocus
        placeholder="black airpods, silver macbook, dorm key..."
      />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={showImageSearch ? "primary" : "outline"}
          onClick={() => setShowImageSearch(!showImageSearch)}
        >
          <Camera className="mr-1.5 h-4 w-4" />
          Image Search
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => setActiveCategory("all")}
          className={`rounded-full px-3 py-1.5 text-xs transition-all duration-300 ${
            activeCategory === "all"
              ? "bg-brand-700 text-white shadow-[0_8px_20px_rgb(136_19_55/0.25)]"
              : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800"
          }`}
        >
          All
        </button>
        {Object.entries(CATEGORIES).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-all duration-300 ${
              activeCategory === key
                ? "bg-brand-700 text-white shadow-[0_8px_20px_rgb(136_19_55/0.25)]"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800"
            }`}
          >
            {meta.label}
          </button>
        ))}
      </div>

      {showImageSearch && (
        <div>
          <ImageUpload
            compact
            onImageSelect={handleImageSearch}
            onClear={() => setImageResults(null)}
          />
        </div>
      )}

      <div className="pt-2">
        {(query.length >= 2 || imageResults) && (
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {isLoading
              ? "Searching..."
              : `${filteredItems.length} result${filteredItems.length !== 1 ? "s" : ""}`}
          </p>
        )}
        <ItemGrid items={filteredItems} loading={isLoading} />
      </div>
    </div>
  );
}
