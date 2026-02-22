"use client";

import { useState } from "react";
import { Camera, ImageIcon } from "lucide-react";
import { SearchBar } from "@/components/search/search-bar";
import { ItemGrid } from "@/components/items/item-grid";
import { ImageUpload } from "@/components/forms/image-upload";
import { Button } from "@/components/ui/button";
import { useSearch, useReverseImageSearch } from "@/lib/hooks/use-search";
import type { Item } from "@/lib/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [imageResults, setImageResults] = useState<Item[] | null>(null);

  const { data: searchData, isLoading: searchLoading } = useSearch(query);
  const reverseSearch = useReverseImageSearch();

  async function handleImageSearch(file: File) {
    const result = await reverseSearch.mutateAsync(file);
    setImageResults(result.items);
  }

  const displayItems = imageResults ?? searchData?.items ?? [];
  const isLoading = searchLoading || reverseSearch.isPending;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-50">Search</h1>

      <SearchBar
        value={query}
        onChange={(val) => {
          setQuery(val);
          setImageResults(null);
        }}
        autoFocus
        placeholder="black airpods, silver macbook, dorm key..."
      />

      <div className="mt-3 flex items-center gap-2">
        <Button
          size="sm"
          variant={showImageSearch ? "primary" : "outline"}
          onClick={() => setShowImageSearch(!showImageSearch)}
        >
          <Camera className="mr-1.5 h-4 w-4" />
          Image Search
        </Button>
      </div>

      {showImageSearch && (
        <div className="mt-3">
          <ImageUpload
            compact
            onImageSelect={handleImageSearch}
            onClear={() => setImageResults(null)}
          />
        </div>
      )}

      <div className="mt-6">
        {(query.length >= 2 || imageResults) && (
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {isLoading
              ? "Searching..."
              : `${displayItems.length} result${displayItems.length !== 1 ? "s" : ""}`}
          </p>
        )}
        <ItemGrid items={displayItems} loading={isLoading} />
      </div>
    </div>
  );
}
