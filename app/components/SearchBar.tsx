"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useDebounce } from "@/app/hooks/useDebounce";

interface SearchResult {
    id: string;
    title: string;
    thumbnail: string;
    url: string;
}

interface SearchBarProps {
    onSelect: (url: string) => void;
    clearOnSelect?: boolean;
}

export function SearchBar({ onSelect, clearOnSelect = true }: SearchBarProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const debouncedQuery = useDebounce(query, 500);
    const resultsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const searchVideos = async () => {
            if (!debouncedQuery) {
                setResults([]);
                return;
            }

            setIsLoading(true);
            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
                const data = await response.json();
                setResults(data);
            } catch (error) {
                console.error("Error searching videos:", error);
            } finally {
                setIsLoading(false);
            }
        };

        searchVideos();
    }, [debouncedQuery]);

    // Hide results when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
                setResults([]);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (url: string) => {
        onSelect(url);
        if (clearOnSelect) setQuery("");
        setResults([]);
    };

    return (
        <div className="relative w-full max-w-xl">
            <div className="flex gap-2">
                <Input
                    type="text"
                    placeholder="Search for a song..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-gray-900 text-white border-purple-700 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-600"
                    style={{ boxShadow: "0 0 0 2px #a78bfa33" }}
                />
                <Button variant="outline" size="icon" className="border-purple-700 text-purple-400 hover:bg-purple-700 hover:text-white">
                    {isLoading ? (
                        <svg className="animate-spin h-4 w-4 text-purple-400" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                    ) : (
                        <Search className="h-4 w-4" />
                    )}
                </Button>
            </div>
            {results.length > 0 && (
                <div ref={resultsRef} className="absolute z-30 w-full mt-2 bg-gray-900 border border-purple-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                    {results.map((result) => (
                        <div
                            key={result.id}
                            className="flex items-center gap-3 p-3 hover:bg-purple-800 cursor-pointer transition-colors"
                            onClick={() => handleSelect(result.url)}
                        >
                            <img
                                src={result.thumbnail}
                                alt={result.title}
                                className="w-16 h-12 object-cover rounded"
                            />
                            <div className="flex-1">
                                <p className="text-sm text-white line-clamp-2">{result.title}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
} 