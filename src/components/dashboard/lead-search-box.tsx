"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function LeadSearchBox() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [radiusMi, setRadiusMi] = useState(25);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({
      keyword,
      location,
      radiusMi: String(radiusMi),
    });
    router.push(`/search?${params.toString()}`);
  }

  return (
    <Card>
      <CardContent className="py-5">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_2fr_1fr_auto] md:items-end">
          <div>
            <label className="mb-1 block text-xs text-ink-600" htmlFor="keyword">
              Keyword
            </label>
            <Input
              id="keyword"
              placeholder="Dentist"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-600" htmlFor="location">
              Location
            </label>
            <Input
              id="location"
              placeholder="Hattiesburg, MS"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-600" htmlFor="radius">
              Radius (mi)
            </label>
            <Input
              id="radius"
              type="number"
              min={1}
              max={100}
              value={radiusMi}
              onChange={(e) => setRadiusMi(Number(e.target.value))}
            />
          </div>
          <Button type="submit" size="md">
            Find Leads
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
