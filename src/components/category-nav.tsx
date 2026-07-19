"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildCatalogHref } from "@/lib/catalog-url";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export function CategoryNav({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary [&[data-state=open]_svg]:rotate-180">
          Categorías
          <ChevronDown className="size-4 transition-transform" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8}>
        <DropdownMenuItem asChild>
          <Link href="/">Todas</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {categories.map((category) => (
          <DropdownMenuItem key={category.id} asChild>
            <Link href={buildCatalogHref({ categoryId: category.id })}>{category.name}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
